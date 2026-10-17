import { el, idUnico } from '../../../utils/dom.js';

/**
 * Panel (.panel): cabecera de asfalto (.panel-head) con título y acciones + cuerpo.
 * @param {{
 *   title: string,
 *   actions?: HTMLElement[],
 *   children?: Array<Node|string>,
 *   flush?: boolean,      // cuerpo sin relleno (tablas, mapas)
 *   tag?: string,
 * }} props
 * @returns {HTMLElement}
 */
export function createPanel({
  title,
  actions = [],
  children = [],
  flush = false,
  tag = 'section',
}) {
  const idTitulo = idUnico('panel');
  return el(tag, { className: 'panel', attrs: { 'aria-labelledby': idTitulo } }, [
    el('div', { className: 'panel-head' }, [
      el('h2', { text: title, attrs: { id: idTitulo } }),
      actions.length ? el('div', { className: 'panel-actions' }, actions) : null,
    ]),
    el('div', { className: flush ? 'panel-body panel-body--flush' : 'panel-body' }, children),
  ]);
}
