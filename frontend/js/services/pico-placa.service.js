import { get, post, put, patch } from './api.js';
import { aQuery } from './usuarios.service.js';

export async function listarReglas(filtros = {}) {
  return (await get(`/pico-placa${aQuery(filtros)}`)).data;
}

export async function reglasDeHoy() {
  return (await get('/pico-placa/hoy')).data;
}

export async function crearRegla(datos) {
  return (await post('/pico-placa', datos)).data;
}

export async function actualizarRegla(id, datos) {
  return (await put(`/pico-placa/${id}`, datos)).data;
}

export async function cambiarActivaRegla(id, activa) {
  return (await patch(`/pico-placa/${id}/activa`, { activa })).data;
}
