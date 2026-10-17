import { el } from '../../../utils/dom.js';
import { createBrandMark } from '../../atoms/brand-mark/brand-mark.js';

/**
 * Marca (.brand): "P" + PARKO + subtítulo de la sede (viene de la BD).
 * @param {{ sede?: string, href?: string }} props  sede: "Parqueadero ABC · Medellín"
 * @returns {HTMLElement}
 */
export function createBrand({ sede = '', href } = {}) {
  const texto = el('div', {}, ['PARKO', el('small', { text: sede })]);
  const hijos = [createBrandMark(), texto];
  return href
    ? el(
        'a',
        { className: 'brand brand--link', attrs: { href, 'aria-label': `PARKO · ${sede}` } },
        hijos
      )
    : el('div', { className: 'brand' }, hijos);
}
