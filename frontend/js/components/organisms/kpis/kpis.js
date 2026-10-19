import { el } from '../../../utils/dom.js';
import { createKpi } from '../../molecules/kpi/kpi.js';

/**
 * Fila de indicadores (.kpis) de la maqueta. El primero suele ser el principal (main).
 * @param {{ items: Array<Parameters<typeof createKpi>[0]>, label?: string }} props
 * @returns {HTMLElement}
 */
export function createKpis({ items, label = 'Indicadores' }) {
  return el('section', { className: 'kpis', attrs: { 'aria-label': label } }, items.map(createKpi));
}
