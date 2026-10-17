import { svgEl } from '../../../utils/dom.js';

export const SPRITE = '/assets/icons.svg';

/**
 * Icono del sprite SVG.
 * @param {{ name: string, className?: string, viewBox?: string, label?: string }} props
 *   label: texto accesible; si no se da, el icono es decorativo (aria-hidden).
 * @returns {SVGSVGElement}
 */
export function createIcon({ name, className = 'icon', viewBox, label } = {}) {
  const svg = svgEl('svg', {
    class: className,
    viewBox,
    'aria-hidden': label ? null : 'true',
    role: label ? 'img' : null,
    'aria-label': label ?? null,
    focusable: 'false',
  });
  svg.append(svgEl('use', { href: `${SPRITE}#${name}` }));
  return svg;
}
