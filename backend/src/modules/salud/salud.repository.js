const { pool } = require('../../config/db');

async function ping() {
  const [filas] = await pool.query('SELECT 1 AS ok');
  return filas[0]?.ok === 1;
}

module.exports = { ping };
