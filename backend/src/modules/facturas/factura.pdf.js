// PDF de la factura en formato de 80 mm (spec 009, research R-06; RF-FAC-10) con pdfkit y sus fuentes
// estándar (Helvetica), así no depende de las fuentes del sistema.
const PDFDocument = require('pdfkit');
const { formatearFechaHora, formatearDuracion } = require('../../utils/fechas');
const { pesos } = require('../liquidaciones/liquidaciones.reglas');

const ANCHO = 226.77; // 80 mm en puntos
const MARGEN = 12;
const METODO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', qr: 'QR' };

/**
 * @param {object} factura detalle de la factura (facturas.service.obtener)
 * @param {object|null} liquidacion detalle del cálculo
 * @returns {Promise<Buffer>}
 */
function generarPdf(factura, liquidacion) {
  return new Promise((resolver, rechazar) => {
    const doc = new PDFDocument({ size: [ANCHO, 640], margin: MARGEN, info: { Title: `Factura ${factura.numero}`, Author: 'PARKO' } });
    const partes = [];
    doc.on('data', (p) => partes.push(p));
    doc.on('end', () => resolver(Buffer.concat(partes)));
    doc.on('error', rechazar);

    const ancho = ANCHO - MARGEN * 2;
    const linea = (etiqueta, valor) => {
      const y = doc.y;
      doc.font('Helvetica').fontSize(8).text(etiqueta, MARGEN, y, { width: ancho * 0.45 });
      doc.font('Helvetica-Bold').fontSize(8).text(String(valor ?? '—'), MARGEN + ancho * 0.45, y, { width: ancho * 0.55, align: 'right' });
      doc.moveDown(0.2);
    };
    const separador = () => {
      doc.moveDown(0.3);
      doc.moveTo(MARGEN, doc.y).lineTo(ANCHO - MARGEN, doc.y).dash(2, { space: 2 }).stroke().undash();
      doc.moveDown(0.4);
    };

    doc.font('Helvetica-Bold').fontSize(14).text('PARKO', { align: 'center' });
    doc.font('Helvetica').fontSize(8).text(factura.parqueadero?.nombre ?? 'Parqueadero', { align: 'center' });
    if (factura.parqueadero?.direccion) doc.text(factura.parqueadero.direccion, { align: 'center' });
    separador();
    doc.font('Helvetica-Bold').fontSize(10).text(`FACTURA ${factura.numero}`, { align: 'center' });
    if (factura.estado === 'anulada') doc.fillColor('#c0392b').fontSize(12).text('ANULADA', { align: 'center' }).fillColor('black');
    doc.moveDown(0.3);
    linea('Fecha', formatearFechaHora(factura.fechaEmision));
    const titular = factura.tercero ?? (factura.cliente ? { nombre: factura.cliente.nombre, documento: `${factura.cliente.tipoDocumento} ${factura.cliente.numeroDocumento}` } : null);
    linea('Cliente', titular ? titular.nombre : 'Consumidor final');
    if (titular?.documento) linea('Documento', titular.documento);
    separador();
    if (factura.movimiento) {
      linea('Placa', factura.movimiento.placa);
      linea('Celda', factura.movimiento.celda);
      linea('Entrada', formatearFechaHora(factura.movimiento.entrada));
      linea('Salida', formatearFechaHora(factura.movimiento.salida));
      linea('Tiempo', formatearDuracion(factura.movimiento.minutos ?? 0));
    }
    if (liquidacion?.tarifa) linea('Tarifa', liquidacion.tarifa.nombre);
    if (liquidacion) {
      doc.font('Helvetica').fontSize(7).text(liquidacion.explicacion, { width: ancho });
      doc.moveDown(0.3);
      linea('Valor del servicio', pesos(liquidacion.valorBruto));
      linea('Descuento', pesos(liquidacion.valorDescuento));
    }
    separador();
    doc.font('Helvetica-Bold').fontSize(12).text(`TOTAL ${pesos(factura.total)}`, { align: 'right' });
    doc.moveDown(0.3);
    if (factura.pago) {
      linea('Método de pago', METODO[factura.pago.metodo] ?? factura.pago.metodo);
      if (factura.pago.metodo === 'efectivo') {
        linea('Recibido', pesos(factura.pago.valorRecibido));
        linea('Cambio', pesos(factura.pago.cambio));
      } else {
        linea('Referencia', factura.pago.referencia);
      }
    }
    separador();
    doc.font('Helvetica').fontSize(6.5).text('Comprobante interno de PARKO. Facturación electrónica: pendiente de envío (TBD-02).', { align: 'center', width: ancho });
    if (factura.anulacion) doc.text(`Anulada: ${factura.anulacion.motivo}`, { align: 'center', width: ancho });
    doc.end();
  });
}

module.exports = { generarPdf };
