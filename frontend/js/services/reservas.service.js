// Una función por endpoint de reservas (spec 012; SRS B.1 §4.12).
import { solicitar } from '../api/http.js';

/** POST /reservas — { idVehiculo, fechaHoraInicio: 'AAAA-MM-DDTHH:MM', idCelda? } */
export const reservar = async (datos) => (await solicitar('/reservas', { method: 'POST', body: datos })).data;

/** GET /reservas?fecha&estado&q&page&limit (reservas.ver) → { data, meta: { …, fecha } } */
export const listarReservas = ({ fecha, estado, q, page = 1, limit = 20 } = {}) => solicitar('/reservas', { query: { fecha, estado, q, page, limit } });

/** GET /usuarios/me/reservas?estado&page&limit → { data, meta } */
export const misReservas = ({ estado, page = 1, limit = 20 } = {}) => solicitar('/usuarios/me/reservas', { query: { estado, page, limit } });

/** PATCH /reservas/:id/cancelacion */
export const cancelarReserva = async (id) => (await solicitar(`/reservas/${id}/cancelacion`, { method: 'PATCH' })).data;

/** GET /celdas/disponibles?fecha&tipo&idParqueadero → celdas libres en la franja de esa hora */
export const celdasDisponibles = async ({ fecha, tipo, idParqueadero }) => (await solicitar('/celdas/disponibles', { query: { fecha, tipo, idParqueadero } })).data;
