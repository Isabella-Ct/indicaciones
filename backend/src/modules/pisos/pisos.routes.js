// Pisos (niveles) del parqueadero — REQ-CLD-01 (ver celdas por piso o nivel)
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const controller = require('./pisos.controller');

const router = Router();

// GET /api/v1/pisos — pisos con los textos del carril para dibujar el mapa
router.get('/', auth(), requirePermiso('celdas.ver'), controller.listar);

module.exports = router;
