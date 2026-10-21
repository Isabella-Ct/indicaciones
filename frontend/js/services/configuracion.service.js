import { get, put } from './api.js';

/** Parámetros del negocio (solo administrador). */
export async function listarParametros() {
  return (await get('/configuracion')).data;
}

export async function actualizarParametro(clave, valor) {
  return (await put(`/configuracion/${encodeURIComponent(clave)}`, { valor })).data;
}
