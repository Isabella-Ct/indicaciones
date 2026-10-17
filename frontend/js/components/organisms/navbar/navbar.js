import { el, idUnico } from '../../../utils/dom.js';
import { createIconButton } from '../../atoms/icon-button/icon-button.js';

/**
 * Barra de navegación (.navbar). Recibe SOLO los ítems permitidos al rol.
 * En móvil (≤ 760 px) se vuelve un menú desplegable con un icon-button.
 * @param {{
 *   items: Array<{ id: string, etiqueta: string, href: string }>,
 *   activeId?: string,
 * }} props
 * @returns {HTMLElement}
 */
export function createNavbar({ items, activeId }) {
  const idLista = idUnico('nav');
  const lista = el(
    'ul',
    { className: 'navbar-list', attrs: { id: idLista } },
    items.map((item) => {
      const activo = item.id === activeId;
      return el('li', {}, [
        el('a', {
          className: activo ? 'navbar-item is-active' : 'navbar-item',
          text: item.etiqueta,
          attrs: { href: item.href, 'aria-current': activo ? 'page' : null },
        }),
      ]);
    })
  );

  const actual = items.find((i) => i.id === activeId);
  const alternar = createIconButton({
    icon: 'i-menu',
    label: 'Abrir menú de navegación',
    attrs: { 'aria-expanded': 'false', 'aria-controls': idLista },
  });
  const nav = el('nav', { className: 'navbar', attrs: { 'aria-label': 'Principal' } }, [
    el('div', { className: 'navbar-inner' }, [
      el('div', { className: 'navbar-bar' }, [
        el('span', { className: 'navbar-current', text: actual ? actual.etiqueta : 'Menú' }),
        alternar,
      ]),
      lista,
    ]),
  ]);

  alternar.addEventListener('click', () => {
    const abierto = nav.classList.toggle('is-open');
    alternar.setAttribute('aria-expanded', String(abierto));
    alternar.setAttribute(
      'aria-label',
      abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'
    );
  });
  return nav;
}
