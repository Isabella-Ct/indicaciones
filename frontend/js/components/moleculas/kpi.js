/**
 * Molécula · molecule-kpi: indicador con etiqueta, valor, nota y medidor opcional (atom-meter).
 * El marcado está en la página (.atom-label-caps, .molecule-kpi-value, .molecule-kpi-note y, si
 * aplica, .atom-meter > span); aquí solo se ponen los textos.
 */

/**
 * @param {HTMLElement} raiz .molecule-kpi
 * @param {{ etiqueta?: string, valor: string, nota?: string, medidor?: number, destacado?: boolean }} datos
 *   medidor: porcentaje 0–100 que llena la barra.
 */
export function ponerKpi(raiz, { etiqueta, valor, nota, medidor, destacado }) {
  if (etiqueta !== undefined) raiz.querySelector('.atom-label-caps').textContent = etiqueta;
  raiz.querySelector('.molecule-kpi-value').textContent = valor;
  const notaNodo = raiz.querySelector('.molecule-kpi-note');
  if (notaNodo && nota !== undefined) notaNodo.textContent = nota;
  const barra = raiz.querySelector('.atom-meter > span');
  if (barra && medidor !== undefined) barra.style.setProperty('--v', String(Math.max(0, Math.min(100, medidor))));
  if (destacado !== undefined) raiz.classList.toggle('molecule-kpi--main', destacado);
}
