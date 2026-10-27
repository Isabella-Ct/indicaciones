/**
 * Gráficos propios (sin librerías) sobre marcado escrito en el HTML. Cada gráfico tiene
 * su contenedor en la página y sus piezas repetidas (barras, celdas, puntos) se copian de
 * las plantillas #tpl-grafico-* (ver el final de cada página que los usa).
 */
import { clonar, clonarSvg } from './plantillas.js';

const fijarV = (nodo, v) => nodo.style.setProperty('--v', String(v));

// ---------------------------------------------------------------- columnas (organism-col-chart)
/**
 * @param {HTMLElement} raiz  .organism-col-chart con -y-axis, -plot y -x-axis
 * @param {{ label: string, items: Array<{ etiqueta: string, valor: number, estado?: 'actual'|'futura', titulo?: string, mostrarValor?: boolean }>, unidad?: string, ejeY?: number[] }} datos
 */
export function pintarColumnas(raiz, { label, items, unidad = '%', ejeY = [100, 75, 50, 25, 0] }) {
  const denso = items.length > 12;
  raiz.classList.toggle('organism-col-chart--dense', denso);
  const mayor = items.reduce(
    (m, i, idx) => (i.estado !== 'futura' && i.valor > (items[m]?.valor ?? -1) ? idx : m),
    -1
  );
  raiz.querySelector('.organism-col-chart-y-axis').replaceChildren(
    ...ejeY.map((v) => {
      const span = clonar('tpl-grafico-texto');
      span.textContent = String(v);
      return span;
    })
  );
  raiz.querySelector('.organism-col-chart-plot').replaceChildren(
    ...items.map((item, idx) => {
      const futura = item.estado === 'futura';
      const barra = clonar('tpl-grafico-barra');
      barra.classList.toggle('organism-col-chart-bar--current', item.estado === 'actual');
      barra.classList.toggle('organism-col-chart-bar--future', futura);
      barra.title =
        item.titulo ?? `${item.etiqueta} · ${futura ? 'pendiente' : `${item.valor} ${unidad}`}`;
      if (!futura) fijarV(barra, Math.max(0, Math.min(100, item.valor)));
      const valor = barra.firstElementChild;
      const conValor = item.mostrarValor ?? (idx === mayor || item.estado === 'actual');
      valor.textContent = `${Math.round(item.valor)} ${unidad}`;
      valor.classList.toggle('hidden', !conValor || futura);
      return barra;
    })
  );
  raiz.querySelector('.organism-col-chart-x-axis').replaceChildren(
    // Con muchas columnas (24 h) se rotula una de cada tres.
    ...items.map((i, idx) => {
      const span = clonar('tpl-grafico-texto');
      span.textContent = denso && idx % 3 ? '' : i.etiqueta;
      return span;
    })
  );
  const descripcion = items
    .filter((i) => i.estado !== 'futura')
    .map((i) => `${i.etiqueta} ${Math.round(i.valor)} ${unidad}`)
    .join(', ');
  raiz.setAttribute('aria-label', `${label}: ${descripcion || 'sin datos'}`);
}

// ---------------------------------------------------------------- barras horizontales
/** @param {HTMLElement} raiz  figure.organism-hbar-chart con ol.organism-hbar-chart-list */
export function pintarBarrasH(raiz, { label, items, max }) {
  const tope = max ?? Math.max(1, ...items.map((i) => i.valor));
  raiz.querySelector('.organism-hbar-chart-list').replaceChildren(
    ...items.map((item, idx) => {
      const fila = clonar('tpl-grafico-hbar');
      const texto = item.texto ?? String(item.valor);
      fila.title = `${item.etiqueta} · ${texto}`;
      fila.querySelector('strong').textContent = item.etiqueta;
      const detalle = fila.querySelector('small');
      detalle.textContent = item.detalle ?? '';
      detalle.classList.toggle('hidden', !item.detalle);
      const barra = fila.querySelector('.organism-hbar-chart-fill');
      barra.classList.toggle('organism-hbar-chart-fill--top', idx === 0);
      fijarV(barra, Math.round((item.valor / tope) * 1000) / 10);
      fila.querySelector('.organism-hbar-chart-value').textContent = texto;
      return fila;
    })
  );
  const descripcion = items.map((i) => `${i.etiqueta} ${i.texto ?? i.valor}`).join(', ');
  raiz.setAttribute('aria-label', `${label}: ${descripcion || 'sin datos'}`);
}

// ---------------------------------------------------------------- barra apilada
const COLORES = ['yellow', 'steel', 'asphalt', 'orange', 'blue', 'green'];

/** @param {HTMLElement} raiz  figure.organism-stacked-meter con -bar y -legend */
export function pintarApilada(raiz, { label, segmentos }) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  const pct = (v) => (total ? Math.round((v / total) * 1000) / 10 : 0);
  const pctTexto = (v) => String(pct(v)).replace('.', ',');
  const color = (i) => `organism-stacked-meter-seg--${COLORES[i % COLORES.length]}`;
  const barra = raiz.querySelector('.organism-stacked-meter-bar');
  barra.replaceChildren(
    ...(total
      ? segmentos.map((s, i) => {
          const parte = clonar('tpl-grafico-segmento');
          parte.classList.add(color(i));
          parte.title = `${s.etiqueta} · ${s.texto ?? s.valor} · ${pctTexto(s.valor)} %`;
          fijarV(parte, pct(s.valor));
          return parte;
        })
      : [])
  );
  raiz.querySelector('.organism-stacked-meter-legend').replaceChildren(
    ...segmentos.map((s, i) => {
      const item = clonar('tpl-grafico-leyenda');
      const [clave, nombre, valor] = item.children;
      clave.classList.add(color(i));
      nombre.textContent = s.etiqueta;
      valor.textContent = `${s.texto ?? s.valor} · ${pctTexto(s.valor)} %`;
      return item;
    })
  );
  const descripcion = segmentos.map((s) => `${s.etiqueta} ${pctTexto(s.valor)} %`).join(', ');
  barra.setAttribute('aria-label', `${label}: ${descripcion || 'sin datos'}`);
}

// ---------------------------------------------------------------- mapa de calor
const NIVELES = 6; // 0 = --concrete-2 … 3 = --yellow … 5 = --orange

/** @param {HTMLElement} raiz  figure.organism-heatmap con .organism-heatmap-grid */
export function pintarCalor(raiz, { label, columnas, filas, resumen = '' }) {
  const max = Math.max(0, ...filas.flatMap((f) => f.celdas.map((c) => c.valor)));
  const nivel = (v) => (max && v > 0 ? Math.max(1, Math.round((v / max) * (NIVELES - 1))) : 0);
  const texto = (contenido, clase) => {
    const span = clonar('tpl-grafico-texto');
    if (clase) span.className = clase;
    span.textContent = contenido;
    return span;
  };
  raiz.querySelector('.organism-heatmap-grid').replaceChildren(
    texto(''),
    ...columnas.map((c, i) => texto(i % 3 ? '' : c, 'organism-heatmap-col')),
    ...filas.flatMap((f) => [
      texto(f.etiqueta, 'organism-heatmap-row'),
      ...f.celdas.map((c, i) => {
        const celda = texto('', `organism-heatmap-cell organism-heatmap-heat-${nivel(c.valor)}`);
        celda.title = `${f.etiqueta} ${columnas[i]} h · ${c.texto}`;
        return celda;
      }),
    ])
  );
  raiz.setAttribute('aria-label', `${label}. ${resumen}`.trim());
}

// ---------------------------------------------------------------- línea (SVG)
const ANCHO = 640;
const ALTO = 240;
const M = { arriba: 16, derecha: 12, abajo: 28, izquierda: 64 };

function marcas(maximo, cantidad = 4) {
  if (maximo <= 0) return [0, 1];
  const paso0 = maximo / cantidad;
  const potencia = 10 ** Math.floor(Math.log10(paso0));
  const paso = [1, 2, 2.5, 5, 10].map((f) => f * potencia).find((p) => p >= paso0);
  return Array.from({ length: Math.ceil(maximo / paso) + 1 }, (_, i) => i * paso);
}

/** Atributos SVG en lote. */
const poner = (nodo, attrs) => {
  for (const [k, v] of Object.entries(attrs)) nodo.setAttribute(k, String(v));
  return nodo;
};

/** @param {HTMLElement} raiz  figure.organism-line-chart con un <svg> y sus grupos */
export function pintarLinea(raiz, { label, puntos, formato = String, formatoCorto = formato }) {
  const ejeY = marcas(Math.max(0, ...puntos.map((p) => p.valor)));
  const tope = ejeY[ejeY.length - 1];
  const ancho = ANCHO - M.izquierda - M.derecha;
  const alto = ALTO - M.arriba - M.abajo;
  const x = (i) =>
    M.izquierda + (puntos.length > 1 ? (i / (puntos.length - 1)) * ancho : ancho / 2);
  const y = (v) => M.arriba + alto - (v / tope) * alto;
  const cadaCuanto = Math.max(1, Math.ceil(puntos.length / 8));
  const svg = raiz.querySelector('svg');

  svg.querySelector('.organism-line-chart-rejilla').replaceChildren(
    ...ejeY.map((v) => {
      const g = clonarSvg('tpl-grafico-rejilla');
      const [linea, rotulo] = g.children;
      poner(linea, { x1: M.izquierda, x2: ANCHO - M.derecha, y1: y(v), y2: y(v) });
      poner(rotulo, { x: M.izquierda - 8, y: y(v) + 4 });
      rotulo.textContent = formatoCorto(v);
      return g;
    })
  );
  poner(svg.querySelector('.organism-line-chart-base'), {
    x1: M.izquierda,
    x2: ANCHO - M.derecha,
    y1: y(0),
    y2: y(0),
  });
  svg.querySelector('.organism-line-chart-etiquetas').replaceChildren(
    ...puntos
      .map((p, i) => {
        if (i % cadaCuanto) return null;
        const rotulo = clonarSvg('tpl-grafico-rotulo');
        poner(rotulo, { x: x(i), y: ALTO - 8 });
        rotulo.textContent = p.etiqueta;
        return rotulo;
      })
      .filter(Boolean)
  );
  const camino = svg.querySelector('.organism-line-chart-path');
  camino.setAttribute(
    'd',
    puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ')
  );
  camino.classList.toggle('hidden', puntos.length === 0);
  svg.querySelector('.organism-line-chart-puntos').replaceChildren(
    ...puntos.map((p, i) => {
      const punto = clonarSvg('tpl-grafico-punto');
      poner(punto, { x: x(i) - 4, y: y(p.valor) - 4 });
      punto.firstElementChild.textContent = p.titulo ?? `${p.etiqueta} · ${formato(p.valor)}`;
      return punto;
    })
  );

  const mayor = puntos.reduce((a, b) => (b.valor > a.valor ? b : a), puntos[0] ?? { valor: 0 });
  const total = puntos.reduce((s, p) => s + p.valor, 0);
  const descripcion = puntos.length
    ? `${puntos.length} períodos, total ${formato(total)}; el más alto ${mayor.etiqueta} con ${formato(mayor.valor)}`
    : 'sin datos';
  svg.setAttribute('aria-label', `${label}: ${descripcion}`);
}
