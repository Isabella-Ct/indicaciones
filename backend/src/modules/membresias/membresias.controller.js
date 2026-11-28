// Traduce HTTP ↔ servicio de membresías (sin SQL ni reglas de negocio).
const servicio = require('./membresias.service');
const { ok, creado } = require('../../utils/respuesta');

const actor = (req) => ({ idUsuario: req.usuario.idUsuario, rol: req.usuario.rol, permisos: req.usuario.permisos, ip: req.ip });
const id = (req) => req.validado.params.id;

module.exports = {
  suscribir: async (req, res) => creado(res, await servicio.suscribir(req.validado.body, actor(req))),
  listar: async (req, res) => {
    const { data, meta } = await servicio.listar(req.validado.query);
    return ok(res, data, meta);
  },
  renovar: async (req, res) => creado(res, await servicio.renovar(id(req), req.validado.body, actor(req))),
  cancelar: async (req, res) => ok(res, await servicio.cancelar(id(req), req.validado.body, actor(req))),
  mias: async (req, res) => ok(res, await servicio.mias(actor(req))),
};
