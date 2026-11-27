/**
 * Plantilla · template-app-layout: marco de las páginas internas (organism-header con el reloj del
 * turno y el menú de usuario, organism-navbar, hazard-strip, contenido y organism-footer), todo
 * escrito en el HTML de cada página. Exige sesión y aplica las reglas de acceso de la spec 003:
 *   - contraseña temporal pendiente → cambiar-contrasena.html (RF-ACC-04);
 *   - página sin permiso para el rol → primera pantalla permitida (HU-13 E3);
 *   - volver atrás después de cerrar sesión → inicio de sesión (HU-16 E2).
 * No llama a la API: la página le pasa el callback de cierre de sesión (alSalir).
 */
import { RUTA_LOGIN, RUTA_CAMBIAR_CONTRASENA, paginaInicial } from '../../config/config.js';
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

const enPagina = (ruta) => location.pathname === ruta;

/**
 * @param {{ permiso?: string | string[], alSalir?: () => Promise<void> }} opciones
 * @returns {{ sesion: object, permitido: boolean } | null} null si la página redirige
 */
export function montarMarco({ permiso, alSalir } = {}) {
  const sesion = leerSesion();
  if (!sesion) {
    location.replace(`${RUTA_LOGIN}?volver=${encodeURIComponent(location.pathname + location.search)}`);
    return null;
  }
  if (sesion.usuario.debeCambiarContrasena && !enPagina(RUTA_CAMBIAR_CONTRASENA)) {
    location.replace(RUTA_CAMBIAR_CONTRASENA);
    return null;
  }
  // `permiso` puede ser un código o una lista (todos obligatorios).
  const permitido = [permiso ?? []].flat().every((p) => sesion.permisos.includes(p));
  const inicio = paginaInicial(sesion.permisos);
  if (!permitido && !enPagina(inicio)) {
    location.replace(inicio);
    return null;
  }

  // Al volver con «Atrás» el navegador puede mostrar la página desde su caché: sin sesión, al login.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && !leerSesion()) location.replace(RUTA_LOGIN);
  });

  alAvisar(mostrarAviso);
  iniciarReloj();
  prepararNavbar(sesion.permisos);
  prepararMenuUsuario(sesion.usuario, async () => {
    try {
      await alSalir?.();
    } finally {
      location.replace(RUTA_LOGIN);
    }
  });
  $('pie-anio').textContent = String(new Date().getFullYear());

  $('contenido').classList.toggle('hidden', !permitido);
  $('sin-permiso')?.classList.toggle('hidden', permitido);
  $('app').classList.remove('hidden');
  return { sesion, permitido };
}
