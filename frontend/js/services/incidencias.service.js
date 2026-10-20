// Incidencias — REQ-INCD-1.
import { get, post, put, patch } from './api.js';
import { aQuery } from './usuarios.service.js';

export async function listarTiposIncidencia({ activos = false } = {}) {
  return (await get(`/tipos-incidencia${aQuery({ activos: activos ? '1' : '' })}`)).data;
}

export async function crearTipoIncidencia(datos) {
  return (await post('/tipos-incidencia', datos)).data;
}

export async function actualizarTipoIncidencia(id, datos) {
  return (await put(`/tipos-incidencia/${id}`, datos)).data;
}

export async function cambiarActivoTipoIncidencia(id, activo) {
  return (await patch(`/tipos-incidencia/${id}/activo`, { activo })).data;
}

/** { data, meta } */
export function listarIncidencias(filtros = {}) {
  return get(`/incidencias${aQuery(filtros)}`);
}

export async function obtenerIncidencia(id) {
  return (await get(`/incidencias/${id}`)).data;
}

export async function registrarIncidencia(datos) {
  return (await post('/incidencias', datos)).data;
}

export function misIncidencias(filtros = {}) {
  return get(`/usuarios/me/incidencias${aQuery(filtros)}`);
}
