// Tipos de incidencia (Rayón, Choque…): consulta el personal; CRUD el administrador.
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const { validate } = require('../../middlewares/validate');
const esquemas = require('./incidencias.schemas');
const controller = require('./incidencias.controller');

const router = Router();
router.use(auth());

// GET /api/v1/tipos-incidencia — admin: todos (?activos=1 solo activos); operador: activos
router.get(
  '/',
  requirePermiso('incidencias.ver'),
  validate({ query: esquemas.listarTipos }),
  controller.listarTipos
);

// POST · PUT /api/v1/tipos-incidencia[/:id] — { nombre, descripcion? }
router.post(
  '/',
  requirePermiso('incidencias.gestionar_tipos'),
  validate({ body: esquemas.tipo }),
  controller.crearTipo
);
router.put(
  '/:id',
  requirePermiso('incidencias.gestionar_tipos'),
  validate({ params: esquemas.params, body: esquemas.tipo }),
  controller.actualizarTipo
);

// PATCH /api/v1/tipos-incidencia/:id/activo — borrado lógico
router.patch(
  '/:id/activo',
  requirePermiso('incidencias.gestionar_tipos'),
  validate({ params: esquemas.params, body: esquemas.activo }),
  controller.cambiarActivoTipo
);

module.exports = router;
