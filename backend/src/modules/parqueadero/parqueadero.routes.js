const { Router } = require('express');
const controller = require('./parqueadero.controller');

const router = Router();

// GET /api/v1/parqueadero — datos públicos de la sede (subtítulo de la marca, página pública)
router.get('/', controller.obtener);

module.exports = router;
