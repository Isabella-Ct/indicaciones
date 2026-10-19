import { get, post, put, patch } from './api.js';
import { aQuery } from './usuarios.service.js';

export async function listarPisos() {
  return (await get('/pisos')).data;
}

/** @param {{ incluir_inactivas?: '1', piso_id?: number, tipo?: string, estado?: string }} filtros */
export async function listarCeldas(filtros = {}) {
  return (await get(`/celdas${aQuery(filtros)}`)).data;
}

export async function obtenerResumen() {
  return (await get('/celdas/resumen')).data;
}

/** @returns {Promise<{ data: object, meta: { estado_final: string } }>} */
export function cambiarEstadoCelda(id, { estado, vehiculo_id, nota }) {
  return patch(`/celdas/${id}/estado`, { estado, vehiculo_id, nota });
}

export async function crearCelda(datos) {
  return (await post('/celdas', datos)).data;
}

export async function actualizarCelda(id, datos) {
  return (await put(`/celdas/${id}`, datos)).data;
}

export async function cambiarActivaCelda(id, activa) {
  return (await patch(`/celdas/${id}/activa`, { activa })).data;
}

/**
 * Suscripción en tiempo real (SSE) al mapa de celdas.
 * Si la conexión se cae, EventSource reintenta solo; si el servidor la cierra
 * (por ejemplo, tras un reinicio), se vuelve a abrir a los 3 s.
 * @param {{
 *   onCelda: (celda: object) => void,
 *   onResumen?: (resumen: object) => void,
 *   onEstado?: (estado: 'conectando'|'en-vivo'|'reconectando', reconectado: boolean) => void,
 * }} manejadores
 * @returns {() => void} cerrar
 */
export function suscribirCeldas({ onCelda, onResumen, onEstado }) {
  let fuente = null;
  let cerrado = false;
  let huboCaida = false;
  let temporizador = null;

  function abrir() {
    onEstado?.(huboCaida ? 'reconectando' : 'conectando', false);
    fuente = new EventSource('/api/v1/celdas/stream', { withCredentials: true });
    fuente.addEventListener('open', () => {
      onEstado?.('en-vivo', huboCaida);
      huboCaida = false;
    });
    fuente.addEventListener('celda-actualizada', (e) => onCelda(JSON.parse(e.data)));
    fuente.addEventListener('resumen-actualizado', (e) => onResumen?.(JSON.parse(e.data)));
    fuente.addEventListener('error', () => {
      huboCaida = true;
      onEstado?.('reconectando', false);
      if (fuente.readyState === EventSource.CLOSED && !cerrado) {
        clearTimeout(temporizador);
        temporizador = setTimeout(abrir, 3000);
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
