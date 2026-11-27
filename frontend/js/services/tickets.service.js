// Ticket de ingreso (spec 007, HU-32; SRS B.1 §4.7).
import { solicitar } from '../api/http.js';

/** GET /tickets/:codigo → { codigo, fechaEmision, valido, extraviado, tieneCorreo, parqueadero, movimiento } */
export const obtenerTicket = async (codigo) => (await solicitar(`/tickets/${encodeURIComponent(codigo)}`)).data;

/** POST /tickets/:codigo/envio → { codigo, enviadoA } */
export const enviarTicket = async (codigo) =>
  (await solicitar(`/tickets/${encodeURIComponent(codigo)}/envio`, { method: 'POST' })).data;
