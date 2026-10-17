import { el } from '../../../utils/dom.js';
import { createIcon } from '../icon/icon.js';

/**
 * Botón cuadrado solo con icono (.icon-button). `label` es obligatorio (aria-label).
 * @param {{ icon: string, label: string, id?: string, onClick?: (e: MouseEvent) => void, attrs?: object }} props
 * @returns {HTMLButtonElement}
 */
export function createIconButton({ icon, label, id, onClick, attrs = {} }) {
  const boton = el(
    'button',
    {
      className: 'icon-button',
      attrs: { type: 'button', id, 'aria-label': label, title: label, ...attrs },
    },
    [createIcon({ name: icon })]
  );
  if (onClick) boton.addEventListener('click', onClick);
  return boton;
}
