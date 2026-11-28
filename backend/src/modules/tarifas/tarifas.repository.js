// Único lugar con SQL de tarifas. Acepta una conexión opcional para la transacción. Los DECIMAL llegan
// como texto desde mysql2 y se devuelven como números.
const { pool } = require('../../config/db');

const COLUMNAS = `t.id_tarifa, t.nombre, t.tipo_vehiculo, t.tipo_cliente, t.valor_primera_hora, t.minutos_fraccion,
  t.valor_fraccion, t.tope_diario, t.minutos_gracia, t.vigente_desde, t.vigente_hasta, t.estado,
  EXISTS (SELECT 1 FROM liquidacion l WHERE l.id_tarifa = t.id_tarifa) AS usada`;

const numero = (v) => (v === null || v === undefined ? null : Number(v));

const aTarifa = (f) =>
  f && {
    idTarifa: f.id_tarifa,
    nombre: f.nombre,
    tipoVehiculo: f.tipo_vehiculo,
    tipoCliente: f.tipo_cliente,
    valorPrimeraHora: numero(f.valor_primera_hora),
    minutosFraccion: f.minutos_fraccion,
    valorFraccion: numero(f.valor_fraccion),
    topeDiario: numero(f.tope_diario),
    minutosGracia: f.minutos_gracia,
    vigenteDesde: f.vigente_desde,
    vigenteHasta: f.vigente_hasta ?? null,
    estado: f.estado,
    usada: Boolean(f.usada),
  };

/** Listado administrativo (RF-TAR-01) con filtros. */
async function listar({ tipoVehiculo, tipoCliente, estado, limit, offset }) {
  const condiciones = [];
  const valores = [];
  for (const [columna, valor] of [
    ['t.tipo_vehiculo', tipoVehiculo],
    ['t.tipo_cliente', tipoCliente],
    ['t.estado', estado],
  ]) {
    if (valor) {
      condiciones.push(`${columna} = ?`);
      valores.push(valor);
    }
  }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} FROM tarifa t ${donde}
      ORDER BY t.tipo_vehiculo, t.tipo_cliente, t.vigente_desde DESC, t.id_tarifa DESC LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM tarifa t ${donde}`, valores);
  return { filas: filas.map(aTarifa), total: Number(total) };
}

/** RF-TAR-07: activas que no terminaron (vigentes o programadas) en el instante dado. */
async function noVencidas(ahora) {
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} FROM tarifa t
      WHERE t.estado = 'activo' AND (t.vigente_hasta IS NULL OR t.vigente_hasta > ?)
      ORDER BY t.tipo_vehiculo, t.tipo_cliente, t.vigente_desde`,
    [ahora]
  );
  return filas.map(aTarifa);
}

async function obtenerPorId(id, { conexion = pool, bloquear = false } = {}) {
  if (bloquear) await conexion.query('SELECT id_tarifa FROM tarifa WHERE id_tarifa = ? FOR UPDATE', [id]);
  const [[fila]] = await conexion.query(`SELECT ${COLUMNAS} FROM tarifa t WHERE t.id_tarifa = ?`, [id]);
  return aTarifa(fila) ?? null;
}

/** Activas de una combinación; con `bloquear` toma las filas (superposición, R-03). */
async function activasDe(tipoVehiculo, tipoCliente, { conexion = pool, bloquear = false } = {}) {
  const [filas] = await conexion.query(
    `SELECT ${COLUMNAS} FROM tarifa t
      WHERE t.tipo_vehiculo = ? AND t.tipo_cliente = ? AND t.estado = 'activo'
      ORDER BY t.vigente_desde ${bloquear ? 'FOR UPDATE' : ''}`,
    [tipoVehiculo, tipoCliente]
  );
  return filas.map(aTarifa);
}

const aFila = (d) => [
  d.nombre,
  d.tipoVehiculo,
  d.tipoCliente,
  d.valorPrimeraHora,
  d.minutosFraccion,
  d.valorFraccion,
  d.topeDiario ?? null,
  d.minutosGracia,
  d.vigenteDesde,
  d.vigenteHasta ?? null,
];

async function insertar(datos, { conexion }) {
  const [r] = await conexion.query(
    `INSERT INTO tarifa (nombre, tipo_vehiculo, tipo_cliente, valor_primera_hora, minutos_fraccion, valor_fraccion,
       tope_diario, minutos_gracia, vigente_desde, vigente_hasta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    aFila(datos)
  );
  return r.insertId;
}

async function actualizar(id, datos, { conexion }) {
  await conexion.query(
    `UPDATE tarifa SET nombre = ?, tipo_vehiculo = ?, tipo_cliente = ?, valor_primera_hora = ?, minutos_fraccion = ?,
       valor_fraccion = ?, tope_diario = ?, minutos_gracia = ?, vigente_desde = ?, vigente_hasta = ? WHERE id_tarifa = ?`,
    [...aFila(datos), id]
  );
}

async function cerrarVigencia(id, hasta, { conexion }) {
  await conexion.query('UPDATE tarifa SET vigente_hasta = ? WHERE id_tarifa = ?', [hasta, id]);
}

async function cambiarEstado(id, estado, { conexion }) {
  await conexion.query('UPDATE tarifa SET estado = ? WHERE id_tarifa = ?', [estado, id]);
}

module.exports = { listar, noVencidas, obtenerPorId, activasDe, insertar, actualizar, cerrarVigencia, cambiarEstado };
