// Traduce HTTP ↔ servicio de acceso (sin reglas ni SQL).
const authService = require('./auth.service');
const { ok, creado, sinContenido } = require('../../utils/respuesta');

const actor = (req) => ({ ...req.usuario, ip: req.ip });

async function login(req, res) {
  return ok(res, await authService.iniciarSesion(req.validado.body, { ip: req.ip }));
}

async function cambiarContrasena(req, res) {
  return ok(res, await authService.cambiarContrasena(req.validado.body, actor(req)));
}

async function registro(req, res) {
  return creado(res, await authService.registrarme(req.validado.body, { ip: req.ip }));
}

async function recuperar(req, res) {
  return ok(res, await authService.recuperar(req.validado.body));
}

async function restablecer(req, res) {
  return ok(res, await authService.restablecer(req.validado.body, { ip: req.ip }));
}

async function logout(req, res) {
  await authService.cerrarSesion(actor(req));
  return sinContenido(res);
}

module.exports = { login, cambiarContrasena, registro, recuperar, restablecer, logout };
