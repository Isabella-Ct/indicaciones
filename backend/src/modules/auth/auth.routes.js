// Autenticación — REQ-USR-7, REQ-USR-8 [AJUSTADO]
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { limiteLogin } = require('../../middlewares/rate-limit');
const esquemas = require('./auth.schemas');
const controller = require('./auth.controller');

const router = Router();

// POST /api/v1/auth/login — documento + contraseña → cookie httpOnly con el JWT
router.post('/login', limiteLogin, validate({ body: esquemas.login }), controller.login);

// POST /api/v1/auth/logout
router.post('/logout', controller.logout);

// GET /api/v1/auth/me — usuario en sesión y sus permisos
router.get('/me', auth({ permitirCambioPendiente: true }), controller.me);

// POST /api/v1/auth/cambiar-contrasena — también resuelve la contraseña temporal
router.post(
  '/cambiar-contrasena',
  auth({ permitirCambioPendiente: true }),
  validate({ body: esquemas.cambiarContrasena }),
  controller.cambiarContrasena
);

module.exports = router;
