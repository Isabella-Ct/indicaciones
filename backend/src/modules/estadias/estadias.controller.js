const estadiasService = require('./estadias.service');
const parqueaderoService = require('../parqueadero/parqueadero.service');
const { generarTicketPdf } = require('../../utils/pdf');
const { formatearFechaHora } = require('../../utils/fechas');

async function previsualizar(req, res) {
  res.json({ data: await estadiasService.previsualizar(req.validado.query) });
}

async function entrada(req, res) {
  const ticket = await estadiasService.registrarEntrada(req.body, req.imagen, req.usuario);
  res.status(201).json({ data: ticket });
}

async function salida(req, res) {
  res.json({ data: await estadiasService.liquidarSalida(req.body) });
}

async function liquidar(req, res) {
  res.json({ data: await estadiasService.liquidar(req.validado.params.id, req.body) });
}

async function pagar(req, res) {
  res.json({ data: await estadiasService.pagar(req.validado.params.id, req.body, req.usuario) });
}

async function enCurso(_req, res) {
  res.json({ data: await estadiasService.enCurso() });
}

async function historial(req, res) {
  res.json(await estadiasService.historial(req.validado.query));
}

async function ultimosMovimientos(req, res) {
  res.json({ data: await estadiasService.ultimosMovimientos(req.validado.query.limite) });
}

async function ticketJson(req, res) {
  res.json({ data: await estadiasService.obtenerTicket(req.validado.params.id) });
}

async function ticketPdf(req, res) {
  const [ticket, sede] = await Promise.all([
    estadiasService.obtenerTicket(req.validado.params.id),
    parqueaderoService.obtenerSede(),
  ]);
  const pdf = await generarTicketPdf(ticket, sede, formatearFechaHora);
  res
    .status(200)
    .set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="ticket-${ticket.codigo_ticket}.pdf"`,
      'Cache-Control': 'no-store',
    })
    .send(pdf);
}

async function accesosDenegados(req, res) {
  res.json(await estadiasService.accesosDenegados(req.validado.query));
}

async function misEstadias(req, res) {
  res.json(await estadiasService.historialDeUsuario(req.usuario.id, req.validado.query));
}

module.exports = {
  previsualizar,
  entrada,
  salida,
  liquidar,
  pagar,
  enCurso,
  historial,
  ultimosMovimientos,
  ticketJson,
  ticketPdf,
  accesosDenegados,
  misEstadias,
};
