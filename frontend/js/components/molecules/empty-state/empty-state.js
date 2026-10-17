import { el } from '../../../utils/dom.js';

/**
 * Estado vacío (.empty-state): borde punteado, título y texto.
 * @param {{ title: string, text?: string, action?: HTMLElement }} props
 * @returns {HTMLDivElement}
 */
export function createEmptyState({ title, text, action }) {
  return el('div', { className: 'empty-state' }, [
    el('strong', { text: title }),
    text ? el('p', { text }) : null,
    action ? el('div', { className: 'empty-state-action' }, [action]) : null,
  ]);
}
