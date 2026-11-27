// /api/v1/movimientos — SRS Apéndice B.1 §4.7 (spec 007-control-ingreso-salida). authenticate se aplica al
// montar el router (app.js).
const { Router } = require('express');
const controller = require('./movimientos.controller');
const esquemas = require('./movimientos.validator');
const { authorize } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');

const router = Router();

// POST /api/v1/movimientos — HU-31, HU-32 · RF-MOV-01..06
router.post('/', authorize('movimientos.crear'), validate({ body: esquemas.entrada }), controller.registrarEntrada);

// GET /api/v1/movimientos?estado&placa&q&page&limit — HU-33, HU-34 · RF-MOV-13, RF-MOV-14
router.get('/', authorize('movimientos.ver'), validate({ query: esquemas.listar }), controller.listar);

// POST /api/v1/movimientos/:id/salida — HU-33 · RF-MOV-09..12
router.post(
  '/:id/salida',
  authorize('movimientos.crear'),
  validate({ params: esquemas.params, body: esquemas.salida }),
  controller.registrarSalida
);

// PATCH /api/v1/movimientos/:id/anulacion — HU-35 · RF-MOV-15..17
router.patch(
  '/:id/anulacion',
  authorize('movimientos.anular'),
  validate({ params: esquemas.params, body: esquemas.anulacion }),
  controller.anular
);

module.exports = router;
