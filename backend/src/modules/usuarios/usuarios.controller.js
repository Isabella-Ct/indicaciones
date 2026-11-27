// Traduce HTTP ↔ servicio de usuarios (sin SQL ni reglas de negocio).
const servicio = require('./usuarios.service');
const { ok, creado } = require('../../utils/respuesta');

/** Quién actúa: id, permisos de la sesión (alcance, research R-08) e IP para la bitácora. */
const actor = (req) => ({ idUsuario: req.usuario.idUsuario, permisos: req.usuario.permisos, ip: req.ip });

async function crear(req, res) {
  return creado(res, await servicio.crear(req.validado.body, req.foto, actor(req)));
}

async function listar(req, res) {
  const { data, meta } = await servicio.listar(req.validado.query, actor(req));
  return ok(res, data, meta);
}

async function obtener(req, res) {
  return ok(res, await servicio.obtener(req.validado.params.id, actor(req)));
}

async function foto(req, res) {
  const { ruta, tipo } = await servicio.foto(req.validado.params.id, actor(req));
  res.set('Cache-Control', 'private, no-store');
  return res.type(tipo).sendFile(ruta);
}

async function actualizar(req, res) {
  return ok(res, await servicio.actualizar(req.validado.params.id, req.validado.body, req.foto, actor(req)));
}

async function cambiarEstado(req, res) {
  return ok(res, await servicio.cambiarEstado(req.validado.params.id, req.validado.body.estado, actor(req)));
}

async function misDatos(req, res) {
  return ok(res, await servicio.misDatos(actor(req)));
}

async function actualizarMisDatos(req, res) {
  return ok(res, await servicio.actualizarMisDatos(req.validado.body, req.foto, actor(req)));
}

module.exports = { crear, listar, obtener, foto, actualizar, cambiarEstado, misDatos, actualizarMisDatos };
