/**
 * Tablas de datos escritas en el HTML (.organism-data-table). El marcado (encabezados, estado
 * vacío, paginación, capa de carga) está en la página; aquí se conectan los eventos y se copian
 * las filas desde un <template>. Nunca llama a la API: la vista le pasa datos y callbacks.
 *
 * Estructura dentro de la raíz: tbody, .molecule-empty-state, .molecule-pagination
 * (botones Anterior / Siguiente + .molecule-pagination-status), .organism-data-table-loading.
 */
import { clonar } from './plantilla.js';

/**
 * @param {HTMLElement} raiz
 * @param {{ plantilla: string, rellenar: (fila: HTMLTableRowElement, dato: object) => void,
 *           onPagina?: (pagina: number) => void, idDe?: (dato: object) => number }} opciones
 */
export function conectarTabla(raiz, { plantilla, rellenar, onPagina, idDe }) {
  const cuerpo = raiz.querySelector('tbody');
  const scroll = raiz.querySelector('.organism-data-table-scroll');
  const vacio = raiz.querySelector(':scope > .molecule-empty-state');
  const paginacion = raiz.querySelector(':scope > .molecule-pagination');
  const carga = raiz.querySelector(':scope > .organism-data-table-loading');
  const [anterior, siguiente] = paginacion?.querySelectorAll('button') ?? [];
  let pagina = 1;

  anterior?.addEventListener('click', () => onPagina?.(pagina - 1));
  siguiente?.addEventListener('click', () => onPagina?.(pagina + 1));

  return {
    /** @param {object[]} datos @param {{ page: number, limit: number, total: number }} [meta] */
    pintar(datos, meta) {
      cuerpo.replaceChildren(
        ...datos.map((dato) => {
          const fila = clonar(plantilla);
          const id = idDe?.(dato);
          if (id !== undefined) fila.dataset.id = String(id);
          rellenar(fila, dato);
          return fila;
        })
      );
      const sinFilas = datos.length === 0;
      scroll?.classList.toggle('hidden', sinFilas);
      vacio?.classList.toggle('hidden', !sinFilas);

      if (paginacion) {
        const conPaginas = Boolean(meta) && !sinFilas;
        paginacion.classList.toggle('hidden', !conPaginas);
        if (conPaginas) {
          pagina = meta.page;
          const totalPaginas = Math.max(1, Math.ceil(meta.total / meta.limit));
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

/** Buscador con espera: llama a onBuscar al dejar de escribir o al pulsar Enter. */
export function conectarBusqueda(input, onBuscar, { espera = 350 } = {}) {
  let temporizador;
  input.addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => onBuscar(input.value.trim()), espera);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(temporizador);
      onBuscar(input.value.trim());
    }
  });
}
