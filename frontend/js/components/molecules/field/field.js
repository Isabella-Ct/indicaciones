import { el, idUnico } from '../../../utils/dom.js';

/**
 * Campo de formulario (.field): label + control + ayuda + mensaje de error.
 * El control (input/select/textarea) se crea con los atoms y se pasa ya hecho.
 * @param {{
 *   label: string,
 *   control: HTMLElement,
 *   required?: boolean,
 *   hint?: string,
 *   error?: string,
 *   full?: boolean,   // ocupa las dos columnas de .form-grid
 * }} props
 * @returns {HTMLDivElement}
 */
export function createField({ label, control, required = false, hint, error, full = false }) {
  if (!control.id) control.id = idUnico('campo');
  const idError = `${control.id}-error`;
  const idAyuda = `${control.id}-ayuda`;

  const etiqueta = el('label', { attrs: { for: control.id } }, [
    label,
    required
      ? el('span', { className: 'req', text: ' *', attrs: { 'aria-hidden': 'true' } })
      : null,
  ]);
  const ayuda = hint
    ? el('p', { className: 'field-hint', text: hint, attrs: { id: idAyuda } })
    : null;
  const mensaje = el('p', {
    className: 'field-error',
    attrs: { id: idError, 'aria-live': 'polite' },
  });

  control.setAttribute(
    'aria-describedby',
    [hint ? idAyuda : null, idError].filter(Boolean).join(' ')
  );
  if (required) control.required = true;

  const campo = el('div', { className: full ? 'field field--full' : 'field' }, [
    etiqueta,
    control,
    ayuda,
    mensaje,
  ]);
  if (error) setFieldError(campo, error);
  return campo;
}

/**
 * Muestra (o limpia con '' / null) el error de un campo creado con createField.
 * @param {HTMLElement} campo
 * @param {string|null} mensaje
 */
export function setFieldError(campo, mensaje) {
  const control = campo.querySelector('input, select, textarea');
  const destino = campo.querySelector('.field-error');
  destino.textContent = mensaje || '';
  if (control) {
    if (mensaje) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
  }
}
