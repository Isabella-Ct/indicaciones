// Pruebas unitarias de las reglas de reservas (spec 012: RF-RES-01, RF-RES-02, RN-27).
const { franja, seCruzan, validarInicio, enFranja, vencida } = require('../../src/modules/reservas/reservas.reglas');

const ahora = new Date('2026-11-27T10:00:00-05:00');
const reserva = { fechaHoraInicio: new Date('2026-11-28T08:00:00-05:00'), minutosEspera: 30 };

test('la franja va del inicio al fin de la espera', () => {
  expect(franja(reserva.fechaHoraInicio, 30)).toEqual({ desde: new Date('2026-11-28T08:00:00-05:00'), hasta: new Date('2026-11-28T08:30:00-05:00') });
});

test('franjas que se tocan se cruzan; separadas por un minuto, no', () => {
  const a = franja('2026-11-28T08:00:00-05:00', 30);
  expect(seCruzan(a, franja('2026-11-28T08:30:00-05:00', 30))).toBe(true);
  expect(seCruzan(a, franja('2026-11-28T07:40:00-05:00', 30))).toBe(true);
  expect(seCruzan(a, franja('2026-11-28T08:31:00-05:00', 30))).toBe(false);
  expect(seCruzan(a, franja('2026-11-28T07:29:00-05:00', 30))).toBe(false);
});

test('HU-52 E3: inicio futuro y a no más de 7 días', () => {
  expect(validarInicio(reserva.fechaHoraInicio, ahora, 7)).toBeNull();
  expect(validarInicio(new Date('2026-11-27T09:59:00-05:00'), ahora, 7)).toBe('La hora de inicio debe ser futura.');
  expect(validarInicio(ahora, ahora, 7)).toBe('La hora de inicio debe ser futura.');
  expect(validarInicio(new Date('2026-12-04T10:00:00-05:00'), ahora, 7)).toBeNull();
  expect(validarInicio(new Date('2026-12-04T10:01:00-05:00'), ahora, 7)).toBe('La reserva debe ser para los próximos 7 días.');
});

test('HU-55: en franja de 08:00 a 08:30; vencida desde 08:30 y un instante', () => {
  expect(enFranja(reserva, new Date('2026-11-28T07:59:00-05:00'))).toBe(false);
  expect(enFranja(reserva, new Date('2026-11-28T08:10:00-05:00'))).toBe(true);
  expect(enFranja(reserva, new Date('2026-11-28T08:30:00-05:00'))).toBe(true);
  expect(vencida(reserva, new Date('2026-11-28T08:30:00-05:00'))).toBe(false);
  expect(vencida(reserva, new Date('2026-11-28T08:31:00-05:00'))).toBe(true);
});
