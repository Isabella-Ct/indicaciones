// Disponibilidad pública (spec 004, HU-24; SRS B.1 §4.3): no necesita sesión.
import { solicitar } from '../api/http.js';

/** GET /disponibilidad?parqueadero → { actualizadoEn, parqueaderos: [{ …, tipos: { carro, moto } }] } */
export const consultarDisponibilidad = async ({ parqueadero } = {}) =>
  (await solicitar('/disponibilidad', { query: { parqueadero }, publica: true })).data;
