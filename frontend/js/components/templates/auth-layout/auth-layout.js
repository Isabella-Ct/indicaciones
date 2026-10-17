import { el } from '../../../utils/dom.js';
import { createBrand } from '../../molecules/brand/brand.js';
import { createHazardStrip } from '../../atoms/hazard-strip/hazard-strip.js';

/**
 * Plantilla de autenticación: fondo de concreto y un panel centrado con
 * cabecera oscura (marca), franja de peligro, título y contenido.
 * @param {{
 *   sede?: string,
 *   title: string,
 *   subtitle?: string,
 *   content?: Array<Node>,
 *   foot?: Array<Node>,     // texto/enlaces bajo el panel
 * }} props
 * @returns {HTMLElement}
 */
export function createAuthLayout({ sede = '', title, subtitle, content = [], foot = [] }) {
  return el('main', { className: 'auth-layout', attrs: { id: 'contenido' } }, [
    el('section', { className: 'panel auth-panel', attrs: { 'aria-labelledby': 'auth-titulo' } }, [
      el('div', { className: 'panel-head auth-panel-head' }, [createBrand({ sede, href: '/' })]),
      createHazardStrip(),
      el('div', { className: 'panel-body auth-panel-body' }, [
        el('h1', { className: 'auth-title', text: title, attrs: { id: 'auth-titulo' } }),
        subtitle ? el('p', { className: 'auth-subtitle', text: `// ${subtitle}` }) : null,
        ...content,
      ]),
    ]),
    foot.length ? el('div', { className: 'auth-foot' }, foot) : null,
  ]);
}
