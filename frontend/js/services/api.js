/**
 * Wrapper de fetch para /api/v1: envía la cookie de sesión, convierte errores
 * al formato { codigo, mensaje, detalles } y redirige a login ante un 401.
 */
import { RUTA_LOGIN, RUTA_CAMBIAR_CONTRASENA } from '../utils/sesion.js';

const BASE = '/api/v1';

export class ApiError extends Error {
  constructor(estado, codigo, mensaje, detalles = []) {
    super(mensaje);
    this.name = 'ApiError';
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

function irALogin() {
  const actual = `${location.pathname}${location.search}`;
  location.assign(`${RUTA_LOGIN}?siguiente=${encodeURIComponent(actual)}`);
}

/**
 * @param {string} ruta ej. "/auth/me"
 * @param {{ method?: string, body?: unknown, redirigir401?: boolean, signal?: AbortSignal }} [opciones]
 * @returns {Promise<{ data: any, meta?: any }>}
 */
export async function api(ruta, { method = 'GET', body, redirigir401 = true, signal } = {}) {
  const esFormData = body instanceof FormData;
  let respuesta;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method,
      credentials: 'include',
      // FormData (fotos) la codifica el navegador como multipart con su propio boundary.
      headers: body !== undefined && !esFormData ? { 'Content-Type': 'application/json' } : {},
      body: body === undefined || esFormData ? body : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(
      0,
      'SIN_CONEXION',
      'No se pudo conectar con el servidor. Revisa tu conexión.'
    );
  }

  const esJson = respuesta.headers.get('content-type')?.includes('application/json');
  const cuerpo = esJson ? await respuesta.json().catch(() => null) : null;

  if (!respuesta.ok) {
    const error = cuerpo?.error ?? {};
    if (respuesta.status === 401 && redirigir401) irALogin();
    if (respuesta.status === 403 && error.codigo === 'DEBE_CAMBIAR_CONTRASENA') {
      location.assign(RUTA_CAMBIAR_CONTRASENA);
    }
    throw new ApiError(
      respuesta.status,
      error.codigo ?? 'ERROR_HTTP',
      error.mensaje ?? `Error ${respuesta.status} del servidor.`,
      error.detalles ?? []
    );
  }
  return cuerpo ?? { data: null };
}

export const get = (ruta, opciones) => api(ruta, { ...opciones, method: 'GET' });
export const post = (ruta, body, opciones) => api(ruta, { ...opciones, method: 'POST', body });
export const put = (ruta, body, opciones) => api(ruta, { ...opciones, method: 'PUT', body });
export const patch = (ruta, body, opciones) => api(ruta, { ...opciones, method: 'PATCH', body });
export const del = (ruta, opciones) => api(ruta, { ...opciones, method: 'DELETE' });
