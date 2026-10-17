// Límites de peticiones. Responden con el formato de error del proyecto.
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { LOGIN_MAX_INTENTOS, LOGIN_VENTANA_MS } = require('../config/constantes');

function responder(codigo, mensaje) {
  return (_req, res, _next, opciones) => {
    res.status(opciones.statusCode).json({ error: { codigo, mensaje } });
  };
}

// Login: 5 intentos FALLIDOS cada 15 min por IP + documento (los exitosos no cuentan).
const limiteLogin = rateLimit({
  windowMs: LOGIN_VENTANA_MS,
  limit: LOGIN_MAX_INTENTOS,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const tipo = String(req.body?.tipo_documento ?? '').toUpperCase();
    const numero = String(req.body?.numero_documento ?? '').trim();
    return `${ipKeyGenerator(req.ip)}|${tipo}|${numero}`;
  },
  handler: responder(
    'DEMASIADOS_INTENTOS',
    'Demasiados intentos fallidos. Espera 15 minutos antes de volver a intentarlo.'
  ),
});

// Límite general de la API (protección básica contra abuso).
const limiteApi = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: responder(
    'DEMASIADAS_SOLICITUDES',
    'Demasiadas solicitudes. Intenta de nuevo en un momento.'
  ),
});

module.exports = { limiteLogin, limiteApi };
