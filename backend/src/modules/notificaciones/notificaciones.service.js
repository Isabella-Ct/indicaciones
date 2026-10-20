// Notificaciones internas (REQ-NOT-1): único punto donde se crean avisos. Todos los
// módulos (perfil, pico y placa, membresías, incidencias, envío manual) usan `notificar`.
const { despuesDeConfirmar } = require('../../config/db');
const { publicar } = require('../../realtime/emisor');
const { errores } = require('../../utils/errores');
const { aLimites, meta } = require('../../utils/paginacion');
const repo = require('./notificaciones.repository');

/** Evento interno del emisor; el stream lo filtra por usuario. */
const EVENTO = 'notificacion-nueva';

const aPublico = (n) => ({
  id: n.id,
  titulo: n.titulo,
  mensaje: n.mensaje,
  tipo: n.tipo,
  enlace: n.enlace,
  leida: Boolean(n.leida),
  leida_at: n.leida_at,
  fecha: n.created_at,
  enviada_por: n.enviada_por ? { id: n.enviada_por, nombre: n.enviada_por_nombre } : null,
});

/**
 * Crea la misma notificación para cada destinatario activo y avisa en tiempo real
 * (después del commit si `conexion` es una transacción).
 * Destino: `usuarios` (ids), `rol` ('administrador' | 'operador' | 'usuario') o `todos`.
 * @param {{
 *   usuarios?: number[], rol?: string, todos?: boolean,
 *   titulo: string, mensaje: string, tipo: string,
 *   enlace?: string|null, enviadaPor?: number|null, excluirUsuarioId?: number,
 * }} datos
 * @param {import('mysql2/promise').PoolConnection} [conexion]
 * @returns {Promise<number[]>} ids de los destinatarios
 */
async function notificar(datos, conexion) {
  const { usuarios, rol, todos, titulo, mensaje, tipo, enlace, enviadaPor, excluirUsuarioId } =
    datos;
  const ids = (await repo.idsDestinatarios({ usuarios, rol, todos }, conexion)).filter(
    (id) => id !== excluirUsuarioId
  );
  await repo.insertarVarias(
    ids.map((usuario_id) => ({
      usuario_id,
      titulo,
      mensaje,
      tipo,
      enlace,
      enviada_por: enviadaPor ?? null,
    })),
    conexion
  );
  if (ids.length) despuesDeConfirmar(conexion, () => publicar(EVENTO, { usuarios: ids, titulo }));
  return ids;
}

async function mias(usuarioId, filtros) {
  const { filas, total } = await repo.listarDeUsuario(usuarioId, filtros, aLimites(filtros));
  return {
    data: filas.map(aPublico),
    meta: { ...meta(filtros, total), no_leidas: await repo.contarNoLeidas(usuarioId) },
  };
}

const conteo = (usuarioId) => repo.contarNoLeidas(usuarioId);

/** Solo el destinatario: una ajena responde 404 (no se revela que existe). */
async function marcarLeida(id, usuarioId) {
  const n = await repo.buscarDeUsuario(id, usuarioId);
  if (!n) throw errores.noEncontrado('La notificación no existe.');
  await repo.marcarLeida(id, usuarioId);
  publicar('notificaciones-leidas', { usuarios: [usuarioId] });
  return aPublico(await repo.buscarDeUsuario(id, usuarioId));
}

async function marcarTodasLeidas(usuarioId) {
  const marcadas = await repo.marcarTodasLeidas(usuarioId);
  if (marcadas) publicar('notificaciones-leidas', { usuarios: [usuarioId] });
  return { marcadas };
}

/** Mensaje manual del administrador (REQ-NOT-1). */
async function enviarManual({ destino, usuario_id, rol, titulo, mensaje }, solicitante) {
  const ids = await notificar({
    usuarios: destino === 'usuario' ? [usuario_id] : undefined,
    rol: destino === 'rol' ? rol : undefined,
    todos: destino === 'todos',
    titulo,
    mensaje,
    tipo: 'manual',
    enviadaPor: solicitante.id,
  });
  if (ids.length === 0) {
    throw errores.validacion(
      [
        {
          campo: destino === 'usuario' ? 'usuario_id' : 'rol',
          mensaje: 'No hay destinatarios activos.',
        },
      ],
      'No hay usuarios activos para ese destino.'
    );
  }
  return { enviadas: ids.length };
}

module.exports = {
  EVENTO,
  notificar,
  mias,
  conteo,
  marcarLeida,
  marcarTodasLeidas,
  enviarManual,
};
