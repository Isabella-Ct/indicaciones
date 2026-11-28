// /api/v1/reservas — SRS Apéndice B.1 §4.12 (spec 012-reservas). authenticate se aplica al montar el router en
// app.js. GET /celdas/disponibles vive en celdas.routes.js y GET /usuarios/me/reservas en usuarios.routes.js; la
// entrada con reserva es un efecto de POST /movimientos y el control de cada minuto está en src/tareas.
const { Router } = require('express');
const controller = require('./reservas.controller');
const esquemas = require('./reservas.validator');
const { authorize } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');

const router = Router();

// POST /api/v1/reservas — HU-52 · RF-RES-01..03 (el Cliente, solo sus vehículos)
router.post('/', authorize('reservas.crear'), validate({ body: esquemas.reserva }), controller.reservar);

// GET /api/v1/reservas?fecha&estado&q&page&limit — HU-54 · RF-RES-06
router.get('/', authorize('reservas.ver'), validate({ query: esquemas.listar }), controller.listar);

// PATCH /api/v1/reservas/:id/cancelacion — HU-53 · RF-RES-04, RF-RES-05 (el Cliente, solo las suyas)
router.patch('/:id/cancelacion', authorize('reservas.editar'), validate({ params: esquemas.params }), controller.cancelar);

module.exports = router;
