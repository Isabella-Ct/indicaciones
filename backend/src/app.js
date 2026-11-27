// Configura Express: seguridad, parsers, API /api/v1, estáticos del frontend y errores (SRS 2.1:
// un solo servidor expone la API y sirve el frontend).
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const { authenticate } = require('./middlewares/authenticate');
const { noEncontrado, errorHandler } = require('./middlewares/error-handler');

const saludRoutes = require('./modules/salud/salud.routes');
const authRoutes = require('./modules/auth/auth.routes');

const CARPETA_FRONTEND = path.join(__dirname, '..', '..', 'frontend');

/**
 * Rutas protegidas: cada módulo exporta { ruta, router }. Todas pasan por authenticate
 * (RNF-SEG-03) y cada endpoint declara su permiso con authorize (RNF-SEG-04).
 * Se cargan de forma diferida para que cada spec agregue la suya aquí.
 */
function rutasProtegidas() {
  const { rolesRouter, permisosRouter } = require('./modules/roles/roles.routes');
  return [
    // spec 001-roles-permisos
    { ruta: '/roles', router: rolesRouter },
    { ruta: '/permisos', router: permisosRouter },
  ];
}

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
          frameAncestors: ["'none'"],
          // En local se sirve por http: no forzar https (RNF-SEG-01 aplica en producción).
          upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
        },
      },
    })
  );
  // CORS solo si el frontend se sirve desde otro origen (constitución §III).
  if (env.CORS_ORIGIN) {
    app.use(
      '/api',
      cors({
        origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
    );
  }
  app.use(express.json({ limit: '100kb' }));

  // ---------- API ----------
  const api = express.Router();
  // Públicas (RNF-SEG-03)
  api.use('/health', saludRoutes);
  api.use('/auth', authRoutes);
  // Protegidas
  for (const { ruta, router } of rutasProtegidas()) api.use(ruta, authenticate, router);
  app.use('/api/v1', api);
  app.use('/api', noEncontrado);

  // ---------- Frontend estático ----------
  app.use(express.static(CARPETA_FRONTEND, { index: 'index.html', extensions: ['html'] }));

  app.use(noEncontrado);
  app.use(errorHandler);
  return app;
}

module.exports = { crearApp, rutasProtegidas };
