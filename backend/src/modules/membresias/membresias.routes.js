// Membresías — REQ-MEM-1 (gestiona el admin; el operador consulta)
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const { validate } = require('../../middlewares/validate');
const esquemas = require('./membresias.schemas');
const controller = require('./membresias.controller');

const router = Router();
router.use(auth());

// GET /api/v1/membresias — filtros: estado, usuario_id, placa, q (documento/nombre del titular)
router.get(
  '/',
  requirePermiso('membresias.ver'),
  validate({ query: esquemas.listar }),
  controller.listar
);

// GET /api/v1/membresias/cotizar?vehiculo_id=&tipo=&fecha_inicio= — fecha fin y valor calculados
router.get(
  '/cotizar',
  requirePermiso('membresias.ver'),
  validate({ query: esquemas.cotizar }),
  controller.cotizar
);

// GET /api/v1/membresias/:id
router.get(
  '/:id',
  requirePermiso('membresias.ver'),
  validate({ params: esquemas.params }),
  controller.obtener
);

// POST /api/v1/membresias — crea la membresía y su factura (admin)
router.post(
  '/',
  requirePermiso('membresias.gestionar'),
  validate({ body: esquemas.crear }),
  controller.crear
);

// PATCH /api/v1/membresias/:id/cancelar — libera la celda fija (admin)
router.patch(
  '/:id/cancelar',
  requirePermiso('membresias.gestionar'),
  validate({ params: esquemas.params }),
  controller.cancelar
);

module.exports = router;
