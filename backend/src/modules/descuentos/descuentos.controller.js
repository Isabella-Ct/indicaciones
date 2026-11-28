// Traduce HTTP ↔ servicio de descuentos (sin SQL ni reglas de negocio).
const servicio = require('./descuentos.service');
const { ok, creado } = require('../../utils/respuesta');

const actor = (req) => ({ idUsuario: req.usuario.idUsuario, permisos: req.usuario.permisos, ip: req.ip });
const id = (req) => req.validado.params.id;

module.exports = {
  listar: async (req, res) => {
    const { data, meta } = await servicio.listar(req.validado.query);
    return ok(res, data, meta);
  },
  crear: async (req, res) => creado(res, await servicio.crear(req.validado.body, actor(req))),
  actualizar: async (req, res) => ok(res, await servicio.actualizar(id(req), req.validado.body, actor(req))),
  cambiarEstado: async (req, res) => ok(res, await servicio.cambiarEstado(id(req), req.validado.body, actor(req))),
};
