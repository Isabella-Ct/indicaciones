// Pico y placa — REQ-CAR-4 (admin y operador)
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const { validate } = require('../../middlewares/validate');
const esquemas = require('./pico-placa.schemas');
const controller = require('./pico-placa.controller');

const router = Router();
router.use(auth());

// GET /api/v1/pico-placa — filtros: tipo_vehiculo, dia_semana, activa
router.get(
  '/',
  requirePermiso('pico_placa.ver'),
  validate({ query: esquemas.listar }),
  controller.listar
);

// GET /api/v1/pico-placa/hoy — reglas activas del día (hora de Bogotá)
router.get('/hoy', requirePermiso('pico_placa.ver'), controller.deHoy);

// POST /api/v1/pico-placa
router.post(
  '/',
  requirePermiso('pico_placa.gestionar'),
  validate({ body: esquemas.crear }),
  controller.crear
);

// PUT /api/v1/pico-placa/:id
router.put(
  '/:id',
  requirePermiso('pico_placa.gestionar'),
  validate({ params: esquemas.params, body: esquemas.editar }),
  controller.actualizar
);

// PATCH /api/v1/pico-placa/:id/activa
router.patch(
  '/:id/activa',
  requirePermiso('pico_placa.gestionar'),
  validate({ params: esquemas.params, body: esquemas.cambiarActiva }),
  controller.cambiarActiva
);

module.exports = router;
