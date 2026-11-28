// Punto de entrada: arranca el servidor HTTP y lo cierra en orden (servidor → pool).
const env = require('./config/env');
const { pool } = require('./config/db');
const { crearApp } = require('./app');
const programador = require('./tareas/programador');

const app = crearApp();

const servidor = app.listen(env.PORT, () => {
  console.log(`Parking Lot ABC escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
  // spec 010: vencimiento diario de membresías (RF-MEM-08).
  programador.iniciar();
});

function apagar(senal) {
  console.log(`${senal} recibido: cerrando servidor…`);
  programador.detener();
  servidor.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => apagar('SIGINT'));
process.on('SIGTERM', () => apagar('SIGTERM'));
