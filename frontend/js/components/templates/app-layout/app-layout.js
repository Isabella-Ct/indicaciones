import { el } from '../../../utils/dom.js';
import { createHazardStrip } from '../../atoms/hazard-strip/hazard-strip.js';

/**
 * Plantilla de las páginas internas:
 * header → navbar → franja de peligro → main.page (page-head + contenido) → footer.
 * @param {{
 *   header: HTMLElement,
 *   navbar?: HTMLElement,
 *   pageHead?: HTMLElement,
 *   content?: Array<Node>,
 *   footer?: HTMLElement,
 * }} props
 * @returns {HTMLDivElement} El <main> queda accesible con `.querySelector('main')`.
 */
export function createAppLayout({ header, navbar, pageHead, content = [], footer }) {
  return el('div', { className: 'app-layout' }, [
    el('a', { className: 'skip-link', text: 'Saltar al contenido', attrs: { href: '#contenido' } }),
    header,
    navbar ?? null,
    createHazardStrip(),
    el('main', { className: 'page', attrs: { id: 'contenido', tabindex: '-1' } }, [
      pageHead ?? null,
      ...content,
    ]),
    footer ?? null,
  ]);
}
