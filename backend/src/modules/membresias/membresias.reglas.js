// Reglas puras de membresías (spec 010, research R-02): fechas de vigencia, renovación, días restantes y aviso.
// Fechas 'AAAA-MM-DD' (calendario de Bogotá), sin zona horaria.
const { sumarDias, diasEntre } = require('../../utils/fechas');

const DIAS_AVISO = 5;

/** Fin de una vigencia de `dias` días que empieza en `inicio` (el primer día cuenta): 16/12 + 30 → 14/01. */
const finDe = (inicio, dias) => sumarDias(inicio, dias - 1);

/**
 * RF-MEM-06: periodo de la renovación. Activa → desde el día siguiente al fin actual; vencida → desde hoy.
 * @returns {{ desde: string, hasta: string }}
 */
function periodoRenovacion({ estado, fechaFin }, dias, hoy) {
  const desde = estado === 'activa' ? sumarDias(fechaFin, 1) : hoy;
  return { desde, hasta: finDe(desde, dias) };
}

/** Días que le quedan (incluido el día de fin); 0 si ya venció o no está activa. */
const diasRestantes = ({ estado, fechaFin }, hoy) => (estado === 'activa' ? Math.max(0, diasEntre(hoy, fechaFin) + 1) : 0);

/** RF-MEM-09 / HU-48 E3: aviso de renovación con 5 días o menos. */
const avisoRenovacion = (membresia, hoy) => membresia.estado === 'activa' && diasRestantes(membresia, hoy) <= DIAS_AVISO;

/** '2026-12-15' → '15/12/2026'. */
const fechaColombiana = (fecha) => fecha.split('-').reverse().join('/');

module.exports = { finDe, periodoRenovacion, diasRestantes, avisoRenovacion, fechaColombiana, DIAS_AVISO };
