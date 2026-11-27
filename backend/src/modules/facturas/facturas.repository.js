// Único lugar con SQL de facturas y pagos (spec 009). Acepta una conexión opcional para la transacción.
// El correo del cliente solo se lee para enviar el comprobante; nunca sale en la API (RNF-PRI-02).
const { pool } = require('../../config/db');
const { escapeLike } = require('../../utils/sql');
const { aIsoBogota } = require('../../utils/fechas');

const numero = (v) => (v === null || v === undefined ? null : Number(v));

const COLUMNAS = `f.id_factura, f.numero, f.estado, f.fecha_emision, f.total, f.id_liquidacion, f.id_membresia, f.id_cliente,
  f.tercero_documento, f.tercero_nombre, f.motivo_anulacion, f.fecha_anulacion, f.cufe,
  u.nombre_completo AS cliente_nombre, u.tipo_documento AS cliente_tipo_documento, u.numero_documento AS cliente_documento,
  u.correo AS cliente_correo,
  ua.nombre_completo AS anulada_por,
  pg.id_pago, pg.metodo, pg.valor, pg.valor_recibido, pg.cambio, pg.referencia, pg.fecha AS pago_fecha, pg.id_cierre,
  pg.id_operador, uo.nombre_completo AS operador,
  m.id_movimiento, m.fecha_hora_entrada, m.fecha_hora_salida, m.minutos_estadia,
  v.placa, v.tipo AS tipo_vehiculo, c.codigo AS celda, p.nombre AS parqueadero, p.direccion AS parqueadero_direccion,
  EXISTS (SELECT 1 FROM bitacora b WHERE b.entidad = 'factura' AND b.id_registro = f.id_factura AND b.accion = 'enviar_factura') AS enviada`;

const DESDE = `FROM factura f
  LEFT JOIN usuario u ON u.id_usuario = f.id_cliente
  LEFT JOIN usuario ua ON ua.id_usuario = f.id_usuario_anulacion
  LEFT JOIN pago pg ON pg.id_factura = f.id_factura
  LEFT JOIN usuario uo ON uo.id_usuario = pg.id_operador
  LEFT JOIN liquidacion l ON l.id_liquidacion = f.id_liquidacion
  LEFT JOIN movimiento m ON m.id_movimiento = l.id_movimiento
  LEFT JOIN vehiculo v ON v.id_vehiculo = m.id_vehiculo
  LEFT JOIN celda c ON c.id_celda = m.id_celda
  LEFT JOIN parqueadero p ON p.id_parqueadero = c.id_parqueadero`;

const aFactura = (f) =>
  f && {
    idFactura: f.id_factura,
    numero: f.numero,
    estado: f.estado,
    fechaEmision: aIsoBogota(f.fecha_emision),
    total: numero(f.total),
    idLiquidacion: f.id_liquidacion,
    idMembresia: f.id_membresia,
    cliente: f.id_cliente ? { idUsuario: f.id_cliente, nombre: f.cliente_nombre, tipoDocumento: f.cliente_tipo_documento, numeroDocumento: f.cliente_documento } : null,
    tercero: f.tercero_documento ? { documento: f.tercero_documento, nombre: f.tercero_nombre } : null,
    parqueadero: f.parqueadero ? { nombre: f.parqueadero, direccion: f.parqueadero_direccion } : null,
    movimiento: f.id_movimiento
      ? {
          idMovimiento: f.id_movimiento,
          placa: f.placa,
          tipoVehiculo: f.tipo_vehiculo,
          celda: f.celda,
          entrada: aIsoBogota(f.fecha_hora_entrada),
          salida: aIsoBogota(f.fecha_hora_salida),
          minutos: f.minutos_estadia,
        }
      : null,
    pago: f.id_pago
      ? {
          idPago: f.id_pago,
          metodo: f.metodo,
          valor: numero(f.valor),
          valorRecibido: numero(f.valor_recibido),
          cambio: numero(f.cambio),
          referencia: f.referencia,
          fecha: aIsoBogota(f.pago_fecha),
          operador: f.operador,
          idCierre: f.id_cierre,
        }
      : null,
    anulacion: f.estado === 'anulada' ? { motivo: f.motivo_anulacion, usuario: f.anulada_por, fecha: aIsoBogota(f.fecha_anulacion) } : null,
    electronica: { estado: f.cufe ? 'enviada' : 'pendiente', cufe: f.cufe ?? null },
    enviada: Boolean(f.enviada),
    // Internos (no salen en la API).
    _correo: f.cliente_correo ?? null,
    _idOperador: f.id_operador ?? null,
  };

async function obtenerPorId(id, { conexion = pool, bloquear = false } = {}) {
  if (bloquear) await conexion.query('SELECT id_factura FROM factura WHERE id_factura = ? FOR UPDATE', [id]);
  const [[fila]] = await conexion.query(`SELECT ${COLUMNAS} ${DESDE} WHERE f.id_factura = ?`, [id]);
  return aFactura(fila) ?? null;
}

/** RF-FAC-15 (R-08): filtros y suma de las emitidas del filtro. */
async function listar({ q, desde, hasta, metodo, estado, idCliente, limit, offset }) {
  const condiciones = [];
  const valores = [];
  if (q) {
    const like = `%${escapeLike(q)}%`;
    condiciones.push('(f.numero LIKE ? OR v.placa LIKE ? OR u.nombre_completo LIKE ? OR u.numero_documento LIKE ? OR f.tercero_nombre LIKE ? OR f.tercero_documento LIKE ?)');
    valores.push(like, `%${escapeLike(q.toUpperCase().replace(/[\s.-]/g, ''))}%`, like, like, like, like);
  }
  if (desde) {
    condiciones.push('f.fecha_emision >= ?');
    valores.push(desde);
  }
  if (hasta) {
    condiciones.push('f.fecha_emision < ?');
    valores.push(hasta);
  }
  if (metodo) {
    condiciones.push('pg.metodo = ?');
    valores.push(metodo);
  }
  if (estado) {
    condiciones.push('f.estado = ?');
    valores.push(estado);
  }
  if (idCliente) {
    condiciones.push('f.id_cliente = ?');
    valores.push(idCliente);
  }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(`SELECT ${COLUMNAS} ${DESDE} ${donde} ORDER BY f.fecha_emision DESC, f.id_factura DESC LIMIT ? OFFSET ?`, [
    ...valores,
    limit,
    offset,
  ]);
  const [[totales]] = await pool.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN f.estado = 'emitida' THEN f.total ELSE 0 END), 0) AS suma ${DESDE} ${donde}`,
    valores
  );
  return { filas: filas.map(aFactura), total: Number(totales.total), sumaTotal: Number(totales.suma) };
}

async function insertarFactura({ numero: num, idLiquidacion, idCliente, tercero, total, fecha }, { conexion }) {
  const [r] = await conexion.query(
    `INSERT INTO factura (numero, id_liquidacion, id_cliente, tercero_documento, tercero_nombre, total, fecha_emision)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [num, idLiquidacion, idCliente ?? null, tercero?.documento ?? null, tercero?.nombre ?? null, total, fecha]
  );
  return r.insertId;
}

async function insertarPago({ idFactura, metodo, valor, valorRecibido, cambio, referencia, idOperador, fecha }, { conexion }) {
  const [r] = await conexion.query(
    `INSERT INTO pago (id_factura, metodo, valor, valor_recibido, cambio, referencia, id_operador, fecha)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [idFactura, metodo, valor, valorRecibido ?? null, cambio ?? null, referencia ?? null, idOperador, fecha]
  );
  return r.insertId;
}

async function guardarTercero(id, tercero, { conexion }) {
  await conexion.query('UPDATE factura SET tercero_documento = ?, tercero_nombre = ? WHERE id_factura = ?', [tercero.documento, tercero.nombre, id]);
}

async function anular(id, { motivo, idUsuario, fecha }, { conexion }) {
  await conexion.query(
    "UPDATE factura SET estado = 'anulada', motivo_anulacion = ?, id_usuario_anulacion = ?, fecha_anulacion = ? WHERE id_factura = ?",
    [motivo, idUsuario, fecha, id]
  );
}

module.exports = { obtenerPorId, listar, insertarFactura, insertarPago, guardarTercero, anular };
