// Reglas puras de pico y placa (research R-02..R-05): dígitos, dígito evaluado de la placa,
// superposición de vigencias (RN-14) y si una restricción aplica a un momento dado (RN-13).
const { nombreDia } = require('../../utils/fechas');

/** [9, 6] → '6,9' (ordenados, como se guardan). */
const digitosATexto = (digitos) => [...digitos].sort((a, b) => a - b).join(',');

/** '6,9' → [6, 9]. */
const textoADigitos = (texto) => String(texto).split(',').filter(Boolean).map(Number);

/** Dígito que se evalúa: el último o el primero numérico de la placa; null si no tiene dígitos. */
function digitoEvaluado(placa, posicion) {
  const numeros = String(placa ?? '').replace(/\D/g, '');
  if (!numeros) return null;
  return Number(posicion === 'primero' ? numeros[0] : numeros[numeros.length - 1]);
}

/** ¿Se cruzan dos vigencias? (fechas 'AAAA-MM-DD'; hasta null = indefinida). */
function vigenciasSeCruzan(a, b) {
  const finA = a.vigenteHasta ?? '9999-12-31';
  const finB = b.vigenteHasta ?? '9999-12-31';
  return a.vigenteDesde <= finB && b.vigenteDesde <= finA;
}

/** ¿La restricción está vigente en la fecha (activa y dentro de la vigencia)? */
const vigenteEn = (r, fecha) =>
  r.estado === 'activo' && r.vigenteDesde <= fecha && (r.vigenteHasta === null || fecha <= r.vigenteHasta);

/**
 * RN-13: la placa está restringida si la restricción está vigente ese día, la hora cae en
 * [horaInicio, horaFin) y el dígito evaluado está en la lista.
 * @param {{ diaSemana: number, digitos: number[], posicionDigito: string, horaInicio: string, horaFin: string,
 *           vigenteDesde: string, vigenteHasta: string|null, estado: string }} r
 * @param {{ placa: string, fecha: string, hora: string, diaSemana: number }} momento hora 'HH:MM[:SS]'
 */
function restringe(r, { placa, fecha, hora, diaSemana }) {
  if (r.diaSemana !== diaSemana || !vigenteEn(r, fecha)) return false;
  const hhmm = hora.slice(0, 5);
  if (hhmm < r.horaInicio || hhmm >= r.horaFin) return false;
  const digito = digitoEvaluado(placa, r.posicionDigito);
  return digito !== null && r.digitos.includes(digito);
}

/** [6, 9] → '6 o 9'; [1, 2, 3] → '1, 2 o 3'. */
const listar = (digitos) =>
  digitos.length === 1 ? String(digitos[0]) : `${digitos.slice(0, -1).join(', ')} o ${digitos[digitos.length - 1]}`;

/** «Pico y placa: carros con placa terminada en 6 o 9, lunes de 05:00 a 20:00.» */
function motivo(r) {
  const quien =
    r.posicionDigito === 'primero'
      ? `${r.tipoVehiculo}s con placa cuyo primer dígito es ${listar(r.digitos)}`
      : `${r.tipoVehiculo}s con placa terminada en ${listar(r.digitos)}`;
  return `Pico y placa: ${quien}, ${nombreDia(r.diaSemana)} de ${r.horaInicio} a ${r.horaFin}.`;
}

module.exports = { digitosATexto, textoADigitos, digitoEvaluado, vigenciasSeCruzan, vigenteEn, restringe, motivo };
