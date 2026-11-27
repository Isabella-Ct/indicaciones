// Recrea la base de pruebas (DB_NAME de .env.test, debe terminar en _test) con schema + seed.
module.exports = async () => {
  process.env.NODE_ENV = 'test';
  const env = require('../../src/config/env');
  const { recrearBaseDatos } = require('../../database/cargar');
  await recrearBaseDatos({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    nombreBd: env.DB_NAME,
  });
};
