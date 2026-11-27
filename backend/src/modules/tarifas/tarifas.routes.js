// /api/v1/tarifas — SRS Apéndice B.1 §4.8 (spec 008-tarifas).
// - `tarifasPublicasRouter` (sin sesión, montado antes del grupo protegido): GET /?vigentes=true (RF-TAR-07).
//   Cualquier otra petición sigue al router protegido con next('router').
// - `tarifasRouter` (con authenticate al montarlo en app.js): listado administrativo, crear, editar y estado.
const { Router } = require('express');
const controller = require('./tarifas.controller');
const esquemas = require('./tarifas.validator');
const { authorize } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');

const tarifasPublicasRouter = Router();

// GET /api/v1/tarifas?vigentes=true — HU-38 · RF-TAR-07 (público)
tarifasPublicasRouter.get(
  '/',
  (req, _res, next) => (req.query.vigentes === 'true' ? next() : next('router')),
  validate({ query: esquemas.listar }),
  controller.vigentes
);

const tarifasRouter = Router();

// GET /api/v1/tarifas?tipoVehiculo&tipoCliente&estado&page&limit — HU-37 (listado administrativo)
tarifasRouter.get('/', authorize('tarifas.ver'), validate({ query: esquemas.listar }), controller.listar);

// POST /api/v1/tarifas — HU-36 · RF-TAR-01..03, RF-TAR-05
tarifasRouter.post('/', authorize('tarifas.crear'), validate({ body: esquemas.tarifaEntrada }), controller.crear);

// PUT /api/v1/tarifas/:id — HU-37 · RF-TAR-04, RF-TAR-05
tarifasRouter.put('/:id', authorize('tarifas.editar'), validate({ params: esquemas.params, body: esquemas.tarifaEdicion }), controller.actualizar);

// PATCH /api/v1/tarifas/:id/estado — HU-37 · RF-TAR-06
tarifasRouter.patch(
  '/:id/estado',
  authorize('tarifas.cambiar_estado'),
  validate({ params: esquemas.params, body: esquemas.cambioEstado }),
  controller.cambiarEstado
);

module.exports = { tarifasPublicasRouter, tarifasRouter };
