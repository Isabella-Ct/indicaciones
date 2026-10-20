import { el } from '../../../utils/dom.js';

const NIVELES = 6; // 0 = --concrete-2 … 3 = --yellow … 5 = --orange

/**
 * Mapa de calor día × hora (REP-10). Escala de --concrete-2 a --yellow a --orange,
 * relativa al valor más alto. Cada celda tiene tooltip; el conjunto, role="img".
 * @param {{
 *   label: string,
 *   columnas: string[],                                   // p. ej. ["0", "1", … "23"]
 *   filas: Array<{ etiqueta: string, celdas: Array<{ valor: number, texto: string }> }>,
 *   resumen?: string,                                      // se agrega al aria-label
 * }} props
 * @returns {HTMLElement}
 */
export function createHeatmap({ label, columnas, filas, resumen = '' }) {
  const max = Math.max(0, ...filas.flatMap((f) => f.celdas.map((c) => c.valor)));
  const nivel = (v) => (max && v > 0 ? Math.max(1, Math.round((v / max) * (NIVELES - 1))) : 0);
  const tabla = el('div', { className: 'heatmap-grid', attrs: { 'aria-hidden': 'true' } }, [
    el('span', { className: 'heatmap-corner' }),
    ...columnas.map((c, i) => el('span', { className: 'heatmap-col', text: i % 3 ? '' : c })),
    ...filas.flatMap((f) => [
      el('span', { className: 'heatmap-row', text: f.etiqueta }),
      ...f.celdas.map((c, i) =>
        el('span', {
          className: `heatmap-cell heat-${nivel(c.valor)}`,
          attrs: { title: `${f.etiqueta} ${columnas[i]} h · ${c.texto}` },
        })
      ),
    ]),
  ]);
  const leyenda = el('div', { className: 'heatmap-legend', attrs: { 'aria-hidden': 'true' } }, [
    el('span', { text: 'Menos' }),
    ...Array.from({ length: NIVELES }, (_, i) =>
      el('span', { className: `heatmap-cell heat-${i}` })
    ),
    el('span', { text: 'Más' }),
  ]);
  return el(
    'figure',
    { className: 'heatmap', attrs: { role: 'img', 'aria-label': `${label}. ${resumen}`.trim() } },
    [el('div', { className: 'heatmap-scroll' }, [tabla]), leyenda]
  );
}
