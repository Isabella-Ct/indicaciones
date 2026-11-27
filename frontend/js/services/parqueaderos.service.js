// Una función por endpoint de parqueaderos y puertas (spec 004; SRS B.1 §4.3).
import { solicitar } from '../api/http.js';

/** GET /parqueaderos?page&limit&q&estado → { data, meta } */
export const listarParqueaderos = ({ page = 1, limit = 10, q, estado } = {}) =>
  solicitar('/parqueaderos', { query: { page, limit, q, estado } });

/** GET /parqueaderos/:id (con puertas y resumen de celdas por piso y tipo) */
export const obtenerParqueadero = async (id) => (await solicitar(`/parqueaderos/${id}`)).data;

/** POST /parqueaderos */
export const crearParqueadero = async ({ nombre, direccion, pisos, horario }) =>
  (await solicitar('/parqueaderos', { method: 'POST', body: { nombre, direccion, pisos, horario } })).data;

/** PUT /parqueaderos/:id (estado opcional: reactivar) */
export const actualizarParqueadero = async (id, datos) =>
  (await solicitar(`/parqueaderos/${id}`, { method: 'PUT', body: datos })).data;

/** DELETE /parqueaderos/:id → inactiva (borrado lógico) */
export const inactivarParqueadero = async (id) =>
  (await solicitar(`/parqueaderos/${id}`, { method: 'DELETE' })).data;

/** GET /parqueaderos/:id/puertas?uso&estado */
export const listarPuertas = async (idParqueadero, { uso, estado } = {}) =>
  (await solicitar(`/parqueaderos/${idParqueadero}/puertas`, { query: { uso, estado } })).data;

/** POST /parqueaderos/:id/puertas */
export const crearPuerta = async (idParqueadero, { nombre, tipo }) =>
  (await solicitar(`/parqueaderos/${idParqueadero}/puertas`, { method: 'POST', body: { nombre, tipo } })).data;

/** PUT /puertas/:id */
export const actualizarPuerta = async (idPuerta, { nombre, tipo, estado }) =>
  (await solicitar(`/puertas/${idPuerta}`, { method: 'PUT', body: { nombre, tipo, estado } })).data;
