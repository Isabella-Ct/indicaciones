// Una función por endpoint de pico y placa (spec 006; SRS B.1 §4.6).
import { solicitar } from '../api/http.js';

/** GET /restricciones-placa?page&limit&tipo&dia&estado → { data, meta } */
export const listarRestricciones = ({ page = 1, limit = 100, tipo, dia, estado } = {}) =>
  solicitar('/restricciones-placa', { query: { page, limit, tipo, dia, estado } });

/** POST /restricciones-placa */
export const crearRestriccion = async (datos) => (await solicitar('/restricciones-placa', { method: 'POST', body: datos })).data;

/** PUT /restricciones-placa/:id */
export const actualizarRestriccion = async (id, datos) =>
  (await solicitar(`/restricciones-placa/${id}`, { method: 'PUT', body: datos })).data;

/** DELETE /restricciones-placa/:id (eliminación lógica) */
export const eliminarRestriccion = async (id) => (await solicitar(`/restricciones-placa/${id}`, { method: 'DELETE' })).data;

/** GET /restricciones-placa/hoy */
export const restriccionHoy = async () => (await solicitar('/restricciones-placa/hoy')).data;
