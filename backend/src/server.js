// Punto de entrada: arranca el servidor HTTP y lo cierra en orden (servidor → pool).
const env = require('./config/env');
const { pool } = require('./config/db');
const { crearApp } = require('./app');

const app = crearApp();

const servidor = app.listen(env.PORT, () => {
  console.log(`Parking Lot ABC escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function apagar(senal) {
  console.log(`${senal} recibido: cerrando servidor…`);
  servidor.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => apagar('SIGINT'));
process.on('SIGTERM', () => apagar('SIGTERM'));
