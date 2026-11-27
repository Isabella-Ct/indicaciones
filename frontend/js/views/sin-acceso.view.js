// Usuario autenticado sin pantallas disponibles: el botón cierra la sesión del navegador.
import { cerrarSesion } from '../services/auth.service.js';

document.getElementById('sin-acceso-salir').addEventListener('click', async (e) => {
  e.preventDefault();
  await cerrarSesion();
  location.assign('/login.html');
});
