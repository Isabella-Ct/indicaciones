// GET /api/v1/health — [Propuesta] (prompt §3.12, monitoreo de RNF-CAL-01). Público.
const { Router } = require('express');
const controller = require('./salud.controller');

const router = Router();

router.get('/', controller.estado);

module.exports = router;
