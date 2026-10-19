const puertasService = require('./puertas.service');

async function listar(req, res) {
  res.json({ data: await puertasService.listar(req.validado.query, req.usuario) });
}

async function crear(req, res) {
  res.status(201).json({ data: await puertasService.crear(req.body) });
}

async function actualizar(req, res) {
  res.json({ data: await puertasService.actualizar(req.validado.params.id, req.body) });
}

async function cambiarActiva(req, res) {
  res.json({ data: await puertasService.cambiarActiva(req.validado.params.id, req.body.activa) });
}

module.exports = { listar, crear, actualizar, cambiarActiva };
