// Notificaciones internas (REQ-NOT-1): bandeja, conteo, leer, envío manual y tiempo real.
import { get, post, patch } from './api.js';
import { aQuery } from './usuarios.service.js';

/** { data, meta: { …, no_leidas } } */
export function misNotificaciones(filtros = {}) {
  return get(`/notificaciones/mias${aQuery(filtros)}`);
}

export async function conteoNoLeidas() {
  return (await get('/notificaciones/mias/conteo')).data.no_leidas;
}

export async function marcarLeida(id) {
  return (await patch(`/notificaciones/${id}/leida`)).data;
}

export async function marcarTodasLeidas() {
  return (await patch('/notificaciones/mias/leer-todas')).data;
}

/** { destino: 'usuario'|'rol'|'todos', usuario_id?, rol?, titulo, mensaje } → { enviadas } */
export async function enviarNotificacion(datos) {
  return (await post('/notificaciones', datos)).data;
}

/**
 * SSE de las notificaciones del usuario en sesión. Reintenta solo si se cae.
 * @param {{ onConteo?: (n: number) => void, onNueva?: (d: { titulo: string }) => void, onLeidas?: () => void }} manejadores
 * @returns {() => void} cerrar
 */
export function suscribirNotificaciones({ onConteo, onNueva, onLeidas }) {
  let fuente = null;
  let cerrado = false;
  let temporizador = null;
  function abrir() {
    fuente = new EventSource('/api/v1/notificaciones/stream', { withCredentials: true });
    fuente.addEventListener('conteo', (e) => onConteo?.(JSON.parse(e.data).no_leidas));
    fuente.addEventListener('notificacion', (e) => onNueva?.(JSON.parse(e.data)));
    fuente.addEventListener('leidas', () => onLeidas?.());
    fuente.addEventListener('error', () => {
      if (fuente.readyState === EventSource.CLOSED && !cerrado) {
        clearTimeout(temporizador);
        temporizador = setTimeout(abrir, 5000);
      }
    });
  }
  abrir();
  return () => {
    cerrado = true;
    clearTimeout(temporizador);
    fuente?.close();
  };
}
