/**
 * Molécula · molecule-user-menu: nombre, rol e iniciales del usuario en sesión y su menú
 * desplegable (Esc o clic fuera lo cierran). No llama a la API: recibe el callback de salida.
 */
import { iniciales } from '../../utils/sesion.js';

/** Botón que abre y cierra un panel; se cierra con Esc o con un clic fuera. */
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

/**
 * @param {{ nombreCompleto: string, rol: string }} usuario
 * @param {() => Promise<void>} alSalir
 */
export function prepararMenuUsuario(usuario, alSalir) {
  const $ = (id) => document.getElementById(id);
  $('menu-usuario-nombre').textContent = usuario.nombreCompleto;
  $('menu-usuario-rol').textContent = usuario.rol;
  $('menu-usuario-iniciales').textContent = iniciales(usuario.nombreCompleto);
  desplegable($('menu-usuario'), $('menu-usuario-boton'), $('menu-usuario-lista'));
  $('menu-usuario-salir').addEventListener('click', () => alSalir());
}
