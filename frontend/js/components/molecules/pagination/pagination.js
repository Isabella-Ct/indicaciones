import { el } from '../../../utils/dom.js';
import { createButton } from '../../atoms/button/button.js';

/**
 * Paginación: Anterior · "Página X de Y · N registros" · Siguiente.
 * @param {{ pagina: number, totalPaginas: number, total: number, onChange: (pagina: number) => void }} props
 * @returns {HTMLElement}
 */
export function createPagination({ pagina, totalPaginas, total, onChange }) {
  const anterior = createButton({
    label: 'Anterior',
    variant: 'ghost',
    size: 'sm',
    disabled: pagina <= 1,
    onClick: () => onChange(pagina - 1),
  });
  const siguiente = createButton({
    label: 'Siguiente',
    variant: 'ghost',
    size: 'sm',
    disabled: pagina >= totalPaginas,
    onClick: () => onChange(pagina + 1),
  });
  const registros = total === 1 ? '1 registro' : `${total} registros`;
  return el('nav', { className: 'pagination', attrs: { 'aria-label': 'Paginación' } }, [
    anterior,
    el('p', {
      className: 'pagination-status',
      text: `Página ${pagina} de ${totalPaginas} · ${registros}`,
      attrs: { 'aria-live': 'polite' },
    }),
    siguiente,
  ]);
}
