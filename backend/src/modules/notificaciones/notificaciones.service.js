// Notificaciones internas (REQ-NOT-1). En la Fase 1 solo se usa para avisar a los
// administradores; las rutas (campana, marcar leída, envío manual) llegan en la Fase 5.
const repo = require('./notificaciones.repository');

/**
 * Crea la misma notificación para todos los administradores activos.
 * @param {{ titulo: string, mensaje: string, tipo: string, enlace?: string, excluirUsuarioId?: number }} datos
 * @param {import('mysql2/promise').PoolConnection} [conexion] para incluirla en una transacción
 * @returns {Promise<number>} cuántas se crearon
 */
async function notificarAdministradores(
  { titulo, mensaje, tipo, enlace, excluirUsuarioId },
  conexion
) {
  const ids = (await repo.listarIdsAdministradoresActivos()).filter(
    (id) => id !== excluirUsuarioId
  );
  await repo.insertarVarias(
    ids.map((usuario_id) => ({ usuario_id, titulo, mensaje, tipo, enlace })),
    conexion
  );
  return ids.length;
}

module.exports = { notificarAdministradores };
