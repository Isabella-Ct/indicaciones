// Procesos programados del servidor (spec 010, research R-05): vencimiento diario de membresías (RF-MEM-08).
// Corre al iniciar y cada día a las 00:05 de Bogotá con setTimeout encadenado (sin node-cron, constitución §VII).
// No se programa con NODE_ENV=test: las pruebas llaman directamente a membresias.service.vencer(hoy).
const env = require('../config/env');
const membresias = require('../modules/membresias/membresias.service');

const BOGOTA_UTC = -5; // Colombia no tiene horario de verano.
let temporizador = null;

/** Milisegundos hasta las próximas 00:05 de Bogotá. */
function msHastaLaMedianoche(ahora = new Date()) {
  const bogota = new Date(ahora.getTime() + BOGOTA_UTC * 3600000);
  const siguiente = Date.UTC(bogota.getUTCFullYear(), bogota.getUTCMonth(), bogota.getUTCDate() + 1, 0, 5) - BOGOTA_UTC * 3600000;
  return siguiente - ahora.getTime();
}

async function vencerMembresias() {
  try {
    const cantidad = await membresias.vencer();
    if (cantidad) console.log(`Membresías vencidas: ${cantidad}`);
  } catch (error) {
    console.error('No se pudo ejecutar el vencimiento de membresías:', error.message);
  }
}

function programarSiguiente() {
  temporizador = setTimeout(async () => {
    await vencerMembresias();
    programarSiguiente();
  }, msHastaLaMedianoche());
  temporizador.unref();
}

/** Arranca los procesos programados (lo llama server.js). */
function iniciar() {
  if (env.NODE_ENV === 'test') return;
  vencerMembresias();
  programarSiguiente();
}

function detener() {
  if (temporizador) clearTimeout(temporizador);
  temporizador = null;
}

module.exports = { iniciar, detener, msHastaLaMedianoche };
