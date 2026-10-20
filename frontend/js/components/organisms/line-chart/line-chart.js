import { el } from '../../../utils/dom.js';

const NS = 'http://www.w3.org/2000/svg';
const ANCHO = 640;
const ALTO = 240;
const M = { arriba: 16, derecha: 12, abajo: 28, izquierda: 64 };

function svg(nombre, attrs = {}, hijos = []) {
  const nodo = document.createElementNS(NS, nombre);
  for (const [k, v] of Object.entries(attrs)) nodo.setAttribute(k, String(v));
  for (const h of hijos) if (h) nodo.append(h);
  return nodo;
}

/** Marcas "redondas" del eje Y (0, 25 000, 50 000…). */
function marcas(maximo, cantidad = 4) {
  if (maximo <= 0) return [0, 1];
  const paso0 = maximo / cantidad;
  const potencia = 10 ** Math.floor(Math.log10(paso0));
  const paso = [1, 2, 2.5, 5, 10].map((f) => f * potencia).find((p) => p >= paso0);
  return Array.from({ length: Math.ceil(maximo / paso) + 1 }, (_, i) => i * paso);
}

/**
 * Línea en SVG (REP-11, ingresos por período): ejes en --font-mono, línea --asphalt,
 * puntos cuadrados --yellow con borde, sin sombras. Colores por clases (tokens en CSS).
 * @param {{
 *   label: string,
 *   puntos: Array<{ etiqueta: string, valor: number, titulo?: string }>,
 *   formato?: (v: number) => string,       // valores del eje y de los tooltips
 *   formatoCorto?: (v: number) => string,  // eje Y abreviado
 * }} props
 * @returns {HTMLElement}
 */
export function createLineChart({ label, puntos, formato = String, formatoCorto = formato }) {
  const ejeY = marcas(Math.max(0, ...puntos.map((p) => p.valor)));
  const tope = ejeY[ejeY.length - 1];
  const ancho = ANCHO - M.izquierda - M.derecha;
  const alto = ALTO - M.arriba - M.abajo;
  const x = (i) =>
    M.izquierda + (puntos.length > 1 ? (i / (puntos.length - 1)) * ancho : ancho / 2);
  const y = (v) => M.arriba + alto - (v / tope) * alto;
  const cadaCuanto = Math.max(1, Math.ceil(puntos.length / 8));

  const rejilla = ejeY.map((v) =>
    svg('g', {}, [
      svg('line', {
        class: 'line-grid',
        x1: M.izquierda,
        x2: ANCHO - M.derecha,
        y1: y(v),
        y2: y(v),
      }),
      Object.assign(
        svg('text', { class: 'line-axis', x: M.izquierda - 8, y: y(v) + 4, 'text-anchor': 'end' }),
        {
          textContent: formatoCorto(v),
        }
      ),
    ])
  );
  const etiquetasX = puntos.map((p, i) =>
    i % cadaCuanto
      ? null
      : Object.assign(
          svg('text', { class: 'line-axis', x: x(i), y: ALTO - 8, 'text-anchor': 'middle' }),
          { textContent: p.etiqueta }
        )
  );
  const camino = puntos
    .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`)
    .join(' ');
  const marcadores = puntos.map((p, i) =>
    svg('rect', { class: 'line-point', x: x(i) - 4, y: y(p.valor) - 4, width: 8, height: 8 }, [
      Object.assign(svg('title'), {
        textContent: p.titulo ?? `${p.etiqueta} · ${formato(p.valor)}`,
      }),
    ])
  );

  const mayor = puntos.reduce((a, b) => (b.valor > a.valor ? b : a), puntos[0] ?? { valor: 0 });
  const total = puntos.reduce((s, p) => s + p.valor, 0);
  const descripcion = puntos.length
    ? `${puntos.length} períodos, total ${formato(total)}; el más alto ${mayor.etiqueta} con ${formato(mayor.valor)}`
    : 'sin datos';

  return el('figure', { className: 'line-chart' }, [
    svg(
      'svg',
      {
        viewBox: `0 0 ${ANCHO} ${ALTO}`,
        role: 'img',
        'aria-label': `${label}: ${descripcion}`,
      },
      [
        ...rejilla,
        svg('line', {
          class: 'line-base',
          x1: M.izquierda,
          x2: ANCHO - M.derecha,
          y1: y(0),
          y2: y(0),
        }),
        ...etiquetasX,
        puntos.length ? svg('path', { class: 'line-path', d: camino }) : null,
        ...marcadores,
      ]
    ),
  ]);
}
