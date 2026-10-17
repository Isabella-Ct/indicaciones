import { el } from '../../../utils/dom.js';
import { createBrand } from '../../molecules/brand/brand.js';
import { createHazardStrip } from '../../atoms/hazard-strip/hazard-strip.js';

/**
 * Plantilla de la página pública: header (marca + acciones) → franja → contenido → footer.
 * @param {{ sede?: string, actions?: HTMLElement[], content?: Array<Node>, footer?: HTMLElement }} props
 * @returns {HTMLDivElement}
 */
export function createPublicLayout({ sede = '', actions = [], content = [], footer }) {
  return el('div', { className: 'app-layout' }, [
    el('a', { className: 'skip-link', text: 'Saltar al contenido', attrs: { href: '#contenido' } }),
    el('header', { className: 'header' }, [
      el('div', { className: 'header-inner' }, [
        createBrand({ sede, href: '/' }),
        el('div', { className: 'public-actions' }, actions),
      ]),
    ]),
    createHazardStrip(),
    el('main', { className: 'page', attrs: { id: 'contenido', tabindex: '-1' } }, content),
    footer ?? null,
  ]);
}
