// Una función por endpoint de vehículos (spec 005; SRS B.1 §4.5).
import { solicitar } from '../api/http.js';

/** GET /vehiculos?page&limit&q&tipo&propietario&dentro → { data, meta } */
export const listarVehiculos = ({ page = 1, limit = 10, q, tipo, propietario, dentro } = {}) =>
  solicitar('/vehiculos', { query: { page, limit, q, tipo, propietario, dentro } });

/** GET /vehiculos/:id (con historial de propietarios y últimos 10 movimientos) */
export const obtenerVehiculo = async (id) => (await solicitar(`/vehiculos/${id}`)).data;

/** POST /vehiculos (idPropietario opcional) */
export const crearVehiculo = async ({ placa, tipo, color, marca, modelo, idPropietario }) =>
  (await solicitar('/vehiculos', { method: 'POST', body: { placa, tipo, color, marca, modelo, idPropietario } })).data;

/** PUT /vehiculos/:id */
export const actualizarVehiculo = async (id, { placa, tipo, color, marca, modelo }) =>
  (await solicitar(`/vehiculos/${id}`, { method: 'PUT', body: { placa, tipo, color, marca, modelo } })).data;

/** PATCH /vehiculos/:id/propietario — { idUsuario } (null = quitar) o { tipoDocumento, numeroDocumento } */
export const asignarPropietario = async (id, identificacion) =>
  (await solicitar(`/vehiculos/${id}/propietario`, { method: 'PATCH', body: identificacion })).data;

/** GET /usuarios/me/vehiculos */
export const misVehiculos = async () => (await solicitar('/usuarios/me/vehiculos')).data;

/** Busca un vehículo por placa exacta (ya normalizada) o devuelve null. */
export async function buscarPorPlaca(placa) {
  const { data } = await listarVehiculos({ q: placa, limit: 20 });
  return data.find((v) => v.placa === placa) ?? null;
}
