// Tarea programada: cada minuto vence las reservas cuyo plazo pasó (REQ-RES-1),
// libera la celda, emite el cambio por SSE y avisa al cliente.
const reservasService = require('../modules/reservas/reservas.service');

const CADA_MINUTO = 60 * 1000;

async function ejecutar() {
  try {
    const { expiradas } = await reservasService.expirarVencidas();
    if (expiradas) console.log(`[reservas] ${expiradas} reserva(s) expirada(s)`);
  } catch (err) {
    console.error('[reservas] error en la tarea programada:', err.message);
  }
}

/** @returns {() => void} detener */
function iniciarJobReservas() {
  ejecutar();
  const temporizador = setInterval(ejecutar, CADA_MINUTO);
  temporizador.unref?.();
  return () => clearInterval(temporizador);
}

module.exports = { iniciarJobReservas, ejecutar };
