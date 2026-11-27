// Reglas puras de entradas y salidas (spec 007): minutos de estadía (RN-16), permanencia de más de
// 24 horas (RF-MOV-14), límite de anulación del Operador (RF-MOV-16) y textos para el usuario.
const { digitoEvaluado } = require('../restricciones/restricciones.reglas');

const MINUTOS_DIA = 24 * 60;
const MINUTOS_ANULACION_OPERADOR = 15;

/** Minutos completos entre la entrada y la salida (nunca negativos). */
const minutosEstadia = (entrada, salida) => Math.max(0, Math.floor((new Date(salida) - new Date(entrada)) / 60000));

/** RF-MOV-14: más de 24 horas dentro. */
const masDe24h = (minutos) => minutos >= MINUTOS_DIA;

/** RF-MOV-16: el Operador anula solo dentro de los 15 minutos siguientes a la entrada. */
const puedeAnularOperador = (entrada, ahora) => minutosEstadia(entrada, ahora) <= MINUTOS_ANULACION_OPERADOR;

/** HU-31 E2: «Vehículo con restricción de pico y placa hoy (dígito 3)». */
const mensajePicoPlaca = (placa, restriccion) =>
  `Vehículo con restricción de pico y placa hoy (dígito ${digitoEvaluado(placa, restriccion.posicionDigito)})`;

/** «andrea.salcedo@correo.co» → «a***@correo.co» (RNF-PRI-02: no se devuelve el correo completo). */
function enmascararCorreo(correo) {
  const [usuario, dominio] = String(correo).split('@');
  return dominio ? `${usuario.slice(0, 1)}***@${dominio}` : '***';
}

module.exports = { minutosEstadia, masDe24h, puedeAnularOperador, mensajePicoPlaca, enmascararCorreo, MINUTOS_ANULACION_OPERADOR };
