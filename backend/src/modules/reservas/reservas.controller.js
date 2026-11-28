// Traduce HTTP ↔ servicio de reservas (sin SQL ni reglas de negocio).
const servicio = require('./reservas.service');
const { ok, creado } = require('../../utils/respuesta');

const actor = (req) => ({ idUsuario: req.usuario.idUsuario, rol: req.usuario.rol, permisos: req.usuario.permisos, ip: req.ip });

module.exports = {
  reservar: async (req, res) => creado(res, await servicio.reservar(req.validado.body, actor(req))),
  disponibles: async (req, res) => ok(res, await servicio.disponibles(req.validado.query)),
  cancelar: async (req, res) => ok(res, await servicio.cancelar(req.validado.params.id, actor(req))),
  listar: async (req, res) => {
    const { data, meta } = await servicio.listar(req.validado.query);
    return ok(res, data, meta);
  },
  mias: async (req, res) => {
    const { data, meta } = await servicio.mias(req.validado.query, actor(req));
    return ok(res, data, meta);
  },
};
