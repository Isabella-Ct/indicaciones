// Incidencias — REQ-INCD-1 (admin y operador registran y consultan)
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const { validate } = require('../../middlewares/validate');
const esquemas = require('./incidencias.schemas');
const controller = require('./incidencias.controller');

const router = Router();
router.use(auth());

// GET /api/v1/incidencias — filtros: tipo_id, placa, desde, hasta (AAAA-MM-DD), paginado
router.get(
  '/',
  requirePermiso('incidencias.ver'),
  validate({ query: esquemas.listar }),
  controller.listar
);

// GET /api/v1/incidencias/:id
router.get(
  '/:id',
  requirePermiso('incidencias.ver'),
  validate({ params: esquemas.params }),
  controller.obtener
);

// POST /api/v1/incidencias — el servidor pone el código INC-AAAAMMDD-0001 y la fecha/hora
router.post(
  '/',
  requirePermiso('incidencias.registrar'),
  validate({ body: esquemas.crear }),
  controller.crear
);

module.exports = router;
