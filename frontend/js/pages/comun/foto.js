/**
 * Foto escrita en el HTML (molecule-photo-input) con prefijo de ids: <p> (input file),
 * <p>-vista, <p>-iniciales, <p>-error y, si existe, <p>-quitar. Valida JPG/PNG ≤ 2 MB y
 * muestra la vista previa.
 */
export const FOTO_MAX_BYTES = 2 * 1024 * 1024;
const TIPOS = ['image/jpeg', 'image/png'];

const iniciales = (nombre = '') =>
  nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');

export function conectarFoto(p) {
  const $ = (sufijo = '') => document.getElementById(`${p}${sufijo}`);
  const archivo = $();
  const vista = $('-vista');
  const quitar = $('-quitar');
  let actual = { fotoUrl: null, nombre: '' };
  let urlTemporal = null;

  function pintar(url) {
    vista.classList.toggle('hidden', !url);
    $('-iniciales').classList.toggle('hidden', Boolean(url));
    if (url) vista.src = url;
    else {
      vista.removeAttribute('src');
      $('-iniciales').textContent = iniciales(actual.nombre) || '—';
    }
  }

  function soltarTemporal() {
    if (urlTemporal) URL.revokeObjectURL(urlTemporal);
    urlTemporal = null;
  }

  archivo.addEventListener('change', () => {
    $('-error').textContent = '';
    soltarTemporal();
    const elegido = archivo.files[0];
    if (!elegido) return pintar(actual.fotoUrl);
    const error = !TIPOS.includes(elegido.type)
      ? 'La foto debe ser JPG o PNG.'
      : elegido.size > FOTO_MAX_BYTES
        ? 'La foto no puede pesar más de 2 MB.'
        : '';
    if (error) {
      $('-error').textContent = error;
      archivo.value = '';
      return pintar(actual.fotoUrl);
    }
    urlTemporal = URL.createObjectURL(elegido);
    pintar(urlTemporal);
    if (quitar) quitar.checked = false;
  });
  quitar?.addEventListener('change', () => {
    if (quitar.checked) {
      archivo.value = '';
      soltarTemporal();
      pintar(null);
    } else pintar(actual.fotoUrl);
  });

  return {
    /** Deja el control con la foto actual (o las iniciales) y sin archivo elegido. */
    reiniciar({ fotoUrl = null, nombre = '' } = {}) {
      actual = { fotoUrl, nombre };
      archivo.value = '';
      soltarTemporal();
      $('-error').textContent = '';
      if (quitar) {
        quitar.checked = false;
        $('-quitar-etiqueta').classList.toggle('hidden', !fotoUrl);
      }
      pintar(fotoUrl);
    },
  };
}
