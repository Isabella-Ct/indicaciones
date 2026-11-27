// Valida params, query y body con esquemas zod (RNF-SEG-06). El resultado limpio queda en
// req.validado (en Express 5 req.query es de solo lectura). Errores → 422 con detalle por campo.
const { errores } = require('../utils/errores');

/** Un mensaje por campo (el primero), para mostrarlo junto al control (RNF-USA-03). */
function aDetalles(issues) {
  const vistos = new Set();
  const detalles = [];
  for (const issue of issues) {
    const campo = issue.path.join('.') || null;
    if (campo !== null && vistos.has(campo)) continue;
    vistos.add(campo);
    detalles.push({ campo, mensaje: issue.message });
  }
  return detalles;
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
