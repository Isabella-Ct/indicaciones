import { el } from '../../../utils/dom.js';

/**
 * Ranking en barras horizontales (estilo col-chart de la maqueta): barras planas
 * --steel y la primera en --yellow con borde. Sin librerías.
 * @param {{
 *   label: string,                                    // descripción para role="img"
 *   items: Array<{ etiqueta: string, valor: number, texto?: string, detalle?: string }>,
 *   max?: number,                                     // por defecto el mayor valor
 * }} props
 * @returns {HTMLElement}
 */
export function createHbarChart({ label, items, max }) {
  const tope = max ?? Math.max(1, ...items.map((i) => i.valor));
  const filas = items.map((item, idx) => {
    const barra = el('span', { className: idx === 0 ? 'hbar-fill hbar-fill--top' : 'hbar-fill' });
    barra.style.setProperty('--v', String(Math.round((item.valor / tope) * 1000) / 10));
    const texto = item.texto ?? String(item.valor);
    return el('li', { className: 'hbar-row', attrs: { title: `${item.etiqueta} · ${texto}` } }, [
      el('span', { className: 'hbar-label' }, [
        el('strong', { text: item.etiqueta }),
        item.detalle ? el('small', { text: item.detalle }) : null,
      ]),
      el('span', { className: 'hbar-track' }, [barra]),
      el('span', { className: 'hbar-value', text: texto }),
    ]);
  });
  const descripcion = items.map((i) => `${i.etiqueta} ${i.texto ?? i.valor}`).join(', ');
  return el(
    'figure',
    {
      className: 'hbar-chart',
      attrs: { role: 'img', 'aria-label': `${label}: ${descripcion || 'sin datos'}` },
    },
    [el('ol', { className: 'hbar-list', attrs: { 'aria-hidden': 'true' } }, filas)]
  );
}
