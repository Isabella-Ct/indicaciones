/**
 * Preferencias por navegador (localStorage) y avisos entre páginas (sessionStorage).
 * Todo envuelto en try/catch: el almacenamiento puede no estar disponible.
 */
const CLAVE_PUERTA = 'parko.puerta';
const CLAVE_AVISO = 'parko.aviso';

export function leerPuertaPreferida() {
  try {
    return Number(localStorage.getItem(CLAVE_PUERTA)) || null;
  } catch {
    return null;
  }
}

export function guardarPuertaPreferida(id) {
  try {
    localStorage.setItem(CLAVE_PUERTA, String(id));
  } catch {
    /* sin almacenamiento: se usa la primera puerta */
  }
}

/** Deja un aviso para mostrarlo como toast en la siguiente página. */
export function guardarAviso(mensaje, variante = 'success') {
  try {
    sessionStorage.setItem(CLAVE_AVISO, JSON.stringify({ mensaje, variante }));
  } catch {
    /* se pierde el aviso, no es crítico */
  }
}

/** Lee y borra el aviso pendiente. */
export function tomarAviso() {
  try {
    const valor = sessionStorage.getItem(CLAVE_AVISO);
    sessionStorage.removeItem(CLAVE_AVISO);
    return valor ? JSON.parse(valor) : null;
  } catch {
    return null;
  }
}
