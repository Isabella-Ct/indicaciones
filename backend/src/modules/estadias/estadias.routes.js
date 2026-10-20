// Estadías (entradas y salidas) — REQ-INEX-1..4, REQ-PLA-1, REQ-TCK-1
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const { validate } = require('../../middlewares/validate');
const { subirImagen } = require('../../middlewares/upload');
const esquemas = require('./estadias.schemas');
const controller = require('./estadias.controller');

const router = Router();
router.use(auth());

const registrar = requirePermiso('movimientos.registrar');
const ver = requirePermiso('movimientos.ver');

// GET /api/v1/estadias/previsualizar?placa= — datos para el modal de ingreso
router.get(
  '/previsualizar',
  registrar,
  validate({ query: esquemas.previsualizar }),
  controller.previsualizar
);

// POST /api/v1/estadias/entrada — REQ-INEX-1, REQ-INEX-4, REQ-PLA-1 (multipart, foto opcional)
router.post(
  '/entrada',
  registrar,
  subirImagen('foto'),
  validate({ body: esquemas.entrada }),
  controller.entrada
);

// POST /api/v1/estadias/salida — REQ-INEX-2/3: liquidación preliminar (no cierra)
router.post('/salida', registrar, validate({ body: esquemas.salida }), controller.salida);

// POST /api/v1/estadias/:id/cerrar — cierra la estadía y libera la celda (en la Fase 4, con la factura)
router.post(
  '/:id/cerrar',
  registrar,
  validate({ params: esquemas.params, body: esquemas.cerrar }),
  controller.cerrar
);

// GET /api/v1/estadias/en-curso — vehículos dentro ahora
router.get('/en-curso', ver, controller.enCurso);

// GET /api/v1/estadias/ultimos-movimientos?limite=10 — bitácora (entradas y salidas)
router.get(
  '/ultimos-movimientos',
  ver,
  validate({ query: esquemas.ultimos }),
  controller.ultimosMovimientos
);

// GET /api/v1/estadias — historial: placa, desde, hasta, puerta_id, estado, paginado
router.get('/', ver, validate({ query: esquemas.historial }), controller.historial);

// GET /api/v1/estadias/:id/ticket · /:id/ticket.pdf — REQ-TCK-1
router.get('/:id/ticket', ver, validate({ params: esquemas.params }), controller.ticketJson);
router.get('/:id/ticket.pdf', ver, validate({ params: esquemas.params }), controller.ticketPdf);

module.exports = router;
