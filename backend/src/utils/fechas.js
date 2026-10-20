// Fechas en la zona del negocio (America/Bogota), sin depender de la zona del proceso.
const ZONA = 'America/Bogota';

const partes = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
});

const DIAS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const NOMBRES_DIA = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** { fecha: 'YYYY-MM-DD', hora: 'HH:MM:SS', diaSemana: 1 (lunes) … 7 (domingo) } en Bogotá. */
function enBogota(fecha = new Date()) {
  const p = Object.fromEntries(partes.formatToParts(new Date(fecha)).map((x) => [x.type, x.value]));
  return {
    fecha: `${p.year}-${p.month}-${p.day}`,
    hora: `${p.hour}:${p.minute}:${p.second}`,
    diaSemana: DIAS[p.weekday],
  };
}

const nombreDia = (diaSemana) => NOMBRES_DIA[diaSemana] ?? '';

/** Minutos completos entre dos fechas (16:05 → 18:42 = 157). Nunca negativo. */
function minutosEntre(desde, hasta) {
  return Math.max(0, Math.floor((new Date(hasta) - new Date(desde)) / 60000));
}

/** 157 → "2 h 37 min"; 45 → "45 min"; 1500 → "1 d 1 h 0 min". */
function formatearDuracion(minutos) {
  if (minutos < 60) return `${minutos} min`;
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  return [dias ? `${dias} d` : null, `${horas} h`, `${minutos % 60} min`].filter(Boolean).join(' ');
}

/** → "19/10/2026 18:42" en hora de Bogotá. */
function formatearFechaHora(fecha) {
  const { fecha: dia, hora } = enBogota(fecha);
  const [a, m, d] = dia.split('-');
  return `${d}/${m}/${a} ${hora.slice(0, 5)}`;
}

/** 'AAAA-MM-DD' ± n días (aritmética de calendario, sin zona horaria). */
function sumarDias(fecha, dias) {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Días entre dos fechas 'AAAA-MM-DD' (hasta − desde). */
function diasEntre(desde, hasta) {
  const ms = (f) => {
    const [a, m, d] = f.split('-').map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((ms(hasta) - ms(desde)) / 86400000);
}

/** Día de la semana de una fecha 'AAAA-MM-DD': 1 (lunes) … 7 (domingo). */
function diaSemanaDe(fecha) {
  const [a, m, d] = fecha.split('-').map(Number);
  return ((new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7) + 1;
}

module.exports = {
  ZONA,
  enBogota,
  nombreDia,
  minutosEntre,
  formatearDuracion,
  formatearFechaHora,
  sumarDias,
  diasEntre,
  diaSemanaDe,
};
