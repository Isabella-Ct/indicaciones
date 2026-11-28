// Pruebas unitarias de las reglas de incidencias (spec 013: RF-INC-03, RF-INC-07, RF-INC-08, RN-28).
const { TIPOS, fechaEventoValida, puedeCambiar, estadoTrasNota } = require('../../src/modules/incidencias/incidencias.reglas');

const ahora = new Date('2026-11-27T10:00:00-05:00');

test('los cuatro tipos del SRS con su nombre', () => {
  expect(TIPOS).toEqual({ rayon: 'Rayón', choque: 'Choque', atropellamiento: 'Atropellamiento', golpe_muro: 'Golpe contra muro' });
});

test('HU-56 E3: la fecha del evento no puede ser futura; ahora mismo sí', () => {
  expect(fechaEventoValida(new Date('2026-11-27T09:40:00-05:00'), ahora)).toBe(true);
  expect(fechaEventoValida(ahora, ahora)).toBe(true);
  expect(fechaEventoValida(new Date('2026-11-27T10:01:00-05:00'), ahora)).toBe(false);
});

test('HU-58: la primera nota pasa a en seguimiento; una cerrada no cambia', () => {
  expect(estadoTrasNota('abierta')).toBe('en_seguimiento');
  expect(estadoTrasNota('en_seguimiento')).toBe('en_seguimiento');
  expect(puedeCambiar('abierta')).toBe(true);
  expect(puedeCambiar('en_seguimiento')).toBe(true);
  expect(puedeCambiar('cerrada')).toBe(false);
});
