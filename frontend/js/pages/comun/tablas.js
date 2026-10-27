/**
 * Tablas de datos escritas en el HTML (.organism-data-table). El marcado completo
 * (encabezados, botones de orden, estado vacío, paginación y capa de carga) ya está en la
 * página; aquí se conectan sus eventos y se copian las filas desde un <template>.
 *
 * Estructura esperada dentro de la raíz:
 *   tbody, .molecule-empty-state, .molecule-pagination (botones Anterior / Siguiente +
 *   .molecule-pagination-status), .organism-data-table-loading y, en los encabezados
 *   ordenables, <button class="organism-data-table-sort" data-id="<clave>">.
 */
import { clonar } from './plantillas.js';

/** '—' para valores vacíos, como en la tabla original. */
export const texto = (valor) =>
  valor === null || valor === undefined || valor === '' ? '—' : String(valor);

/**
 * @param {HTMLElement} raiz  .organism-data-table
 * @param {{
 *   plantilla: string,                        // id del <template> de una fila (<tr>)
 *   rellenar: (fila: HTMLTableRowElement, dato: object) => void,
 *   onOrden?: (clave: string) => void,
 *   onPagina?: (pagina: number) => void,
 * }} opciones
 */
export function conectarTabla(raiz, { plantilla, rellenar, onOrden, onPagina }) {
  const cuerpo = raiz.querySelector('tbody');
  const scroll = raiz.querySelector('.organism-data-table-scroll');
  const vacio = raiz.querySelector(':scope > .molecule-empty-state');
  const paginacion = raiz.querySelector(':scope > .molecule-pagination');
  const carga = raiz.querySelector(':scope > .organism-data-table-loading');
  const [anterior, siguiente] = paginacion?.querySelectorAll('button') ?? [];
  let pagina = 1;

  raiz.querySelectorAll('.organism-data-table-sort').forEach((boton) => {
    boton.addEventListener('click', () => onOrden?.(boton.dataset.id));
  });
  anterior?.addEventListener('click', () => onPagina?.(pagina - 1));
  siguiente?.addEventListener('click', () => onPagina?.(pagina + 1));

  return {
    /**
     * @param {object[]} datos
     * @param {{ orden?: { clave: string, dir: 'asc'|'desc' }, meta?: { pagina: number, total_paginas: number, total: number } }} [extra]
     */
    pintar(datos, { orden, meta } = {}) {
      cuerpo.replaceChildren(
        ...datos.map((dato) => {
          const fila = clonar(plantilla);
          if (dato.id !== undefined) fila.dataset.id = String(dato.id);
          rellenar(fila, dato);
          return fila;
        })
      );
      const sinFilas = datos.length === 0;
      scroll?.classList.toggle('hidden', sinFilas);
      vacio?.classList.toggle('hidden', !sinFilas);

      raiz.querySelectorAll('.organism-data-table-sort').forEach((boton) => {
        const activa = orden?.clave === boton.dataset.id;
        boton
          .closest('th')
          .setAttribute(
            'aria-sort',
            activa ? (orden.dir === 'asc' ? 'ascending' : 'descending') : 'none'
          );
        boton.querySelector('.organism-data-table-arrow').textContent = activa
          ? orden.dir === 'asc'
            ? '▲'
            : '▼'
          : '↕';
      });

      if (paginacion) {
        const conPaginas = Boolean(meta) && !sinFilas;
        paginacion.classList.toggle('hidden', !conPaginas);
        if (conPaginas) {
          pagina = meta.pagina;
          const totalPaginas = Math.max(1, meta.total_paginas);
          anterior.disabled = pagina <= 1;
          siguiente.disabled = pagina >= totalPaginas;
          const registros = meta.total === 1 ? '1 registro' : `${meta.total} registros`;
          paginacion.querySelector('.molecule-pagination-status').textContent =
            `Página ${pagina} de ${totalPaginas} · ${registros}`;
        }
      }
    },
    cargando(activo) {
      carga?.classList.toggle('hidden', !activo);
      raiz.toggleAttribute('aria-busy', activo);
    },
  };
}

/**
 * Buscador con espera: llama a onSearch al dejar de escribir o al pulsar Enter.
 * @param {HTMLInputElement} input
 */
export function conectarBusqueda(input, onSearch, { transform, espera = 350 } = {}) {
  let temporizador;
  input.addEventListener('input', () => {
    if (transform) input.value = transform(input.value);
    clearTimeout(temporizador);
    temporizador = setTimeout(() => onSearch(input.value.trim()), espera);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(temporizador);
      onSearch(input.value.trim());
    }
  });
}

/** Llena un indicador (molecule-kpi) escrito con el prefijo de ids `id`. */
export function ponerKpi(id, { titulo, valor, unidad, nota, medidor }) {
  const $ = (sufijo) => document.getElementById(`${id}${sufijo}`);
  if (titulo !== undefined) $('-titulo').textContent = titulo;
  $('').textContent = valor === null || valor === undefined ? '—' : String(valor);
  const nodoUnidad = $('-unidad');
  if (nodoUnidad && unidad !== undefined) {
    nodoUnidad.textContent = unidad ? ` ${unidad}` : '';
    nodoUnidad.classList.toggle('hidden', !unidad);
  }
  if (nota !== undefined) $('-nota').textContent = nota ?? '';
  const barra = $('-medidor');
  if (barra && medidor !== undefined) {
    const v = Math.max(0, Math.min(100, Math.round(Number(medidor) || 0)));
    barra.setAttribute('aria-valuenow', String(v));
    barra.firstElementChild.style.setProperty('--v', String(v));
  }
}

/** Orden en el navegador (tablas sin paginación del servidor). */
export function ordenarLocal(datos, { clave, dir }, valor = (d) => d[clave]) {
  const factor = dir === 'asc' ? 1 : -1;
  return [...datos].sort((a, b) => {
    const x = valor(a);
    const y = valor(b);
    if (x === y) return 0;
    if (x === null || x === undefined) return 1;
    if (y === null || y === undefined) return -1;
    return (
      (typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y), 'es', { numeric: true })) * factor
    );
  });
}
