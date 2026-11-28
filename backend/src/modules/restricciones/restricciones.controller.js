// Traduce HTTP ↔ servicio de pico y placa (sin SQL ni reglas de negocio).
const servicio = require('./restricciones.service');
const { ok, creado } = require('../../utils/respuesta');

const actor = (req) => ({ idUsuario: req.usuario.idUsuario, permisos: req.usuario.permisos, ip: req.ip });
const id = (req) => req.validado.params.id;

module.exports = {
  listar: async (req, res) => {
    const { data, meta } = await servicio.listar(req.validado.query);
    return ok(res, data, meta);
  },
  crear: async (req, res) => creado(res, await servicio.crear(req.validado.body, actor(req))),
  hoy: async (_req, res) => ok(res, await servicio.hoy()),
  actualizar: async (req, res) => ok(res, await servicio.actualizar(id(req), req.validado.body, actor(req))),
  eliminar: async (req, res) => ok(res, await servicio.eliminar(id(req), actor(req))),
};
