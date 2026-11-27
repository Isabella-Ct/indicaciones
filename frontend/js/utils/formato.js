// Formatos colombianos (SRS §3.1): moneda $ 12.500, fecha dd/mm/aaaa, hora de 12 h.
const ZONA = 'America/Bogota';

const moneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
const fecha = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: ZONA,
});
const hora = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: ZONA,
});

export const formatearCOP = (valor) => moneda.format(Number(valor) || 0);
export const formatearFecha = (valor) => (valor ? fecha.format(new Date(valor)) : '—');
export const formatearHora = (valor) => (valor ? hora.format(new Date(valor)) : '—');
export const formatearFechaHora = (valor) =>
  valor ? `${formatearFecha(valor)} ${formatearHora(valor)}` : '—';

/** '—' para vacíos. */
export const texto = (valor) =>
  valor === null || valor === undefined || valor === '' ? '—' : String(valor);

/** 1 → "1 usuario"; 3 → "3 usuarios". */
export const plural = (n, singular, pluralTexto = `${singular}s`) =>
  `${n} ${n === 1 ? singular : pluralTexto}`;

/** 135 → "2 h 15 min"; 45 → "45 min"; 1500 → "1 d 1 h 0 min" (tiempo de estadía, RN-16). */
export function formatearDuracion(minutos) {
  const m = Math.max(0, Math.floor(Number(minutos) || 0));
  if (m < 60) return `${m} min`;
  const dias = Math.floor(m / 1440);
  const horas = Math.floor((m % 1440) / 60);
  return [dias ? `${dias} d` : null, `${horas} h`, `${m % 60} min`].filter(Boolean).join(' ');
}
