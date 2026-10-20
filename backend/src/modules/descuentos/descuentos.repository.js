const { pool } = require('../../config/db');

const COLUMNAS = 'id, nombre, descripcion, porcentaje, activo, created_at, updated_at';

async function listar({ soloActivos = false } = {}) {
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} FROM descuentos ${soloActivos ? 'WHERE activo = 1' : ''} ORDER BY activo DESC, nombre`
  );
  return filas;
}

async function buscarPorId(id, conexion = pool) {
  const [filas] = await conexion.query(`SELECT ${COLUMNAS} FROM descuentos WHERE id = ?`, [id]);
  return filas[0] ?? null;
}

async function existeNombre(nombre, excluirId = 0) {
  const [filas] = await pool.query(
    'SELECT 1 FROM descuentos WHERE nombre = ? AND id <> ? LIMIT 1',
    [nombre, excluirId]
  );
  return filas.length > 0;
}

async function insertar({ nombre, descripcion, porcentaje }) {
  const [r] = await pool.query(
    'INSERT INTO descuentos (nombre, descripcion, porcentaje) VALUES (?, ?, ?)',
    [nombre, descripcion ?? null, porcentaje]
  );
  return r.insertId;
}

async function actualizar(id, { nombre, descripcion, porcentaje }) {
  await pool.query(
    'UPDATE descuentos SET nombre = ?, descripcion = ?, porcentaje = ? WHERE id = ?',
    [nombre, descripcion ?? null, porcentaje, id]
  );
}

async function actualizarActivo(id, activo) {
  await pool.query('UPDATE descuentos SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
}

module.exports = { listar, buscarPorId, existeNombre, insertar, actualizar, actualizarActivo };
