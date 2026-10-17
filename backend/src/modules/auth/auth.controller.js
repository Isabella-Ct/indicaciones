const env = require('../../config/env');
const { COOKIE_SESION } = require('../../config/constantes');
const authService = require('./auth.service');

const opcionesCookie = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: env.NODE_ENV === 'production',
  path: '/',
});

async function login(req, res) {
  const { token, expiraEn, usuario } = await authService.login(req.body);
  res.cookie(COOKIE_SESION, token, { ...opcionesCookie(), expires: expiraEn });
  res.json({ data: usuario });
}

function logout(_req, res) {
  res.clearCookie(COOKIE_SESION, opcionesCookie());
  res.json({ data: { mensaje: 'Sesión cerrada.' } });
}

function me(req, res) {
  res.json({ data: req.usuario });
}

async function cambiarContrasena(req, res) {
  const usuario = await authService.cambiarContrasena(req.usuario.id, req.body);
  res.json({ data: usuario });
}

module.exports = { login, logout, me, cambiarContrasena };
