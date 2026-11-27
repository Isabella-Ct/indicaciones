// Configuración del frontend (constitución §V: js/config).
export const API_BASE = '/api/v1';
export const TIEMPO_ESPERA_MS = 15000;

export const RUTA_LOGIN = '/login.html';
export const RUTA_INICIO_PUBLICO = '/';

/**
 * Menú principal (SRS §3.1). Cada ítem se muestra solo si la sesión tiene su permiso
 * (la autorización real la hace el servidor, RNF-SEG-04). Las specs siguientes agregan los suyos.
 */
export const MENU = [
  { id: 'usuarios', texto: 'Usuarios', href: '/usuarios.html', permiso: 'usuarios.ver' },
  { id: 'roles', texto: 'Roles', href: '/roles.html', permiso: 'roles.ver', grupo: 'Configuración' },
  { id: 'permisos', texto: 'Permisos', href: '/permisos.html', permiso: 'roles.ver', grupo: 'Configuración' },
  { id: 'mi-perfil', texto: 'Mi perfil', href: '/mi-perfil.html', permiso: 'perfil.ver' },
];

/** Primera página a la que puede entrar la sesión después del login. */
export function paginaInicial(permisos) {
  const item = MENU.find((m) => permisos.includes(m.permiso));
  return item ? item.href : '/sin-acceso.html';
}
