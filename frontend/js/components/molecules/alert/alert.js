import { el } from '../../../utils/dom.js';
import { createIcon } from '../../atoms/icon/icon.js';

const ICONOS = { error: 'i-alert', success: 'i-check', info: 'i-info' };

/**
 * Mensaje en línea dentro de un formulario o panel (.alert).
 * Se crea vacío y oculto si no hay mensaje; usa setAlert para cambiarlo.
 * @param {{ message?: string, variant?: 'error'|'success'|'info' }} props
 * @returns {HTMLDivElement}
 */
export function createAlert({ message = '', variant = 'error' } = {}) {
  const alerta = el('div', { attrs: { 'aria-live': 'assertive' } });
  setAlert(alerta, message, variant);
  return alerta;
}

/** Cambia el texto y la variante; con mensaje vacío la oculta. */
export function setAlert(alerta, message, variant = 'error') {
  alerta.className = `alert alert--${variant}`;
  alerta.replaceChildren();
  if (!message) {
    alerta.classList.add('hidden');
    return;
  }
  alerta.append(createIcon({ name: ICONOS[variant] }), el('p', { text: message }));
}
