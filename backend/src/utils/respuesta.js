// Sobre de respuesta común { ok, data, meta } (constitución §II).

/** 200 (o el código indicado) con { ok: true, data, meta? }. */
function ok(res, data, meta, status = 200) {
  const cuerpo = { ok: true, data };
  if (meta) cuerpo.meta = meta;
  return res.status(status).json(cuerpo);
}

/** 201 Created. */
function creado(res, data) {
  return ok(res, data, undefined, 201);
}

/** 204 No Content. */
function sinContenido(res) {
  return res.status(204).end();
}

/** Cuerpo de error { ok: false, error: { code, message, details? } }. */
function cuerpoError(code, message, details) {
  const error = { code, message };
  if (details && details.length) error.details = details;
  return { ok: false, error };
}

module.exports = { ok, creado, sinContenido, cuerpoError };
