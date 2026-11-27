// Traduce HTTP ↔ servicio de movimientos (sin SQL ni reglas de negocio).
const servicio = require('./movimientos.service');
const { ok, creado } = require('../../utils/respuesta');

const actor = (req) => ({ idUsuario: req.usuario.idUsuario, rol: req.usuario.rol, permisos: req.usuario.permisos, ip: req.ip });
const id = (req) => req.validado.params.id;

module.exports = {
  registrarEntrada: async (req, res) => creado(res, await servicio.registrarEntrada(req.validado.body, actor(req))),
  registrarSalida: async (req, res) => ok(res, await servicio.registrarSalida(id(req), req.validado.body, actor(req))),
  listar: async (req, res) => {
    const { data, meta } = await servicio.listar(req.validado.query);
    return ok(res, data, meta);
  },
  anular: async (req, res) => ok(res, await servicio.anular(id(req), req.validado.body, actor(req))),
};
