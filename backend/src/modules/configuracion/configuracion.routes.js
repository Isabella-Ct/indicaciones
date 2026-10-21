// Parámetros del negocio (CLAUDE.md §7, valores ⚙️) — solo el administrador.
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const { validate } = require('../../middlewares/validate');
const esquemas = require('./configuracion.schemas');
const controller = require('./configuracion.controller');

const router = Router();
router.use(auth(), requirePermiso('configuracion.gestionar'));

// GET /api/v1/configuracion — todos los parámetros con su tipo y descripción
router.get('/', controller.listar);

// PUT /api/v1/configuracion/:clave — { valor } validado según el tipo del parámetro
router.put(
  '/:clave',
  validate({ params: esquemas.params, body: esquemas.editar }),
  controller.actualizar
);

module.exports = router;
