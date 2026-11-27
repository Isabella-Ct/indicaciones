// Autenticación Bearer (RNF-SEG-03, research R-04): firma válida, sesión (jti) vigente y no
// revocada, usuario activo. Deja req.usuario = { idUsuario, rol, permisos, jti }.
const authService = require('../modules/auth/auth.service');
const { errores } = require('../utils/errores');

async function authenticate(req, _res, next) {
  const cabecera = req.get('authorization') || '';
  const [esquema, token] = cabecera.split(' ');
  if (esquema !== 'Bearer' || !token) return next(errores.noAutenticado());
  req.usuario = await authService.verificarToken(token);
  return next();
}

module.exports = { authenticate };
