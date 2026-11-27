import { get, post, put, patch, del } from './api.js';
import { aQuery } from './usuarios.service.js';

export function listarVehiculos(filtros = {}) {
  return get(`/vehiculos${aQuery(filtros)}`);
}

export async function obtenerVehiculoPorPlaca(placa) {
  return (await get(`/vehiculos/placa/${encodeURIComponent(placa)}`)).data;
}

export async function obtenerVehiculo(id) {
  return (await get(`/vehiculos/${id}`)).data;
}

export async function historialPropietarios(id) {
  return (await get(`/vehiculos/${id}/historial`)).data;
}

export async function crearVehiculo(datos) {
  return (await post('/vehiculos', datos)).data;
}

export async function actualizarVehiculo(id, datos) {
  return (await put(`/vehiculos/${id}`, datos)).data;
}

/** Borrado lógico: el vehículo queda inactivo (DELETE /vehiculos/:id). */
export async function eliminarVehiculo(id) {
  return (await del(`/vehiculos/${id}`)).data;
}

/** usuario_id null = dejar sin propietario (solo admin). */
export async function cambiarPropietario(id, { usuario_id, motivo }) {
  return (await patch(`/vehiculos/${id}/propietario`, { usuario_id, motivo })).data;
}
