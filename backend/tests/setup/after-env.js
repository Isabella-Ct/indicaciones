// Cierra el pool de MySQL al terminar cada archivo de prueba.
afterAll(async () => {
  const { pool } = require('../../src/config/db');
  await pool.end();
});
