// Valida body / query / params con esquemas zod.
// El resultado limpio queda en req.validado (y req.body se reemplaza por el body validado).
const { errores } = require('../utils/errores');

function aDetalles(issues) {
  return issues.map((i) => ({ campo: i.path.join('.') || null, mensaje: i.message }));
}

/**
 * @param {{ body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny }} esquemas
 */
function validate(esquemas) {
  return (req, _res, next) => {
    const validado = {};
    const detalles = [];
    for (const parte of ['params', 'query', 'body']) {
      if (!esquemas[parte]) continue;
      const resultado = esquemas[parte].safeParse(req[parte] ?? {});
      if (resultado.success) validado[parte] = resultado.data;
      else detalles.push(...aDetalles(resultado.error.issues));
    }
    if (detalles.length > 0) return next(errores.validacion(detalles));
    req.validado = validado;
    if (validado.body) req.body = validado.body;
    return next();
  };
}

module.exports = { validate };
