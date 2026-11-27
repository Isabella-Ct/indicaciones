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
