// /api/v1/tickets — SRS Apéndice B.1 §4.7 (spec 007-control-ingreso-salida, HU-32). authenticate se aplica
// al montar el router (app.js).
const { Router } = require('express');
const controller = require('./tickets.controller');
const { params } = require('./tickets.validator');
const { authorize } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');

const router = Router();

// GET /api/v1/tickets/:codigo — HU-32 · RF-MOV-06, RF-MOV-08
router.get('/:codigo', authorize('movimientos.ver'), validate({ params }), controller.obtener);

// POST /api/v1/tickets/:codigo/envio — HU-32 · RF-MOV-07
router.post('/:codigo/envio', authorize('movimientos.crear'), validate({ params }), controller.enviar);

module.exports = router;
