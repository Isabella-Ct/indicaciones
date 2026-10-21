// Configura Express: seguridad, parsers, estáticos del frontend, rutas /api/v1 y errores.
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { limiteApi } = require('./middlewares/rate-limit');
const { noEncontrado, errorHandler } = require('./middlewares/error-handler');

const saludRoutes = require('./modules/salud/salud.routes');
const authRoutes = require('./modules/auth/auth.routes');
const parqueaderoRoutes = require('./modules/parqueadero/parqueadero.routes');
const rolesRoutes = require('./modules/roles/roles.routes');
const usuariosRoutes = require('./modules/usuarios/usuarios.routes');
const vehiculosRoutes = require('./modules/vehiculos/vehiculos.routes');
const pisosRoutes = require('./modules/pisos/pisos.routes');
const celdasRoutes = require('./modules/celdas/celdas.routes');
const puertasRoutes = require('./modules/puertas/puertas.routes');
const publicoRoutes = require('./modules/publico/publico.routes');
const picoPlacaRoutes = require('./modules/pico-placa/pico-placa.routes');
const estadiasRoutes = require('./modules/estadias/estadias.routes');
const accesosDenegadosRoutes = require('./modules/estadias/accesos-denegados.routes');
const tarifasRoutes = require('./modules/tarifas/tarifas.routes');
const descuentosRoutes = require('./modules/descuentos/descuentos.routes');
const membresiasRoutes = require('./modules/membresias/membresias.routes');
const facturasRoutes = require('./modules/facturas/facturas.routes');
const notificacionesRoutes = require('./modules/notificaciones/notificaciones.routes');
const incidenciasRoutes = require('./modules/incidencias/incidencias.routes');
const tiposIncidenciaRoutes = require('./modules/incidencias/tipos-incidencia.routes');
const reportesRoutes = require('./modules/reportes/reportes.routes');
const reservasRoutes = require('./modules/reservas/reservas.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const configuracionRoutes = require('./modules/configuracion/configuracion.routes');
const { auth } = require('./middlewares/auth');
const { requirePermiso } = require('./middlewares/require-permiso');
const { CARPETA_UPLOADS } = require('./utils/archivos');

const CARPETA_FRONTEND = path.join(__dirname, '..', '..', 'frontend');

function crearApp() {
  const app = express();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          // Mapa embebido de la página pública (OpenStreetMap, sin API key).
          frameSrc: ['https://www.openstreetmap.org'],
          frameAncestors: ["'none'"],
          // En local se sirve por http: no forzar https.
          upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
        },
      },
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // ---------- API ----------
  const api = express.Router();
  if (env.NODE_ENV !== 'test') api.use(limiteApi);
  api.use('/salud', saludRoutes);
  api.use('/auth', authRoutes);
  api.use('/parqueadero', parqueaderoRoutes);
  api.use('/roles', rolesRoutes);
  api.use('/usuarios', usuariosRoutes);
  api.use('/vehiculos', vehiculosRoutes);
  api.use('/pisos', pisosRoutes);
  api.use('/celdas', celdasRoutes);
  api.use('/puertas', puertasRoutes);
  api.use('/publico', publicoRoutes);
  api.use('/pico-placa', picoPlacaRoutes);
  api.use('/estadias', estadiasRoutes);
  api.use('/accesos-denegados', accesosDenegadosRoutes);
  api.use('/tarifas', tarifasRoutes);
  api.use('/descuentos', descuentosRoutes);
  api.use('/membresias', membresiasRoutes);
  api.use('/facturas', facturasRoutes);
  api.use('/notificaciones', notificacionesRoutes);
  api.use('/incidencias', incidenciasRoutes);
  api.use('/tipos-incidencia', tiposIncidenciaRoutes);
  api.use('/reportes', reportesRoutes);
  api.use('/reservas', reservasRoutes);
  api.use('/dashboard', dashboardRoutes);
  api.use('/configuracion', configuracionRoutes);
  app.use('/api/v1', api);

  // ---------- Archivos subidos (fotos): solo con sesión iniciada ----------
  // Las fotos de lectura de placa (REQ-PLA-1) son solo para el personal.
  app.use('/uploads/lecturas', auth(), requirePermiso('movimientos.ver'));
  app.use(
    '/uploads',
    auth({ permitirCambioPendiente: true }),
    express.static(CARPETA_UPLOADS, { index: false, dotfiles: 'deny' })
  );

  // ---------- Frontend estático ----------
  // El catálogo de componentes es solo para desarrollo.
  app.use('/app/_catalogo.html', (req, res, next) =>
    env.NODE_ENV === 'production' ? noEncontrado(req, res) : next()
  );
  app.use(express.static(CARPETA_FRONTEND, { index: 'index.html', extensions: ['html'] }));

  app.use(noEncontrado);
  app.use(errorHandler);
  return app;
}

module.exports = { crearApp };
