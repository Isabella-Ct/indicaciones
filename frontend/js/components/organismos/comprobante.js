/**
 * Organismo · comprobante (variante factura del organism-ticket de la maqueta): factura de 80 mm con número,
 * parqueadero, cliente o tercero, placa, entrada, salida, tiempo, tarifa, cálculo, descuento (spec 011), total y
 * pago (RF-FAC-09).
 * El marcado está en la página; aquí solo se ponen los textos.
 */
import { ponerPlaca } from '../atomos/placa.js';
import { ponerChipFactura } from '../atomos/chip-estado.js';
import { formatearCOP, formatearFechaHora, formatearDuracion } from '../../utils/formato.js';

const METODO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', qr: 'QR' };

/** @param {HTMLElement} raiz .organism-ticket @param {object} f detalle de GET /facturas/:id */
export function ponerComprobante(raiz, f) {
  const poner = (clase, valor) => {
    raiz.querySelector(`.js-${clase}`).textContent = valor ?? '—';
  };
  poner('numero', f.numero);
  ponerChipFactura(raiz.querySelector('.js-estado'), f.estado);
  poner('parqueadero', f.parqueadero?.nombre);
  poner('fecha', formatearFechaHora(f.fechaEmision));
  const titular = f.tercero ? `${f.tercero.nombre} · ${f.tercero.documento}` : f.cliente ? `${f.cliente.nombre} · ${f.cliente.tipoDocumento} ${f.cliente.numeroDocumento}` : 'Consumidor final';
  poner('cliente', titular);
  ponerPlaca(raiz.querySelector('.js-placa'), f.movimiento?.placa);
  poner('entrada', formatearFechaHora(f.movimiento?.entrada));
  poner('salida', formatearFechaHora(f.movimiento?.salida));
  poner('tiempo', f.movimiento ? formatearDuracion(f.movimiento.minutos) : '—');
  poner('tarifa', f.liquidacion?.tarifa?.nombre);
  poner('calculo', f.liquidacion?.explicacion);
  // Spec 011 (RF-DES-04): nombre y valor del descuento aplicado.
  const descuento = f.liquidacion?.descuento;
  poner('descuento', descuento ? `${descuento.nombre} · − ${formatearCOP(f.liquidacion.valorDescuento)}` : formatearCOP(0));
  poner('total', formatearCOP(f.total));
  poner('metodo', METODO[f.pago?.metodo] ?? f.pago?.metodo);
  poner('pago-detalle', f.pago?.metodo === 'efectivo' ? `Recibido ${formatearCOP(f.pago.valorRecibido)} · cambio ${formatearCOP(f.pago.cambio)}` : f.pago?.referencia ? `Referencia ${f.pago.referencia}` : '—');
  poner('nota', f.estado === 'anulada' ? `Factura anulada: ${f.anulacion?.motivo ?? ''}` : 'Comprobante interno · facturación electrónica pendiente de envío.');
  raiz.classList.add('organism-ticket--issued');
}
