// /api/v1/auth — spec 001 (login mínimo, research R-05). La spec 003 agrega contrasena,
// registro, recuperar, restablecer y logout (SRS B.1 §4.3).
const { Router } = require('express');
const controller = require('./auth.controller');
const esquemas = require('./auth.validator');
const { validate } = require('../../middlewares/validate');
const { limiteLogin } = require('../../middlewares/rate-limit');

const router = Router();

// POST /api/v1/auth/login — HU-12, HU-13 · RF-ACC-01, RF-ACC-02, RF-ACC-05
router.post('/login', limiteLogin, validate({ body: esquemas.login }), controller.login);

module.exports = router;
