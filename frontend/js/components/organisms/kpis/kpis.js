import { el } from '../../../utils/dom.js';
import { createKpi } from '../../molecules/kpi/kpi.js';

/**
 * Fila de indicadores (.kpis) de la maqueta. El primero suele ser el principal (main).
 * @param {{ items: Array<Parameters<typeof createKpi>[0]>, label?: string }} props
 * @returns {HTMLElement}
 */
export function createKpis({ items, label = 'Indicadores' }) {
  // La maqueta tiene 5 indicadores; con 2, 3 o 4 se usa la variante de ese número de columnas.
  const clase = items.length >= 2 && items.length <= 4 ? `kpis kpis--${items.length}` : 'kpis';
  return el('section', { className: clase, attrs: { 'aria-label': label } }, items.map(createKpi));
}
