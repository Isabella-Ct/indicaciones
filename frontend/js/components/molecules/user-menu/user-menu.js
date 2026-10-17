import { el, idUnico } from '../../../utils/dom.js';
import { createIcon } from '../../atoms/icon/icon.js';
import { createAvatar } from '../../atoms/avatar/avatar.js';

/**
 * Menú de usuario del header: botón (avatar + nombre + rol) que despliega opciones.
 * Se cierra con Esc (devolviendo el foco al botón) o al hacer clic fuera.
 * @param {{
 *   nombre: string,
 *   rol: string,
 *   fotoUrl?: string|null,
 *   items: Array<{ label: string, icon?: string, href?: string, onClick?: () => void }>,
 * }} props
 * @returns {HTMLDivElement}
 */
export function createUserMenu({ nombre, rol, fotoUrl, items }) {
  const idLista = idUnico('menu-usuario');
  const boton = el(
    'button',
    {
      className: 'user-menu-button',
      attrs: {
        type: 'button',
        'aria-expanded': 'false',
        'aria-controls': idLista,
        'aria-haspopup': 'true',
      },
    },
    [
      createAvatar({ nombre, fotoUrl }),
      el('span', { className: 'user-menu-name' }, [nombre, el('small', { text: rol })]),
      createIcon({ name: 'i-chevron-down' }),
    ]
  );

  const lista = el(
    'ul',
    { className: 'user-menu-list hidden', attrs: { id: idLista } },
    items.map((item) => {
      const contenido = [item.icon ? createIcon({ name: item.icon }) : null, item.label];
      const accion = item.href
        ? el('a', { className: 'user-menu-item', attrs: { href: item.href } }, contenido)
        : el('button', { className: 'user-menu-item', attrs: { type: 'button' } }, contenido);
      if (item.onClick) accion.addEventListener('click', item.onClick);
      return el('li', {}, [accion]);
    })
  );

  const menu = el('div', { className: 'user-menu' }, [boton, lista]);

  function abrir(abierto) {
    lista.classList.toggle('hidden', !abierto);
    boton.setAttribute('aria-expanded', String(abierto));
  }
  boton.addEventListener('click', () => abrir(lista.classList.contains('hidden')));
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lista.classList.contains('hidden')) {
      abrir(false);
      boton.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target)) abrir(false);
  });
  return menu;
}
