import { el } from '../../../utils/dom.js';

/** Colores de los segmentos, en orden (todos son tokens; ver stacked-meter.css). */
const COLORES = ['yellow', 'steel', 'asphalt', 'orange', 'blue', 'green'];

/**
 * Barra apilada (meter de la maqueta, en segmentos) en lugar de una dona: participación
 * de cada parte en el total (métodos de pago, tipo de vehículo, concepto).
 * @param {{
 *   label: string,                                           // descripción para role="img"
 *   segmentos: Array<{ etiqueta: string, valor: number, texto?: string }>,
 * }} props
 * @returns {HTMLElement}
 */
export function createStackedMeter({ label, segmentos }) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  const pct = (v) => (total ? Math.round((v / total) * 1000) / 10 : 0);
  const pctTexto = (v) => String(pct(v)).replace('.', ',');
  const partes = segmentos.map((s, i) => {
    const parte = el('span', {
      className: `stacked-seg stacked-seg--${COLORES[i % COLORES.length]}`,
      attrs: { title: `${s.etiqueta} · ${s.texto ?? s.valor} · ${pctTexto(s.valor)} %` },
    });
    parte.style.setProperty('--v', String(pct(s.valor)));
    return parte;
  });
  const leyenda = segmentos.map((s, i) =>
    el('li', {}, [
      el('span', {
        className: `stacked-key stacked-seg--${COLORES[i % COLORES.length]}`,
        attrs: { 'aria-hidden': 'true' },
      }),
      el('strong', { text: s.etiqueta }),
      el('span', { text: `${s.texto ?? s.valor} · ${pctTexto(s.valor)} %` }),
    ])
  );
  const descripcion = segmentos.map((s) => `${s.etiqueta} ${pctTexto(s.valor)} %`).join(', ');
  return el('figure', { className: 'stacked-meter' }, [
    el(
      'div',
      {
        className: 'stacked-bar',
        attrs: { role: 'img', 'aria-label': `${label}: ${descripcion || 'sin datos'}` },
      },
      total ? partes : []
    ),
    el('ul', { className: 'stacked-legend' }, leyenda),
  ]);
}
