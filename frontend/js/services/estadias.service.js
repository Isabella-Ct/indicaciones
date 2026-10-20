import { get, post } from './api.js';
import { aQuery } from './usuarios.service.js';

export async function previsualizarEntrada(placa, requiereAccesible = false) {
  return (
    await get(
      `/estadias/previsualizar${aQuery({ placa, requiere_accesible: requiereAccesible ? '1' : '0' })}`
    )
  ).data;
}

/** @param {FormData} datos (multipart: incluye la foto opcional) */
export async function registrarEntrada(datos) {
  return (await post('/estadias/entrada', datos)).data;
}

/** Liquidación preliminar (no cierra). */
export async function liquidarSalida({ puerta_id, placa, codigo_ticket }) {
  return (await post('/estadias/salida', { puerta_id, placa, codigo_ticket })).data;
}

export async function cerrarEstadia(id, puertaId) {
  return (await post(`/estadias/${id}/cerrar`, { puerta_id: puertaId })).data;
}

export async function ultimosMovimientos(limite = 10) {
  return (await get(`/estadias/ultimos-movimientos${aQuery({ limite })}`)).data;
}

/** Historial: { data, meta } */
export function historialEstadias(filtros = {}) {
  return get(`/estadias${aQuery(filtros)}`);
}

export const urlTicketPdf = (id) => `/api/v1/estadias/${id}/ticket.pdf`;
