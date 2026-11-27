// Pruebas unitarias de las reglas de vehículos (spec 005: RF-VEH-02, RN-11, modelo 6.1).
const { normalizarPlaca, placaValida, mensajeFormato, modeloValido } = require('../../src/modules/vehiculos/vehiculos.reglas');
const { anioActualBogota } = require('../../src/utils/fechas');

describe('normalizarPlaca', () => {
  test.each([
    ['abc 123', 'ABC123'],
    ['ABC-123', 'ABC123'],
    [' qwe.45a ', 'QWE45A'],
    ['', ''],
    [null, ''],
  ])('%p → %p', (entrada, salida) => expect(normalizarPlaca(entrada)).toBe(salida));
});

describe('placaValida', () => {
  test.each([
    ['ABC123', 'carro', true],
    ['AB1234', 'carro', false],
    ['ABC12A', 'carro', false],
    ['QWE45', 'moto', true],
    ['QWE45A', 'moto', true],
    ['QWE456', 'moto', false],
    ['ABC123', 'bus', false],
  ])('%s como %s → %s', (placa, tipo, esperado) => expect(placaValida(placa, tipo)).toBe(esperado));
});

test('mensajeFormato según el tipo', () => {
  expect(mensajeFormato('carro')).toBe('Formato de placa inválido para carro (AAA123).');
  expect(mensajeFormato('moto')).toBe('Formato de placa inválido para moto (AAA12 o AAA12A).');
});

test('modeloValido entre 1950 y el año siguiente', () => {
  expect(modeloValido(1950, 2026)).toBe(true);
  expect(modeloValido(2027, 2026)).toBe(true);
  expect(modeloValido(2028, 2026)).toBe(false);
  expect(modeloValido(1949, 2026)).toBe(false);
  expect(modeloValido(2020.5, 2026)).toBe(false);
});

test('anioActualBogota usa la hora de Bogotá', () => {
  // 1 de enero 03:00 UTC = 31 de diciembre 22:00 en Bogotá.
  expect(anioActualBogota(new Date('2027-01-01T03:00:00Z'))).toBe(2026);
});
