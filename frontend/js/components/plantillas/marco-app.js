/**
 * Plantilla · template-app-layout: marco de las páginas internas (organism-header con el reloj del
 * turno y el menú de usuario, organism-navbar, hazard-strip, contenido y organism-footer), todo
 * escrito en el HTML de cada página. Exige sesión y muestra el contenido solo si la sesión tiene
 * el permiso de la página; si no, muestra el bloque #sin-permiso (HU-06 E2).
 * No llama a la API: la página le pasa el callback de cierre de sesión.
 */
import { RUTA_LOGIN } from '../../config/config.js';
import { leerSesion } from '../../utils/sesion.js';
import { formatearFecha, formatearHora } from '../../utils/formato.js';
import { alAvisar } from '../../api/http.js';
import { mostrarAviso } from '../moleculas/aviso.js';
import { prepararMenuUsuario } from '../moleculas/menu-usuario.js';
import { prepararNavbar } from '../organismos/navbar.js';

const $ = (id) => document.getElementById(id);

/** Molécula · molecule-shift del encabezado: fecha y hora reales, actualizadas cada 30 s. */
function iniciarReloj() {
  const actualizar = () => {
    const ahora = new Date();
    $('marco-fecha').textContent = formatearFecha(ahora);
    $('marco-hora').textContent = formatearHora(ahora);
  };
  actualizar();
  setInterval(actualizar, 30 * 1000);
}

/**
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
  prepararMenuUsuario(sesion.usuario, async () => {
    try {
      await alSalir?.();
    } finally {
      location.assign(RUTA_LOGIN);
    }
  });
  $('pie-anio').textContent = String(new Date().getFullYear());

  const permitido = !permiso || sesion.permisos.includes(permiso);
  $('contenido').classList.toggle('hidden', !permitido);
  $('sin-permiso')?.classList.toggle('hidden', permitido);
  $('app').classList.remove('hidden');
  return { sesion, permitido };
}
