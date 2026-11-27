// Una función por endpoint de acceso (SRS B.1 §4.3; specs 001 y 003).
import { solicitar } from '../api/http.js';
import { guardarSesion, borrarSesion, leerSesion } from '../utils/sesion.js';

/** POST /auth/login → guarda { token, expiraEn, usuario, permisos } en sessionStorage. */
export async function iniciarSesion({ tipoDocumento, numeroDocumento, contrasena }) {
  const { data } = await solicitar('/auth/login', {
    method: 'POST',
    body: { tipoDocumento, numeroDocumento, contrasena },
    publica: true,
  });
  guardarSesion(data);
  return data;
}

/** POST /auth/logout: invalida el token en el servidor y siempre lo borra del navegador (HU-16). */
export async function cerrarSesion() {
  try {
    if (leerSesion()) await solicitar('/auth/logout', { method: 'POST', publica: false });
  } catch {
    // Si la sesión ya no era válida, igual se borra localmente.
  } finally {
    borrarSesion();
  }
}

/** PUT /auth/contrasena: al cambiarla deja de exigirse el cambio en la sesión guardada. */
export async function cambiarContrasena({ contrasenaActual, contrasenaNueva, confirmacion }) {
  const { data } = await solicitar('/auth/contrasena', {
    method: 'PUT',
    body: { contrasenaActual, contrasenaNueva, confirmacion },
  });
  const sesion = leerSesion();
  if (sesion) guardarSesion({ ...sesion, usuario: { ...sesion.usuario, debeCambiarContrasena: false } });
  return data;
}

/** POST /auth/registro (público). */
export const registrarme = async (datos) =>
  (await solicitar('/auth/registro', { method: 'POST', body: datos, publica: true })).data;

/** POST /auth/recuperar (público): siempre el mismo mensaje. */
export const recuperarContrasena = async ({ tipoDocumento, numeroDocumento }) =>
  (await solicitar('/auth/recuperar', { method: 'POST', body: { tipoDocumento, numeroDocumento }, publica: true })).data;

/** POST /auth/restablecer (público). */
export const restablecerContrasena = async ({ token, contrasenaNueva, confirmacion }) =>
  (await solicitar('/auth/restablecer', { method: 'POST', body: { token, contrasenaNueva, confirmacion }, publica: true }))
    .data;
