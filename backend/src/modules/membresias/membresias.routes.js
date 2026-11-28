// /api/v1/membresias — SRS Apéndice B.1 §4.10 (spec 010-membresias, HU-46, HU-47). authenticate se aplica al
// montar el router en app.js. GET /usuarios/me/membresias vive en usuarios.routes.js.
const { Router } = require('express');
const controller = require('./membresias.controller');
const esquemas = require('./membresias.validator');
const { authorize } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');

const router = Router();

// POST /api/v1/membresias — HU-46 · RF-MEM-03..05 (el Cliente, solo sus vehículos)
router.post('/', authorize('membresias.crear'), validate({ body: esquemas.suscripcion }), controller.suscribir);

// GET /api/v1/membresias?q&estado&page&limit — HU-47 [Propuesta]
router.get('/', authorize('membresias.ver'), validate({ query: esquemas.listar }), controller.listar);

// POST /api/v1/membresias/:id/renovacion — HU-47 · RF-MEM-06
router.post('/:id/renovacion', authorize('membresias.editar'), validate({ params: esquemas.params, body: esquemas.renovacion }), controller.renovar);

// PATCH /api/v1/membresias/:id/cancelacion — HU-47 · RF-MEM-07
router.patch('/:id/cancelacion', authorize('membresias.editar'), validate({ params: esquemas.params, body: esquemas.cancelacion }), controller.cancelar);

module.exports = router;
