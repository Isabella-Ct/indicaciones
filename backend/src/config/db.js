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
 * `conexion.alConfirmar(cb)` registra efectos que solo deben ocurrir si hubo commit
 * (p. ej. avisos en tiempo real); se ejecutan después del commit y nunca tras un rollback.
 * @template T
 * @param {(conexion: import('mysql2/promise').PoolConnection) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function enTransaccion(fn) {
  const conexion = await pool.getConnection();
  const pendientes = [];
  conexion.alConfirmar = (cb) => pendientes.push(cb);
  try {
    await conexion.beginTransaction();
    const resultado = await fn(conexion);
    await conexion.commit();
    for (const cb of pendientes) cb();
    return resultado;
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    delete conexion.alConfirmar;
    conexion.release();
  }
}

/** Ejecuta `cb` tras el commit si `conexion` es transaccional; si no, de inmediato. */
function despuesDeConfirmar(conexion, cb) {
  if (conexion?.alConfirmar) conexion.alConfirmar(cb);
  else cb();
}

module.exports = { pool, enTransaccion, despuesDeConfirmar };
