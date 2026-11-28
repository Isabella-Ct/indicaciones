// Traduce HTTP ↔ servicio de liquidaciones (sin SQL ni reglas de negocio).
const servicio = require('./liquidaciones.service');
const { ok } = require('../../utils/respuesta');

const actor = (req) => ({ idUsuario: req.usuario.idUsuario, permisos: req.usuario.permisos, ip: req.ip });

module.exports = {
  liquidar: async (req, res) => ok(res, await servicio.liquidar(req.validado.params.id, actor(req))),
};
