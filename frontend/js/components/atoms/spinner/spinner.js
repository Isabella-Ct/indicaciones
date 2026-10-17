import { el } from '../../../utils/dom.js';

/**
 * Indicador de carga: cuadro de trazo que gira (sin esquinas redondeadas).
 * @param {{ label?: string, size?: 'sm'|'md' }} props
 * @returns {HTMLSpanElement}
 */
export function createSpinner({ label = 'Cargando…', size = 'md' } = {}) {
  return el(
    'span',
    { className: size === 'sm' ? 'spinner spinner--sm' : 'spinner', attrs: { role: 'status' } },
    [el('span', { className: 'visually-hidden', text: label })]
  );
}
