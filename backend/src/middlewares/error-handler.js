// Manejo centralizado de errores con el sobre { ok:false, error:{ code, message, details? } }
// (constitución §II). Los 500 nunca exponen la traza fuera de desarrollo.
const path = require('node:path');
const env = require('../config/env');
const { AppError } = require('../utils/errores');
const { cuerpoError } = require('../utils/respuesta');

const CARPETA_FRONTEND = path.join(__dirname, '..', '..', '..', 'frontend');
const esApi = (req) => req.originalUrl.startsWith('/api/');

// 404: JSON para la API, página del frontend para el resto.
function noEncontrado(req, res) {
  if (esApi(req)) {
    return res
      .status(404)
      .json(cuerpoError('RUTA_NO_ENCONTRADA', 'La ruta solicitada no existe.'));
  }
  return res.status(404).sendFile(path.join(CARPETA_FRONTEND, '404.html'));
}

function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json(cuerpoError(err.code, err.message, err.details));
  }
  if (err.type === 'entity.parse.failed') {
    return res
      .status(400)
      .json(cuerpoError('JSON_INVALIDO', 'El cuerpo de la solicitud no es JSON válido.'));
  }
  if (err.type === 'entity.too.large') {
    return res
      .status(413)
      .json(cuerpoError('CUERPO_DEMASIADO_GRANDE', 'La solicitud es demasiado grande.'));
  }
  // Violación de UNIQUE que el servicio no tradujo.
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json(cuerpoError('DUPLICADO', 'Ya existe un registro con esos datos.'));
  }

  if (env.NODE_ENV !== 'test') {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  }
  if (!esApi(req)) return res.status(500).sendFile(path.join(CARPETA_FRONTEND, 'error.html'));
  const detalles =
    env.NODE_ENV === 'development' ? [{ campo: null, mensaje: err.message }] : undefined;
  return res
    .status(500)
    .json(cuerpoError('ERROR_INTERNO', 'Ocurrió un error inesperado. Intente de nuevo.', detalles));
}

module.exports = { noEncontrado, errorHandler };
