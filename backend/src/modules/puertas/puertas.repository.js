const { pool } = require('../../config/db');

const COLUMNAS = 'id, parqueadero_id, nombre, tipo, activa, created_at, updated_at';

async function listar({ incluirInactivas }) {
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} FROM puertas ${incluirInactivas ? '' : 'WHERE activa = 1'} ORDER BY id`
  );
  return filas;
}

async function buscarPorId(id) {
  const [filas] = await pool.query(`SELECT ${COLUMNAS} FROM puertas WHERE id = ?`, [id]);
  return filas[0] ?? null;
}

async function existeNombre(parqueaderoId, nombre, excluirId = 0) {
  const [filas] = await pool.query(
    'SELECT 1 FROM puertas WHERE parqueadero_id = ? AND nombre = ? AND id <> ? LIMIT 1',
    [parqueaderoId, nombre, excluirId]
  );
  return filas.length > 0;
}

async function parqueaderoPrincipalId() {
  const [filas] = await pool.query(
    'SELECT id FROM parqueaderos WHERE activo = 1 ORDER BY id LIMIT 1'
  );
  return filas[0]?.id ?? null;
}

async function contarActivas() {
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM puertas WHERE activa = 1');
  return total;
}

async function insertar({ parqueadero_id, nombre, tipo }) {
  const [r] = await pool.query(
    'INSERT INTO puertas (parqueadero_id, nombre, tipo) VALUES (?, ?, ?)',
    [parqueadero_id, nombre, tipo]
  );
  return r.insertId;
}

async function actualizar(id, { nombre, tipo }) {
  await pool.query('UPDATE puertas SET nombre = ?, tipo = ? WHERE id = ?', [nombre, tipo, id]);
}

async function actualizarActiva(id, activa) {
  await pool.query('UPDATE puertas SET activa = ? WHERE id = ?', [activa ? 1 : 0, id]);
}

module.exports = {
  listar,
  buscarPorId,
  existeNombre,
  parqueaderoPrincipalId,
  contarActivas,
  insertar,
  actualizar,
  actualizarActiva,
};
