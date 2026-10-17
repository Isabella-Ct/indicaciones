/**
 * Helpers de sesión y rol (sin llamadas a la API: eso lo hacen los services).
 */
const ETIQUETAS_ROL = {
  administrador: 'Administrador',
  operador: 'Operador',
  usuario: 'Cliente',
};

export const TIPOS_DOCUMENTO = [
  { value: 'CC', label: 'Cédula de ciudadanía (CC)' },
  { value: 'CE', label: 'Cédula de extranjería (CE)' },
  { value: 'TI', label: 'Tarjeta de identidad (TI)' },
  { value: 'PAS', label: 'Pasaporte (PAS)' },
  { value: 'NIT', label: 'NIT' },
];

export const RUTA_INICIO = '/app/inicio.html';
export const RUTA_LOGIN = '/login.html';
export const RUTA_CAMBIAR_CONTRASENA = '/app/cambiar-contrasena.html';

export function etiquetaRol(rol) {
  return ETIQUETAS_ROL[rol] ?? rol;
}

export function tienePermiso(sesion, codigo) {
  return Boolean(sesion?.permisos?.includes(codigo));
}

export function esPersonal(sesion) {
  return sesion?.rol === 'administrador' || sesion?.rol === 'operador';
}

/** "Laura Marcela" + "Gómez Ríos" → "L. Gómez" */
export function nombreCorto(sesion) {
  if (!sesion) return '';
  const inicial = sesion.nombres?.charAt(0) ?? '';
  const apellido = sesion.apellidos?.split(' ')[0] ?? '';
  return `${inicial}. ${apellido}`.trim();
}

export function primerNombre(sesion) {
  return sesion?.nombres?.split(' ')[0] ?? '';
}

/**
 * Valida el parámetro ?siguiente= para evitar redirecciones abiertas:
 * solo rutas internas que empiezan por "/" (no "//").
 */
export function rutaSiguienteSegura(valor) {
  if (typeof valor !== 'string' || !valor.startsWith('/') || valor.startsWith('//')) return null;
  if (valor.startsWith(RUTA_LOGIN)) return null;
  return valor;
}
