import { el } from '../../../utils/dom.js';

/**
 * Gráfico de columnas de la maqueta (.col-chart, sección 7): barras planas --steel,
 * la actual en --yellow con borde y las futuras rayadas. Valores 0–100 (%).
 * @param {{
 *   label: string,                       // descripción para role="img" (se agregan los valores)
 *   items: Array<{
 *     etiqueta: string,                  // eje X, p. ej. "8h"
 *     valor: number,                     // 0–100
 *     estado?: 'pasada'|'actual'|'futura',
 *     titulo?: string,                   // tooltip, p. ej. "8:00 · 58 %"
 *     mostrarValor?: boolean,            // etiqueta encima de la barra
 *   }>,
 *   unidad?: string,                     // "%" por defecto
 *   ejeY?: number[],                     // marcas del eje (de arriba a abajo)
 * }} props
 * @returns {HTMLDivElement}
 */
export function createColChart({ label, items, unidad = '%', ejeY = [100, 75, 50, 25, 0] }) {
  const denso = items.length > 12;
  const mayor = items.reduce(
    (m, i, idx) => (i.estado !== 'futura' && i.valor > (items[m]?.valor ?? -1) ? idx : m),
    -1
  );
  const barras = items.map((item, idx) => {
    const futura = item.estado === 'futura';
    const clases = ['bar'];
    if (item.estado === 'actual') clases.push('bar--current');
    if (futura) clases.push('bar--future');
    const barra = el('div', {
      className: clases.join(' '),
      attrs: {
        title:
          item.titulo ?? `${item.etiqueta} · ${futura ? 'pendiente' : `${item.valor} ${unidad}`}`,
      },
    });
    if (!futura) barra.style.setProperty('--v', String(Math.max(0, Math.min(100, item.valor))));
    const conValor = item.mostrarValor ?? (idx === mayor || item.estado === 'actual');
    if (conValor && !futura) {
      barra.append(
        el('span', { className: 'bar-value', text: `${Math.round(item.valor)} ${unidad}` })
      );
    }
    return barra;
  });
  const descripcion = items
    .filter((i) => i.estado !== 'futura')
    .map((i) => `${i.etiqueta} ${Math.round(i.valor)} ${unidad}`)
    .join(', ');
  return el(
    'div',
    {
      className: denso ? 'col-chart col-chart--dense' : 'col-chart',
      attrs: { role: 'img', 'aria-label': `${label}: ${descripcion || 'sin datos'}` },
    },
    [
      el(
        'div',
        { className: 'y-axis', attrs: { 'aria-hidden': 'true' } },
        ejeY.map((v) => el('span', { text: String(v) }))
      ),
      el('div', { className: 'plot', attrs: { 'aria-hidden': 'true' } }, barras),
      el(
        'div',
        { className: 'x-axis', attrs: { 'aria-hidden': 'true' } },
        // Con muchas columnas (24 h) se rotula una de cada tres.
        items.map((i, idx) => el('span', { text: denso && idx % 3 ? '' : i.etiqueta }))
      ),
    ]
  );
}
