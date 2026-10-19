// Endpoints públicos (sin sesión) — REQ-WEB-1. Solo totales: nunca celdas, placas ni personas.
const { Router } = require('express');
const controller = require('./publico.controller');

const router = Router();

// GET /api/v1/publico/disponibilidad — disponibles y habilitadas por tipo
router.get('/disponibilidad', controller.disponibilidad);

// GET /api/v1/publico/disponibilidad/stream — SSE con los mismos totales
router.get('/disponibilidad/stream', controller.stream);

module.exports = router;
