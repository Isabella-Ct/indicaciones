// Una función por endpoint de tarifas (spec 008; SRS B.1 §4.8).
import { solicitar } from '../api/http.js';

/** GET /tarifas?vigentes=true (público): vigentes y programadas. */
export const tarifasVigentes = async () => (await solicitar('/tarifas', { query: { vigentes: true }, publica: true })).data;

/** GET /tarifas?tipoVehiculo&tipoCliente&estado&page&limit (tarifas.ver) → { data, meta } */
export const listarTarifas = ({ tipoVehiculo, tipoCliente, estado, page = 1, limit = 20 } = {}) =>
  solicitar('/tarifas', { query: { tipoVehiculo, tipoCliente, estado, page, limit } });

/** POST /tarifas (cerrarAnterior opcional) */
export const crearTarifa = async (datos) => (await solicitar('/tarifas', { method: 'POST', body: datos })).data;

/** PUT /tarifas/:id */
export const actualizarTarifa = async (id, datos) => (await solicitar(`/tarifas/${id}`, { method: 'PUT', body: datos })).data;

/** PATCH /tarifas/:id/estado — { estado, confirmar } */
export const cambiarEstadoTarifa = async (id, estado, confirmar = false) =>
  (await solicitar(`/tarifas/${id}/estado`, { method: 'PATCH', body: { estado, confirmar } })).data;
