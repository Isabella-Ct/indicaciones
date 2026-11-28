// Procesos programados del servidor (sin node-cron, constitución §VII):
// - spec 010 (research R-05): vencimiento diario de membresías (RF-MEM-08), al iniciar y cada día a las 00:05 de
//   Bogotá con setTimeout encadenado;
// - spec 012 (research R-07): control de reservas (RF-RES-08, RF-RES-09), al iniciar y cada minuto.
// No se programan con NODE_ENV=test: las pruebas llaman directamente a membresias.vencer(hoy) y reservas.controlar(ahora).
const env = require('../config/env');
const membresias = require('../modules/membresias/membresias.service');
const reservas = require('../modules/reservas/reservas.service');

const CADA_MINUTO = 60 * 1000;

const BOGOTA_UTC = -5; // Colombia no tiene horario de verano.
let temporizador = null;
let intervaloReservas = null;

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

/** RF-RES-08, RF-RES-09: marca celdas reservadas, reasigna y vence reservas. */
async function controlarReservas() {
  try {
    const { vencidas, reasignadas } = await reservas.controlar();
    if (vencidas || reasignadas) console.log(`Reservas: ${vencidas} vencidas, ${reasignadas} reasignadas`);
  } catch (error) {
    console.error('No se pudo ejecutar el control de reservas:', error.message);
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
  controlarReservas();
  intervaloReservas = setInterval(controlarReservas, CADA_MINUTO);
  intervaloReservas.unref();
}

function detener() {
  if (temporizador) clearTimeout(temporizador);
  if (intervaloReservas) clearInterval(intervaloReservas);
  temporizador = null;
  intervaloReservas = null;
}

module.exports = { iniciar, detener, msHastaLaMedianoche };
