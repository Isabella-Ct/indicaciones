// /api/v1/celdas — SRS Apéndice B.1 §4.4 (spec 004-parqueaderos-celdas). /lote va antes de /:id.
const { Router } = require('express');
const controller = require('./celdas.controller');
const esquemas = require('./celdas.validator');
const { authorize } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');

const router = Router();

// POST /api/v1/celdas — HU-20 · RF-CLD-09, RF-CLD-10, RF-CLD-11
router.post('/', authorize('celdas.crear'), validate({ body: esquemas.celdaEntrada }), controller.crear);

// POST /api/v1/celdas/lote — HU-20 · RF-CLD-12
router.post('/lote', authorize('celdas.crear'), validate({ body: esquemas.lote }), controller.crearLote);

// GET /api/v1/celdas?parqueadero&piso&tipo&estado — HU-22 · RF-CLD-16, RF-CLD-17, RF-CLD-18
router.get('/', authorize('celdas.ver'), validate({ query: esquemas.listar }), controller.listar);

// GET /api/v1/celdas/:id — HU-22
router.get('/:id', authorize('celdas.ver'), validate({ params: esquemas.params }), controller.obtener);

// PUT /api/v1/celdas/:id — HU-21 · RF-CLD-13
router.put('/:id', authorize('celdas.editar'), validate({ params: esquemas.params, body: esquemas.celdaEdicion }), controller.actualizar);

// PATCH /api/v1/celdas/:id/estado — HU-21 · RF-CLD-14, RF-CLD-15, RN-09
router.patch(
  '/:id/estado',
  authorize('celdas.cambiar_estado'),
  validate({ params: esquemas.params, body: esquemas.cambioEstado }),
  controller.cambiarEstado
);

// DELETE /api/v1/celdas/:id — HU-21 · RF-CLD-14 (inhabilitación lógica)
router.delete('/:id', authorize('celdas.cambiar_estado'), validate({ params: esquemas.params }), controller.inhabilitar);

module.exports = router;
