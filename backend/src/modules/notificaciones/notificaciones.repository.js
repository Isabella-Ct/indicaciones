const { pool } = require('../../config/db');

async function listarIdsAdministradoresActivos() {
  const [filas] = await pool.query(
    `SELECT u.id
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
      WHERE r.nombre = 'administrador' AND u.estado = 'activo'`
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

module.exports = { listarIdsAdministradoresActivos, insertarVarias };
