// Traduce HTTP ↔ servicio de tickets (sin SQL ni reglas de negocio).
const servicio = require('./tickets.service');
const { ok } = require('../../utils/respuesta');

const codigo = (req) => req.validado.params.codigo;

module.exports = {
  obtener: async (req, res) => ok(res, await servicio.obtener(codigo(req))),
  enviar: async (req, res) => ok(res, await servicio.enviar(codigo(req))),
};
