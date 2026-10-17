import { el } from '../../../utils/dom.js';
import { formatearPlaca } from '../../../utils/placa.js';

/**
 * Placa amarilla (.plate). Recibe la placa normalizada ("JKL482") y la muestra "JKL 482".
 * @param {{ placa: string, large?: boolean, id?: string }} props
 * @returns {HTMLSpanElement}
 */
export function createPlate({ placa, large = false, id } = {}) {
  return el('span', {
    className: large ? 'plate plate--large' : 'plate',
    text: formatearPlaca(placa),
    attrs: { id },
  });
}
