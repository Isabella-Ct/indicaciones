// /api/v1/planes-membresia — SRS Apéndice B.1 §4.10 (spec 010-membresias, HU-45). authenticate se aplica al
// montar el router en app.js.
const { Router } = require('express');
const controller = require('./planes.controller');
const esquemas = require('./planes.validator');
const { authorize } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');

const router = Router();

// GET /api/v1/planes-membresia?estado&tipoVehiculo&q&page&limit — HU-45, HU-48 · RF-MEM-01, RF-MEM-10
router.get('/', authorize('planes.ver'), validate({ query: esquemas.listar }), controller.listar);

// POST /api/v1/planes-membresia — HU-45 · RF-MEM-01
router.post('/', authorize('planes.crear'), validate({ body: esquemas.planEntrada }), controller.crear);

// PUT /api/v1/planes-membresia/:id — HU-45 · RF-MEM-01
router.put('/:id', authorize('planes.editar'), validate({ params: esquemas.params, body: esquemas.planEntrada }), controller.actualizar);

// PATCH /api/v1/planes-membresia/:id/estado — HU-45 · RF-MEM-02
router.patch(
  '/:id/estado',
  authorize('planes.cambiar_estado'),
  validate({ params: esquemas.params, body: esquemas.cambioEstado }),
  controller.cambiarEstado
);

module.exports = router;
