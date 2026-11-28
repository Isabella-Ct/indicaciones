// /api/v1/descuentos — SRS Apéndice B.1 §4.11 (spec 011-descuentos). authenticate se aplica al montar el router
// en app.js. La aplicación en la liquidación es parte de GET /movimientos/:id/liquidacion (HU-50).
const { Router } = require('express');
const controller = require('./descuentos.controller');
const esquemas = require('./descuentos.validator');
const { authorize } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');

const router = Router();

// GET /api/v1/descuentos?q&estado&tipoVehiculo&tipoCliente&page&limit — HU-49 · RF-DES-01
router.get('/', authorize('descuentos.ver'), validate({ query: esquemas.listar }), controller.listar);

// POST /api/v1/descuentos — HU-49 · RF-DES-01, RF-DES-02
router.post('/', authorize('descuentos.crear'), validate({ body: esquemas.descuentoEntrada }), controller.crear);

// PUT /api/v1/descuentos/:id — HU-49 · RF-DES-01, RF-DES-02
router.put('/:id', authorize('descuentos.editar'), validate({ params: esquemas.params, body: esquemas.descuentoEntrada }), controller.actualizar);

// PATCH /api/v1/descuentos/:id/estado — HU-51 · RF-DES-05
router.patch(
  '/:id/estado',
  authorize('descuentos.cambiar_estado'),
  validate({ params: esquemas.params, body: esquemas.cambioEstado }),
  controller.cambiarEstado
);

module.exports = router;
