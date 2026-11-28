// Único lugar con SQL de parqueaderos y puertas. Acepta una conexión opcional para la transacción.
const { pool } = require('../../config/db');
const { escapeLike } = require('../../utils/sql');
const { aIsoBogota } = require('../../utils/fechas');

const MOTIVO_PARQUEADERO_INACTIVO = 'Parqueadero inactivo';

const COLUMNAS = `p.id_parqueadero, p.nombre, p.direccion, p.pisos, p.horario, p.estado, p.created_at, p.updated_at,
  COALESCE(SUM(c.tipo_vehiculo = 'carro'), 0) AS celdas_carro,
  COALESCE(SUM(c.tipo_vehiculo = 'moto'), 0) AS celdas_moto,
  COUNT(c.id_celda) AS celdas_total`;

const aParqueadero = (f) => ({
  idParqueadero: f.id_parqueadero,
  nombre: f.nombre,
  direccion: f.direccion,
  pisos: f.pisos,
  horario: f.horario,
  estado: f.estado,
  celdas: { carro: Number(f.celdas_carro), moto: Number(f.celdas_moto), total: Number(f.celdas_total) },
  createdAt: aIsoBogota(f.created_at),
  updatedAt: aIsoBogota(f.updated_at),
});

const aPuerta = (f) => ({
  idPuerta: f.id_puerta,
  idParqueadero: f.id_parqueadero,
  nombre: f.nombre,
  tipo: f.tipo,
  estado: f.estado,
});

/** RF-CLD-02: página de parqueaderos con el total de celdas por tipo, en una sola consulta. */
async function listar({ q, estado, limit, offset }) {
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
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} FROM parqueadero p LEFT JOIN celda c ON c.id_parqueadero = p.id_parqueadero
      ${donde} GROUP BY p.id_parqueadero ORDER BY p.nombre LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM parqueadero p ${donde}`, valores);
  return { parqueaderos: filas.map(aParqueadero), total: Number(total) };
}

async function obtenerPorId(id, { conexion = pool, bloquear = false } = {}) {
  if (bloquear) await conexion.query('SELECT id_parqueadero FROM parqueadero WHERE id_parqueadero = ? FOR UPDATE', [id]);
  const [filas] = await conexion.query(
    `SELECT ${COLUMNAS} FROM parqueadero p LEFT JOIN celda c ON c.id_parqueadero = p.id_parqueadero
      WHERE p.id_parqueadero = ? GROUP BY p.id_parqueadero`,
    [id]
  );
  return filas[0] ? aParqueadero(filas[0]) : null;
}

/** RF-CLD-03: resumen de celdas por piso y tipo. */
async function resumenCeldas(id) {
  const [filas] = await pool.query(
    `SELECT piso, tipo_vehiculo, COUNT(*) AS total,
            SUM(estado = 'disponible') AS disponibles, SUM(estado = 'ocupada') AS ocupadas,
            SUM(estado = 'reservada') AS reservadas, SUM(estado = 'inhabilitada') AS inhabilitadas
       FROM celda WHERE id_parqueadero = ? GROUP BY piso, tipo_vehiculo ORDER BY piso, tipo_vehiculo`,
    [id]
  );
  return filas.map((f) => ({
    piso: f.piso,
    tipoVehiculo: f.tipo_vehiculo,
    total: Number(f.total),
    disponibles: Number(f.disponibles),
    ocupadas: Number(f.ocupadas),
    reservadas: Number(f.reservadas),
    inhabilitadas: Number(f.inhabilitadas),
  }));
}

async function insertar({ nombre, direccion, pisos, horario }, { conexion }) {
  const [r] = await conexion.query(
    "INSERT INTO parqueadero (nombre, direccion, pisos, horario, estado) VALUES (?, ?, ?, ?, 'activo')",
    [nombre, direccion, pisos, horario]
  );
  return r.insertId;
}

async function actualizar(id, { nombre, direccion, pisos, horario }, { conexion }) {
  await conexion.query('UPDATE parqueadero SET nombre = ?, direccion = ?, pisos = ?, horario = ? WHERE id_parqueadero = ?', [
    nombre,
    direccion,
    pisos,
    horario,
    id,
  ]);
}

/** RF-CLD-06: piso más alto con celdas (0 si no hay). */
async function pisoMaximoConCeldas(id, { conexion }) {
  const [[{ maximo }]] = await conexion.query('SELECT COALESCE(MAX(piso), 0) AS maximo FROM celda WHERE id_parqueadero = ?', [id]);
  return Number(maximo);
}

/** RN-10: vehículos dentro = celdas ocupadas del parqueadero. */
async function contarOcupadas(id, { conexion }) {
  const [[{ n }]] = await conexion.query(
    "SELECT COUNT(*) AS n FROM celda WHERE id_parqueadero = ? AND estado = 'ocupada' FOR UPDATE",
    [id]
  );
  return Number(n);
}

/** RF-CLD-05 (research R-03): cambia el estado y saca o devuelve a servicio sus celdas. */
async function cambiarEstado(id, estado, { conexion }) {
  await conexion.query('UPDATE parqueadero SET estado = ? WHERE id_parqueadero = ?', [estado, id]);
  if (estado === 'inactivo') {
    await conexion.query(
      "UPDATE celda SET estado = 'inhabilitada', motivo_inhabilitacion = ? WHERE id_parqueadero = ? AND estado = 'disponible'",
      [MOTIVO_PARQUEADERO_INACTIVO, id]
    );
  } else {
    await conexion.query(
      "UPDATE celda SET estado = 'disponible', motivo_inhabilitacion = NULL WHERE id_parqueadero = ? AND estado = 'inhabilitada' AND motivo_inhabilitacion = ?",
      [id, MOTIVO_PARQUEADERO_INACTIVO]
    );
  }
}

// ---------------------------------------------------------------- puertas (RF-CLD-07, RF-CLD-08)
async function listarPuertas(idParqueadero, { uso, estado }) {
  const condiciones = ['id_parqueadero = ?'];
  const valores = [idParqueadero];
  if (uso) {
    // RF-CLD-08: solo puertas activas del tipo del movimiento o mixtas.
    condiciones.push("estado = 'activo' AND tipo IN (?, 'mixta')");
    valores.push(uso);
  } else if (estado) {
    condiciones.push('estado = ?');
    valores.push(estado);
  }
  const [filas] = await pool.query(
    `SELECT id_puerta, id_parqueadero, nombre, tipo, estado FROM puerta_acceso
      WHERE ${condiciones.join(' AND ')} ORDER BY nombre`,
    valores
  );
  return filas.map(aPuerta);
}

async function obtenerPuerta(id, { conexion = pool, bloquear = false } = {}) {
  const [filas] = await conexion.query(
    `SELECT id_puerta, id_parqueadero, nombre, tipo, estado FROM puerta_acceso WHERE id_puerta = ? ${bloquear ? 'FOR UPDATE' : ''}`,
    [id]
  );
  return filas[0] ? aPuerta(filas[0]) : null;
}

async function insertarPuerta(idParqueadero, { nombre, tipo }, { conexion }) {
  const [r] = await conexion.query(
    "INSERT INTO puerta_acceso (id_parqueadero, nombre, tipo, estado) VALUES (?, ?, ?, 'activo')",
    [idParqueadero, nombre, tipo]
  );
  return r.insertId;
}

async function actualizarPuerta(id, { nombre, tipo, estado }, { conexion }) {
  await conexion.query('UPDATE puerta_acceso SET nombre = ?, tipo = ?, estado = ? WHERE id_puerta = ?', [nombre, tipo, estado, id]);
}

module.exports = {
  MOTIVO_PARQUEADERO_INACTIVO,
  listar,
  obtenerPorId,
  resumenCeldas,
  insertar,
  actualizar,
  pisoMaximoConCeldas,
  contarOcupadas,
  cambiarEstado,
  listarPuertas,
  obtenerPuerta,
  insertarPuerta,
  actualizarPuerta,
};
