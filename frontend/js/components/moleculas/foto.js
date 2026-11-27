/**
 * Molécula · molecule-photo-input: elegir, previsualizar y quitar la foto (RNF-PRI-03). Valida en
 * el navegador JPG/PNG ≤ 2 MB (el servidor vuelve a validar la firma del archivo).
 * Marcado esperado dentro de la raíz: input[type=file], .molecule-photo-input-preview con
 * <img> y .js-iniciales, y la casilla opcional .js-quitar dentro de .js-quitar-etiqueta.
 */
import { iniciales } from '../../utils/sesion.js';
import { marcarCampo } from './campo.js';

const TAMANO_MAXIMO = 2 * 1024 * 1024;
const TIPOS = ['image/jpeg', 'image/png'];

/** @param {HTMLElement} raiz .molecule-photo-input */
export function conectarFoto(raiz) {
  const input = raiz.querySelector('input[type="file"]');
  const img = raiz.querySelector('.molecule-photo-input-preview img');
  const textoIniciales = raiz.querySelector('.js-iniciales');
  const quitar = raiz.querySelector('.js-quitar');
  const etiquetaQuitar = raiz.querySelector('.js-quitar-etiqueta');
  let url = null;
  let nombre = '';

  function mostrar(blob) {
    if (url) URL.revokeObjectURL(url);
    url = blob ? URL.createObjectURL(blob) : null;
    if (url) img.src = url;
    else img.removeAttribute('src');
    img.classList.toggle('hidden', !url);
    textoIniciales.textContent = iniciales(nombre) || '—';
    textoIniciales.classList.toggle('hidden', Boolean(url));
  }

  input.addEventListener('change', () => {
    const archivo = input.files[0];
    marcarCampo(input, '');
    if (!archivo) return mostrar(null);
    if (!TIPOS.includes(archivo.type)) {
      input.value = '';
      marcarCampo(input, 'La foto debe ser JPG o PNG.');
      return mostrar(null);
    }
    if (archivo.size > TAMANO_MAXIMO) {
      input.value = '';
      marcarCampo(input, 'La foto supera 2 MB.');
      return mostrar(null);
    }
    if (quitar) quitar.checked = false;
    return mostrar(archivo);
  });
  quitar?.addEventListener('change', () => {
    if (quitar.checked) {
      input.value = '';
      mostrar(null);
    }
  });

  return {
    /** Prepara la molécula para un formulario nuevo o para editar (foto actual como Blob). */
    reiniciar({ nombreUsuario = '', blob = null } = {}) {
      nombre = nombreUsuario;
      input.value = '';
      marcarCampo(input, '');
      if (quitar) quitar.checked = false;
      etiquetaQuitar?.classList.toggle('hidden', !blob);
      mostrar(blob);
    },
    /** Archivo elegido (o null). */
    archivo: () => input.files[0] ?? null,
    /** ¿Se pidió quitar la foto actual? */
    quitada: () => Boolean(quitar?.checked),
  };
}
