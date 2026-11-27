// Valida params, query y body con esquemas zod (RNF-SEG-06). El resultado limpio queda en
// req.validado (en Express 5 req.query es de solo lectura). Errores → 422 con detalle por campo.
const { errores } = require('../utils/errores');

function aDetalles(issues) {
  return issues.map((i) => ({ campo: i.path.join('.') || null, mensaje: i.message }));
}

/**
 * @param {{ params?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, body?: import('zod').ZodTypeAny }} esquemas
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
    return next();
  };
}

module.exports = { validate };
