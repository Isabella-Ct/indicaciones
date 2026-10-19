import { el, idUnico } from '../../../utils/dom.js';
import { createCheck } from '../check/check.js';

export const FOTO_MAX_BYTES = 2 * 1024 * 1024;
const TIPOS = ['image/jpeg', 'image/png'];

/**
 * Foto con vista previa: <input type="file" name="foto"> (jpg/png ≤ 2 MB) y, si ya hay
 * foto, la casilla "Quitar foto" (name="quitar_foto"). Valida en el navegador; el
 * backend valida de nuevo.
 * @param {{ label?: string, fotoUrl?: string|null, nombre?: string }} props
 * @returns {HTMLDivElement}
 */
export function createPhotoInput({ label = 'Foto', fotoUrl = null, nombre = '' } = {}) {
  const id = idUnico('foto');
  const vista = el('div', { className: 'photo-input-preview', attrs: { 'aria-hidden': 'true' } });
  const archivo = el('input', {
    className: 'visually-hidden',
    attrs: {
      id,
      type: 'file',
      name: 'foto',
      accept: 'image/jpeg,image/png',
      'aria-describedby': `${id}-error`,
    },
  });
  const boton = el('label', {
    className: 'btn btn--ghost btn--sm',
    text: 'Elegir foto',
    attrs: { for: id },
  });
  const error = el('p', {
    className: 'field-error',
    attrs: { id: `${id}-error`, 'aria-live': 'polite' },
  });
  const quitar = fotoUrl
    ? createCheck({ label: 'Quitar la foto actual', name: 'quitar_foto' })
    : null;
  let urlTemporal = null;

  function pintar(url) {
    vista.replaceChildren();
    if (url) {
      vista.append(el('img', { attrs: { src: url, alt: '' } }));
    } else {
      const iniciales = nombre
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join('');
      vista.append(el('span', { text: iniciales || '—' }));
    }
  }

  archivo.addEventListener('change', () => {
    error.textContent = '';
    if (urlTemporal) URL.revokeObjectURL(urlTemporal);
    urlTemporal = null;
    const elegido = archivo.files[0];
    if (!elegido) return pintar(fotoUrl);
    if (!TIPOS.includes(elegido.type)) {
      error.textContent = 'La foto debe ser JPG o PNG.';
      archivo.value = '';
      return pintar(fotoUrl);
    }
    if (elegido.size > FOTO_MAX_BYTES) {
      error.textContent = 'La foto no puede pesar más de 2 MB.';
      archivo.value = '';
      return pintar(fotoUrl);
    }
    urlTemporal = URL.createObjectURL(elegido);
    pintar(urlTemporal);
    if (quitar) quitar.querySelector('input').checked = false;
  });
  quitar?.querySelector('input').addEventListener('change', (e) => {
    if (e.target.checked) {
      archivo.value = '';
      pintar(null);
    } else pintar(fotoUrl);
  });

  pintar(fotoUrl);
  return el('div', { className: 'field field--full photo-input' }, [
    el('span', { className: 'label', text: label }),
    el('div', { className: 'photo-input-row' }, [
      vista,
      el('div', { className: 'photo-input-actions' }, [
        archivo,
        boton,
        el('p', { className: 'field-hint', text: 'JPG o PNG, máximo 2 MB.' }),
        quitar,
      ]),
    ]),
    error,
  ]);
}
