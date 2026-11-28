// Traduce HTTP ↔ servicio de roles (sin SQL ni reglas de negocio).
const servicio = require('./roles.service');
const { ok, creado } = require('../../utils/respuesta');

const actor = (req) => ({ idUsuario: req.usuario.idUsuario, ip: req.ip });

async function listar(req, res) {
  const { data, meta } = await servicio.listar(req.validado.query);
  return ok(res, data, meta);
}

async function obtener(req, res) {
  return ok(res, await servicio.obtener(req.validado.params.id));
}

async function crear(req, res) {
  return creado(res, await servicio.crear(req.validado.body, actor(req)));
}

async function actualizar(req, res) {
  return ok(res, await servicio.actualizar(req.validado.params.id, req.validado.body, actor(req)));
}

async function cambiarEstado(req, res) {
  const { id } = req.validado.params;
  return ok(res, await servicio.cambiarEstado(id, req.validado.body.estado, actor(req)));
}

async function catalogo(_req, res) {
  return ok(res, await servicio.catalogo());
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, catalogo };
