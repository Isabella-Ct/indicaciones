import { get, post, put, patch } from './api.js';

/** Puertas de acceso. Con `todas` (admin) incluye las inactivas. */
export async function listarPuertas({ todas = false } = {}) {
  return (await get(`/puertas${todas ? '?incluir_inactivas=1' : ''}`)).data;
}

export async function crearPuerta({ nombre, tipo }) {
  return (await post('/puertas', { nombre, tipo })).data;
}

export async function actualizarPuerta(id, { nombre, tipo }) {
  return (await put(`/puertas/${id}`, { nombre, tipo })).data;
}

export async function cambiarActivaPuerta(id, activa) {
  return (await patch(`/puertas/${id}/activa`, { activa })).data;
}
