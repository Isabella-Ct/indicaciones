import { get } from './api.js';

/** Datos de la sede (nombre, ciudad, dirección, puertas). Público. */
export async function obtenerSede() {
  const { data } = await get('/parqueadero', { redirigir401: false });
  return data;
}

/** "Parqueadero ABC · Medellín" (subtítulo de la marca, sale de la BD). */
export function subtituloSede(sede) {
  return sede ? `${sede.nombre} · ${sede.ciudad}` : '';
}
