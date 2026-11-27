// /api/v1/vehiculos — SRS Apéndice B.1 §4.5 (spec 005-vehiculos). authenticate se aplica al montar
// el router (app.js). GET /usuarios/me/vehiculos está en usuarios.routes.js y usa este controlador.
const { Router } = require('express');
const controller = require('./vehiculos.controller');
const esquemas = require('./vehiculos.validator');
const { authorize } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');

const router = Router();

// POST /api/v1/vehiculos — HU-25 · RF-VEH-01..03
router.post('/', authorize('vehiculos.crear'), validate({ body: esquemas.vehiculoEntrada }), controller.crear);

// GET /api/v1/vehiculos?page&limit&q&tipo&propietario&dentro — HU-28 · RF-VEH-10
router.get('/', authorize('vehiculos.ver'), validate({ query: esquemas.listar }), controller.listar);

// GET /api/v1/vehiculos/:id — HU-28 · RF-VEH-11
router.get('/:id', authorize('vehiculos.ver'), validate({ params: esquemas.params }), controller.obtener);

// PUT /api/v1/vehiculos/:id — HU-27 · RF-VEH-07..09
router.put(
  '/:id',
  authorize('vehiculos.editar'),
  validate({ params: esquemas.params, body: esquemas.vehiculoEntrada }),
  controller.actualizar
);

// PATCH /api/v1/vehiculos/:id/propietario — HU-26, HU-27 · RF-VEH-04..06, RF-VEH-08
// (reasignar o quitar exige además vehiculos.editar: se verifica en el servicio)
router.patch(
  '/:id/propietario',
  authorize('vehiculos.crear'),
  validate({ params: esquemas.params, body: esquemas.propietario }),
  controller.asignarPropietario
);

module.exports = router;
