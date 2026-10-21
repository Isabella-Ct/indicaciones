const service = require('./reservas.service');

async function crear(req, res) {
  res.status(201).json({ data: await service.crear(req.body, req.usuario) });
}

async function cancelar(req, res) {
  res.json({ data: await service.cancelar(req.validado.params.id, req.usuario) });
}

async function listar(req, res) {
  res.json(await service.listar(req.validado.query));
}

async function obtener(req, res) {
  res.json({ data: await service.obtener(req.validado.params.id, req.usuario) });
}

async function mias(req, res) {
  res.json(await service.deUsuario(req.usuario.id, req.validado.query));
}

module.exports = { crear, cancelar, listar, obtener, mias };
