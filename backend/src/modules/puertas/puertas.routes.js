// Puertas de acceso (Norte, Sur…) — CRUD de administrador
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const { validate } = require('../../middlewares/validate');
const esquemas = require('./puertas.schemas');
const controller = require('./puertas.controller');

const router = Router();
router.use(auth());

// GET /api/v1/puertas — activas (admin: ?incluir_inactivas=1)
router.get('/', validate({ query: esquemas.listar }), controller.listar);

// POST /api/v1/puertas
router.post(
  '/',
  requirePermiso('puertas.gestionar'),
  validate({ body: esquemas.crear }),
  controller.crear
);

// PUT /api/v1/puertas/:id
router.put(
  '/:id',
  requirePermiso('puertas.gestionar'),
  validate({ params: esquemas.params, body: esquemas.editar }),
  controller.actualizar
);

// PATCH /api/v1/puertas/:id/activa — borrado lógico
router.patch(
  '/:id/activa',
  requirePermiso('puertas.gestionar'),
  validate({ params: esquemas.params, body: esquemas.cambiarActiva }),
  controller.cambiarActiva
);

module.exports = router;
