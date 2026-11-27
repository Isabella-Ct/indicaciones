// Liquidación, pagos y facturas (spec 009; SRS B.1 §4.9).
import { solicitar, solicitarArchivo } from '../api/http.js';

/** GET /movimientos/:id/liquidacion */
export const obtenerLiquidacion = async (idMovimiento) => (await solicitar(`/movimientos/${idMovimiento}/liquidacion`)).data;

/** POST /pagos → { pago, factura } */
export const registrarPago = async (datos) => (await solicitar('/pagos', { method: 'POST', body: datos })).data;

/** POST /facturas — emite el comprobante (tercero opcional y envío del PDF al correo del cliente). */
export const emitirFactura = async (idFactura, tercero) =>
  (await solicitar('/facturas', { method: 'POST', body: tercero ? { idFactura, tercero } : { idFactura } })).data;

/** GET /facturas/:id */
export const obtenerFactura = async (id) => (await solicitar(`/facturas/${id}`)).data;

/** GET /facturas/:id/pdf → Blob (o null si no se puede descargar). */
export const descargarPdf = (id) => solicitarArchivo(`/facturas/${id}/pdf`);

/** GET /facturas?q&desde&hasta&metodo&estado&page&limit → { data, meta: { …, sumaTotal } } */
export const listarFacturas = ({ q, desde, hasta, metodo, estado, page = 1, limit = 20 } = {}) =>
  solicitar('/facturas', { query: { q, desde, hasta, metodo, estado, page, limit } });

/** PATCH /facturas/:id/anulacion */
export const anularFactura = async (id, motivo) => (await solicitar(`/facturas/${id}/anulacion`, { method: 'PATCH', body: { motivo } })).data;

/** GET /usuarios/me/facturas */
export const misFacturas = ({ page = 1, limit = 20 } = {}) => solicitar('/usuarios/me/facturas', { query: { page, limit } });
