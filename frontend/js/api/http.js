// Cliente fetch único (constitución §V; frontend-integration §3): Bearer, sobre
// { ok, data, meta, error }, timeout con AbortController, 401 → login, 403 → aviso.
import { API_BASE, TIEMPO_ESPERA_MS, RUTA_LOGIN } from '../config/config.js';
import { tokenActual, borrarSesion } from '../utils/sesion.js';

export class ErrorApi extends Error {
  /**
   * @param {number} status
   * @param {string} code
   * @param {string} message
   * @param {Array<{campo: string|null, mensaje: string}>} [details]
   */
  constructor(status, code, message, details = []) {
    super(message);
    this.name = 'ErrorApi';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Avisos globales (403, sin conexión). La página registra quién los muestra. */
let avisar = () => {};
export function alAvisar(fn) {
  avisar = fn;
}

/**
 * @param {string} ruta ruta relativa a /api/v1, p. ej. '/roles'
 * @param {{ method?: string, body?: unknown, query?: Record<string, unknown>, publica?: boolean }} [opciones]
 * @returns {Promise<{ data: any, meta?: any }>}
 */
export async function solicitar(ruta, { method = 'GET', body, query, publica = false } = {}) {
  const url = new URL(API_BASE + ruta, location.origin);
  for (const [clave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') url.searchParams.set(clave, String(valor));
  }

  // Con FormData (fotos) el navegador pone el Content-Type con su boundary (spec 002 R-11).
  const esFormulario = body instanceof FormData;
  const cabeceras = { Accept: 'application/json' };
  if (body !== undefined && !esFormulario) cabeceras['Content-Type'] = 'application/json';
  const token = tokenActual();
  if (token && !publica) cabeceras.Authorization = `Bearer ${token}`;

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_ESPERA_MS);
  let respuesta;
  try {
    respuesta = await fetch(url, {
      method,
      headers: cabeceras,
      body: body === undefined || esFormulario ? body : JSON.stringify(body),
      signal: control.signal,
    });
  } catch (error) {
    const mensaje =
      error.name === 'AbortError'
        ? 'El servidor tardó demasiado en responder. Intente de nuevo.'
        : 'No hay conexión con el servidor.';
    throw new ErrorApi(0, 'SIN_CONEXION', mensaje);
  } finally {
    clearTimeout(temporizador);
  }

  if (respuesta.status === 204) return { data: null };
  const cuerpo = await respuesta.json().catch(() => null);
  if (respuesta.ok && cuerpo?.ok) return { data: cuerpo.data, meta: cuerpo.meta };

  const error = cuerpo?.error ?? {};
  const fallo = new ErrorApi(
    respuesta.status,
    error.code ?? 'ERROR',
    error.message ?? 'Ocurrió un error inesperado.',
    error.details ?? []
  );
  if (respuesta.status === 401 && !publica) {
    borrarSesion();
    location.assign(`${RUTA_LOGIN}?vencida=1`);
  } else if (respuesta.status === 403) {
    avisar(fallo.message, 'error');
  }
  throw fallo;
}

/**
 * Descarga un archivo protegido (p. ej. la foto de un usuario) con el token Bearer: un <img src>
 * no envía la cabecera Authorization. Devuelve el Blob, o null si no existe (404).
 * @param {string} ruta ruta relativa a /api/v1
 * @returns {Promise<Blob|null>}
 */
export async function solicitarArchivo(ruta) {
  const token = tokenActual();
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_ESPERA_MS);
  try {
    const respuesta = await fetch(new URL(API_BASE + ruta, location.origin), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: control.signal,
    });
    if (!respuesta.ok) return null;
    return await respuesta.blob();
  } catch {
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}
