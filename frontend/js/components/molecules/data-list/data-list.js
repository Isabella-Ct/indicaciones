import { el } from '../../../utils/dom.js';

/**
 * Lista de datos término/valor en dos columnas (.data-list).
 * @param {{ items: Array<{ term: string, value: string|Node }> }} props
 * @returns {HTMLDListElement}
 */
export function createDataList({ items }) {
  return el(
    'dl',
    { className: 'data-list' },
    items.map(({ term, value }) =>
      el('div', {}, [el('dt', { text: term }), el('dd', {}, [value ?? '—'])])
    )
  );
}
