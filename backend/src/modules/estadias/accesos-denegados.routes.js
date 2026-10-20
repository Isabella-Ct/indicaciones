// Entradas rechazadas (pico y placa) — REQ-INEX-4, insumo de REQ-REP-06. Solo administrador.
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const { validate } = require('../../middlewares/validate');
const esquemas = require('./estadias.schemas');
const controller = require('./estadias.controller');

const router = Router();

// GET /api/v1/accesos-denegados — filtros: placa, desde, hasta; paginado
router.get(
  '/',
  auth(),
  requirePermiso('reportes.ver'),
  validate({ query: esquemas.denegados }),
  controller.accesosDenegados
);

module.exports = router;
