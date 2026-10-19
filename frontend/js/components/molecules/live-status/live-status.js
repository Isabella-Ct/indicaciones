import { el } from '../../../utils/dom.js';

const TEXTOS = {
  conectando: 'Conectando…',
  'en-vivo': 'En vivo',
  reconectando: 'Reconectando…',
};

/**
 * Indicador de la conexión en tiempo real (.live-status--en-vivo / --reconectando).
 * @param {{ estado?: 'conectando'|'en-vivo'|'reconectando' }} props
 * @returns {HTMLSpanElement}
 */
export function createLiveStatus({ estado = 'conectando' } = {}) {
  const indicador = el('span', { attrs: { role: 'status' } });
  setLiveStatus(indicador, estado);
  return indicador;
}

export function setLiveStatus(indicador, estado) {
  indicador.className = `live-status live-status--${estado}`;
  indicador.textContent = TEXTOS[estado];
}
