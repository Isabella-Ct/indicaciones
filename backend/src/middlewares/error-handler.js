// Manejo centralizado de errores: { error: { codigo, mensaje, detalles? } }.
const path = require('node:path');
const env = require('../config/env');
const { AppError } = require('../utils/errores');

const PAGINA_404 = path.join(__dirname, '..', '..', '..', 'frontend', '404.html');

// 404: JSON para la API, página PARKO para el resto.
function noEncontrado(req, res) {
  if (req.originalUrl.startsWith('/api/')) {
    return res
      .status(404)
      .json({ error: { codigo: 'RUTA_NO_ENCONTRADA', mensaje: 'La ruta solicitada no existe.' } });
  }
  return res.status(404).sendFile(PAGINA_404);
}

function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    const cuerpo = { codigo: err.codigo, mensaje: err.message };
    if (err.detalles) cuerpo.detalles = err.detalles;
    return res.status(err.estado).json({ error: cuerpo });
  }

  // JSON mal formado o cuerpo demasiado grande (express.json)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { codigo: 'JSON_INVALIDO', mensaje: 'El cuerpo de la solicitud no es JSON válido.' },
    });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: { codigo: 'CUERPO_DEMASIADO_GRANDE', mensaje: 'La solicitud es demasiado grande.' },
    });
  }

  // Violación de UNIQUE no controlada por el service
  if (err.code === 'ER_DUP_ENTRY') {
    return res
      .status(409)
      .json({ error: { codigo: 'DUPLICADO', mensaje: 'Ya existe un registro con esos datos.' } });
  }

  // Error inesperado: se registra, pero nunca se expone el stack en producción.
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  const cuerpo = {
    codigo: 'ERROR_INTERNO',
    mensaje: 'Ocurrió un error inesperado. Intenta de nuevo.',
  };
  if (env.NODE_ENV === 'development')
    cuerpo.detalles = [{ mensaje: err.message, stack: err.stack }];
  return res.status(500).json({ error: cuerpo });
}

module.exports = { noEncontrado, errorHandler };
