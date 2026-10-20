// Tarea programada simple: al arrancar y luego cada hora, mantiene las membresías
// (vence las expiradas, reserva/libera celdas fijas y avisa 3 días antes).
const membresiasService = require('../modules/membresias/membresias.service');

const CADA_HORA = 60 * 60 * 1000;

async function ejecutar() {
  try {
    const r = await membresiasService.ejecutarMantenimiento();
    if (r.vencidas || r.celdas_reservadas || r.celdas_liberadas || r.avisos) {
      console.log(`[membresías] ${JSON.stringify(r)}`);
    }
  } catch (err) {
    console.error('[membresías] error en la tarea programada:', err.message);
  }
}

/** @returns {() => void} detener */
function iniciarJobMembresias() {
  ejecutar();
  const temporizador = setInterval(ejecutar, CADA_HORA);
  temporizador.unref?.();
  return () => clearInterval(temporizador);
}

module.exports = { iniciarJobMembresias, ejecutar };
