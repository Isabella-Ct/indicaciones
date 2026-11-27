// /api/v1/usuarios — SRS Apéndice B.1 §4.2 (spec 002-gestion-usuarios) + /:id/foto [Propuesta].
// authenticate se aplica al montar el router (app.js). Las rutas /me van antes de /:id.
const { Router } = require('express');
const controller = require('./usuarios.controller');
const esquemas = require('./usuarios.validator');
const { authorize } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');
const { subirFoto } = require('../../middlewares/subir-foto');

const router = Router();

// GET /api/v1/usuarios/me — HU-11 · RF-USR-15
router.get('/me', authorize('perfil.ver'), controller.misDatos);

// PUT /api/v1/usuarios/me — HU-11 · RF-USR-15, RF-USR-16, RF-USR-17
router.put(
  '/me',
  authorize('perfil.editar'),
  subirFoto,
  validate({ body: esquemas.perfilEntrada }),
  controller.actualizarMisDatos
);

// POST /api/v1/usuarios — HU-07 · RF-USR-01..05
router.post('/', authorize('usuarios.crear'), subirFoto, validate({ body: esquemas.usuarioEntrada }), controller.crear);

// GET /api/v1/usuarios?page&limit&q&rol&estado — HU-08 · RF-USR-06, RF-USR-08
router.get('/', authorize('usuarios.ver'), validate({ query: esquemas.listar }), controller.listar);

// GET /api/v1/usuarios/:id — HU-08 · RF-USR-07
router.get('/:id', authorize('usuarios.ver'), validate({ params: esquemas.params }), controller.obtener);

// GET /api/v1/usuarios/:id/foto — [Propuesta] RNF-PRI-03 (alcance verificado en el servicio)
router.get('/:id/foto', validate({ params: esquemas.params }), controller.foto);

// PUT /api/v1/usuarios/:id — HU-09 · RF-USR-09, RF-USR-10, RF-USR-11
router.put(
  '/:id',
  authorize('usuarios.editar'),
  subirFoto,
  validate({ params: esquemas.params, body: esquemas.usuarioEdicion }),
  controller.actualizar
);

// PATCH /api/v1/usuarios/:id/estado — HU-10 · RF-USR-12, RF-USR-13, RF-USR-14
router.patch(
  '/:id/estado',
  authorize('usuarios.cambiar_estado'),
  validate({ params: esquemas.params, body: esquemas.cambioEstado }),
  controller.cambiarEstado
);

module.exports = router;
