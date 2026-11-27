// Una función por endpoint de la spec 002 (SRS B.1 §4.2 + foto [Propuesta]).
// Con foto (o para quitarla en multipart) se envía FormData; si no, JSON.
import { solicitar, solicitarArchivo } from '../api/http.js';

/** Arma el cuerpo: FormData si hay archivo, JSON en otro caso. */
function cuerpo(datos, foto) {
  if (!foto) return datos;
  const formulario = new FormData();
  for (const [clave, valor] of Object.entries(datos)) {
    if (valor !== undefined && valor !== null) formulario.append(clave, String(valor));
  }
  formulario.append('foto', foto);
  return formulario;
}

/** GET /usuarios?page&limit&q&rol&estado → { data, meta } */
export const listarUsuarios = ({ page = 1, limit = 10, q, rol, estado } = {}) =>
  solicitar('/usuarios', { query: { page, limit, q, rol, estado } });

/** GET /usuarios/:id → detalle con vehículos y membresía */
export const obtenerUsuario = async (id) => (await solicitar(`/usuarios/${id}`)).data;

/** POST /usuarios → usuario + correoEnviado */
export const crearUsuario = async (datos, foto) =>
  (await solicitar('/usuarios', { method: 'POST', body: cuerpo(datos, foto) })).data;

/** PUT /usuarios/:id */
export const actualizarUsuario = async (id, datos, foto) =>
  (await solicitar(`/usuarios/${id}`, { method: 'PUT', body: cuerpo(datos, foto) })).data;

/** PATCH /usuarios/:id/estado */
export const cambiarEstadoUsuario = async (id, estado) =>
  (await solicitar(`/usuarios/${id}/estado`, { method: 'PATCH', body: { estado } })).data;

/** GET /usuarios/me */
export const misDatos = async () => (await solicitar('/usuarios/me')).data;

/** PUT /usuarios/me */
export const actualizarMisDatos = async (datos, foto) =>
  (await solicitar('/usuarios/me', { method: 'PUT', body: cuerpo(datos, foto) })).data;

/** GET /usuarios/:id/foto → Blob o null */
export const obtenerFoto = (id) => solicitarArchivo(`/usuarios/${id}/foto`);
