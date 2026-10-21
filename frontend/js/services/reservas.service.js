// Reservas (REQ-RES-1): el cliente reserva para sus vehículos; el personal gestiona todas.
import { get, post, patch } from './api.js';
import { aQuery } from './usuarios.service.js';

export async function crearReserva({ vehiculo_id, celda_id, requiere_accesible = false }) {
  return (await post('/reservas', { vehiculo_id, celda_id, requiere_accesible })).data;
}

export async function cancelarReserva(id) {
  return (await patch(`/reservas/${id}/cancelar`)).data;
}

/** Personal: { data, meta } */
export function listarReservas(filtros = {}) {
  return get(`/reservas${aQuery(filtros)}`);
}

/** Cliente: { data, meta } (sin titular). */
export function misReservas(filtros = {}) {
  return get(`/usuarios/me/reservas${aQuery(filtros)}`);
}

/** Cliente: historial de entradas y salidas de sus vehículos. */
export function misEstadias(filtros = {}) {
  return get(`/usuarios/me/estadias${aQuery(filtros)}`);
}
