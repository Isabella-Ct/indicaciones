const membresiasService = require('./membresias.service');

async function listar(req, res) {
  res.json(await membresiasService.listar(req.validado.query));
}

async function obtener(req, res) {
  res.json({ data: await membresiasService.obtener(req.validado.params.id) });
}

async function cotizar(req, res) {
  res.json({ data: await membresiasService.cotizar(req.validado.query) });
}

async function crear(req, res) {
  res.status(201).json({ data: await membresiasService.crear(req.body, req.usuario) });
}

async function cancelar(req, res) {
  res.json({ data: await membresiasService.cancelar(req.validado.params.id) });
}

async function misMembresias(req, res) {
  res.json({ data: await membresiasService.deUsuario(req.usuario.id) });
}

module.exports = { listar, obtener, cotizar, crear, cancelar, misMembresias };
