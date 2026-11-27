// Molécula · molecule-toast: aviso no bloqueante (SRS §3.1) copiado de la plantilla #tpl-aviso
// en la región #avisos (aria-live, RNF-USA-04).
import { clonar } from '../../utils/plantillas.js';

const ICONOS = { success: 'i-check', error: 'i-alert', info: 'i-info' };

/** @param {'success'|'error'|'info'} variante */
export function mostrarAviso(mensaje, variante = 'info', { duracion = 5000 } = {}) {
  const region = document.getElementById('avisos');
  if (!region) return;
  const aviso = clonar('tpl-aviso');
  aviso.classList.add(`molecule-toast--${variante}`);
  aviso.setAttribute('role', variante === 'error' ? 'alert' : 'status');
  aviso.querySelector('use').setAttribute('href', `/assets/icons.svg#${ICONOS[variante]}`);
  aviso.querySelector('p').textContent = mensaje;
  aviso.querySelector('.molecule-toast-close').addEventListener('click', () => aviso.remove());
  region.append(aviso);
  if (duracion > 0) setTimeout(() => aviso.remove(), duracion);
}
