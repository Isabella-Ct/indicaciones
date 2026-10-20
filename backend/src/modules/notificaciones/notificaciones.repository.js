const { pool } = require('../../config/db');

/** Ids de usuarios activos según el destino: lista de ids, un rol o todos. */
async function idsDestinatarios({ usuarios, rol, todos }, conexion = pool) {
  if (usuarios) {
    if (usuarios.length === 0) return [];
    const [filas] = await conexion.query(
      "SELECT id FROM usuarios WHERE id IN (?) AND estado = 'activo'",
      [usuarios]
    );
    return filas.map((f) => f.id);
  }
  const [filas] = await conexion.query(
    `SELECT u.id
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
      WHERE u.estado = 'activo' ${todos ? '' : 'AND r.nombre = ?'}
      ORDER BY u.id`,
    todos ? [] : [rol]
  );
  return filas.map((f) => f.id);
}

/**
 * Inserta una notificación por destinatario.
 * @param {Array<{ usuario_id: number, titulo: string, mensaje: string, tipo: string, enlace?: string|null, enviada_por?: number|null }>} notificaciones
 */
async function insertarVarias(notificaciones, conexion = pool) {
  if (notificaciones.length === 0) return;
  const valores = notificaciones.map((n) => [
    n.usuario_id,
    n.titulo,
    n.mensaje,
    n.tipo,
    n.enlace ?? null,
    n.enviada_por ?? null,
  ]);
  await conexion.query(
    'INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, enlace, enviada_por) VALUES ?',
    [valores]
  );
}

const COLUMNAS = `n.id, n.usuario_id, n.titulo, n.mensaje, n.tipo, n.enlace, n.leida, n.leida_at,
  n.created_at, n.enviada_por,
  CONCAT_WS(' ', e.primer_nombre, e.primer_apellido) AS enviada_por_nombre`;

async function listarDeUsuario(usuarioId, { leida }, { limit, offset }) {
  const condiciones = ['n.usuario_id = ?'];
  const valores = [usuarioId];
  if (leida !== undefined) {
    condiciones.push('n.leida = ?');
    valores.push(leida === '1' ? 1 : 0);
  }
  const where = `WHERE ${condiciones.join(' AND ')}`;
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS}
       FROM notificaciones n LEFT JOIN usuarios e ON e.id = n.enviada_por
     ${where}
     ORDER BY n.created_at DESC, n.id DESC
     LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM notificaciones n ${where}`,
    valores
  );
  return { filas, total };
}

async function contarNoLeidas(usuarioId) {
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM notificaciones WHERE usuario_id = ? AND leida = 0',
    [usuarioId]
  );
  return total;
}

async function buscarDeUsuario(id, usuarioId) {
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS}
       FROM notificaciones n LEFT JOIN usuarios e ON e.id = n.enviada_por
      WHERE n.id = ? AND n.usuario_id = ?`,
    [id, usuarioId]
  );
  return filas[0] ?? null;
}

async function marcarLeida(id, usuarioId) {
  await pool.query(
    'UPDATE notificaciones SET leida = 1, leida_at = NOW() WHERE id = ? AND usuario_id = ? AND leida = 0',
    [id, usuarioId]
  );
}

async function marcarTodasLeidas(usuarioId) {
  const [r] = await pool.query(
    'UPDATE notificaciones SET leida = 1, leida_at = NOW() WHERE usuario_id = ? AND leida = 0',
    [usuarioId]
  );
  return r.affectedRows;
}

module.exports = {
  idsDestinatarios,
  insertarVarias,
  listarDeUsuario,
  contarNoLeidas,
  buscarDeUsuario,
  marcarLeida,
  marcarTodasLeidas,
};
