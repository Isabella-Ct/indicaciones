// /api/v1/pagos y /api/v1/facturas — SRS Apéndice B.1 §4.9 (spec 009-facturacion-pagos). authenticate se
// aplica al montar los routers (app.js). GET /usuarios/me/facturas está en usuarios.routes.js.
const { Router } = require('express');
const controller = require('./facturas.controller');
const esquemas = require('./facturas.validator');
const { authorize } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');

const pagosRouter = Router();

// POST /api/v1/pagos — HU-40 · RF-FAC-05..09
pagosRouter.post('/', authorize('facturas.crear'), validate({ body: esquemas.pago }), controller.pagar);

const facturasRouter = Router();

// POST /api/v1/facturas — HU-41 · RF-FAC-10..12 (emite el comprobante del pago)
facturasRouter.post('/', authorize('facturas.crear'), validate({ body: esquemas.emision }), controller.emitir);

// GET /api/v1/facturas?page&limit&q&desde&hasta&metodo&estado — HU-43 · RF-FAC-15
facturasRouter.get('/', authorize('facturas.ver'), validate({ query: esquemas.listar }), controller.listar);

// GET /api/v1/facturas/:id — HU-41
facturasRouter.get('/:id', authorize('facturas.ver'), validate({ params: esquemas.params }), controller.obtener);

// GET /api/v1/facturas/:id/pdf — HU-41, HU-43 · RF-FAC-10, RF-FAC-16 (el personal o el Cliente dueño: en el servicio)
facturasRouter.get('/:id/pdf', validate({ params: esquemas.params }), controller.pdf);

// PATCH /api/v1/facturas/:id/anulacion — HU-42 · RF-FAC-13, RF-FAC-14
facturasRouter.patch(
  '/:id/anulacion',
  authorize('facturas.anular'),
  validate({ params: esquemas.params, body: esquemas.anulacion }),
  controller.anular
);

module.exports = { pagosRouter, facturasRouter };
