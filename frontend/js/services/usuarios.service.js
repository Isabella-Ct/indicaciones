import { get, post, put, patch } from './api.js';

/** @param {Record<string, string|number|undefined>} filtros */
export function aQuery(filtros) {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null && valor !== '') params.set(clave, String(valor));
  }
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

/** Listado (admin): { data, meta } */
export function listarUsuarios(filtros = {}) {
  return get(`/usuarios${aQuery(filtros)}`);
}

export async function obtenerUsuario(id) {
  return (await get(`/usuarios/${id}`)).data;
}

/** Clientes activos por documento (user-picker). */
export async function buscarClientes(documento) {
  return (await get(`/usuarios/buscar${aQuery({ documento })}`)).data;
}

/** @param {FormData} formulario */
export async function crearUsuario(formulario) {
  return (await post('/usuarios', formulario)).data;
}

/** @param {FormData} formulario */
export async function actualizarUsuario(id, formulario) {
  return (await put(`/usuarios/${id}`, formulario)).data;
}

export async function cambiarEstadoUsuario(id, estado) {
  return (await patch(`/usuarios/${id}/estado`, { estado })).data;
}

export async function obtenerMiPerfil() {
  return (await get('/usuarios/me')).data;
}

/** @returns {Promise<{ data: object, meta: { campos_cambiados: string[] } }>} */
export function actualizarMiPerfil(formulario) {
  return put('/usuarios/me', formulario);
}

export async function listarMisVehiculos() {
  return (await get('/usuarios/me/vehiculos')).data;
}
