// /api/v1/roles y /api/v1/permisos — SRS Apéndice B.1 §4.1 (spec 001-roles-permisos).
// authenticate se aplica al montar el router (app.js); aquí cada ruta declara su permiso.
const { Router } = require('express');
const controller = require('./roles.controller');
const esquemas = require('./roles.validator');
const { authorize } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');

const rolesRouter = Router();

// GET /api/v1/roles?page&limit&q&estado — HU-01, HU-03 · RF-ROL-01, RF-ROL-07
rolesRouter.get('/', authorize('roles.ver'), validate({ query: esquemas.listar }), controller.listar);

// POST /api/v1/roles — HU-02 · RF-ROL-04, RF-ROL-05, RF-ROL-06
rolesRouter.post('/', authorize('roles.crear'), validate({ body: esquemas.rolEntrada }), controller.crear);

// GET /api/v1/roles/:id — HU-03 · RF-ROL-08
rolesRouter.get('/:id', authorize('roles.ver'), validate({ params: esquemas.params }), controller.obtener);

// PUT /api/v1/roles/:id — HU-04 · RF-ROL-09, RF-ROL-10, RF-ROL-11
rolesRouter.put(
  '/:id',
  authorize('roles.editar'),
  validate({ params: esquemas.params, body: esquemas.rolEntrada }),
  controller.actualizar
);

// PATCH /api/v1/roles/:id/estado — HU-05 · RF-ROL-12, RF-ROL-13, RF-ROL-14
rolesRouter.patch(
  '/:id/estado',
  authorize('roles.cambiar_estado'),
  validate({ params: esquemas.params, body: esquemas.cambioEstado }),
  controller.cambiarEstado
);

const permisosRouter = Router();

// GET /api/v1/permisos — HU-06 · RF-ROL-15
permisosRouter.get('/', authorize('roles.ver'), controller.catalogo);

module.exports = { rolesRouter, permisosRouter };
