// Una función por endpoint de incidencias (spec 013; SRS B.1 §4.13 + evidencia [Propuesta]).
// Con evidencia se envía FormData (el navegador pone el Content-Type); sin ella, JSON.
import { solicitar, solicitarArchivo } from '../api/http.js';

/** POST /incidencias — { tipo, placa, tipoVehiculo?, idCelda?, fechaHoraEvento, descripcion } + evidencia (File) opcional */
export async function registrarIncidencia(datos, evidencia) {
  let body = datos;
  if (evidencia) {
    body = new FormData();
    for (const [clave, valor] of Object.entries(datos)) {
      if (valor !== undefined && valor !== null && valor !== '') body.append(clave, String(valor));
    }
    body.append('evidencia', evidencia);
  }
  return (await solicitar('/incidencias', { method: 'POST', body })).data;
}

/** GET /incidencias?q&tipo&estado&desde&hasta&page&limit → { data, meta } */
export const listarIncidencias = ({ q, tipo, estado, desde, hasta, page = 1, limit = 20 } = {}) =>
  solicitar('/incidencias', { query: { q, tipo, estado, desde, hasta, page, limit } });

/** GET /incidencias/:id (con el seguimiento) */
export const obtenerIncidencia = async (id) => (await solicitar(`/incidencias/${id}`)).data;

/** GET /incidencias/:id/evidencia → Blob (o null) */
export const descargarEvidencia = (id) => solicitarArchivo(`/incidencias/${id}/evidencia`);

/** POST /incidencias/:id/seguimientos */
export const agregarSeguimiento = async (id, nota) => (await solicitar(`/incidencias/${id}/seguimientos`, { method: 'POST', body: { nota } })).data;

/** PATCH /incidencias/:id/cierre */
export const cerrarIncidencia = async (id, solucion) => (await solicitar(`/incidencias/${id}/cierre`, { method: 'PATCH', body: { solucion } })).data;
