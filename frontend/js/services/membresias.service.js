// Una función por endpoint de planes y membresías (spec 010; SRS B.1 §4.10).
import { solicitar } from '../api/http.js';

/** GET /planes-membresia?estado&tipoVehiculo&q&page&limit (planes.ver) → { data, meta } */
export const listarPlanes = ({ estado, tipoVehiculo, q, page = 1, limit = 20 } = {}) =>
  solicitar('/planes-membresia', { query: { estado, tipoVehiculo, q, page, limit } });

/** POST /planes-membresia */
export const crearPlan = async (datos) => (await solicitar('/planes-membresia', { method: 'POST', body: datos })).data;

/** PUT /planes-membresia/:id */
export const actualizarPlan = async (id, datos) => (await solicitar(`/planes-membresia/${id}`, { method: 'PUT', body: datos })).data;

/** PATCH /planes-membresia/:id/estado */
export const cambiarEstadoPlan = async (id, estado) => (await solicitar(`/planes-membresia/${id}/estado`, { method: 'PATCH', body: { estado } })).data;

/** GET /membresias?q&estado&page&limit (membresias.ver) → { data, meta } */
export const listarMembresias = ({ q, estado, page = 1, limit = 20 } = {}) => solicitar('/membresias', { query: { q, estado, page, limit } });

/** POST /membresias → { membresia, factura } */
export const suscribir = async ({ idVehiculo, idPlan, pago }) => (await solicitar('/membresias', { method: 'POST', body: { idVehiculo, idPlan, pago } })).data;

/** POST /membresias/:id/renovacion → { membresia, periodo, factura } */
export const renovar = async (id, pago) => (await solicitar(`/membresias/${id}/renovacion`, { method: 'POST', body: { pago } })).data;

/** PATCH /membresias/:id/cancelacion */
export const cancelar = async (id, motivo) => (await solicitar(`/membresias/${id}/cancelacion`, { method: 'PATCH', body: { motivo } })).data;

/** GET /usuarios/me/membresias → { membresias, planesDisponibles } */
export const miMembresia = async () => (await solicitar('/usuarios/me/membresias')).data;
