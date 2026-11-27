// Una función por endpoint de entradas y salidas (spec 007; SRS B.1 §4.7).
import { solicitar } from '../api/http.js';

/** POST /movimientos — { placa, idPuerta, tipo?, idCelda?, color?, marca?, modelo? } */
export const registrarEntrada = async (datos) => (await solicitar('/movimientos', { method: 'POST', body: datos })).data;

/** GET /movimientos?estado&placa&q&page&limit → { data, meta } */
export const listarMovimientos = ({ estado = 'abierto', placa, q, page = 1, limit = 100 } = {}) =>
  solicitar('/movimientos', { query: { estado, placa, q, page, limit } });

/** POST /movimientos/:id/salida — { idPuerta, ticketExtraviado } */
export const registrarSalida = async (id, { idPuerta, ticketExtraviado = false }) =>
  (await solicitar(`/movimientos/${id}/salida`, { method: 'POST', body: { idPuerta, ticketExtraviado } })).data;

/** PATCH /movimientos/:id/anulacion — { motivo } */
export const anularMovimiento = async (id, motivo) =>
  (await solicitar(`/movimientos/${id}/anulacion`, { method: 'PATCH', body: { motivo } })).data;
