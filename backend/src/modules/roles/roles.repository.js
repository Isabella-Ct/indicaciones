const { pool } = require('../../config/db');

async function listar() {
  const [filas] = await pool.query('SELECT id, nombre, descripcion FROM roles ORDER BY id');
  return filas;
}

module.exports = { listar };
