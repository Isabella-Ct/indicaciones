import { el } from '../../../utils/dom.js';

/**
 * Enlace de texto (.link). `onDark` para usarlo sobre fondos de asfalto.
 * @param {{ href: string, text: string, onDark?: boolean, external?: boolean, id?: string }} props
 * @returns {HTMLAnchorElement}
 */
export function createLink({ href, text, onDark = false, external = false, id } = {}) {
  return el('a', {
    className: onDark ? 'link link--on-dark' : 'link',
    text,
    attrs: {
      href,
      id,
      target: external ? '_blank' : null,
      rel: external ? 'noopener noreferrer' : null,
    },
  });
}
