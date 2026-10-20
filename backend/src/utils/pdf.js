// Documentos PDF de PARKO con pdfkit. Ticket de ingreso para impresora térmica de
// 80 mm que imita el .ticket de la maqueta: franja de peligro, "TICKET DE INGRESO",
// datos en monoespaciada y código de barras (Code 39) con el número del ticket.
const PDFDocument = require('pdfkit');

const MM = 72 / 25.4;
const ANCHO = 80 * MM; // 226.8 pt
const MARGEN = 12;
const COLOR = { amarillo: '#ffc400', asfalto: '#1e2023', tinta: '#16181a', tinta2: '#44484e' };

// Code 39: 9 elementos (barra/espacio alternados, empieza en barra); w = ancho, n = angosto.
const CODE39 = {
  0: 'nnnwwnwnn',
  1: 'wnnwnnnnw',
  2: 'nnwwnnnnw',
  3: 'wnwwnnnnn',
  4: 'nnnwwnnnw',
  5: 'wnnwwnnnn',
  6: 'nnwwwnnnn',
  7: 'nnnwnnwnw',
  8: 'wnnwnnwnn',
  9: 'nnwwnnwnn',
  T: 'nnnnwnwwn',
  '-': 'nwnnnnwnw',
  '*': 'nwnnwnwnn',
};

/** Dibuja el código de barras Code 39 de `texto` (solo dígitos, T y -). */
function dibujarCode39(doc, texto, x, y, ancho, alto) {
  const simbolos = `*${texto}*`
    .split('')
    .map((c) => CODE39[c])
    .filter(Boolean);
  // Cada símbolo: 6 angostos + 3 anchos (ancho = 2.5 angostos) + 1 angosto de separación.
  const unidades = simbolos.length * (6 + 3 * 2.5 + 1);
  const angosto = ancho / unidades;
  let cursor = x;
  for (const patron of simbolos) {
    patron.split('').forEach((e, i) => {
      const w = e === 'w' ? angosto * 2.5 : angosto;
      if (i % 2 === 0) doc.rect(cursor, y, w, alto).fill(COLOR.tinta);
      cursor += w;
    });
    cursor += angosto;
  }
}

/** Franja de peligro amarillo/asfalto (como --hazard de la maqueta). */
function dibujarFranja(doc, x, y, ancho, alto) {
  doc.save();
  doc.rect(x, y, ancho, alto).clip();
  doc.rect(x, y, ancho, alto).fill(COLOR.amarillo);
  for (let i = -alto; i < ancho + alto; i += 14) {
    doc
      .polygon([x + i, y + alto], [x + i + 7, y + alto], [x + i + 7 + alto, y], [x + i + alto, y])
      .fill(COLOR.asfalto);
  }
  doc.restore();
}

/**
 * @param {object} t datos del ticket (estadias.service.obtenerTicket)
 * @param {{ nombre: string, direccion: string, ciudad: string }} sede
 * @param {(fecha: Date) => string} formatearFecha
 * @returns {Promise<Buffer>}
 */
function generarTicketPdf(t, sede, formatearFecha) {
  return new Promise((resolver, rechazar) => {
    const doc = new PDFDocument({
      size: [ANCHO, 470],
      margins: { top: MARGEN, bottom: MARGEN, left: MARGEN, right: MARGEN },
      info: { Title: `PARKO · Ticket ${t.codigo_ticket}`, Author: 'PARKO' },
    });
    const partes = [];
    doc.on('data', (p) => partes.push(p));
    doc.on('end', () => resolver(Buffer.concat(partes)));
    doc.on('error', rechazar);

    const ancho = ANCHO - MARGEN * 2;
    let y = MARGEN;

    // Encabezado: franja de peligro con la etiqueta oscura.
    dibujarFranja(doc, MARGEN, y, ancho, 30);
    doc.font('Helvetica-Bold').fontSize(10);
    const etiqueta = 'TICKET DE INGRESO';
    const anchoEtiqueta = doc.widthOfString(etiqueta, { characterSpacing: 0.8 }) + 14;
    doc.rect(MARGEN + 8, y + 7, anchoEtiqueta, 16).fill(COLOR.asfalto);
    doc
      .fillColor(COLOR.amarillo)
      .text(etiqueta, MARGEN + 14, y + 11, { lineBreak: false, characterSpacing: 0.8 });
    y += 40;

    // Marca y sede
    doc
      .fillColor(COLOR.tinta)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('PARKO', MARGEN, y, { characterSpacing: 1 });
    y += 18;
    doc.font('Courier').fontSize(7.5).fillColor(COLOR.tinta2);
    doc.text(`${sede.nombre} · ${sede.direccion}, ${sede.ciudad}`, MARGEN, y, { width: ancho });
    y = doc.y + 8;

    // Filas término / valor
    const fila = (termino, valor, destacado = false) => {
      doc
        .font('Courier')
        .fontSize(8.5)
        .fillColor(COLOR.tinta2)
        .text(termino, MARGEN, y, { lineBreak: false });
      doc
        .font('Courier-Bold')
        .fontSize(destacado ? 11 : 8.5)
        .fillColor(COLOR.tinta)
        .text(valor, MARGEN, y - (destacado ? 1.5 : 0), { width: ancho, align: 'right' });
      y = Math.max(doc.y, y + 12) + 3;
    };
    const tipo = t.vehiculo.tipo === 'moto' ? 'Moto' : 'Carro';
    fila('N.º', t.codigo_ticket, true);
    fila('Placa', t.vehiculo.placa, true);
    fila(
      'Vehículo',
      [tipo, t.vehiculo.marca, t.vehiculo.modelo, t.vehiculo.color].filter(Boolean).join(' ')
    );
    fila('Espacio', `${t.celda.codigo} · ${t.celda.piso}`);
    fila('Entrada', formatearFecha(t.fecha_hora_entrada));
    fila('Puerta', t.puerta_entrada);
    fila('Cliente', t.tipo_cliente === 'mensualidad' ? 'Mensualidad' : 'Visitante');
    if (t.tarifa) {
      const valor = `$${Number(t.tarifa.valor_fraccion).toLocaleString('es-CO')}/${t.tarifa.unidad}`;
      fila('Tarifa', `${valor} · tope $${Number(t.tarifa.tope_dia).toLocaleString('es-CO')}`);
    }
    fila('Llaves en caseta', t.deja_llaves ? 'Sí' : 'No');

    if (t.observaciones_entrada) {
      y += 2;
      doc.font('Courier').fontSize(7.5).fillColor(COLOR.tinta2).text('Observaciones', MARGEN, y);
      doc
        .font('Courier-Bold')
        .fontSize(8)
        .fillColor(COLOR.tinta)
        .text(t.observaciones_entrada, MARGEN, doc.y + 1, { width: ancho });
      y = doc.y + 6;
    }

    // Código de barras + número legible
    y += 4;
    dibujarCode39(doc, t.codigo_ticket, MARGEN, y, ancho, 46);
    y += 50;
    doc.font('Courier-Bold').fontSize(9).fillColor(COLOR.tinta).text(t.codigo_ticket, MARGEN, y, {
      width: ancho,
      align: 'center',
      characterSpacing: 2,
    });
    y = doc.y + 8;

    if (t.mensaje_pie) {
      doc
        .font('Courier')
        .fontSize(7)
        .fillColor(COLOR.tinta2)
        .text(t.mensaje_pie, MARGEN, y, { width: ancho, align: 'center' });
    }
    doc.end();
  });
}

module.exports = { generarTicketPdf };
