import { el } from '../../../utils/dom.js';
import { createLabelCaps } from '../../atoms/label-caps/label-caps.js';
import { createMeter } from '../../atoms/meter/meter.js';
import { formatearCOP } from '../../../utils/formato.js';

/**
 * Bloque "Valor a pagar" (maqueta, sección 6: .charge, .charge-value, meter--orange, .charge-note).
 * Los números vienen del cálculo del servidor (calcularCobro); aquí solo se muestran.
 * @param {{
 *   total: number,
 *   porcentajeTope?: number|null,   // null = sin barra (ej. mensualidad)
 *   nota?: string,                  // "157 min × $ 120 = $ 18.840"
 *   etiqueta?: string,
 * }} props
 * @returns {HTMLDivElement}
 */
export function createCharge({
  total,
  porcentajeTope = null,
  nota = '',
  etiqueta = 'Valor a pagar',
}) {
  const conTope = porcentajeTope !== null && porcentajeTope !== undefined;
  return el('div', { className: 'charge-block' }, [
    el('div', { className: 'charge' }, [
      el('div', {}, [
        createLabelCaps({ text: etiqueta }),
        el('p', {
          className: 'charge-value',
          text: formatearCOP(total),
          attrs: { 'aria-live': 'polite' },
        }),
      ]),
      conTope ? el('p', { className: 'charge-pct', text: `${porcentajeTope} % del tope` }) : null,
    ]),
    conTope
      ? createMeter({
          value: porcentajeTope,
          variant: 'orange',
          label: 'Porcentaje del tope del día',
        })
      : null,
    nota ? el('p', { className: 'charge-note', text: nota }) : null,
  ]);
}
