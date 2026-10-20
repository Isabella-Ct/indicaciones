/**
 * npm run db:reset — BORRA y recrea la base de datos: vuelve a generar seed.sql (el historial
 * depende del día de la semana y de la hora actuales) y ejecuta schema.sql y seed.sql.
 * Usa las credenciales de backend/.env. El nombre de la BD sale de DB_NAME.
 */
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');
const { generarSeed } = require('./generar-seed');

const NOMBRE_EN_SCRIPTS = 'parking_lot_abc';

function leer(archivo) {
  const contenido = fs.readFileSync(path.join(__dirname, archivo), 'utf8');
  // DB_NAME ya está validado (solo [A-Za-z0-9_]) en config/env.js.
  return contenido.replaceAll(NOMBRE_EN_SCRIPTS, env.DB_NAME);
}

async function main() {
  if (env.NODE_ENV === 'production') {
    throw new Error('db:reset está deshabilitado con NODE_ENV=production.');
  }
  await generarSeed();
  const conexion = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true,
    charset: 'utf8mb4',
  });
  try {
    console.log(`Recreando la base de datos "${env.DB_NAME}"…`);
    await conexion.query(leer('schema.sql'));
    console.log('schema.sql ✔');
    await conexion.query(leer('seed.sql'));
    console.log('seed.sql ✔');

    const [[conteo]] = await conexion.query(
      `SELECT (SELECT COUNT(*) FROM usuarios) AS usuarios,
              (SELECT COUNT(*) FROM celdas) AS celdas,
              (SELECT COUNT(*) FROM vehiculos) AS vehiculos,
              (SELECT COUNT(*) FROM estadias WHERE estado = 'en_curso') AS en_curso,
              (SELECT COUNT(*) FROM estadias WHERE estado = 'finalizada') AS finalizadas,
              (SELECT COUNT(*) FROM facturas) AS facturas,
              (SELECT COUNT(*) FROM accesos_denegados) AS denegados`
    );
    console.log('Datos cargados:', conteo);
  } finally {
    await conexion.end();
  }
}

main().catch((err) => {
  console.error('Error en db:reset:', err.message);
  process.exit(1);
});
