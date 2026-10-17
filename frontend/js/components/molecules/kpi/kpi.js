import { el } from '../../../utils/dom.js';
import { createLabelCaps } from '../../atoms/label-caps/label-caps.js';
import { createMeter } from '../../atoms/meter/meter.js';

/**
 * Indicador (.kpi). `main` lo pinta amarillo (.kpi--main); `meter` agrega barra 0–100.
 * @param {{ label: string, value: string|number, unit?: string, note?: string, main?: boolean, meter?: number }} props
 * @returns {HTMLElement}
 */
export function createKpi({ label, value, unit, note, main = false, meter }) {
  const valor = el('p', { className: 'kpi-value' }, [
    String(value),
    unit ? el('small', { text: ` ${unit}` }) : null,
  ]);
  return el('article', { className: main ? 'kpi kpi--main' : 'kpi' }, [
    createLabelCaps({ text: label }),
    valor,
    meter !== undefined ? createMeter({ value: meter, label }) : null,
    note ? el('p', { className: 'kpi-note', text: note }) : null,
  ]);
}
