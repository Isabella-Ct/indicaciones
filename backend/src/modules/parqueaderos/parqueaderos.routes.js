// /api/v1/parqueaderos y /api/v1/puertas — SRS Apéndice B.1 §4.4 (spec 004-parqueaderos-celdas).
const { Router } = require('express');
const controller = require('./parqueaderos.controller');
const esquemas = require('./parqueaderos.validator');
const { authorize } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');

const parqueaderosRouter = Router();

// POST /api/v1/parqueaderos — HU-17 · RF-CLD-01
parqueaderosRouter.post('/', authorize('parqueaderos.crear'), validate({ body: esquemas.parqueaderoEntrada }), controller.crear);

// GET /api/v1/parqueaderos?page&limit&q&estado — HU-17 · RF-CLD-02
parqueaderosRouter.get('/', authorize('parqueaderos.ver'), validate({ query: esquemas.listar }), controller.listar);

// GET /api/v1/parqueaderos/:id — HU-17 · RF-CLD-03
parqueaderosRouter.get('/:id', authorize('parqueaderos.ver'), validate({ params: esquemas.params }), controller.obtener);

// PUT /api/v1/parqueaderos/:id — HU-18 · RF-CLD-04..06 (el estado exige además cambiar_estado)
parqueaderosRouter.put(
  '/:id',
  authorize('parqueaderos.editar'),
  validate({ params: esquemas.params, body: esquemas.parqueaderoEdicion }),
  controller.actualizar
);

// DELETE /api/v1/parqueaderos/:id — HU-18 · RF-CLD-05 (inactivación lógica)
parqueaderosRouter.delete('/:id', authorize('parqueaderos.cambiar_estado'), validate({ params: esquemas.params }), controller.inactivar);

// GET /api/v1/parqueaderos/:id/puertas?uso&estado — HU-19 · RF-CLD-07, RF-CLD-08
parqueaderosRouter.get(
  '/:id/puertas',
  authorize('parqueaderos.ver'),
  validate({ params: esquemas.params, query: esquemas.listarPuertas }),
  controller.listarPuertas
);

// POST /api/v1/parqueaderos/:id/puertas — HU-19 · RF-CLD-07
parqueaderosRouter.post(
  '/:id/puertas',
  authorize('parqueaderos.editar'),
  validate({ params: esquemas.params, body: esquemas.puertaEntrada }),
  controller.crearPuerta
);

const puertasRouter = Router();

// PUT /api/v1/puertas/:id — HU-19 · RF-CLD-07
puertasRouter.put(
  '/:id',
  authorize('parqueaderos.editar'),
  validate({ params: esquemas.params, body: esquemas.puertaEdicion }),
  controller.actualizarPuerta
);

module.exports = { parqueaderosRouter, puertasRouter };
