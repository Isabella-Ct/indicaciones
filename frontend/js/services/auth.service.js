import { get, post } from './api.js';

/** @returns {Promise<object>} usuario en sesión */
export async function iniciarSesion({ tipo_documento, numero_documento, contrasena }) {
  const { data } = await post(
    '/auth/login',
    { tipo_documento, numero_documento, contrasena },
    { redirigir401: false }
  );
  return data;
}

export async function cerrarSesion() {
  await post('/auth/logout', undefined, { redirigir401: false });
}

/**
 * @param {{ redirigir401?: boolean }} [opciones] false para solo consultar (página de login)
 */
export async function obtenerSesion(opciones = {}) {
  const { data } = await get('/auth/me', opciones);
  return data;
}

export async function cambiarContrasena({ contrasena_actual, contrasena_nueva }) {
  const { data } = await post('/auth/cambiar-contrasena', { contrasena_actual, contrasena_nueva });
  return data;
}
