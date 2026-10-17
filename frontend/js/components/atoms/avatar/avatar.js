import { el } from '../../../utils/dom.js';

/**
 * Avatar cuadrado: foto del usuario o sus iniciales.
 * @param {{ nombre: string, fotoUrl?: string|null, size?: 'sm'|'md' }} props
 * @returns {HTMLSpanElement}
 */
export function createAvatar({ nombre = '', fotoUrl = null, size = 'sm' } = {}) {
  const clase = size === 'md' ? 'avatar avatar--md' : 'avatar';
  if (fotoUrl) {
    return el('span', { className: clase }, [el('img', { attrs: { src: fotoUrl, alt: '' } })]);
  }
  const iniciales = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
  return el('span', { className: clase, text: iniciales, attrs: { 'aria-hidden': 'true' } });
}
