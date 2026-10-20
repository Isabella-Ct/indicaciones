// Fase 4: tarifas, descuentos, membresías y facturas (REQ-TAR, REQ-DES, REQ-MEM, REQ-FAC).
import { get, post, put, patch } from './api.js';
import { aQuery } from './usuarios.service.js';

// ---------------------------------------------------------------- tarifas
/** { vigentes: { carro, moto }, historial? } */
export async function obtenerTarifas({ historial = false } = {}) {
  return (await get(`/tarifas${aQuery({ historial: historial ? '1' : '' })}`)).data;
}

export async function crearTarifa(datos) {
  return (await post('/tarifas', datos)).data;
}

/** { tarifa, cobro } — el cálculo lo hace el servidor (mismo calcularCobro del cobro real). */
export async function simularCobro({ tipo_vehiculo, minutos, tarifa }) {
  return (await post('/tarifas/simular', { tipo_vehiculo, minutos, tarifa })).data;
}

// ---------------------------------------------------------------- descuentos
export async function listarDescuentos({ activos = false } = {}) {
  return (await get(`/descuentos${aQuery({ activos: activos ? '1' : '' })}`)).data;
}

export async function crearDescuento(datos) {
  return (await post('/descuentos', datos)).data;
}

export async function actualizarDescuento(id, datos) {
  return (await put(`/descuentos/${id}`, datos)).data;
}

export async function cambiarActivoDescuento(id, activo) {
  return (await patch(`/descuentos/${id}/activo`, { activo })).data;
}

// ---------------------------------------------------------------- membresías
export function listarMembresias(filtros = {}) {
  return get(`/membresias${aQuery(filtros)}`);
}

export async function cotizarMembresia({ vehiculo_id, tipo, fecha_inicio }) {
  return (await get(`/membresias/cotizar${aQuery({ vehiculo_id, tipo, fecha_inicio })}`)).data;
}

export async function crearMembresia(datos) {
  return (await post('/membresias', datos)).data;
}

export async function cancelarMembresia(id) {
  return (await patch(`/membresias/${id}/cancelar`)).data;
}

export async function misMembresias() {
  return (await get('/usuarios/me/membresias')).data;
}

// ---------------------------------------------------------------- facturas
/** { data, meta: { …, suma_total } } */
export function listarFacturas(filtros = {}) {
  return get(`/facturas${aQuery(filtros)}`);
}

export function misFacturas(filtros = {}) {
  return get(`/usuarios/me/facturas${aQuery(filtros)}`);
}

export async function resumenFacturacionHoy() {
  return (await get('/facturas/resumen-hoy')).data;
}

export const urlFacturaPdf = (id) => `/api/v1/facturas/${id}/pdf`;
