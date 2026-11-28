// Reglas puras de reservas (spec 012, research R-01): franja, cruce de franjas, hora de inicio válida y momento
// de la reserva respecto al reloj. Sin BD ni HTTP. La franja va del inicio al fin de la espera, ambos incluidos.

const MS_MINUTO = 60000;
const ms = (fecha) => new Date(fecha).getTime();

/** RN-27: [inicio, inicio + espera]. */
const franja = (inicio, minutosEspera) => ({ desde: new Date(inicio), hasta: new Date(ms(inicio) + minutosEspera * MS_MINUTO) });

/** RF-RES-02: ¿se tocan dos franjas? (una a las 08:00 con 30 min y otra a las 08:30 se cruzan). */
const seCruzan = (a, b) => ms(a.desde) <= ms(b.hasta) && ms(b.desde) <= ms(a.hasta);

/**
 * RF-RES-01: la hora de inicio debe ser futura y estar a no más de `diasMaximos` días.
 * @returns {string|null} el mensaje de error o null
 */
function validarInicio(inicio, ahora, diasMaximos) {
  if (ms(inicio) <= ms(ahora)) return 'La hora de inicio debe ser futura.';
  if (ms(inicio) > ms(ahora) + diasMaximos * 1440 * MS_MINUTO) return `La reserva debe ser para los próximos ${diasMaximos} días.`;
  return null;
}

/** ¿El instante está dentro de la franja de la reserva? (HU-55 E1). */
const enFranja = (reserva, instante) => {
  const f = franja(reserva.fechaHoraInicio, reserva.minutosEspera);
  return ms(f.desde) <= ms(instante) && ms(instante) <= ms(f.hasta);
};

/** ¿Ya terminó la espera? (RF-RES-09). */
const vencida = (reserva, instante) => ms(instante) > ms(franja(reserva.fechaHoraInicio, reserva.minutosEspera).hasta);

module.exports = { franja, seCruzan, validarInicio, enFranja, vencida };
