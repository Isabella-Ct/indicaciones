import { el } from '../../../utils/dom.js';

/** Franja de peligro amarillo/asfalto (.hazard-strip). Decorativa. */
export function createHazardStrip() {
  return el('div', { className: 'hazard-strip', attrs: { 'aria-hidden': 'true' } });
}
