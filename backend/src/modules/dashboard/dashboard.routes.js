// Dashboard por rol — GET /api/v1/dashboard (cualquier sesión; el contenido depende del rol).
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const controller = require('./dashboard.controller');

const router = Router();
router.use(auth());

router.get('/', controller.obtener);

module.exports = router;
