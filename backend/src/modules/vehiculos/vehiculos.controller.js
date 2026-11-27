// Traduce HTTP ↔ servicio de vehículos (sin SQL ni reglas de negocio).
const servicio = require('./vehiculos.service');
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
  asignarPropietario: async (req, res) =>
    ok(res, await servicio.asignarPropietario(id(req), req.validado.body, actor(req))),
  misVehiculos: async (req, res) => ok(res, await servicio.misVehiculos(actor(req))),
};
