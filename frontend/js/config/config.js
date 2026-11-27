// Configuración del frontend (constitución §V: js/config).
export const API_BASE = '/api/v1';
export const TIEMPO_ESPERA_MS = 15000;

export const RUTA_LOGIN = '/login.html';
export const RUTA_INICIO_PUBLICO = '/';
export const RUTA_CAMBIAR_CONTRASENA = '/cambiar-contrasena.html';

/**
 * Menú principal (SRS §3.1). Cada ítem se muestra solo si la sesión tiene su permiso
 * (la autorización real la hace el servidor, RNF-SEG-04). Las specs siguientes agregan los suyos.
 */
export const MENU = [
  // spec 004: el mapa con placas es del personal; el Cliente ve solo la disponibilidad (RF-CLD-17).
  { id: 'celdas', texto: 'Celdas', href: '/celdas.html', permiso: 'celdas.ver', tambien: 'movimientos.ver' },
  { id: 'disponibilidad', texto: 'Disponibilidad', href: '/disponibilidad.html', permiso: 'celdas.ver', ocultarCon: 'movimientos.ver' },
  { id: 'usuarios', texto: 'Usuarios', href: '/usuarios.html', permiso: 'usuarios.ver' },
  { id: 'parqueaderos', texto: 'Parqueaderos', href: '/parqueaderos.html', permiso: 'parqueaderos.ver', grupo: 'Configuración' },
  { id: 'roles', texto: 'Roles', href: '/roles.html', permiso: 'roles.ver', grupo: 'Configuración' },
  { id: 'permisos', texto: 'Permisos', href: '/permisos.html', permiso: 'roles.ver', grupo: 'Configuración' },
  { id: 'mi-perfil', texto: 'Mi perfil', href: '/mi-perfil.html', permiso: 'perfil.ver' },
];

/**
 * ¿La sesión ve este ítem? Exige `permiso` (y `tambien`, si lo hay); `ocultarCon` lo esconde a
 * quien tenga ese otro permiso (p. ej. Disponibilidad solo para quien no ve el mapa completo).
 */
export function itemPermitido(item, permisos) {
  if (!permisos.includes(item.permiso)) return false;
  if (item.tambien && !permisos.includes(item.tambien)) return false;
  return !(item.ocultarCon && permisos.includes(item.ocultarCon));
}

/** Primera página a la que puede entrar la sesión después del login. */
export function paginaInicial(permisos) {
  const item = MENU.find((m) => itemPermitido(m, permisos));
  return item ? item.href : '/sin-acceso.html';
}
