// CSV para Excel en español: UTF-8 con BOM (tildes), separador ";" (la coma es el
// separador decimal en es-CO) y saltos de línea CRLF. Escapa comillas y separadores.
const BOM = '﻿';
const SEPARADOR = ';';

function celda(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  // Evita inyección de fórmulas al abrir en Excel (=, +, -, @ al inicio de un texto).
  const seguro = /^[=+\-@\t\r]/.test(texto) && typeof valor === 'string' ? `'${texto}` : texto;
  return /[";\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

/**
 * @param {Array<{ titulo: string, valor: (fila: object) => any }>} columnas
 * @param {Array<object>} filas
 * @returns {string}
 */
function aCsv(columnas, filas) {
  const lineas = [columnas.map((c) => celda(c.titulo)).join(SEPARADOR)];
  for (const fila of filas) lineas.push(columnas.map((c) => celda(c.valor(fila))).join(SEPARADOR));
  return BOM + lineas.join('\r\n') + '\r\n';
}

/** Envía el CSV como descarga: reporte-<nombre>-<fecha>.csv */
function enviarCsv(res, nombre, contenido) {
  res
    .status(200)
    .set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nombre}.csv"`,
      'Cache-Control': 'no-store',
    })
    .send(contenido);
}

module.exports = { aCsv, enviarCsv, BOM, SEPARADOR };
