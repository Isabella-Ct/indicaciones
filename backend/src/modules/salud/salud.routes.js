const { Router } = require('express');
const controller = require('./salud.controller');

const router = Router();

// GET /api/v1/salud — estado del servidor y de la conexión a MySQL
router.get('/', controller.obtener);

module.exports = router;
