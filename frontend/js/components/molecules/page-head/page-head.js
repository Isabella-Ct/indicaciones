import { el } from '../../../utils/dom.js';

/**
 * Encabezado de página (.page-head): h1 condensado + subtítulo mono "// …" + acciones.
 * @param {{ title: string, subtitle?: string, actions?: HTMLElement[] }} props
 * @returns {HTMLDivElement}
 */
export function createPageHead({ title, subtitle, actions = [] }) {
  return el('div', { className: 'page-head' }, [
    el('div', {}, [
      el('h1', { text: title }),
      subtitle ? el('p', { text: `// ${subtitle}` }) : null,
    ]),
    actions.length ? el('div', { className: 'page-head-actions' }, actions) : null,
  ]);
}
