// Roles — REQ-USR-1 (perfiles iniciales). Lo usará el formulario de usuarios (Fase 1).
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const controller = require('./roles.controller');

const router = Router();

// GET /api/v1/roles
router.get('/', auth(), requirePermiso('usuarios.crear'), controller.listar);

module.exports = router;
