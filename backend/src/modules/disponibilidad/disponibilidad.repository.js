// SQL de la disponibilidad pública (spec 004 research R-09): una sola consulta agrupada, sin datos personales.
const { pool } = require('../../config/db');

/** Parqueaderos activos con disponibles y total (sin inhabilitadas) por tipo. */
async function porParqueadero({ idParqueadero } = {}) {
  const [filas] = await pool.query(
    `SELECT p.id_parqueadero, p.nombre, p.direccion, p.horario,
            COALESCE(SUM(c.tipo_vehiculo = 'carro' AND c.estado = 'disponible'), 0) AS carro_disponibles,
            COALESCE(SUM(c.tipo_vehiculo = 'carro' AND c.estado <> 'inhabilitada'), 0) AS carro_total,
            COALESCE(SUM(c.tipo_vehiculo = 'moto' AND c.estado = 'disponible'), 0) AS moto_disponibles,
            COALESCE(SUM(c.tipo_vehiculo = 'moto' AND c.estado <> 'inhabilitada'), 0) AS moto_total
       FROM parqueadero p
       LEFT JOIN celda c ON c.id_parqueadero = p.id_parqueadero
      WHERE p.estado = 'activo' ${idParqueadero ? 'AND p.id_parqueadero = ?' : ''}
      GROUP BY p.id_parqueadero
      ORDER BY p.nombre`,
    idParqueadero ? [idParqueadero] : []
  );
  return filas;
}

module.exports = { porParqueadero };
