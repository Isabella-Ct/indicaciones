// Facturas — REQ-FAC-1 (pago simulado) y REQ-FAC-2 (factura con consecutivo y PDF).
// Documento interno, no es facturación electrónica DIAN.
const { errores } = require('../../utils/errores');
const { aLimites, meta } = require('../../utils/paginacion');
const { enBogota, formatearDuracion } = require('../../utils/fechas');
const repo = require('./facturas.repository');

function aPublico(f) {
  let detalle = f.detalle_calculo;
  if (typeof detalle === 'string') detalle = JSON.parse(detalle);
  return {
    id: f.id,
    numero: f.numero,
    concepto: f.concepto,
    fecha_pago: f.fecha_pago,
    metodo_pago: f.metodo_pago,
    subtotal: Number(f.subtotal),
    descuento: f.descuento_id
      ? {
          id: f.descuento_id,
          nombre: f.descuento_nombre,
          porcentaje: Number(f.porcentaje_descuento),
        }
      : null,
    valor_descuento: Number(f.valor_descuento),
    total: Number(f.total),
    observacion: f.observacion,
    cliente: f.cliente_id
      ? {
          id: f.cliente_id,
          nombre_completo: f.cliente_nombre,
          tipo_documento: f.cliente_tipo_documento,
          numero_documento: f.cliente_numero_documento,
        }
      : null,
    placa: f.placa,
    tipo_vehiculo: f.tipo_vehiculo,
    estadia: f.estadia_id
      ? {
          id: f.estadia_id,
          codigo_ticket: f.codigo_ticket,
          celda: f.celda_codigo,
          fecha_hora_entrada: f.fecha_hora_entrada,
          fecha_hora_salida: f.fecha_hora_salida,
          minutos: f.minutos_estadia,
          tiempo: formatearDuracion(f.minutos_estadia ?? 0),
          tipo_cliente: f.tipo_cliente,
        }
      : null,
    membresia: f.membresia_id
      ? {
          id: f.membresia_id,
          tipo: f.membresia_tipo,
          fecha_inicio: f.membresia_inicio,
          fecha_fin: f.membresia_fin,
        }
      : null,
    tarifa_id: f.tarifa_id,
    detalle_calculo: detalle ?? null,
    registrada_por: f.registrada_por,
  };
}

const esAdmin = (u) => u.permisos.includes('reportes.ver');

/** Admin: todas con filtros. Operador: solo las del día. */
async function listar(filtros, solicitante) {
  const consulta = { ...filtros };
  if (!esAdmin(solicitante)) {
    const hoy = enBogota().fecha;
    consulta.desde = hoy;
    consulta.hasta = hoy;
  }
  const { filas, total, suma } = await repo.listar(consulta, aLimites(consulta));
  return {
    data: filas.map(aPublico),
    meta: {
      ...meta(consulta, total),
      suma_total: suma,
      desde: consulta.desde ?? null,
      hasta: consulta.hasta ?? null,
    },
  };
}

async function listarDeCliente(clienteId, filtros) {
  const { filas, total, suma } = await repo.listar(
    { ...filtros, cliente_id: clienteId },
    aLimites(filtros)
  );
  return { data: filas.map(aPublico), meta: { ...meta(filtros, total), suma_total: suma } };
}

/**
 * Detalle con control de acceso: el personal (facturas.ver) ve cualquiera;
 * el cliente solo las suyas (403 para las ajenas).
 */
async function obtener(id, solicitante) {
  const f = await repo.buscarDetalle(id);
  if (!f) throw errores.noEncontrado('La factura no existe.');
  const esPersonal = solicitante.permisos.includes('facturas.ver');
  if (!esPersonal && f.cliente_id !== solicitante.id) {
    throw errores.prohibido('Solo puedes consultar tus propias facturas.');
  }
  return aPublico(f);
}

async function resumenHoy() {
  const { fecha } = enBogota();
  return { fecha, ...(await repo.resumenDia(fecha)) };
}

module.exports = { listar, listarDeCliente, obtener, resumenHoy, aPublico };
