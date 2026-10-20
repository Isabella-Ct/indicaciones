// Descuentos — REQ-DES-1 (gestiona el admin; el operador ve los activos al cobrar)
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const { validate } = require('../../middlewares/validate');
const esquemas = require('./descuentos.schemas');
const controller = require('./descuentos.controller');

const router = Router();
router.use(auth());

// GET /api/v1/descuentos — admin: todos (?activos=1 solo activos); operador: activos
router.get(
  '/',
  requirePermiso('descuentos.ver'),
  validate({ query: esquemas.listar }),
  controller.listar
);

// POST /api/v1/descuentos
router.post(
  '/',
  requirePermiso('descuentos.gestionar'),
  validate({ body: esquemas.crear }),
  controller.crear
);

// PUT /api/v1/descuentos/:id
router.put(
  '/:id',
  requirePermiso('descuentos.gestionar'),
  validate({ params: esquemas.params, body: esquemas.editar }),
  controller.actualizar
);

// PATCH /api/v1/descuentos/:id/activo
router.patch(
  '/:id/activo',
  requirePermiso('descuentos.gestionar'),
  validate({ params: esquemas.params, body: esquemas.cambiarActivo }),
  controller.cambiarActivo
);

module.exports = router;
