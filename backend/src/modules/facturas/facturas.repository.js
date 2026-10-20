// Acceso a datos de facturas (REQ-FAC-1, REQ-FAC-2) y del consecutivo.
const { pool } = require('../../config/db');

const escaparLike = (texto) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);
const NOMBRE = (a) =>
  `CONCAT_WS(' ', ${a}.primer_nombre, ${a}.segundo_nombre, ${a}.primer_apellido, ${a}.segundo_apellido)`;

/**
 * Siguiente número FAC-000001. Bloquea la fila del consecutivo hasta el commit:
 * dos pagos simultáneos esperan su turno y nunca repiten número; si la
 * transacción falla, el número no se consume (sin huecos).
 */
async function siguienteNumero(conexion) {
  const [[fila]] = await conexion.query(
    "SELECT ultimo FROM consecutivos WHERE nombre = 'factura' FOR UPDATE"
  );
  const siguiente = (fila?.ultimo ?? 0) + 1;
  if (fila)
    await conexion.query("UPDATE consecutivos SET ultimo = ? WHERE nombre = 'factura'", [
      siguiente,
    ]);
  else
    await conexion.query("INSERT INTO consecutivos (nombre, ultimo) VALUES ('factura', ?)", [
      siguiente,
    ]);
  return `FAC-${String(siguiente).padStart(6, '0')}`;
}

async function insertar(f, conexion) {
  const [r] = await conexion.query(
    `INSERT INTO facturas
       (numero, concepto, estadia_id, membresia_id, cliente_id, subtotal, descuento_id, porcentaje_descuento,
        valor_descuento, total, metodo_pago, observacion, tarifa_id, detalle_calculo, fecha_pago, registrada_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      f.numero,
      f.concepto,
      f.estadia_id ?? null,
      f.membresia_id ?? null,
      f.cliente_id ?? null,
      f.subtotal,
      f.descuento_id ?? null,
      f.porcentaje_descuento ?? 0,
      f.valor_descuento ?? 0,
      f.total,
      f.metodo_pago,
      f.observacion ?? null,
      f.tarifa_id ?? null,
      f.detalle_calculo ? JSON.stringify(f.detalle_calculo) : null,
      f.fecha_pago,
      f.registrada_por,
    ]
  );
  return r.insertId;
}

const SELECT_DETALLE = `
  SELECT f.id, f.numero, f.concepto, f.estadia_id, f.membresia_id, f.cliente_id, f.subtotal, f.descuento_id,
         f.porcentaje_descuento, f.valor_descuento, f.total, f.metodo_pago, f.observacion, f.tarifa_id,
         f.detalle_calculo, f.fecha_pago,
         ${NOMBRE('uc')} AS cliente_nombre, uc.tipo_documento AS cliente_tipo_documento,
         uc.numero_documento AS cliente_numero_documento,
         d.nombre AS descuento_nombre,
         ${NOMBRE('ur')} AS registrada_por,
         e.codigo_ticket, e.fecha_hora_entrada, e.fecha_hora_salida, e.minutos_estadia, e.tipo_cliente,
         c.codigo AS celda_codigo,
         COALESCE(ve.placa, vm.placa) AS placa, COALESCE(ve.tipo, vm.tipo) AS tipo_vehiculo,
         m.tipo AS membresia_tipo, m.fecha_inicio AS membresia_inicio, m.fecha_fin AS membresia_fin
    FROM facturas f
    LEFT JOIN usuarios uc ON uc.id = f.cliente_id
    LEFT JOIN descuentos d ON d.id = f.descuento_id
    JOIN usuarios ur ON ur.id = f.registrada_por
    LEFT JOIN estadias e ON e.id = f.estadia_id
    LEFT JOIN celdas c ON c.id = e.celda_id
    LEFT JOIN vehiculos ve ON ve.id = e.vehiculo_id
    LEFT JOIN membresias m ON m.id = f.membresia_id
    LEFT JOIN vehiculos vm ON vm.id = m.vehiculo_id`;

function filtros({ desde, hasta, metodo_pago, concepto, placa, cliente_id }) {
  const condiciones = [];
  const valores = [];
  const agregar = (sql, ...v) => {
    condiciones.push(sql);
    valores.push(...v);
  };
  if (desde) agregar('f.fecha_pago >= ?', `${desde} 00:00:00`);
  if (hasta) agregar('f.fecha_pago <= ?', `${hasta} 23:59:59`);
  if (metodo_pago) agregar('f.metodo_pago = ?', metodo_pago);
  if (concepto) agregar('f.concepto = ?', concepto);
  if (placa) agregar('COALESCE(ve.placa, vm.placa) LIKE ?', `%${escaparLike(placa)}%`);
  if (cliente_id) agregar('f.cliente_id = ?', cliente_id);
  return { where: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '', valores };
}

async function listar(filtrosConsulta, { limit, offset }) {
  const { where, valores } = filtros(filtrosConsulta);
  const [filas] = await pool.query(
    `${SELECT_DETALLE} ${where} ORDER BY f.fecha_pago DESC, f.id DESC LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[totales]] = await pool.query(
    `SELECT COUNT(*) AS cantidad, COALESCE(SUM(f.total), 0) AS suma
       FROM facturas f
       LEFT JOIN estadias e ON e.id = f.estadia_id
       LEFT JOIN vehiculos ve ON ve.id = e.vehiculo_id
       LEFT JOIN membresias m ON m.id = f.membresia_id
       LEFT JOIN vehiculos vm ON vm.id = m.vehiculo_id
       ${where}`,
    valores
  );
  return { filas, total: totales.cantidad, suma: Number(totales.suma) };
}

async function buscarDetalle(id) {
  const [filas] = await pool.query(`${SELECT_DETALLE} WHERE f.id = ?`, [id]);
  return filas[0] ?? null;
}

/** Indicadores del día (hora de Bogotá). */
async function resumenDia(fecha) {
  const [[r]] = await pool.query(
    `SELECT COALESCE(SUM(total), 0) AS recaudo,
            SUM(concepto = 'estadia') AS salidas_cobradas,
            COUNT(*) AS facturas
       FROM facturas WHERE fecha_pago BETWEEN ? AND ?`,
    [`${fecha} 00:00:00`, `${fecha} 23:59:59`]
  );
  const [[p]] = await pool.query(
    `SELECT AVG(minutos_estadia) AS promedio, COUNT(*) AS visitas
       FROM estadias
      WHERE estado = 'finalizada' AND tipo_cliente = 'visitante' AND fecha_hora_salida BETWEEN ? AND ?`,
    [`${fecha} 00:00:00`, `${fecha} 23:59:59`]
  );
  return {
    recaudo: Number(r.recaudo),
    salidas_cobradas: Number(r.salidas_cobradas ?? 0),
    facturas: Number(r.facturas),
    permanencia_promedio_min: p.promedio === null ? null : Math.round(Number(p.promedio)),
    visitas_finalizadas: Number(p.visitas),
  };
}

module.exports = { siguienteNumero, insertar, listar, buscarDetalle, resumenDia };
