const picoPlacaService = require('./pico-placa.service');

async function listar(req, res) {
  res.json({ data: await picoPlacaService.listar(req.validado.query) });
}

async function deHoy(_req, res) {
  res.json({ data: await picoPlacaService.deHoy() });
}

async function crear(req, res) {
  res.status(201).json({ data: await picoPlacaService.crear(req.body, req.usuario) });
}

async function actualizar(req, res) {
  res.json({ data: await picoPlacaService.actualizar(req.validado.params.id, req.body) });
}

async function cambiarActiva(req, res) {
  res.json({ data: await picoPlacaService.cambiarActiva(req.validado.params.id, req.body.activa) });
}

module.exports = { listar, deHoy, crear, actualizar, cambiarActiva };
