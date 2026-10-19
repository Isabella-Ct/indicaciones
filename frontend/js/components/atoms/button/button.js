import { el } from '../../../utils/dom.js';
import { createIcon } from '../icon/icon.js';

/**
 * Botón PARKO (.btn).
 * @param {{
 *   label: string,
 *   variant?: 'primary'|'dark'|'ghost',
 *   block?: boolean,
 *   size?: 'md'|'sm',       // sm: botones dentro de tablas y barras
 *   icon?: string,
 *   type?: 'button'|'submit'|'reset',
 *   href?: string,          // si se da, se dibuja como <a> con aspecto de botón
 *   disabled?: boolean,
 *   id?: string,
 *   ariaLabel?: string,
 *   onClick?: (e: MouseEvent) => void,
 * }} props
 * @returns {HTMLButtonElement|HTMLAnchorElement}
 */
export function createButton({
  label,
  variant = 'primary',
  block = false,
  size = 'md',
  icon,
  type = 'button',
  href,
  disabled = false,
  id,
  ariaLabel,
  onClick,
} = {}) {
  const clases = ['btn'];
  if (variant !== 'primary') clases.push(`btn--${variant}`);
  if (block) clases.push('btn--block');
  if (size === 'sm') clases.push('btn--sm');

  const contenido = [icon ? createIcon({ name: icon }) : null, el('span', { text: label })];
  const boton = href
    ? el(
        'a',
        { className: clases.join(' '), attrs: { href, id, 'aria-label': ariaLabel } },
        contenido
      )
    : el(
        'button',
        { className: clases.join(' '), attrs: { type, id, disabled, 'aria-label': ariaLabel } },
        contenido
      );
  if (onClick) boton.addEventListener('click', onClick);
  return boton;
}

const textosOriginales = new WeakMap();

/** Pone o quita el estado "cargando" (deshabilitado + aria-busy + texto opcional). */
export function setButtonLoading(boton, cargando, textoCargando) {
  const span = boton.querySelector('span');
  if (cargando) {
    boton.setAttribute('aria-busy', 'true');
    boton.disabled = true;
    if (span && textoCargando) {
      textosOriginales.set(boton, span.textContent);
      span.textContent = textoCargando;
    }
  } else {
    boton.removeAttribute('aria-busy');
    boton.disabled = false;
    if (span && textosOriginales.has(boton)) span.textContent = textosOriginales.get(boton);
  }
}
