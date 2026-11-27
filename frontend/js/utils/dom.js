// Atajos de DOM. Los datos externos se escriben solo con textContent (constitución §V).

/** document.getElementById */
export const $ = (id) => document.getElementById(id);

/** Parámetro de la URL actual (?id=3 → '3'). */
export const parametro = (nombre) => new URLSearchParams(location.search).get(nombre);

/** Muestra u oculta con la clase utilitaria `hidden`. */
export function mostrar(nodo, visible = true) {
  nodo?.classList.toggle('hidden', !visible);
}
