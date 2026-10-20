// Facturas — REQ-FAC-1, REQ-FAC-2 (PDF interno, no DIAN)
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const { validate } = require('../../middlewares/validate');
const esquemas = require('./facturas.schemas');
const controller = require('./facturas.controller');

const router = Router();
router.use(auth());

// GET /api/v1/facturas — admin: todas (desde, hasta, metodo_pago, concepto, placa); operador: las del día
router.get(
  '/',
  requirePermiso('facturas.ver'),
  validate({ query: esquemas.listar }),
  controller.listar
);

// GET /api/v1/facturas/resumen-hoy — recaudo, salidas cobradas y permanencia promedio (KPIs)
router.get('/resumen-hoy', requirePermiso('facturas.ver'), controller.resumenHoy);

// GET /api/v1/facturas/:id · /:id/pdf — personal: cualquiera; cliente: solo las suyas
router.get('/:id', validate({ params: esquemas.params }), controller.obtener);
router.get('/:id/pdf', validate({ params: esquemas.params }), controller.pdf);

module.exports = router;
