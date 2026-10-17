// Exige que el usuario en sesión tenga el permiso indicado (tabla roles_permisos).
// Debe ir después de `auth()`.
const { errores } = require('../utils/errores');

function requirePermiso(codigo) {
  return (req, _res, next) => {
    if (!req.usuario) return next(errores.noAutenticado());
    if (!req.usuario.permisos.includes(codigo)) return next(errores.prohibido());
    return next();
  };
}

module.exports = { requirePermiso };
