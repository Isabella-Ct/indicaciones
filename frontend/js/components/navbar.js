/**
 * Marco de las páginas internas (header, navbar y menú de usuario ya escritos en el HTML).
 * Exige sesión, muestra solo los ítems del menú cuyos permisos tiene la sesión (constitución §V;
 * la autorización real es del servidor) y conecta reloj, menú móvil y menú de usuario.
 * No llama a la API: la vista le pasa el callback de cierre de sesión.
 */
import { MENU, RUTA_LOGIN } from '../config/config.js';
import { leerSesion, iniciales } from '../utils/sesion.js';
import { formatearFecha, formatearHora } from '../utils/formato.js';
import { alAvisar } from '../api/http.js';
import { mostrarAviso } from './toast.js';

const $ = (id) => document.getElementById(id);

function iniciarReloj() {
  const actualizar = () => {
    const ahora = new Date();
    $('marco-fecha').textContent = formatearFecha(ahora);
    $('marco-hora').textContent = formatearHora(ahora);
  };
  actualizar();
  setInterval(actualizar, 30 * 1000);
}

/** Botón que abre/cierra un panel; se cierra con Esc o con un clic fuera. */
function desplegable(contenedor, boton, panel) {
  const abrir = (abierto) => {
    panel.classList.toggle('hidden', !abierto);
    boton.setAttribute('aria-expanded', String(abierto));
  };
  boton.addEventListener('click', () => abrir(panel.classList.contains('hidden')));
  contenedor.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.classList.contains('hidden')) {
      abrir(false);
      boton.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!contenedor.contains(e.target)) abrir(false);
  });
}

function prepararNavbar(permisos) {
  const permitidos = new Set(MENU.filter((m) => permisos.includes(m.permiso)).map((m) => m.id));
  document.querySelectorAll('.organism-navbar-item').forEach((item) => {
    item.closest('li').classList.toggle('hidden', !permitidos.has(item.dataset.id));
  });
  const navbar = $('navbar');
  const alternar = $('navbar-alternar');
  alternar.addEventListener('click', () => {
    const abierto = navbar.classList.toggle('is-open');
    alternar.setAttribute('aria-expanded', String(abierto));
    alternar.setAttribute('aria-label', abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
  });
}

function prepararMenuUsuario(usuario, alSalir) {
  $('menu-usuario-nombre').textContent = usuario.nombreCompleto;
  $('menu-usuario-rol').textContent = usuario.rol;
  $('menu-usuario-iniciales').textContent = iniciales(usuario.nombreCompleto);
  desplegable($('menu-usuario'), $('menu-usuario-boton'), $('menu-usuario-lista'));
  $('menu-usuario-salir').addEventListener('click', async () => {
    try {
      await alSalir?.();
    } finally {
      location.assign(RUTA_LOGIN);
    }
  });
}

/**
 * Monta el marco. Si no hay sesión redirige al login; si la sesión no tiene `permiso`,
 * muestra el bloque #sin-permiso (HU-06 E2) en lugar del contenido.
 * @param {{ permiso?: string, alSalir?: () => Promise<void> }} opciones
 * @returns {{ sesion: object, permitido: boolean } | null}
 */
export function montarMarco({ permiso, alSalir } = {}) {
  const sesion = leerSesion();
  if (!sesion) {
    location.replace(`${RUTA_LOGIN}?volver=${encodeURIComponent(location.pathname + location.search)}`);
    return null;
  }
  alAvisar(mostrarAviso);
  iniciarReloj();
  prepararNavbar(sesion.permisos);
  prepararMenuUsuario(sesion.usuario, alSalir);
  $('pie-anio').textContent = String(new Date().getFullYear());

  const permitido = !permiso || sesion.permisos.includes(permiso);
  $('contenido').classList.toggle('hidden', !permitido);
  $('sin-permiso')?.classList.toggle('hidden', permitido);
  $('app').classList.remove('hidden');
  return { sesion, permitido };
}
