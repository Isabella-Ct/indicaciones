// Pagos y facturas (spec 009): RF-FAC-05..16, RN-22. El pago y su factura numerada nacen en la misma
// transacción (research R-04); el comprobante se emite con POST /facturas (tercero y PDF por correo, R-05).
const { withTransaction } = require('../../config/db');
const repositorio = require('./facturas.repository');
const liquidacionesRepositorio = require('../liquidaciones/liquidaciones.repository');
const liquidaciones = require('../liquidaciones/liquidaciones.service');
const { generarPdf } = require('./factura.pdf');
const { enviarCorreo } = require('../../integrations/correo');
const reloj = require('../../utils/reloj');
const { AppError, errores } = require('../../utils/errores');
const { registrarBitacora } = require('../../utils/bitacora');
const { siguienteConsecutivo } = require('../../utils/consecutivos');
const { aLimites, meta } = require('../../utils/paginacion');
const { sumarDias } = require('../../utils/fechas');
const { pesos } = require('../liquidaciones/liquidaciones.reglas');
const { enmascararCorreo } = require('../movimientos/movimientos.reglas');

const NO_ENCONTRADA = () => errores.noEncontrado('Factura no encontrada.', 'FACTURA_NO_ENCONTRADA');
const YA_PAGADO = () => errores.conflicto('El servicio ya fue pagado', 'YA_PAGADO');

const bitacora = (conexion, actor, accion, entidad, idRegistro, nuevo, anterior = null) =>
  registrarBitacora(conexion, { idUsuario: actor.idUsuario, accion, entidad, idRegistro, anterior, nuevo, ip: actor.ip });

/** Factura para la API: sin datos internos. */
function publica(factura) {
  if (!factura) return factura;
  const { _correo: _c, _idOperador: _o, ...resto } = factura;
  return resto;
}

/** Detalle con la liquidación (la guardada) para la pantalla y el PDF. */
async function detalle(idFactura, { conexion } = {}) {
  const factura = await repositorio.obtenerPorId(idFactura, { conexion });
  if (!factura) throw NO_ENCONTRADA();
  const liquidacion = factura.movimiento ? await liquidaciones.liquidar(factura.movimiento.idMovimiento, null) : null;
  return { factura, liquidacion };
}

// ---------------------------------------------------------------- HU-40
/**
 * Cobro reutilizable (spec 009 R-04; lo usan el pago del servicio y las membresías de la spec 010): valida el
 * pago (RF-FAC-06, RF-FAC-07), toma el consecutivo y crea la factura y el pago dentro de la transacción de quien
 * llama. Exactamente uno de idLiquidacion o idMembresia. `prefijoCampo` ('pago.') nombra el campo del error
 * cuando el pago viene anidado en el cuerpo. Devuelve el id de la factura.
 */
async function cobrar(conexion, { idLiquidacion = null, idMembresia = null, total, idCliente, tercero, pago, actor, accion = 'registrar_pago', prefijoCampo = '' }) {
  const { metodo, valorRecibido, referencia } = pago;
  let cambio = null;
  let recibido = total;
  if (metodo === 'efectivo') {
    recibido = valorRecibido ?? total;
    // RF-FAC-06: muestra el faltante y no registra el pago.
    if (recibido < total) {
      throw errores.validacion([{ campo: `${prefijoCampo}valorRecibido`, mensaje: `El valor recibido no alcanza: faltan ${pesos(total - recibido)}.` }]);
    }
    cambio = Math.round((recibido - total) * 100) / 100;
  }
  const fecha = reloj.ahora();
  // RN-22: el número se toma dentro de la transacción (sin huecos si el cobro falla).
  const numero = await siguienteConsecutivo(conexion, 'factura');
  const id = await repositorio.insertarFactura({ numero, idLiquidacion, idMembresia, idCliente, tercero, total, fecha }, { conexion });
  const idPago = await repositorio.insertarPago(
    { idFactura: id, metodo, valor: total, valorRecibido: recibido, cambio, referencia: metodo === 'efectivo' ? null : referencia, idOperador: actor.idUsuario, fecha },
    { conexion }
  );
  await bitacora(conexion, actor, accion, 'factura', id, { numero, idPago, metodo, total, cambio, idMembresia });
  return id;
}

/** RF-FAC-05..09 (R-04): pago del servicio + factura numerada en una transacción. */
async function pagar({ idMovimiento, metodo, valorRecibido, referencia, tercero }, actor) {
  let idFactura;
  try {
    idFactura = await withTransaction(async (conexion) => {
      const liquidacion = await liquidaciones.liquidarEn(conexion, idMovimiento, actor);
      if (!liquidacion.persistida) {
        throw errores.conflicto('Registre primero la salida del vehículo: el movimiento sigue abierto.', 'MOVIMIENTO_NO_CERRADO');
      }
      if (liquidacion.pagada) throw YA_PAGADO();
      const movimiento = await liquidacionesRepositorio.movimientoParaLiquidar(idMovimiento, { conexion });
      return cobrar(conexion, {
        idLiquidacion: liquidacion.idLiquidacion,
        total: liquidacion.total,
        idCliente: movimiento.idPropietario,
        tercero,
        pago: { metodo, valorRecibido, referencia },
        actor,
      });
    });
  } catch (error) {
    await liquidaciones.alertarSiFaltaTarifa(error);
    if (error.code === 'ER_DUP_ENTRY') throw YA_PAGADO();
    throw error;
  }
  const { factura } = await detalle(idFactura);
  return { pago: factura.pago, factura: publica(factura) };
}

// ---------------------------------------------------------------- HU-41
/** GET /facturas/:id. */
async function obtener(id) {
  const { factura, liquidacion } = await detalle(id);
  return { ...publica(factura), liquidacion };
}

/** RF-FAC-10..12 (R-05): tercero (antes del envío) y PDF al correo del cliente registrado. */
async function emitir({ idFactura, tercero }, actor) {
  await withTransaction(async (conexion) => {
    const factura = await repositorio.obtenerPorId(idFactura, { conexion, bloquear: true });
    if (!factura) throw NO_ENCONTRADA();
    if (factura.estado === 'anulada') throw errores.conflicto('La factura está anulada.', 'FACTURA_ANULADA');
    if (tercero) {
      if (factura.enviada) throw errores.conflicto('La factura ya se envió al cliente: no se puede cambiar el titular.', 'FACTURA_YA_ENVIADA');
      await repositorio.guardarTercero(idFactura, tercero, { conexion });
      await bitacora(conexion, actor, 'factura_a_tercero', 'factura', idFactura, tercero, factura.tercero);
    }
  });
  const { factura, liquidacion } = await detalle(idFactura);
  let enviadaA = null;
  if (factura._correo) {
    const pdf = await generarPdf(factura, liquidacion);
    const enviado = await enviarCorreo({
      para: factura._correo,
      asunto: `PARKO · Factura ${factura.numero}`,
      texto: [
        `Hola, ${factura.cliente.nombre}.`,
        '',
        `Adjuntamos la factura ${factura.numero} de ${factura.parqueadero?.nombre ?? 'PARKO'} por ${pesos(factura.total)}${factura.movimiento ? ` (placa ${factura.movimiento.placa})` : ''}.`,
        '',
        'Comprobante interno; la facturación electrónica está pendiente de envío.',
        'PARKO · Sistema de Gestión de Parqueadero',
      ].join('\n'),
      adjuntos: [{ nombre: `factura-${factura.numero}.pdf`, contenido: pdf, tipo: 'application/pdf' }],
    });
    if (enviado) {
      await withTransaction((conexion) => bitacora(conexion, actor, 'enviar_factura', 'factura', idFactura, { para: enmascararCorreo(factura._correo) }));
      enviadaA = enmascararCorreo(factura._correo);
    }
  }
  const actualizada = await repositorio.obtenerPorId(idFactura);
  return { ...publica(actualizada), liquidacion, enviadaA };
}

/** RF-FAC-10, RF-FAC-16 (R-06): PDF para el personal o para el Cliente dueño. */
async function pdf(id, actor) {
  const { factura, liquidacion } = await detalle(id);
  const esDueno = factura.cliente && factura.cliente.idUsuario === actor.idUsuario;
  if (!actor.permisos.includes('facturas.ver') && !esDueno) {
    throw new AppError(403, 'SIN_PERMISO', 'Solo puede descargar sus propias facturas.');
  }
  return { numero: factura.numero, contenido: await generarPdf(factura, liquidacion) };
}

// ---------------------------------------------------------------- HU-42
/** RF-FAC-13, RF-FAC-14 (R-07). */
async function anular(id, { motivo }, actor) {
  await withTransaction(async (conexion) => {
    const factura = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!factura) throw NO_ENCONTRADA();
    if (factura.estado === 'anulada') throw errores.conflicto('La factura ya está anulada.', 'FACTURA_ANULADA');
    await repositorio.anular(id, { motivo, idUsuario: actor.idUsuario, fecha: reloj.ahora() }, { conexion });
    await bitacora(conexion, actor, 'anular', 'factura', id, { estado: 'anulada', motivo }, { estado: 'emitida' });
  });
  return obtener(id);
}

// ---------------------------------------------------------------- HU-43
/** Fechas 'AAAA-MM-DD' de Bogotá → rango [desde 00:00, hasta + 1 día 00:00). */
const rango = ({ desde, hasta }) => ({
  desde: desde ? new Date(`${desde}T00:00:00-05:00`) : undefined,
  hasta: hasta ? new Date(`${sumarDias(hasta, 1)}T00:00:00-05:00`) : undefined,
});

/** RF-FAC-15 (R-08). */
async function listar(filtros, { idCliente } = {}) {
  const { filas, total, sumaTotal } = await repositorio.listar({ ...filtros, ...rango(filtros), idCliente, ...aLimites(filtros) });
  return { data: filas.map(publica), meta: { ...meta(filtros, total), sumaTotal } };
}

/** RF-FAC-16: solo las del cliente de la sesión. */
const misFacturas = (filtros, actor) => listar(filtros, { idCliente: actor.idUsuario });

module.exports = { pagar, cobrar, obtener, emitir, pdf, anular, listar, misFacturas, publica };
