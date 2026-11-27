// Límite de peticiones de inicio de sesión por IP (constitución §III; complemento del bloqueo
// por documento de RN-07, que completa la spec 003). Justificado en plan.md › Complexity Tracking.
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { LOGIN_VENTANA_MS } = require('../config/constantes');
const { cuerpoError } = require('../utils/respuesta');

const limiteLogin = rateLimit({
  windowMs: LOGIN_VENTANA_MS,
  limit: env.LOGIN_LIMITE_IP,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) =>
    res
      .status(429)
      .json(cuerpoError('DEMASIADAS_PETICIONES', 'Demasiados intentos. Intente más tarde.')),
});

module.exports = { limiteLogin };
