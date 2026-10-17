const { pool } = require('../../config/db');

async function obtenerPrincipal() {
  const [filas] = await pool.query(
    `SELECT id, nombre, direccion, ciudad, telefono, horario
       FROM parqueaderos
      WHERE activo = 1
      ORDER BY id
      LIMIT 1`
  );
  return filas[0] ?? null;
}

async function listarPuertasActivas(parqueaderoId) {
  const [filas] = await pool.execute(
    'SELECT id, nombre, tipo FROM puertas WHERE parqueadero_id = ? AND activa = 1 ORDER BY id',
    [parqueaderoId]
  );
  return filas;
}

module.exports = { obtenerPrincipal, listarPuertasActivas };
