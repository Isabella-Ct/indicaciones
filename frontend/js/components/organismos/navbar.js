/**
 * Organismo · organism-navbar: barra de navegación principal. Sus ítems ya están escritos en la
 * página; aquí se ocultan los que la sesión no puede usar (constitución §V; la autorización real
 * la hace el servidor) y se conecta el botón del menú desplegable en móvil (≤ 760 px).
 */
import { MENU, itemPermitido } from '../../config/config.js';

/** @param {string[]} permisos permisos de la sesión */
export function prepararNavbar(permisos) {
  const permitidos = new Set(MENU.filter((m) => itemPermitido(m, permisos)).map((m) => m.id));
  document.querySelectorAll('.organism-navbar-item').forEach((item) => {
    item.closest('li').classList.toggle('hidden', !permitidos.has(item.dataset.id));
  });

  const navbar = document.getElementById('navbar');
  const alternar = document.getElementById('navbar-alternar');
  alternar.addEventListener('click', () => {
    const abierto = navbar.classList.toggle('is-open');
    alternar.setAttribute('aria-expanded', String(abierto));
    alternar.setAttribute('aria-label', abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
  });
}
