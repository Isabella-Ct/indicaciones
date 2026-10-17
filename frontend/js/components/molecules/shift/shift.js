import { el } from '../../../utils/dom.js';
import { formatearFechaCorta, formatearHora } from '../../../utils/formato.js';

/**
 * Bloque de turno (.shift): fecha y hora REALES (America/Bogota), actualizadas
 * cada minuto, y el turno ("Norte · L. Gómez").
 * @param {{ turno?: string, turnoLabel?: string }} props
 * @returns {HTMLDivElement}
 */
export function createShift({ turno, turnoLabel = 'Turno' } = {}) {
  const fecha = el('strong');
  const hora = el('strong');
  const reloj = el('time');
  reloj.append(hora);

  function actualizar() {
    const ahora = new Date();
    fecha.textContent = formatearFechaCorta(ahora);
    hora.textContent = formatearHora(ahora);
    reloj.setAttribute('datetime', ahora.toISOString());
  }
  actualizar();
  // Primer tic al cambiar de minuto; luego, cada 60 s.
  const ahora = new Date();
  const restante = (60 - ahora.getSeconds()) * 1000 - ahora.getMilliseconds();
  setTimeout(() => {
    actualizar();
    setInterval(actualizar, 60 * 1000);
  }, restante);

  return el('div', { className: 'shift' }, [
    el('div', {}, ['Fecha', fecha]),
    el('div', {}, ['Hora', reloj]),
    turno ? el('div', {}, [turnoLabel, el('strong', { text: turno })]) : null,
  ]);
}
