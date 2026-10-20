// Reportes del administrador (REQ-REP-01…11) y dashboard por rol.
import { get } from './api.js';
import { aQuery } from './usuarios.service.js';

/** { data, meta } de /reportes/<id> con los filtros dados. */
export function obtenerReporte(id, filtros = {}) {
  return get(`/reportes/${id}${aQuery(filtros)}`);
}

/**
 * Enlace de descarga del mismo reporte en CSV (UTF-8 con BOM, separador ";").
 * En CSV el servidor ignora la paginación de los listados y trae todas las filas.
 */
export function urlReporteCsv(id, filtros = {}) {
  return `/api/v1/reportes/${id}${aQuery({ ...filtros, formato: 'csv' })}`;
}

export async function obtenerDashboard() {
  return (await get('/dashboard')).data;
}
