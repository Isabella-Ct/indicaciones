/**
 * Modales escritos en el HTML (.organism-modal-overlay): abrir, cerrar, Esc, clic fuera,
 * foco atrapado y devolver el foco al botón que los abrió. También avisos (toasts) y el
 * diálogo de confirmación, ambos a partir de marcado de la página.
 */
import { clonar } from './plantillas.js';

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const estados = new WeakMap();

function visibles(contenedor) {
  return [...contenedor.querySelectorAll(ENFOCABLES)].filter((n) => n.offsetParent !== null);
}

function prepararModal(overlay) {
  if (estados.has(overlay)) return;
  estados.set(overlay, { retorno: null, alCerrar: null });
  const dialogo = overlay.querySelector('.organism-modal');
  overlay
    .querySelectorAll('.organism-modal-close')
    .forEach((boton) => boton.addEventListener('click', () => cerrarModal(overlay)));
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) cerrarModal(overlay);
  });
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      cerrarModal(overlay);
      return;
    }
    if (e.key !== 'Tab') return;
    const nodos = visibles(dialogo);
    if (!nodos.length) return;
    const primero = nodos[0];
    const ultimo = nodos[nodos.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  });
}

/**
 * @param {HTMLElement} overlay
 * @param {{ origen?: HTMLElement, foco?: HTMLElement, alCerrar?: () => void }} [opciones]
 */
export function abrirModal(overlay, { origen = document.activeElement, foco, alCerrar } = {}) {
  prepararModal(overlay);
  const estado = estados.get(overlay);
  estado.retorno = origen;
  estado.alCerrar = alCerrar ?? null;
  overlay.classList.remove('hidden');
  document.body.classList.add('has-modal');
  (
    foco ??
    visibles(overlay.querySelector('.organism-modal-body'))[0] ??
    visibles(overlay)[0]
  )?.focus();
}

export function cerrarModal(overlay) {
  if (overlay.classList.contains('hidden')) return;
  const estado = estados.get(overlay);
  overlay.classList.add('hidden');
  if (!document.querySelector('.organism-modal-overlay:not(.hidden)')) {
    document.body.classList.remove('has-modal');
  }
  estado?.retorno?.focus?.();
  estado?.alCerrar?.();
}

/** Diálogo #modal-confirmar de la página. Devuelve una promesa con true/false. */
export function confirmar({ titulo, mensaje, textoConfirmar = 'Confirmar', origen }) {
  const overlay = document.getElementById('modal-confirmar');
  const aceptar = document.getElementById('confirmar-aceptar');
  document.getElementById('confirmar-titulo').textContent = titulo;
  document.getElementById('confirmar-mensaje').textContent = mensaje;
  aceptar.querySelector('span').textContent = textoConfirmar;
  return new Promise((resolver) => {
    let respuesta = false;
    const alAceptar = () => {
      respuesta = true;
      cerrarModal(overlay);
    };
    aceptar.addEventListener('click', alAceptar, { once: true });
    abrirModal(overlay, {
      origen,
      foco: aceptar,
      alCerrar: () => {
        aceptar.removeEventListener('click', alAceptar);
        resolver(respuesta);
      },
    });
  });
}

const ICONOS_AVISO = { success: 'i-check', error: 'i-alert', info: 'i-info' };

/** Aviso flotante (toast) copiado de la plantilla #tpl-aviso. */
export function mostrarAviso(mensaje, variante = 'info', { duracion = 5000 } = {}) {
  const aviso = clonar('tpl-aviso');
  aviso.classList.add(`molecule-toast--${variante}`);
  aviso.setAttribute('role', variante === 'error' ? 'alert' : 'status');
  aviso.querySelector('use').setAttribute('href', `/assets/icons.svg#${ICONOS_AVISO[variante]}`);
  aviso.querySelector('p').textContent = mensaje;
  aviso.querySelector('.molecule-toast-close').addEventListener('click', () => aviso.remove());
  document.getElementById('avisos').append(aviso);
  if (duracion > 0) setTimeout(() => aviso.remove(), duracion);
}
