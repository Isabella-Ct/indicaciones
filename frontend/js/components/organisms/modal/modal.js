import { el, idUnico } from '../../../utils/dom.js';
import { createIconButton } from '../../atoms/icon-button/icon-button.js';

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal (.modal-overlay > .modal con .modal-head / .modal-body / .modal-foot).
 * Se crea oculto; ábrelo con openModal(overlay, botonQueLoAbrio).
 * Cierra con Esc, con la X o haciendo clic en el fondo, y devuelve el foco.
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   body: Array<Node>,
 *   footer?: Array<Node>,
 *   size?: 'md'|'sm',
 *   onClose?: () => void,
 * }} props
 * @returns {HTMLDivElement} overlay
 */
export function createModal({ title, subtitle, body, footer = [], size = 'md', onClose }) {
  const idTitulo = idUnico('modal');
  const cerrar = createIconButton({ icon: 'i-x', label: 'Cerrar' });

  const dialogo = el(
    'section',
    {
      className: size === 'sm' ? 'modal modal--sm' : 'modal',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': idTitulo },
    },
    [
      el('header', { className: 'modal-head' }, [
        el('div', {}, [
          el('h2', { text: title, attrs: { id: idTitulo } }),
          subtitle ? el('p', { text: `// ${subtitle}` }) : null,
        ]),
        cerrar,
      ]),
      el('div', { className: 'modal-body' }, body),
      footer.length ? el('footer', { className: 'modal-foot' }, footer) : null,
    ]
  );
  const overlay = el('div', { className: 'modal-overlay hidden' }, [dialogo]);

  estados.set(overlay, { onClose, retorno: null });
  cerrar.addEventListener('click', () => closeModal(overlay));
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) closeModal(overlay);
  });
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeModal(overlay);
    } else if (e.key === 'Tab') {
      atraparFoco(e, dialogo);
    }
  });
  return overlay;
}

const estados = new WeakMap();

/** Muestra el modal y lleva el foco al primer control. */
export function openModal(overlay, botonQueLoAbrio = document.activeElement) {
  const estado = estados.get(overlay);
  estado.retorno = botonQueLoAbrio;
  if (!overlay.isConnected) document.body.append(overlay);
  overlay.classList.remove('hidden');
  document.body.classList.add('has-modal');
  const cuerpo = overlay.querySelector('.modal-body');
  const primero = cuerpo.querySelector(ENFOCABLES) ?? overlay.querySelector(ENFOCABLES);
  primero?.focus();
}

/** Oculta el modal y devuelve el foco al botón que lo abrió. */
export function closeModal(overlay) {
  if (overlay.classList.contains('hidden')) return;
  const estado = estados.get(overlay);
  overlay.classList.add('hidden');
  document.body.classList.remove('has-modal');
  estado.retorno?.focus?.();
  estado.onClose?.();
}

function atraparFoco(evento, contenedor) {
  const nodos = [...contenedor.querySelectorAll(ENFOCABLES)].filter((n) => n.offsetParent !== null);
  if (nodos.length === 0) return;
  const primero = nodos[0];
  const ultimo = nodos[nodos.length - 1];
  if (evento.shiftKey && document.activeElement === primero) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault();
    primero.focus();
  }
}
