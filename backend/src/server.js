// Punto de entrada: arranca el servidor HTTP.
const env = require('./config/env');
const { pool } = require('./config/db');
const { crearApp } = require('./app');
const { iniciarJobMembresias } = require('./jobs/membresias.job');

const app = crearApp();

const servidor = app.listen(env.PORT, () => {
  console.log(`PARKO escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Membresías: vencer, reservar/liberar celdas fijas y avisar 3 días antes (cada hora).
const detenerJob = iniciarJobMembresias();

async function apagar(senal) {
  console.log(`${senal} recibido: cerrando servidor…`);
  detenerJob();
  servidor.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => apagar('SIGINT'));
process.on('SIGTERM', () => apagar('SIGTERM'));
