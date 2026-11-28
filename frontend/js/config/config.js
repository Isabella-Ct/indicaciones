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
  // spec 007: la caseta es la primera pantalla del personal (entradas, salidas y vehículos dentro).
  { id: 'movimientos', texto: 'Movimientos', href: '/movimientos.html', permiso: 'movimientos.ver' },
  // spec 009: facturación y caja del personal; el Cliente ve solo sus facturas.
  { id: 'facturas', texto: 'Facturación', href: '/facturas.html', permiso: 'facturas.ver' },
  { id: 'caja', texto: 'Caja', href: '/caja.html', permiso: 'caja.ver' },
  // spec 004: el mapa con placas es del personal; el Cliente ve solo la disponibilidad (RF-CLD-17).
  { id: 'celdas', texto: 'Celdas', href: '/celdas.html', permiso: 'celdas.ver', tambien: 'movimientos.ver' },
  { id: 'disponibilidad', texto: 'Disponibilidad', href: '/disponibilidad.html', permiso: 'celdas.ver', ocultarCon: 'movimientos.ver' },
  // spec 005: el personal consulta todos los vehículos; el Cliente solo los suyos (RF-VEH-12).
  { id: 'vehiculos', texto: 'Vehículos', href: '/vehiculos.html', permiso: 'vehiculos.ver' },
  { id: 'mis-vehiculos', texto: 'Mis vehículos', href: '/mis-vehiculos.html', permiso: 'perfil.ver', ocultarCon: 'vehiculos.ver' },
  { id: 'mis-facturas', texto: 'Mis facturas', href: '/mis-facturas.html', permiso: 'perfil.ver', ocultarCon: 'facturas.ver' },
  // spec 010: el personal gestiona las membresías; el Cliente ve la suya y se suscribe desde su panel.
  { id: 'membresias', texto: 'Membresías', href: '/membresias.html', permiso: 'membresias.ver' },
  { id: 'mi-membresia', texto: 'Mi membresía', href: '/mi-membresia.html', permiso: 'perfil.ver', ocultarCon: 'membresias.ver' },
  // spec 012: el personal ve las reservas del día; el Cliente reserva y ve las suyas.
  { id: 'reservas', texto: 'Reservas', href: '/reservas.html', permiso: 'reservas.ver' },
  { id: 'mis-reservas', texto: 'Mis reservas', href: '/mis-reservas.html', permiso: 'perfil.ver', ocultarCon: 'reservas.ver' },
  { id: 'usuarios', texto: 'Usuarios', href: '/usuarios.html', permiso: 'usuarios.ver' },
  { id: 'parqueaderos', texto: 'Parqueaderos', href: '/parqueaderos.html', permiso: 'parqueaderos.ver', grupo: 'Configuración' },
  // spec 006: solo quien configura ve la tabla semanal en el menú (el aviso de hoy está en otras pantallas).
  { id: 'pico-placa', texto: 'Pico y placa', href: '/pico-placa.html', permiso: 'restricciones.crear', grupo: 'Configuración' },
  // spec 008: la lista la ven Operador y Cliente (solo lectura); solo el Administrador la edita.
  { id: 'tarifas', texto: 'Tarifas', href: '/tarifas.html', permiso: 'tarifas.ver', grupo: 'Configuración' },
  // spec 010: solo quien configura los planes los ve en el menú (el Cliente los ve en Mi membresía).
  { id: 'planes', texto: 'Planes', href: '/planes.html', permiso: 'planes.crear', grupo: 'Configuración' },
  // spec 011: el Operador los consulta en modo de solo lectura; solo el Administrador los configura.
  { id: 'descuentos', texto: 'Descuentos', href: '/descuentos.html', permiso: 'descuentos.ver', grupo: 'Configuración' },
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
