// Usuarios — REQ-USR-2, REQ-USR-3, REQ-USR-4, REQ-USR-5
const { Router } = require('express');
const { auth } = require('../../middlewares/auth');
const { requirePermiso } = require('../../middlewares/require-permiso');
const { validate } = require('../../middlewares/validate');
const { subirImagen } = require('../../middlewares/upload');
const esquemas = require('./usuarios.schemas');
const controller = require('./usuarios.controller');
const estadiasController = require('../estadias/estadias.controller');
const esquemasEstadias = require('../estadias/estadias.schemas');
const facturasController = require('../facturas/facturas.controller');
const esquemasFacturas = require('../facturas/facturas.schemas');
const membresiasController = require('../membresias/membresias.controller');
const incidenciasController = require('../incidencias/incidencias.controller');
const esquemasIncidencias = require('../incidencias/incidencias.schemas');
const reservasController = require('../reservas/reservas.controller');
const esquemasReservas = require('../reservas/reservas.schemas');

const router = Router();
router.use(auth());

// GET /api/v1/usuarios — listado completo, solo administrador
router.get(
  '/',
  requirePermiso('usuarios.ver'),
  validate({ query: esquemas.listar }),
  controller.listar
);

// GET /api/v1/usuarios/buscar?documento= — clientes activos para el user-picker (admin/operador)
router.get(
  '/buscar',
  requirePermiso('usuarios.buscar'),
  validate({ query: esquemas.buscar }),
  controller.buscar
);

// GET/PUT /api/v1/usuarios/me — mis datos (REQ-USR-4: notifica a los administradores)
router.get('/me', controller.miPerfil);
router.put(
  '/me',
  requirePermiso('perfil.editar'),
  subirImagen('foto'),
  validate({ body: esquemas.editarMiPerfil }),
  controller.actualizarMiPerfil
);

// GET /api/v1/usuarios/me/vehiculos — vehículos del usuario en sesión
router.get('/me/vehiculos', controller.misVehiculos);

// GET /api/v1/usuarios/me/estadias — historial de entradas y salidas de mis vehículos
router.get(
  '/me/estadias',
  validate({ query: esquemasEstadias.historial }),
  estadiasController.misEstadias
);

// GET /api/v1/usuarios/me/facturas — mis facturas (REQ-FAC-2)
router.get(
  '/me/facturas',
  validate({ query: esquemasFacturas.listar }),
  facturasController.misFacturas
);

// GET /api/v1/usuarios/me/membresias — mis mensualidades
router.get('/me/membresias', membresiasController.misMembresias);

// GET /api/v1/usuarios/me/reservas — mis reservas (REQ-RES-1)
router.get('/me/reservas', validate({ query: esquemasReservas.listar }), reservasController.mias);

// GET /api/v1/usuarios/me/incidencias — incidencias de mis vehículos (REQ-INCD-1)
router.get(
  '/me/incidencias',
  validate({ query: esquemasIncidencias.listar }),
  incidenciasController.mias
);

// GET /api/v1/usuarios/:id — administrador, o el propio usuario
router.get('/:id', validate({ params: esquemas.params }), controller.obtener);

// POST /api/v1/usuarios — REQ-USR-2 (multipart con foto opcional)
router.post(
  '/',
  requirePermiso('usuarios.crear'),
  subirImagen('foto'),
  validate({ body: esquemas.crear }),
  controller.crear
);

// PUT /api/v1/usuarios/:id — REQ-USR-5
router.put(
  '/:id',
  requirePermiso('usuarios.editar'),
  subirImagen('foto'),
  validate({ params: esquemas.params, body: esquemas.editar }),
  controller.actualizar
);

// PATCH /api/v1/usuarios/:id/estado — REQ-USR-3
router.patch(
  '/:id/estado',
  requirePermiso('usuarios.cambiar_estado'),
  validate({ params: esquemas.params, body: esquemas.cambiarEstado }),
  controller.cambiarEstado
);

// PATCH /api/v1/usuarios/:id/contrasena — REQ-USR-5: contraseña temporal asignada por el admin
router.patch(
  '/:id/contrasena',
  requirePermiso('usuarios.editar'),
  validate({ params: esquemas.params, body: esquemas.restablecerContrasena }),
  controller.restablecerContrasena
);

module.exports = router;
