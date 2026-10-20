const facturasService = require('./facturas.service');
const parqueaderoService = require('../parqueadero/parqueadero.service');
const { generarFacturaPdf } = require('../../utils/pdf');
const { formatearFechaHora } = require('../../utils/fechas');

async function listar(req, res) {
  res.json(await facturasService.listar(req.validado.query, req.usuario));
}

async function resumenHoy(_req, res) {
  res.json({ data: await facturasService.resumenHoy() });
}

async function obtener(req, res) {
  res.json({ data: await facturasService.obtener(req.validado.params.id, req.usuario) });
}

/** PDF: el personal, cualquiera; el cliente, solo las suyas (403 si es ajena). */
async function pdf(req, res) {
  const [factura, sede] = await Promise.all([
    facturasService.obtener(req.validado.params.id, req.usuario),
    parqueaderoService.obtenerSede(),
  ]);
  const archivo = await generarFacturaPdf(factura, sede, formatearFechaHora);
  res
    .status(200)
    .set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="factura-${factura.numero}.pdf"`,
      'Cache-Control': 'no-store',
    })
    .send(archivo);
}

async function misFacturas(req, res) {
  res.json(await facturasService.listarDeCliente(req.usuario.id, req.validado.query));
}

module.exports = { listar, resumenHoy, obtener, pdf, misFacturas };
