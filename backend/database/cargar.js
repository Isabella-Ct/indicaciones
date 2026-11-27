/**
 * Recrea una base de datos con schema.sql + seed.sql. La usan `npm run db:reset` y el
 * globalSetup de Jest. El nombre `parqueaderodb` de los scripts se reemplaza por `nombreBd`.
 */
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const NOMBRE_EN_SCRIPTS = 'parqueaderodb';

function leer(archivo, nombreBd) {
  const contenido = fs.readFileSync(path.join(__dirname, archivo), 'utf8');
  return contenido.replaceAll(NOMBRE_EN_SCRIPTS, nombreBd);
}

/**
 * @param {{ host: string, port: number, user: string, password: string, nombreBd: string }} opciones
 * @returns {Promise<{ roles: number, permisos: number, usuarios: number }>}
 */
async function recrearBaseDatos({ host, port, user, password, nombreBd }) {
  if (!/^[A-Za-z0-9_]+$/.test(nombreBd)) throw new Error(`Nombre de base de datos inválido: ${nombreBd}`);
  const conexion = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
    charset: 'utf8mb4',
    timezone: '-05:00',
  });
  try {
    await conexion.query(leer('schema.sql', nombreBd));
    await conexion.query(leer('seed.sql', nombreBd));
    const [[conteo]] = await conexion.query(
      `SELECT (SELECT COUNT(*) FROM \`${nombreBd}\`.rol) AS roles,
              (SELECT COUNT(*) FROM \`${nombreBd}\`.permiso) AS permisos,
              (SELECT COUNT(*) FROM \`${nombreBd}\`.usuario) AS usuarios`
    );
    return conteo;
  } finally {
    await conexion.end();
  }
}

module.exports = { recrearBaseDatos };
