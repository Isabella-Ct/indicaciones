// Verifica el JWT de la cookie de sesión y carga el usuario con sus permisos.
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { COOKIE_SESION } = require('../config/constantes');
const { AppError, errores } = require('../utils/errores');
const authService = require('../modules/auth/auth.service');

/**
 * @param {{ permitirCambioPendiente?: boolean }} [opciones]
 *   permitirCambioPendiente: deja pasar a quien aún debe cambiar su contraseña
 *   temporal (solo /auth/me, /auth/logout y /auth/cambiar-contrasena).
 */
function auth({ permitirCambioPendiente = false } = {}) {
  return async (req, res, next) => {
    const token = req.cookies?.[COOKIE_SESION];
    if (!token) return next(errores.noAutenticado());

    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch {
      res.clearCookie(COOKIE_SESION, { path: '/' });
      return next(errores.noAutenticado('Tu sesión expiró. Inicia sesión de nuevo.'));
    }

    try {
      const usuario = await authService.obtenerSesion(Number(payload.sub));
      if (!usuario || usuario.estado !== 'activo') {
        res.clearCookie(COOKIE_SESION, { path: '/' });
        return next(errores.noAutenticado('Tu sesión ya no es válida. Inicia sesión de nuevo.'));
      }
      if (usuario.debe_cambiar_contrasena && !permitirCambioPendiente) {
        return next(
          new AppError(
            403,
            'DEBE_CAMBIAR_CONTRASENA',
            'Debes cambiar tu contraseña temporal antes de continuar.'
          )
        );
      }
      req.usuario = usuario;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { auth };
