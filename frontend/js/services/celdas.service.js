// Una función por endpoint de celdas (spec 004; SRS B.1 §4.3).
import { solicitar } from '../api/http.js';

/** GET /celdas?parqueadero&piso&tipo&estado&q&page&limit → { data, meta } */
export const listarCeldas = ({ parqueadero, piso, tipo, estado, q, page = 1, limit = 100 } = {}) =>
  solicitar('/celdas', { query: { parqueadero, piso, tipo, estado, q, page, limit } });

/** GET /celdas/:id (el ocupante solo llega si la sesión tiene movimientos.ver) */
export const obtenerCelda = async (id) => (await solicitar(`/celdas/${id}`)).data;

/** POST /celdas */
export const crearCelda = async ({ idParqueadero, codigo, tipoVehiculo, piso, area }) =>
  (await solicitar('/celdas', { method: 'POST', body: { idParqueadero, codigo, tipoVehiculo, piso, area } })).data;

/** POST /celdas/lote → { creadas: string[], omitidas: string[] } */
export const crearLoteCeldas = async (datos) => (await solicitar('/celdas/lote', { method: 'POST', body: datos })).data;

/** PUT /celdas/:id */
export const actualizarCelda = async (id, { codigo, tipoVehiculo, piso, area }) =>
  (await solicitar(`/celdas/${id}`, { method: 'PUT', body: { codigo, tipoVehiculo, piso, area } })).data;

/** PATCH /celdas/:id/estado (inhabilitada con motivo | disponible) */
export const cambiarEstadoCelda = async (id, { estado, motivo }) =>
  (await solicitar(`/celdas/${id}/estado`, { method: 'PATCH', body: { estado, motivo } })).data;
