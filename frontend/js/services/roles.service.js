// Una función por endpoint de la spec 001 (SRS B.1 §4.1; frontend-integration §3).
import { solicitar } from '../api/http.js';

/** GET /roles?page&limit&q&estado → { data, meta } */
export const listarRoles = ({ page = 1, limit = 10, q, estado } = {}) =>
  solicitar('/roles', { query: { page, limit, q, estado } });

/** GET /roles/:id */
export const obtenerRol = async (id) => (await solicitar(`/roles/${id}`)).data;

/** POST /roles */
export const crearRol = async ({ nombre, descripcion, permisos }) =>
  (await solicitar('/roles', { method: 'POST', body: { nombre, descripcion, permisos } })).data;

/** PUT /roles/:id */
export const actualizarRol = async (id, { nombre, descripcion, permisos }) =>
  (await solicitar(`/roles/${id}`, { method: 'PUT', body: { nombre, descripcion, permisos } })).data;

/** PATCH /roles/:id/estado */
export const cambiarEstadoRol = async (id, estado) =>
  (await solicitar(`/roles/${id}/estado`, { method: 'PATCH', body: { estado } })).data;

/** GET /permisos → grupos por módulo */
export const listarPermisos = async () => (await solicitar('/permisos')).data;

/** "Consultar · Roles y permisos" → "Roles y permisos" (nombre legible del módulo). */
export const nombreModulo = (grupo) =>
  grupo.permisos[0]?.descripcion.split(' · ')[1] ?? grupo.modulo;
