import { el } from '../../../utils/dom.js';
import { createEmptyState } from '../../molecules/empty-state/empty-state.js';
import { createPagination } from '../../molecules/pagination/pagination.js';
import { createSpinner } from '../../atoms/spinner/spinner.js';

/**
 * Tabla de datos basada en la bitácora `.log` de la maqueta: encabezados en
 * --font-display, celdas en --font-mono, orden por columna, paginación y estado vacío.
 * En móvil hace scroll horizontal dentro de su contenedor.
 * @param {{
 *   caption: string,                       // título accesible (visualmente oculto)
 *   columns: Array<{
 *     key: string, label: string, sortable?: boolean, align?: 'left'|'right',
 *     render?: (fila: object) => Node|string|number|null,
 *   }>,
 *   rows: Array<object>,
 *   rowKey?: (fila: object) => string|number,  // va en data-id
 *   sort?: { key: string, dir: 'asc'|'desc' },
 *   onSort?: (key: string) => void,
 *   loading?: boolean,
 *   empty?: { title: string, text?: string },
 *   pagination?: { pagina: number, totalPaginas: number, total: number, onChange: (p: number) => void },
 *   minWidth?: number,                     // ancho mínimo antes de hacer scroll (px)
 * }} props
 * @returns {HTMLDivElement}
 */
export function createDataTable({
  caption,
  columns,
  rows,
  rowKey = (fila) => fila.id,
  sort,
  onSort,
  loading = false,
  empty = { title: 'Sin resultados', text: 'No hay registros que coincidan con los filtros.' },
  pagination,
  minWidth = 720,
}) {
  const encabezados = columns.map((col) => {
    const ordenada = sort?.key === col.key;
    const th = el('th', {
      className: col.align === 'right' ? 'right' : '',
      attrs: {
        scope: 'col',
        'aria-sort': col.sortable
          ? ordenada
            ? sort.dir === 'asc'
              ? 'ascending'
              : 'descending'
            : 'none'
          : null,
      },
    });
    if (col.sortable && onSort) {
      th.append(
        el(
          'button',
          {
            className: 'data-table-sort',
            attrs: { type: 'button' },
            on: { click: () => onSort(col.key) },
          },
          [
            col.label,
            el('span', {
              className: 'data-table-arrow',
              text: ordenada ? (sort.dir === 'asc' ? '▲' : '▼') : '↕',
              attrs: { 'aria-hidden': 'true' },
            }),
          ]
        )
      );
    } else {
      th.textContent = col.label;
    }
    return th;
  });

  const cuerpo = el(
    'tbody',
    {},
    rows.map((fila) =>
      el(
        'tr',
        { attrs: { 'data-id': rowKey(fila) } },
        columns.map((col) => {
          const valor = col.render ? col.render(fila) : fila[col.key];
          return el('td', { className: col.align === 'right' ? 'right' : '' }, [
            valor === null || valor === undefined || valor === '' ? '—' : valor,
          ]);
        })
      )
    )
  );

  const tabla = el('table', { className: 'log data-table-table' }, [
    el('caption', { className: 'visually-hidden', text: caption }),
    el('thead', {}, [el('tr', {}, encabezados)]),
    cuerpo,
  ]);
  tabla.style.setProperty('--min-width', `${minWidth}px`);

  const vacio = !loading && rows.length === 0;
  return el('div', { className: 'data-table', attrs: { 'aria-busy': loading ? 'true' : null } }, [
    vacio
      ? createEmptyState(empty)
      : el(
          'div',
          {
            className: 'data-table-scroll',
            attrs: { tabindex: '0', role: 'region', 'aria-label': caption },
          },
          [tabla]
        ),
    loading
      ? el('div', { className: 'data-table-loading' }, [
          createSpinner({ label: 'Cargando datos…' }),
        ])
      : null,
    pagination && !vacio ? createPagination(pagination) : null,
  ]);
}
