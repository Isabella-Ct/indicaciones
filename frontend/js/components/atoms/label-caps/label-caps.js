import { el } from '../../../utils/dom.js';

/**
 * Etiqueta en mayúsculas condensadas (.label-caps).
 * @param {{ text: string, tag?: string, id?: string }} props
 * @returns {HTMLElement}
 */
export function createLabelCaps({ text, tag = 'p', id } = {}) {
  return el(tag, { className: 'label-caps', text, attrs: { id } });
}
