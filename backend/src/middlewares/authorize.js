// Autorización por permiso `modulo.accion` con denegación por defecto (RNF-SEG-04, constitución §III).
// Los permisos vienen del token: quedan fijos al iniciar sesión (RF-ROL-10).
const { errores } = require('../utils/errores');

/** @param {string} codigo p. ej. 'roles.ver' */
function authorize(codigo) {
  return (req, _res, next) => {
    const permisos = req.usuario?.permisos;
    if (!Array.isArray(permisos) || !permisos.includes(codigo)) return next(errores.sinPermiso());
    return next();
  };
}

module.exports = { authorize };
