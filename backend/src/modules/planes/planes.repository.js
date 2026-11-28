// Único lugar con SQL de los planes de membresía (spec 010). Acepta una conexión opcional para la transacción.
const { pool } = require('../../config/db');
const { escapeLike } = require('../../utils/sql');

const COLUMNAS = `p.id_plan, p.nombre, p.tipo_vehiculo, p.valor_mensual, p.dias_vigencia, p.beneficios, p.estado,
  (SELECT COUNT(*) FROM membresia m WHERE m.id_plan = p.id_plan AND m.estado = 'activa') AS activas`;

const aPlan = (f) =>
  f && {
    idPlan: f.id_plan,
    nombre: f.nombre,
    tipoVehiculo: f.tipo_vehiculo,
    valorMensual: Number(f.valor_mensual),
    diasVigencia: f.dias_vigencia,
    beneficios: f.beneficios,
    estado: f.estado,
    membresiasActivas: Number(f.activas),
  };

async function listar({ q, estado, tipoVehiculo, limit, offset }) {
  const condiciones = [];
  const valores = [];
  if (q) {
    condiciones.push('p.nombre LIKE ?');
    valores.push(`%${escapeLike(q)}%`);
  }
  if (estado) {
    condiciones.push('p.estado = ?');
    valores.push(estado);
  }
  if (tipoVehiculo) {
    condiciones.push('p.tipo_vehiculo = ?');
    valores.push(tipoVehiculo);
  }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} FROM plan_membresia p ${donde} ORDER BY p.estado, p.tipo_vehiculo, p.valor_mensual, p.id_plan LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM plan_membresia p ${donde}`, valores);
  return { filas: filas.map(aPlan), total: Number(total) };
}

/** Planes activos (para el Cliente sin membresía vigente, RF-MEM-10). */
async function activos({ tipoVehiculo } = {}) {
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} FROM plan_membresia p WHERE p.estado = 'activo' ${tipoVehiculo ? 'AND p.tipo_vehiculo = ?' : ''} ORDER BY p.tipo_vehiculo, p.valor_mensual`,
    tipoVehiculo ? [tipoVehiculo] : []
  );
  return filas.map(aPlan);
}

async function obtenerPorId(id, { conexion = pool, bloquear = false } = {}) {
  const [[fila]] = await conexion.query(`SELECT ${COLUMNAS} FROM plan_membresia p WHERE p.id_plan = ? ${bloquear ? 'FOR UPDATE' : ''}`, [id]);
  return aPlan(fila) ?? null;
}

async function insertar(d, { conexion }) {
  const [r] = await conexion.query(
    'INSERT INTO plan_membresia (nombre, tipo_vehiculo, valor_mensual, dias_vigencia, beneficios) VALUES (?, ?, ?, ?, ?)',
    [d.nombre, d.tipoVehiculo, d.valorMensual, d.diasVigencia, d.beneficios]
  );
  return r.insertId;
}

async function actualizar(id, d, { conexion }) {
  await conexion.query(
    'UPDATE plan_membresia SET nombre = ?, tipo_vehiculo = ?, valor_mensual = ?, dias_vigencia = ?, beneficios = ? WHERE id_plan = ?',
    [d.nombre, d.tipoVehiculo, d.valorMensual, d.diasVigencia, d.beneficios, id]
  );
}

async function cambiarEstado(id, estado, { conexion }) {
  await conexion.query('UPDATE plan_membresia SET estado = ? WHERE id_plan = ?', [estado, id]);
}

module.exports = { listar, activos, obtenerPorId, insertar, actualizar, cambiarEstado };
