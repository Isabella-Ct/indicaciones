// Notificaciones internas — REQ-NOT-1 (campana, bandeja y envío manual)
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const { validate } = require('../../middlewares/validate');
const esquemas = require('./notificaciones.schemas');
const controller = require('./notificaciones.controller');

const router = Router();
router.use(auth());

// GET /api/v1/notificaciones/mias?leida=0|1 — bandeja del usuario en sesión (paginada)
router.get('/mias', validate({ query: esquemas.mias }), controller.mias);

// GET /api/v1/notificaciones/mias/conteo — no leídas (contador de la campana)
router.get('/mias/conteo', controller.conteo);

// PATCH /api/v1/notificaciones/mias/leer-todas
router.patch('/mias/leer-todas', controller.marcarTodasLeidas);

// GET /api/v1/notificaciones/stream — SSE: conteo, notificacion, leidas (solo las propias)
router.get('/stream', controller.stream);

// PATCH /api/v1/notificaciones/:id/leida — solo el destinatario (ajena → 404)
router.patch('/:id/leida', validate({ params: esquemas.params }), controller.marcarLeida);

// POST /api/v1/notificaciones — mensaje manual a un usuario, a un rol o a todos (admin)
router.post(
  '/',
  requirePermiso('notificaciones.enviar'),
  validate({ body: esquemas.enviar }),
  controller.enviar
);

module.exports = router;
