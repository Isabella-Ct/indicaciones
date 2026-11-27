// Sesión del navegador en sessionStorage (se borra al cerrar la pestaña; frontend-integration §6).
const CLAVE = 'parqueadero.sesion';

/** @returns {{ token: string, expiraEn: string, usuario: object, permisos: string[] } | null} */
export function leerSesion() {
  try {
    const sesion = JSON.parse(sessionStorage.getItem(CLAVE) || 'null');
    if (!sesion?.token) return null;
    if (sesion.expiraEn && new Date(sesion.expiraEn) <= new Date()) {
      borrarSesion();
      return null;
    }
    return sesion;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion) {
  sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
}

export function borrarSesion() {
  sessionStorage.removeItem(CLAVE);
}

export function tokenActual() {
  return leerSesion()?.token ?? null;
}

export function tienePermiso(codigo) {
  return Boolean(leerSesion()?.permisos?.includes(codigo));
}

/** "Laura Gómez Restrepo" → "LG" */
export function iniciales(nombre) {
  return String(nombre || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}
