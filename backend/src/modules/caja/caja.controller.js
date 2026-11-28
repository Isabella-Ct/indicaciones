// Traduce HTTP ↔ servicio de caja (sin SQL ni reglas de negocio).
const servicio = require('./caja.service');
const { ok, creado } = require('../../utils/respuesta');

const actor = (req) => ({ idUsuario: req.usuario.idUsuario, rol: req.usuario.rol, permisos: req.usuario.permisos, ip: req.ip });

module.exports = {
  turnoActual: async (req, res) => ok(res, await servicio.turnoActual(actor(req))),
  cerrar: async (req, res) => creado(res, await servicio.cerrar(req.validado.body, actor(req))),
  listar: async (req, res) => {
    const { data, meta } = await servicio.listar(req.validado.query, actor(req));
    return ok(res, data, meta);
  },
};
