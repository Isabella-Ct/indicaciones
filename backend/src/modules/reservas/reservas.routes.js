// Reservas — REQ-RES-1 (cliente para sus vehículos; admin/operador para cualquiera).
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const { validate } = require('../../middlewares/validate');
const esquemas = require('./reservas.schemas');
const controller = require('./reservas.controller');

const router = Router();
router.use(auth());

// GET /api/v1/reservas — admin/operador: estado, activas=1, placa, desde, hasta (paginado)
router.get(
  '/',
  requirePermiso('reservas.ver'),
  validate({ query: esquemas.listar }),
  controller.listar
);

// GET /api/v1/reservas/:id — personal: cualquiera; cliente: solo las suyas
router.get('/:id', validate({ params: esquemas.params }), controller.obtener);

// POST /api/v1/reservas — { vehiculo_id, celda_id, requiere_accesible? }
router.post(
  '/',
  requirePermiso('reservas.crear'),
  validate({ body: esquemas.crear }),
  controller.crear
);

// PATCH /api/v1/reservas/:id/cancelar — el titular o admin/operador; libera la celda
router.patch(
  '/:id/cancelar',
  requirePermiso('reservas.crear'),
  validate({ params: esquemas.params }),
  controller.cancelar
);

module.exports = router;
