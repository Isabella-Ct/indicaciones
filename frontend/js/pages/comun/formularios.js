/**
 * Ayudas de página para formularios: pintar los errores de la API en cada campo.
 */
import { setFieldError } from '../../components/molecules/field/field.js';
import { setAlert } from '../../components/molecules/alert/alert.js';

/**
 * @param {Record<string, HTMLElement>} campos  nombre del campo (como lo devuelve la API) → .field
 * @param {HTMLElement} alerta  creada con createAlert
 */
export function limpiarErrores(campos, alerta) {
  Object.values(campos).forEach((campo) => {
    if (campo.querySelector('.field-error')) setFieldError(campo, '');
  });
  if (alerta) setAlert(alerta, '');
}

/** Muestra error.detalles en sus campos y el mensaje general en la alerta. */
export function mostrarErrorApi(error, campos, alerta) {
  let primero = null;
  for (const detalle of error.detalles ?? []) {
    const campo = campos[detalle.campo];
    if (campo) {
      setFieldError(campo, detalle.mensaje);
      primero ??= campo;
    }
  }
  if (alerta) setAlert(alerta, error.message, 'error');
  primero?.querySelector('input:not([type="hidden"]), select, textarea')?.focus();
}

/** Marca un error del lado del navegador; devuelve false para encadenar validaciones. */
export function marcarError(campo, mensaje) {
  setFieldError(campo, mensaje);
  return false;
}

export const PATRON_CELULAR = /^3\d{9}$/;
export const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
