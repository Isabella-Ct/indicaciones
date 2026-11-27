// /api/v1/auth — SRS Apéndice B.1 §4.3 (spec 003-gestion-acceso; el login nació en la spec 001).
// Públicas: login, registro, recuperar y restablecer (RNF-SEG-03), con límite por IP.
// Con token (aun con la contraseña temporal pendiente, research R-02): contrasena y logout.
const { Router } = require('express');
const controller = require('./auth.controller');
const esquemas = require('./auth.validator');
const { validate } = require('../../middlewares/validate');
const { limiteLogin } = require('../../middlewares/rate-limit');
const { authenticate } = require('../../middlewares/authenticate');

const router = Router();

// POST /api/v1/auth/login — HU-12, HU-13 · RF-ACC-01..06
router.post('/login', limiteLogin, validate({ body: esquemas.login }), controller.login);

// PUT /api/v1/auth/contrasena — HU-12 · RF-ACC-04
router.put(
  '/contrasena',
  authenticate.permitirCambioPendiente,
  validate({ body: esquemas.cambioContrasena }),
  controller.cambiarContrasena
);

// POST /api/v1/auth/registro — HU-14 · RF-ACC-07, RF-ACC-08, RF-ACC-09
router.post('/registro', limiteLogin, validate({ body: esquemas.registro }), controller.registro);

// POST /api/v1/auth/recuperar — HU-15 · RF-ACC-10, RF-ACC-11
router.post('/recuperar', limiteLogin, validate({ body: esquemas.recuperar }), controller.recuperar);

// POST /api/v1/auth/restablecer — HU-15 · RF-ACC-12
router.post('/restablecer', limiteLogin, validate({ body: esquemas.restablecer }), controller.restablecer);

// POST /api/v1/auth/logout — HU-16 · RF-ACC-13
router.post('/logout', authenticate.permitirCambioPendiente, controller.logout);

module.exports = router;
