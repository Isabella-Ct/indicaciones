// /api/v1/incidencias — SRS Apéndice B.1 §4.13 (spec 013-incidencias) + /:id/evidencia [Propuesta]. authenticate se
// aplica al montar el router en app.js.
const { Router } = require('express');
const controller = require('./incidencias.controller');
const esquemas = require('./incidencias.validator');
const { authorize } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');
const { subirEvidencia } = require('../../middlewares/subir-foto');

const router = Router();

// POST /api/v1/incidencias (JSON o multipart con `evidencia`) — HU-56 · RF-INC-01..04
router.post('/', authorize('incidencias.crear'), subirEvidencia, validate({ body: esquemas.registro }), controller.registrar);

// GET /api/v1/incidencias?q&tipo&estado&desde&hasta&page&limit — HU-57 · RF-INC-05
router.get('/', authorize('incidencias.ver'), validate({ query: esquemas.listar }), controller.listar);

// GET /api/v1/incidencias/:id — HU-57 · RF-INC-06
router.get('/:id', authorize('incidencias.ver'), validate({ params: esquemas.params }), controller.obtener);

// GET /api/v1/incidencias/:id/evidencia — [Propuesta] RF-INC-06, RNF-PRI-03
router.get('/:id/evidencia', authorize('incidencias.ver'), validate({ params: esquemas.params }), controller.evidencia);

// POST /api/v1/incidencias/:id/seguimientos — HU-58 · RF-INC-07
router.post('/:id/seguimientos', authorize('incidencias.editar'), validate({ params: esquemas.params, body: esquemas.seguimiento }), controller.agregarSeguimiento);

// PATCH /api/v1/incidencias/:id/cierre — HU-58 · RF-INC-08
router.patch('/:id/cierre', authorize('incidencias.editar'), validate({ params: esquemas.params, body: esquemas.cierre }), controller.cerrar);

module.exports = router;
