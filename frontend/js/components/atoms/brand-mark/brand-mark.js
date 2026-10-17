import { el } from '../../../utils/dom.js';

/** Cuadro amarillo con la "P" de PARKO (.brand-mark). */
export function createBrandMark() {
  return el('span', { className: 'brand-mark', text: 'P', attrs: { 'aria-hidden': 'true' } });
}
