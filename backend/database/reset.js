/**
 * npm run db:reset — BORRA y recrea la base de datos DB_NAME con schema.sql + seed.sql.
 * Bloqueado con NODE_ENV=production. Para regenerar los hashes: npm run db:seed:generar.
 */
const env = require('../src/config/env');
const { recrearBaseDatos } = require('./cargar');

async function main() {
  if (env.NODE_ENV === 'production') {
    throw new Error('db:reset está deshabilitado con NODE_ENV=production.');
  }
  console.log(`Recreando la base de datos "${env.DB_NAME}"…`);
  const conteo = await recrearBaseDatos({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    nombreBd: env.DB_NAME,
  });
  console.log('schema.sql + seed.sql ✔', conteo);
}

main().catch((err) => {
  console.error('Error en db:reset:', err.message);
  process.exit(1);
});
