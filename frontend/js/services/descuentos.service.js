// Una función por endpoint de descuentos (spec 011; SRS B.1 §4.11).
import { solicitar } from '../api/http.js';

/** GET /descuentos?q&estado&tipoVehiculo&tipoCliente&page&limit (descuentos.ver) → { data, meta } */
export const listarDescuentos = ({ q, estado, tipoVehiculo, tipoCliente, page = 1, limit = 20 } = {}) =>
  solicitar('/descuentos', { query: { q, estado, tipoVehiculo, tipoCliente, page, limit } });

/** POST /descuentos */
export const crearDescuento = async (datos) => (await solicitar('/descuentos', { method: 'POST', body: datos })).data;

/** PUT /descuentos/:id */
export const actualizarDescuento = async (id, datos) => (await solicitar(`/descuentos/${id}`, { method: 'PUT', body: datos })).data;

/** PATCH /descuentos/:id/estado */
export const cambiarEstadoDescuento = async (id, estado) => (await solicitar(`/descuentos/${id}/estado`, { method: 'PATCH', body: { estado } })).data;
