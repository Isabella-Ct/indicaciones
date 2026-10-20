import { el, idUnico } from '../../../utils/dom.js';
import { createIcon } from '../../atoms/icon/icon.js';
import { createSpinner } from '../../atoms/spinner/spinner.js';
import { formatearFechaHora } from '../../../utils/formato.js';

/**
 * Campana de notificaciones del header (REQ-NOT-1): contador de no leídas y desplegable
 * con las últimas. No llama a la API: la página (montar-app) le pasa las funciones y
 * actualiza el contador en vivo con setBellCount / setBellItems.
 * @param {{
 *   noLeidas?: number,
 *   verTodasHref: string,
 *   onAbrir: () => void,                       // pedir las últimas (luego setBellItems)
 *   onSeleccionar: (n: object) => void,        // marcar leída y seguir su enlace
 *   onLeerTodas: () => void,
 * }} props
 * @returns {HTMLDivElement}
 */
export function createNotificationBell({
  noLeidas = 0,
  verTodasHref,
  onAbrir,
  onSeleccionar,
  onLeerTodas,
}) {
  const idPanel = idUnico('campana');
  const contador = el('span', { className: 'bell-count', attrs: { 'aria-hidden': 'true' } });
  const boton = el(
    'button',
    {
      className: 'bell-button',
      attrs: { type: 'button', 'aria-expanded': 'false', 'aria-controls': idPanel },
    },
    [createIcon({ name: 'i-bell' }), contador]
  );
  const lista = el('ul', { className: 'bell-list', attrs: { 'aria-live': 'polite' } });
  const leerTodas = el('button', {
    className: 'bell-action',
    text: 'Marcar todas leídas',
    attrs: { type: 'button' },
    on: { click: () => onLeerTodas() },
  });
  const panel = el(
    'div',
    {
      className: 'bell-panel hidden',
      attrs: { id: idPanel, role: 'region', 'aria-label': 'Notificaciones recientes' },
    },
    [
      el('div', { className: 'bell-head' }, [el('strong', { text: 'Notificaciones' }), leerTodas]),
      lista,
      el('a', { className: 'bell-all', text: 'Ver todas', attrs: { href: verTodasHref } }),
    ]
  );
  const campana = el('div', { className: 'bell' }, [boton, panel]);
  campana._estado = { onSeleccionar, contador, boton, lista, leerTodas };

  function abrir(abierto) {
    panel.classList.toggle('hidden', !abierto);
    boton.setAttribute('aria-expanded', String(abierto));
    if (abierto) {
      lista.replaceChildren(
        el('li', { className: 'bell-empty' }, [createSpinner({ label: 'Cargando…' })])
      );
      onAbrir();
    }
  }
  boton.addEventListener('click', () => abrir(panel.classList.contains('hidden')));
  campana.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.classList.contains('hidden')) {
      abrir(false);
      boton.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!campana.contains(e.target)) abrir(false);
  });

  setBellCount(campana, noLeidas);
  return campana;
}

/** Actualiza el contador (y la etiqueta accesible) sin recargar. */
export function setBellCount(campana, noLeidas) {
  const { contador, boton, leerTodas } = campana._estado;
  contador.textContent = noLeidas > 99 ? '99+' : String(noLeidas);
  contador.classList.toggle('hidden', noLeidas === 0);
  leerTodas.disabled = noLeidas === 0;
  boton.setAttribute(
    'aria-label',
    noLeidas ? `Notificaciones: ${noLeidas} sin leer` : 'Notificaciones: ninguna sin leer'
  );
}

/** Pinta las últimas notificaciones en el desplegable. */
export function setBellItems(campana, items) {
  const { lista, onSeleccionar } = campana._estado;
  if (!items.length) {
    lista.replaceChildren(el('li', { className: 'bell-empty', text: 'No tienes notificaciones.' }));
    return;
  }
  lista.replaceChildren(
    ...items.map((n) =>
      el('li', {}, [
        el(
          'button',
          {
            className: n.leida ? 'bell-item' : 'bell-item is-unread',
            attrs: { type: 'button' },
            on: { click: () => onSeleccionar(n) },
          },
          [
            el('strong', { text: n.titulo }),
            el('span', { className: 'bell-item-text', text: n.mensaje }),
            el('small', { text: formatearFechaHora(n.fecha) }),
          ]
        ),
      ])
    )
  );
}
