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
const { auth } = require('./middlewares/auth');
const { CARPETA_UPLOADS } = require('./utils/archivos');

const CARPETA_FRONTEND = path.join(__dirname, '..', '..', 'frontend');

function crearApp() {
  const app = express();
  app.disable('x-powered-by');

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
  app.use('/api/v1', api);

  // ---------- Archivos subidos (fotos): solo con sesión iniciada ----------
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
