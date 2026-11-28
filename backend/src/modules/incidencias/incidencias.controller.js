// Traduce HTTP ↔ servicio de incidencias (sin SQL ni reglas de negocio).
const servicio = require('./incidencias.service');
const { ok, creado } = require('../../utils/respuesta');

const actor = (req) => ({ idUsuario: req.usuario.idUsuario, permisos: req.usuario.permisos, ip: req.ip });
const id = (req) => req.validado.params.id;

module.exports = {
  registrar: async (req, res) => creado(res, await servicio.registrar(req.validado.body, req.evidencia, actor(req))),
  listar: async (req, res) => {
    const { data, meta } = await servicio.listar(req.validado.query);
    return ok(res, data, meta);
  },
  obtener: async (req, res) => ok(res, await servicio.obtener(id(req))),
  /** RF-INC-06 [Propuesta]: la imagen, privada (no usa el sobre JSON). */
  evidencia: async (req, res) => {
    const { ruta, tipo } = await servicio.evidencia(id(req));
    res.set('Cache-Control', 'private, no-store');
    return res.type(tipo).sendFile(ruta);
  },
  agregarSeguimiento: async (req, res) => creado(res, await servicio.agregarSeguimiento(id(req), req.validado.body, actor(req))),
  cerrar: async (req, res) => ok(res, await servicio.cerrar(id(req), req.validado.body, actor(req))),
};
