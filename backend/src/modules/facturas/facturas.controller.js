// Traduce HTTP ↔ servicio de pagos y facturas (sin SQL ni reglas de negocio).
const servicio = require('./facturas.service');
const { ok, creado } = require('../../utils/respuesta');

const actor = (req) => ({ idUsuario: req.usuario.idUsuario, rol: req.usuario.rol, permisos: req.usuario.permisos, ip: req.ip });
const id = (req) => req.validado.params.id;

module.exports = {
  pagar: async (req, res) => creado(res, await servicio.pagar(req.validado.body, actor(req))),
  emitir: async (req, res) => ok(res, await servicio.emitir(req.validado.body, actor(req))),
  obtener: async (req, res) => ok(res, await servicio.obtener(id(req))),
  /** RF-FAC-10: application/pdf (no usa el sobre JSON). */
  pdf: async (req, res) => {
    const { numero, contenido } = await servicio.pdf(id(req), actor(req));
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `inline; filename="factura-${numero}.pdf"`);
    res.set('Cache-Control', 'private, no-store');
    return res.send(contenido);
  },
  anular: async (req, res) => ok(res, await servicio.anular(id(req), req.validado.body, actor(req))),
  listar: async (req, res) => {
    const { data, meta } = await servicio.listar(req.validado.query);
    return ok(res, data, meta);
  },
  misFacturas: async (req, res) => {
    const { data, meta } = await servicio.misFacturas(req.validado.query, actor(req));
    return ok(res, data, meta);
  },
};
