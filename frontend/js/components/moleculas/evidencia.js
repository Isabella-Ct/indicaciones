/**
 * Molécula · molecule-photo-input (variante evidencia, spec 013): elegir y previsualizar la foto de evidencia de
 * una incidencia. Valida en el navegador JPG/PNG ≤ 5 MB (el servidor vuelve a validar la firma del archivo).
 * Marcado esperado dentro de la raíz: input[type=file], .molecule-photo-input-preview con <img> y .js-vacio.
 * No llama a la API.
 */
import { marcarCampo } from './campo.js';

const TAMANO_MAXIMO = 5 * 1024 * 1024;
const TIPOS = ['image/jpeg', 'image/png'];

/** @param {HTMLElement} raiz .molecule-photo-input */
export function conectarEvidencia(raiz) {
  const input = raiz.querySelector('input[type="file"]');
  const img = raiz.querySelector('.molecule-photo-input-preview img');
  const vacio = raiz.querySelector('.js-vacio');
  let url = null;

  function vistaPrevia(archivo) {
    if (url) URL.revokeObjectURL(url);
    url = archivo ? URL.createObjectURL(archivo) : null;
    if (url) img.src = url;
    else img.removeAttribute('src');
    img.classList.toggle('hidden', !url);
    vacio.classList.toggle('hidden', Boolean(url));
  }

  /** Mensaje de error del archivo elegido, o '' si está bien. */
  function error() {
    const archivo = input.files[0];
    if (!archivo) return '';
    if (!TIPOS.includes(archivo.type)) return 'La evidencia debe ser JPG o PNG.';
    if (archivo.size > TAMANO_MAXIMO) return 'La evidencia supera 5 MB.';
    return '';
  }

  input.addEventListener('change', () => {
    const mensaje = error();
    marcarCampo(input, mensaje);
    vistaPrevia(mensaje ? null : input.files[0]);
  });

  return {
    /** El archivo válido elegido, o null. */
    archivo: () => (input.files[0] && !error() ? input.files[0] : null),
    /** Marca el error junto al campo; devuelve true si no hay error. */
    validar: () => marcarCampo(input, error()),
    limpiar() {
      input.value = '';
      marcarCampo(input, '');
      vistaPrevia(null);
    },
  };
}
