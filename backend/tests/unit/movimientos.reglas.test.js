// Pruebas unitarias de las reglas de entradas y salidas (spec 007: RN-16, RF-MOV-14, RF-MOV-16).
const {
  minutosEstadia,
  masDe24h,
  puedeAnularOperador,
  mensajePicoPlaca,
  enmascararCorreo,
} = require('../../src/modules/movimientos/movimientos.reglas');

const a = (iso) => new Date(iso);

test('minutos de estadía: 08:10 → 10:25 son 135; segundos sueltos no cuentan; nunca negativos', () => {
  expect(minutosEstadia(a('2026-11-30T08:10:00-05:00'), a('2026-11-30T10:25:00-05:00'))).toBe(135);
  expect(minutosEstadia(a('2026-11-30T08:10:00-05:00'), a('2026-11-30T08:10:59-05:00'))).toBe(0);
  expect(minutosEstadia(a('2026-11-30T08:10:00-05:00'), a('2026-11-30T08:00:00-05:00'))).toBe(0);
});

test('más de 24 horas desde 1440 minutos', () => {
  expect(masDe24h(1439)).toBe(false);
  expect(masDe24h(1440)).toBe(true);
});

test('el Operador anula hasta el minuto 15', () => {
  const entrada = a('2026-11-30T08:00:00-05:00');
  expect(puedeAnularOperador(entrada, a('2026-11-30T08:05:00-05:00'))).toBe(true);
  expect(puedeAnularOperador(entrada, a('2026-11-30T08:15:59-05:00'))).toBe(true);
  expect(puedeAnularOperador(entrada, a('2026-11-30T08:16:00-05:00'))).toBe(false);
});

test('mensaje de pico y placa con el dígito evaluado', () => {
  expect(mensajePicoPlaca('ABC123', { posicionDigito: 'ultimo' })).toBe('Vehículo con restricción de pico y placa hoy (dígito 3)');
  expect(mensajePicoPlaca('QWE45A', { posicionDigito: 'primero' })).toBe('Vehículo con restricción de pico y placa hoy (dígito 4)');
});

test('correo enmascarado', () => {
  expect(enmascararCorreo('andrea.salcedo@correo.co')).toBe('a***@correo.co');
  expect(enmascararCorreo('sin-arroba')).toBe('***');
});
