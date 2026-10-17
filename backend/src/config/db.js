// Pool de conexiones MySQL (mysql2/promise). Todas las consultas son parametrizadas.
const mysql = require('mysql2/promise');
const env = require('./env');
const { ZONA_HORARIA_MYSQL } = require('./constantes');

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  timezone: ZONA_HORARIA_MYSQL,
  dateStrings: false,
  decimalNumbers: true,
});

// Cada conexión nueva trabaja en hora de Bogotá (NOW(), CURDATE()).
pool.on('connection', (conexion) => {
  conexion.query(`SET time_zone = '${ZONA_HORARIA_MYSQL}'`);
});

/**
 * Ejecuta `fn(conexion)` dentro de una transacción; hace commit o rollback.
 * @template T
 * @param {(conexion: import('mysql2/promise').PoolConnection) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function enTransaccion(fn) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await fn(conexion);
    await conexion.commit();
    return resultado;
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}

module.exports = { pool, enTransaccion };
