// Cuadre y cierre de caja (spec 009, research R-09): RF-FAC-17..19. Solo cuentan las facturas emitidas
// (RF-FAC-14); el cierre deja sus pagos en ese cierre y los nuevos abren el turno siguiente.
const { withTransaction } = require('../../config/db');
const repositorio = require('./caja.repository');
const reloj = require('../../utils/reloj');
const { errores } = require('../../utils/errores');
const { registrarBitacora } = require('../../utils/bitacora');
const { aLimites, meta } = require('../../utils/paginacion');
const { aIsoBogota } = require('../../utils/fechas');
const { ROL_ADMINISTRADOR } = require('../../config/constantes');

const METODOS = ['efectivo', 'tarjeta', 'transferencia', 'qr'];
const redondear = (v) => Math.round(v * 100) / 100;

/** Totales por método, servicios y efectivo esperado de una lista de pagos (sin las facturas anuladas). */
function resumir(pagos) {
  const emitidos = pagos.filter((p) => p.estado === 'emitida');
  const totalesPorMetodo = Object.fromEntries(METODOS.map((m) => [m, redondear(emitidos.filter((p) => p.metodo === m).reduce((s, p) => s + p.valor, 0))]));
  return {
    servicios: emitidos.length,
    totalesPorMetodo,
    total: redondear(Object.values(totalesPorMetodo).reduce((s, v) => s + v, 0)),
    efectivoEsperado: totalesPorMetodo.efectivo,
    anuladas: pagos.length - emitidos.length,
  };
}

/** RF-FAC-17: cuadre del turno abierto del operador de la sesión. */
async function turnoActual(actor) {
  const pagos = await repositorio.pagosAbiertos(actor.idUsuario);
  return {
    inicio: pagos[0] ? aIsoBogota(pagos[0].fecha) : null,
    ...resumir(pagos),
    facturas: pagos.map((p) => ({ idFactura: p.idFactura, numero: p.numero, placa: p.placa, metodo: p.metodo, total: p.total, estado: p.estado })),
  };
}

/** RF-FAC-18: cierre con el efectivo contado y la diferencia. */
async function cerrar({ efectivoContado, observaciones }, actor) {
  const fin = reloj.ahora();
  const idCierre = await withTransaction(async (conexion) => {
    const pagos = await repositorio.pagosAbiertos(actor.idUsuario, { conexion, bloquear: true });
    if (!pagos.length) throw errores.conflicto('No hay pagos en el turno: no hay nada que cerrar.', 'TURNO_SIN_PAGOS');
    const resumen = resumir(pagos);
    const diferencia = redondear(efectivoContado - resumen.efectivoEsperado);
    const id = await repositorio.insertarCierre(
      { idOperador: actor.idUsuario, inicio: pagos[0].fecha, fin, totales: resumen.totalesPorMetodo, efectivoContado, diferencia, observaciones },
      { conexion }
    );
    await repositorio.asignarCierre(
      pagos.map((p) => p.idPago),
      id,
      { conexion }
    );
    await registrarBitacora(conexion, {
      idUsuario: actor.idUsuario,
      accion: 'cerrar_caja',
      entidad: 'cierre_caja',
      idRegistro: id,
      anterior: null,
      nuevo: { ...resumen, efectivoContado, diferencia },
      ip: actor.ip,
    });
    return id;
  });
  const { filas } = await repositorio.listarCierres({ idOperador: actor.idUsuario, limit: 1, offset: 0 });
  return filas.find((c) => c.idCierre === idCierre) ?? filas[0];
}

/** RF-FAC-19: el Administrador ve todos los cierres; los demás, solo los suyos. */
async function listar(filtros, actor) {
  const idOperador = actor.rol === ROL_ADMINISTRADOR ? undefined : actor.idUsuario;
  const { filas, total } = await repositorio.listarCierres({ idOperador, ...aLimites(filtros) });
  return { data: filas, meta: meta(filtros, total) };
}

module.exports = { turnoActual, cerrar, listar, resumir };
