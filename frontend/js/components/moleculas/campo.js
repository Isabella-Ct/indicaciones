/**
 * Molécula · molecule-field: errores de un campo de formulario junto al control (RNF-USA-03).
 * Cada control tiene un <p class="molecule-field-error" id="<id-del-control>-error"> y
 * aria-describedby hacia él.
 */

/** Pone (o limpia) el mensaje de un control y su aria-invalid. Devuelve true si no hay error. */
export function marcarCampo(control, mensaje) {
  const destino = document.getElementById(`${control.id}-error`);
  if (destino) destino.textContent = mensaje || '';
  if (mensaje) control.setAttribute('aria-invalid', 'true');
  else control.removeAttribute('aria-invalid');
  return !mensaje;
}

/** Limpia todos los errores de los campos de un formulario. */
export function limpiarErrores(formulario) {
  formulario.querySelectorAll('.molecule-field-error').forEach((p) => (p.textContent = ''));
  formulario.querySelectorAll('[aria-invalid]').forEach((c) => c.removeAttribute('aria-invalid'));
}

/**
 * Pinta error.details de la API en los campos. `mapa` traduce el campo de la API al id del
 * control (p. ej. { nombre: 'rol-nombre' }). Devuelve los mensajes que no tenían campo.
 * @param {{ details?: Array<{campo: string|null, mensaje: string}> }} error
 * @param {Record<string, string>} mapa
 */
export function pintarErroresApi(error, mapa) {
  const sinCampo = [];
  let primero = null;
  for (const { campo, mensaje } of error.details ?? []) {
    const raiz = (campo ?? '').split('.')[0];
    const control = mapa[raiz] ? document.getElementById(mapa[raiz]) : null;
    if (control) {
      marcarCampo(control, mensaje);
      primero ??= control;
    } else {
      sinCampo.push(mensaje);
    }
  }
  primero?.focus();
  return sinCampo;
}
