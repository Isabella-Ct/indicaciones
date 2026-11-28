// /api/v1/restricciones-placa — SRS Apéndice B.1 §4.6 (spec 006-pico-y-placa). authenticate se aplica al
// montar el router (app.js). /hoy va antes de /:id.
const { Router } = require('express');
const controller = require('./restricciones.controller');
const esquemas = require('./restricciones.validator');
const { authorize } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');

const router = Router();

// GET /api/v1/restricciones-placa?page&limit&tipo&dia&estado — HU-29 · RF-PYP-01
router.get('/', authorize('restricciones.ver'), validate({ query: esquemas.listar }), controller.listar);

// POST /api/v1/restricciones-placa — HU-29 · RF-PYP-01..03
router.post('/', authorize('restricciones.crear'), validate({ body: esquemas.restriccionEntrada }), controller.crear);

// GET /api/v1/restricciones-placa/hoy — HU-30 · RF-PYP-05
router.get('/hoy', authorize('restricciones.ver'), controller.hoy);

// PUT /api/v1/restricciones-placa/:id — HU-29 · RF-PYP-04 (estado exige además cambiar_estado)
router.put(
  '/:id',
  authorize('restricciones.editar'),
  validate({ params: esquemas.params, body: esquemas.restriccionEdicion }),
  controller.actualizar
);

// DELETE /api/v1/restricciones-placa/:id — HU-29 · RF-PYP-04 (eliminación lógica)
router.delete('/:id', authorize('restricciones.cambiar_estado'), validate({ params: esquemas.params }), controller.eliminar);

module.exports = router;
