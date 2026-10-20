// Tarifas — REQ-TAR-1 (configurar, admin) y REQ-TAR-2 (cálculo)
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const { validate } = require('../../middlewares/validate');
const esquemas = require('./tarifas.schemas');
const controller = require('./tarifas.controller');

const router = Router();
router.use(auth());

// GET /api/v1/tarifas — vigentes por tipo (admin: ?historial=1 incluye las anteriores)
router.get('/', validate({ query: esquemas.listar }), controller.listar);

// POST /api/v1/tarifas — nueva tarifa vigente; desactiva la anterior del mismo tipo
router.post(
  '/',
  requirePermiso('tarifas.gestionar'),
  validate({ body: esquemas.crear }),
  controller.crear
);

// POST /api/v1/tarifas/simular — "si un carro dura X minutos, paga $Y"
router.post(
  '/simular',
  requirePermiso('tarifas.ver'),
  validate({ body: esquemas.simular }),
  controller.simular
);

module.exports = router;
