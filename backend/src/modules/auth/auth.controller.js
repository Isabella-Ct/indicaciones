// Traduce HTTP ↔ servicio de autenticación (sin reglas ni SQL).
const authService = require('./auth.service');
const { ok } = require('../../utils/respuesta');

async function login(req, res) {
  const sesion = await authService.iniciarSesion(req.validado.body, { ip: req.ip });
  return ok(res, sesion);
}

module.exports = { login };
