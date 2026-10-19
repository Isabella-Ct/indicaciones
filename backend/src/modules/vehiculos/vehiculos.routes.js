// Vehículos — REQ-CAR-1, REQ-CAR-2, REQ-CAR-3, REQ-USR-6
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const { validate } = require('../../middlewares/validate');
const esquemas = require('./vehiculos.schemas');
const controller = require('./vehiculos.controller');

const router = Router();
router.use(auth());

// GET /api/v1/vehiculos — filtros: placa, tipo, propietario=con|sin, usuario_id, q (documento/nombre)
router.get(
  '/',
  requirePermiso('vehiculos.ver'),
  validate({ query: esquemas.listar }),
  controller.listar
);

// GET /api/v1/vehiculos/placa/:placa — búsqueda exacta (entradas/salidas, Fase 3)
router.get(
  '/placa/:placa',
  requirePermiso('vehiculos.ver'),
  validate({ params: esquemas.paramsPlaca }),
  controller.obtenerPorPlaca
);

// GET /api/v1/vehiculos/:id
router.get(
  '/:id',
  requirePermiso('vehiculos.ver'),
  validate({ params: esquemas.params }),
  controller.obtener
);

// GET /api/v1/vehiculos/:id/historial — cambios de propietario
router.get(
  '/:id/historial',
  requirePermiso('vehiculos.ver'),
  validate({ params: esquemas.params }),
  controller.historial
);

// POST /api/v1/vehiculos — REQ-CAR-1 (+ REQ-USR-6 con usuario_id)
router.post(
  '/',
  requirePermiso('vehiculos.crear'),
  validate({ body: esquemas.crear }),
  controller.crear
);

// PUT /api/v1/vehiculos/:id — REQ-CAR-2 (solo administrador)
router.put(
  '/:id',
  requirePermiso('vehiculos.editar'),
  validate({ params: esquemas.params, body: esquemas.editar }),
  controller.actualizar
);

// PATCH /api/v1/vehiculos/:id/propietario — REQ-USR-6 (asignar) / REQ-CAR-3 (cambiar, solo admin)
router.patch(
  '/:id/propietario',
  requirePermiso('vehiculos.crear'),
  validate({ params: esquemas.params, body: esquemas.cambiarPropietario }),
  controller.cambiarPropietario
);

module.exports = router;
