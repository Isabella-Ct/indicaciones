// Traduce HTTP ↔ servicio de parqueaderos y puertas (sin SQL ni reglas de negocio).
const servicio = require('./parqueaderos.service');
const { ok, creado } = require('../../utils/respuesta');

const actor = (req) => ({ idUsuario: req.usuario.idUsuario, permisos: req.usuario.permisos, ip: req.ip });
const id = (req) => req.validado.params.id;

module.exports = {
  crear: async (req, res) => creado(res, await servicio.crear(req.validado.body, actor(req))),
  listar: async (req, res) => {
    const { data, meta } = await servicio.listar(req.validado.query);
    return ok(res, data, meta);
  },
  obtener: async (req, res) => ok(res, await servicio.obtener(id(req))),
  actualizar: async (req, res) => ok(res, await servicio.actualizar(id(req), req.validado.body, actor(req))),
  inactivar: async (req, res) => ok(res, await servicio.inactivar(id(req), actor(req))),
  listarPuertas: async (req, res) => ok(res, await servicio.listarPuertas(id(req), req.validado.query)),
  crearPuerta: async (req, res) => creado(res, await servicio.crearPuerta(id(req), req.validado.body, actor(req))),
  actualizarPuerta: async (req, res) => ok(res, await servicio.actualizarPuerta(id(req), req.validado.body, actor(req))),
};
