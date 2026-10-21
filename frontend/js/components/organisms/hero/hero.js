import { el } from '../../../utils/dom.js';
import { createHazardStrip } from '../../atoms/hazard-strip/hazard-strip.js';
import { createBrandMark } from '../../atoms/brand-mark/brand-mark.js';

/**
 * Portada de la página pública: fondo --asphalt con franja de peligro, marca PARKO con la
 * sede, título grande, texto y botones (los arma la página).
 * @param {{ sede: string, titulo: string, texto?: string, datos?: string[], acciones?: HTMLElement[] }} props
 * @returns {HTMLElement}
 */
export function createHero({ sede, titulo, texto, datos = [], acciones = [] }) {
  return el('section', { className: 'hero', attrs: { 'aria-labelledby': 'hero-titulo' } }, [
    el('div', { className: 'hero-inner' }, [
      el('p', { className: 'hero-brand' }, [
        createBrandMark(),
        el('span', {}, [el('strong', { text: 'PARKO' }), el('small', { text: sede })]),
      ]),
      el('h1', { className: 'hero-title', text: titulo, attrs: { id: 'hero-titulo' } }),
      texto ? el('p', { className: 'hero-text', text: texto }) : null,
      datos.length
        ? el(
            'ul',
            { className: 'hero-facts' },
            datos.map((d) => el('li', { text: d }))
          )
        : null,
      acciones.length ? el('div', { className: 'hero-actions' }, acciones) : null,
    ]),
    createHazardStrip(),
  ]);
}
