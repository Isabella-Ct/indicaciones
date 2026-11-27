/**
 * Clonado de <template> (constitución §V). Lo que se repite según los datos (filas, opciones,
 * grupos) se escribe una vez en un <template> de la página y aquí se copia; el texto se pone
 * siempre con textContent. No es un componente: lo usan todos los niveles de Atomic Design.
 */

/** Copia el primer elemento de la plantilla `id`. */
export function clonar(id) {
  return document.getElementById(id).content.firstElementChild.cloneNode(true);
}
