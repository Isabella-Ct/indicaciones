const { pool } = require('../../config/db');

async function listar() {
  const [filas] = await pool.query(
    `SELECT p.id, p.parqueadero_id, p.nombre, p.orden, p.texto_carril,
            SUM(c.activa = 1) AS total_celdas,
            SUM(c.activa = 1 AND c.tipo = 'carro') AS celdas_carro,
            SUM(c.activa = 1 AND c.tipo = 'moto') AS celdas_moto
       FROM pisos p
       LEFT JOIN celdas c ON c.piso_id = p.id
      GROUP BY p.id
      ORDER BY p.orden`
  );
  return filas;
}

module.exports = { listar };
