// Cuadre y cierre de caja (spec 009, HU-44; SRS B.1 §4.9).
import { solicitar } from '../api/http.js';

/** GET /caja/turno-actual */
export const turnoActual = async () => (await solicitar('/caja/turno-actual')).data;

/** POST /caja/cierres — { efectivoContado, observaciones? } */
export const cerrarCaja = async (datos) => (await solicitar('/caja/cierres', { method: 'POST', body: datos })).data;

/** GET /caja/cierres?page&limit */
export const listarCierres = ({ page = 1, limit = 10 } = {}) => solicitar('/caja/cierres', { query: { page, limit } });
