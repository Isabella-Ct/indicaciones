import { el } from '../../../utils/dom.js';
import { createIcon } from '../../atoms/icon/icon.js';

/**
 * Rejilla de servicios de la página pública: icono del sprite + título + texto.
 * @param {{ items: Array<{ icono: string, titulo: string, texto: string }> }} props
 * @returns {HTMLUListElement}
 */
export function createFeatureGrid({ items }) {
  return el(
    'ul',
    { className: 'feature-grid' },
    items.map((item) =>
      el('li', { className: 'feature' }, [
        el('span', { className: 'feature-icon', attrs: { 'aria-hidden': 'true' } }, [
          createIcon({ name: item.icono }),
        ]),
        el('h3', { className: 'feature-title', text: item.titulo }),
        el('p', { text: item.texto }),
      ])
    )
  );
}
