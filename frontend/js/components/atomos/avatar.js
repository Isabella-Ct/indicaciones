/**
 * Átomo · atom-avatar: foto del usuario o, si no tiene, sus iniciales. La foto llega como Blob
 * (la página la descarga con el token; un <img src> no envía la cabecera Authorization).
 * Marcado: <span class="atom-avatar"><img class="hidden" alt="" /><span class="js-iniciales"></span></span>
 */
import { iniciales } from '../../utils/sesion.js';

const urls = new WeakMap();

/** @param {HTMLElement} nodo .atom-avatar @param {{ nombre: string, blob?: Blob|null }} datos */
export function ponerAvatar(nodo, { nombre, blob = null }) {
  const img = nodo.querySelector('img');
  const texto = nodo.querySelector('.js-iniciales');
  const anterior = urls.get(nodo);
  if (anterior) URL.revokeObjectURL(anterior);
  urls.delete(nodo);

  texto.textContent = iniciales(nombre);
  if (blob) {
    const url = URL.createObjectURL(blob);
    urls.set(nodo, url);
    img.src = url;
    img.alt = `Foto de ${nombre}`;
  } else {
    img.removeAttribute('src');
    img.alt = '';
  }
  img.classList.toggle('hidden', !blob);
  texto.classList.toggle('hidden', Boolean(blob));
}
