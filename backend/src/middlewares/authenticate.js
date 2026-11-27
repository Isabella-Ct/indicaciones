// Autenticación Bearer (RNF-SEG-03): firma válida, sesión (jti) vigente y no revocada, usuario activo.
// Deja req.usuario = { idUsuario, rol, permisos, jti, debeCambiarContrasena }.
// Con contraseña temporal pendiente (RF-ACC-04, spec 003 research R-02) solo pasan las rutas montadas
// con authenticate.permitirCambioPendiente (cambiar contraseña y cerrar sesión); el resto → 403.
const authService = require('../modules/auth/auth.service');
const { errores, AppError } = require('../utils/errores');

function crear({ permitirCambioPendiente }) {
  return async function autenticar(req, _res, next) {
    const cabecera = req.get('authorization') || '';
    const [esquema, token] = cabecera.split(' ');
    if (esquema !== 'Bearer' || !token) return next(errores.noAutenticado());
    req.usuario = await authService.verificarToken(token);
    if (req.usuario.debeCambiarContrasena && !permitirCambioPendiente) {
      return next(
        new AppError(403, 'CAMBIO_CONTRASENA_REQUERIDO', 'Debe cambiar su contraseña antes de continuar.')
      );
    }
    return next();
  };
}

const authenticate = crear({ permitirCambioPendiente: false });
authenticate.permitirCambioPendiente = crear({ permitirCambioPendiente: true });

module.exports = { authenticate };
