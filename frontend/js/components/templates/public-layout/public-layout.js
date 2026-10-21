import { el } from '../../../utils/dom.js';
import { createBrand } from '../../molecules/brand/brand.js';
import { createHazardStrip } from '../../atoms/hazard-strip/hazard-strip.js';

/**
 * Plantilla de la página pública: header (marca + acciones) → franja → hero a todo el
 * ancho (opcional) → contenido → footer.
 * @param {{ sede?: string, actions?: HTMLElement[], hero?: HTMLElement, content?: Array<Node>, footer?: HTMLElement }} props
 * @returns {HTMLDivElement}
 */
export function createPublicLayout({ sede = '', actions = [], hero, content = [], footer }) {
  return el('div', { className: 'app-layout public-layout' }, [
    el('a', { className: 'skip-link', text: 'Saltar al contenido', attrs: { href: '#contenido' } }),
    el('header', { className: 'header' }, [
      el('div', { className: 'header-inner' }, [
        createBrand({ sede, href: '/' }),
        el('nav', { className: 'public-actions', attrs: { 'aria-label': 'Accesos' } }, actions),
      ]),
    ]),
    createHazardStrip(),
    el('main', { attrs: { id: 'contenido', tabindex: '-1' } }, [
      hero ?? null,
      el('div', { className: 'page public-page' }, content),
    ]),
    footer ?? null,
  ]);
}

/**
 * Sección de la portada con título condensado (ancla para el menú: id).
 * @param {{ id: string, titulo: string, subtitulo?: string, children: Array<Node>, extra?: HTMLElement }} props
 */
export function createPublicSection({ id, titulo, subtitulo, children, extra }) {
  return el('section', { className: 'public-section', attrs: { id, 'aria-labelledby': `${id}-titulo` } }, [
    el('div', { className: 'public-section-head' }, [
      el('div', {}, [
        el('h2', { text: titulo, attrs: { id: `${id}-titulo` } }),
        subtitulo ? el('p', { text: subtitulo }) : null,
      ]),
      extra ?? null,
    ]),
    ...children,
  ]);
}
