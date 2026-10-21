import { get } from './api.js';

/** Cupos libres por tipo (solo totales). Público. */
export async function obtenerDisponibilidad() {
  return (await get('/publico/disponibilidad', { redirigir401: false })).data;
}

/** Tarifas vigentes por tipo y valores de mensualidad/anualidad. Público. */
export async function obtenerTarifas() {
  return (await get('/publico/tarifas', { redirigir401: false })).data;
}

/** Dígitos con pico y placa hoy por tipo. Público. */
export async function obtenerPicoPlacaHoy() {
  return (await get('/publico/pico-placa-hoy', { redirigir401: false })).data;
}

/**
 * Disponibilidad en vivo (SSE, sin sesión). Mismo patrón de reconexión que el mapa:
 * EventSource reintenta solo; si el servidor cierra la conexión se reabre a los 3 s.
 * @param {{
 *   onDisponibilidad: (datos: object) => void,
 *   onEstado?: (estado: 'conectando'|'en-vivo'|'reconectando') => void,
 * }} manejadores
 * @returns {() => void} cerrar
 */
export function suscribirDisponibilidad({ onDisponibilidad, onEstado }) {
  let fuente = null;
  let cerrado = false;
  let huboCaida = false;
  let temporizador = null;

  function abrir() {
    onEstado?.(huboCaida ? 'reconectando' : 'conectando');
    fuente = new EventSource('/api/v1/publico/disponibilidad/stream');
    fuente.addEventListener('open', () => {
      onEstado?.('en-vivo');
      huboCaida = false;
    });
    fuente.addEventListener('disponibilidad', (e) => onDisponibilidad(JSON.parse(e.data)));
    fuente.addEventListener('error', () => {
      huboCaida = true;
      onEstado?.('reconectando');
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
