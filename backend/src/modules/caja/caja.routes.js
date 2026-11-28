// /api/v1/caja — SRS Apéndice B.1 §4.9 (spec 009-facturacion-pagos, HU-44). authenticate se aplica al montar
// el router (app.js).
const { Router } = require('express');
const controller = require('./caja.controller');
const esquemas = require('./caja.validator');
const { authorize } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');

const router = Router();

// GET /api/v1/caja/turno-actual — HU-44 · RF-FAC-17
router.get('/turno-actual', authorize('caja.ver'), controller.turnoActual);

// POST /api/v1/caja/cierres — HU-44 · RF-FAC-18
router.post('/cierres', authorize('caja.crear'), validate({ body: esquemas.cierre }), controller.cerrar);

// GET /api/v1/caja/cierres — HU-44 · RF-FAC-19 (el Administrador ve todos; los demás, los suyos)
router.get('/cierres', authorize('caja.ver'), validate({ query: esquemas.listar }), controller.listar);

module.exports = router;
