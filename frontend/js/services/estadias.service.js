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

/** Liquidación con dinero: tiempo, tarifa, membresía, descuentos y cobro (no cierra). */
export async function liquidarSalida({ puerta_id, placa, codigo_ticket }) {
  return (await post('/estadias/salida', { puerta_id, placa, codigo_ticket })).data;
}

/** Recalcula el cobro de una estadía abierta (descuento opcional). */
export async function liquidarEstadia(id, descuentoId = null) {
  return (await post(`/estadias/${id}/liquidar`, { descuento_id: descuentoId ?? undefined })).data;
}

/** Cobra y cierra (el total lo calcula el servidor): { estadia, factura }. */
export async function pagarEstadia(id, { puerta_id, metodo_pago, descuento_id }) {
  return (await post(`/estadias/${id}/pagar`, { puerta_id, metodo_pago, descuento_id })).data;
}

export async function ultimosMovimientos(limite = 10) {
  return (await get(`/estadias/ultimos-movimientos${aQuery({ limite })}`)).data;
}

/** Historial: { data, meta } */
export function historialEstadias(filtros = {}) {
  return get(`/estadias${aQuery(filtros)}`);
}

export const urlTicketPdf = (id) => `/api/v1/estadias/${id}/ticket.pdf`;
