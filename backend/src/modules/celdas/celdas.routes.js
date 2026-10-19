// Celdas — REQ-CLD-01 (ver por área/piso), REQ-CLD-02 (cliente, solo lectura), REQ-CLD-03 (estado)
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const { validate } = require('../../middlewares/validate');
const esquemas = require('./celdas.schemas');
const controller = require('./celdas.controller');

const router = Router();
router.use(auth());

// GET /api/v1/celdas — filtros: piso_id, area, tipo, estado, accesible (0/1), incluir_inactivas (admin)
// Las placas y titulares solo se incluyen para administrador y operador.
router.get(
  '/',
  requirePermiso('celdas.ver'),
  validate({ query: esquemas.listar }),
  controller.listar
);

// GET /api/v1/celdas/resumen — totales por estado, tipo, piso y área
router.get('/resumen', requirePermiso('celdas.ver'), controller.resumen);

// GET /api/v1/celdas/stream — SSE: celda-actualizada, resumen-actualizado (+ heartbeat 25 s)
router.get('/stream', requirePermiso('celdas.ver'), controller.stream);

// GET /api/v1/celdas/:id
router.get(
  '/:id',
  requirePermiso('celdas.ver'),
  validate({ params: esquemas.params }),
  controller.obtener
);

// POST /api/v1/celdas — crear (admin)
router.post(
  '/',
  requirePermiso('celdas.gestionar'),
  validate({ body: esquemas.crear }),
  controller.crear
);

// PUT /api/v1/celdas/:id — editar (admin)
router.put(
  '/:id',
  requirePermiso('celdas.gestionar'),
  validate({ params: esquemas.params, body: esquemas.editar }),
  controller.actualizar
);

// PATCH /api/v1/celdas/:id/estado — REQ-CLD-03 (admin y operador)
router.patch(
  '/:id/estado',
  requirePermiso('celdas.cambiar_estado'),
  validate({ params: esquemas.params, body: esquemas.cambiarEstado }),
  controller.cambiarEstado
);

// PATCH /api/v1/celdas/:id/activa — borrado lógico (admin)
router.patch(
  '/:id/activa',
  requirePermiso('celdas.gestionar'),
  validate({ params: esquemas.params, body: esquemas.cambiarActiva }),
  controller.cambiarActiva
);

module.exports = router;
