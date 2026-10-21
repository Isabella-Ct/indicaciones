const { pool } = require('../../config/db');
const { nombreCompleto } = require('../../utils/sql');

const SELECT = `SELECT c.clave, c.valor, c.tipo, c.descripcion, c.updated_at,
                       c.actualizado_por, ${nombreCompleto('u')} AS actualizado_por_nombre
                  FROM configuracion c LEFT JOIN usuarios u ON u.id = c.actualizado_por`;

async function listar() {
  const [filas] = await pool.query(`${SELECT} ORDER BY c.clave`);
  return filas;
}

async function buscar(clave) {
  const [filas] = await pool.query(`${SELECT} WHERE c.clave = ?`, [clave]);
  return filas[0] ?? null;
}

async function actualizar(clave, valor, usuarioId) {
  await pool.query('UPDATE configuracion SET valor = ?, actualizado_por = ? WHERE clave = ?', [
    valor,
    usuarioId,
    clave,
  ]);
}

module.exports = { listar, buscar, actualizar };
