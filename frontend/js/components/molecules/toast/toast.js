import { el } from '../../../utils/dom.js';
import { createIcon } from '../../atoms/icon/icon.js';

const ICONOS = { success: 'i-check', error: 'i-alert', info: 'i-info' };

/**
 * Aviso flotante (.toast).
 * @param {{ message: string, variant?: 'success'|'error'|'info', onClose?: () => void }} props
 * @returns {HTMLDivElement}
 */
export function createToast({ message, variant = 'info', onClose }) {
  const cerrar = el(
    'button',
    {
      className: 'toast-close',
      attrs: { type: 'button', 'aria-label': 'Cerrar aviso' },
    },
    [createIcon({ name: 'i-x' })]
  );
  const toast = el(
    'div',
    {
      className: `toast toast--${variant}`,
      attrs: { role: variant === 'error' ? 'alert' : 'status' },
    },
    [createIcon({ name: ICONOS[variant] }), el('p', { text: message }), cerrar]
  );
  cerrar.addEventListener('click', () => {
    toast.remove();
    onClose?.();
  });
  return toast;
}

function region() {
  let contenedor = document.querySelector('.toast-region');
  if (!contenedor) {
    contenedor = el('div', { className: 'toast-region', attrs: { 'aria-live': 'polite' } });
    document.body.append(contenedor);
  }
  return contenedor;
}

/**
 * Muestra un toast en la esquina inferior; se cierra solo.
 * @param {string} message
 * @param {'success'|'error'|'info'} [variant]
 * @param {{ duracion?: number }} [opciones] ms; 0 = no se cierra solo
 */
export function showToast(message, variant = 'info', { duracion = 5000 } = {}) {
  const toast = createToast({ message, variant });
  region().append(toast);
  if (duracion > 0) setTimeout(() => toast.remove(), duracion);
  return toast;
}
