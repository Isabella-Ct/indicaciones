/**
 * Formatos de presentación: dinero COP, fechas y horas en America/Bogota.
 */
const ZONA = 'America/Bogota';

const numeroCOP = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

/** 12500 → "$ 12.500" (sin decimales). */
export function formatearCOP(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  return `$ ${numeroCOP.format(Math.round(n))}`;
}

const partesFecha = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

/** → "17 OCT 2026" (formato del bloque `shift` de la maqueta). */
export function formatearFechaCorta(fecha = new Date()) {
  const partes = Object.fromEntries(
    partesFecha.formatToParts(new Date(fecha)).map((p) => [p.type, p.value])
  );
  const mes = partes.month.replace('.', '').slice(0, 3).toUpperCase();
  return `${partes.day} ${mes} ${partes.year}`;
}

const hora = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** → "18:42" */
export function formatearHora(fecha = new Date()) {
  return hora.format(new Date(fecha));
}

const fechaHora = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** → "17/10/2026 18:42" */
export function formatearFechaHora(fecha) {
  if (!fecha) return '—';
  return fechaHora.format(new Date(fecha)).replace(',', '');
}

const soloFecha = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Fecha sin hora → "20/10/2026". "AAAA-MM-DD" se toma como fecha de Bogotá (no UTC). */
export function formatearFecha(fecha) {
  if (!fecha) return '—';
  const valor =
    typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
      ? `${fecha}T12:00:00-05:00`
      : fecha;
  return soloFecha.format(new Date(valor));
}

/** Hoy en Bogotá como "AAAA-MM-DD" (para inputs type=date). */
export function hoyBogota() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date());
}

export const METODOS_PAGO = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};
