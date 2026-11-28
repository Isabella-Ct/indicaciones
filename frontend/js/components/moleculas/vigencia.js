/**
 * Molécula · molecule-kpi + atom-meter: vigencia de una membresía (spec 010, RF-MEM-09): días restantes, fechas y
 * la barra de lo que queda; con 5 días o menos, la barra naranja y el aviso de renovación (molecule-alert .js-aviso).
 * El marcado está en la página; aquí solo se ponen los textos. No llama a la API.
 */
import { ponerKpi } from './kpi.js';

/** '2026-12-15' → '15/12/2026'. */
export const fechaCorta = (fecha) => (fecha ? fecha.split('-').reverse().join('/') : '—');

/** Días de calendario entre dos fechas 'AAAA-MM-DD', contando ambas. */
function diasDelPeriodo(inicio, fin) {
  const ms = (f) => {
    const [a, m, d] = f.split('-').map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((ms(fin) - ms(inicio)) / 86400000) + 1;
}

/**
 * @param {HTMLElement} raiz contenedor con .molecule-kpi y, opcional, .js-aviso (molecule-alert con un <p>)
 * @param {{ estado: string, fechaInicio: string, fechaFin: string, diasRestantes: number, avisoRenovacion: boolean }} m
 */
export function ponerVigencia(raiz, m) {
  const kpi = raiz.matches('.molecule-kpi') ? raiz : raiz.querySelector('.molecule-kpi');
  const activa = m.estado === 'activa';
  ponerKpi(kpi, {
    etiqueta: activa ? 'Días restantes' : 'Vigencia',
    valor: activa ? String(m.diasRestantes) : m.estado === 'cancelada' ? 'Cancelada' : 'Vencida',
    nota: `${fechaCorta(m.fechaInicio)} → ${fechaCorta(m.fechaFin)}`,
    medidor: activa ? Math.round((m.diasRestantes / diasDelPeriodo(m.fechaInicio, m.fechaFin)) * 100) : 0,
  });
  kpi.querySelector('.atom-meter')?.classList.toggle('atom-meter--orange', Boolean(m.avisoRenovacion));
  const aviso = raiz.querySelector('.js-aviso');
  if (aviso) {
    aviso.querySelector('p').textContent = m.avisoRenovacion ? `Su membresía vence el ${fechaCorta(m.fechaFin)}: renuévela para no pagar por evento.` : '';
    aviso.classList.toggle('hidden', !m.avisoRenovacion);
  }
}
