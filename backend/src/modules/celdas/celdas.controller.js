// Traduce HTTP ↔ servicio de celdas (sin SQL ni reglas de negocio).
const servicio = require('./celdas.service');
const { ok, creado } = require('../../utils/respuesta');

const actor = (req) => ({ idUsuario: req.usuario.idUsuario, permisos: req.usuario.permisos, ip: req.ip });
const id = (req) => req.validado.params.id;

module.exports = {
  crear: async (req, res) => creado(res, await servicio.crear(req.validado.body, actor(req))),
  crearLote: async (req, res) => creado(res, await servicio.crearLote(req.validado.body, actor(req))),
  listar: async (req, res) => {
    const { data, meta } = await servicio.listar(req.validado.query, actor(req));
    return ok(res, data, meta);
  },
  obtener: async (req, res) => ok(res, await servicio.obtener(id(req), actor(req))),
  actualizar: async (req, res) => ok(res, await servicio.actualizar(id(req), req.validado.body, actor(req))),
  cambiarEstado: async (req, res) => ok(res, await servicio.cambiarEstado(id(req), req.validado.body, actor(req))),
  inhabilitar: async (req, res) => ok(res, await servicio.inhabilitar(id(req), actor(req))),
};
