// Pruebas unitarias de las reglas de pico y placa (spec 006: RF-PYP-02, RN-13, RN-14).
const {
  digitosATexto,
  textoADigitos,
  digitoEvaluado,
  vigenciasSeCruzan,
  restringe,
  motivo,
} = require('../../src/modules/restricciones/restricciones.reglas');

const lunesCarro = {
  diaSemana: 1,
  tipoVehiculo: 'carro',
  digitos: [6, 9],
  posicionDigito: 'ultimo',
  horaInicio: '05:00',
  horaFin: '20:00',
  vigenteDesde: '2026-01-01',
  vigenteHasta: null,
  estado: 'activo',
};
// 2026-11-30 es lunes.
const momento = (cambios = {}) => ({ placa: 'ABC126', fecha: '2026-11-30', hora: '07:30:00', diaSemana: 1, ...cambios });

test('dígitos como texto ordenado y de vuelta', () => {
  expect(digitosATexto([9, 6])).toBe('6,9');
  expect(textoADigitos('6,9')).toEqual([6, 9]);
});

describe('digitoEvaluado', () => {
  test.each([
    ['ABC126', 'ultimo', 6],
    ['ABC126', 'primero', 1],
    ['QWE45A', 'primero', 4],
    ['QWE45A', 'ultimo', 5],
    ['ABCDEF', 'ultimo', null],
  ])('%s · %s → %p', (placa, posicion, esperado) => expect(digitoEvaluado(placa, posicion)).toBe(esperado));
});

describe('vigenciasSeCruzan', () => {
  const v = (desde, hasta = null) => ({ vigenteDesde: desde, vigenteHasta: hasta });
  test.each([
    [v('2026-01-01'), v('2030-01-01'), true],
    [v('2026-01-01', '2026-06-30'), v('2026-07-01'), false],
    [v('2026-01-01', '2026-06-30'), v('2026-06-30', '2026-12-31'), true],
    [v('2027-01-01', '2027-01-31'), v('2026-01-01', '2026-12-31'), false],
  ])('%p y %p → %p', (a, b, esperado) => {
    expect(vigenciasSeCruzan(a, b)).toBe(esperado);
    expect(vigenciasSeCruzan(b, a)).toBe(esperado);
  });
});

describe('restringe (RN-13)', () => {
  test('lunes 07:30 con placa terminada en 6 → restringido', () => expect(restringe(lunesCarro, momento())).toBe(true));
  test('05:00 en punto sí; 19:59:59 sí; 20:00 ya no', () => {
    expect(restringe(lunesCarro, momento({ hora: '05:00:00' }))).toBe(true);
    expect(restringe(lunesCarro, momento({ hora: '19:59:59' }))).toBe(true);
    expect(restringe(lunesCarro, momento({ hora: '20:00:00' }))).toBe(false);
    expect(restringe(lunesCarro, momento({ hora: '04:59:59' }))).toBe(false);
  });
  test('otro día, otro dígito, fuera de vigencia o inactiva → no', () => {
    expect(restringe(lunesCarro, momento({ diaSemana: 2, fecha: '2026-12-01' }))).toBe(false);
    expect(restringe(lunesCarro, momento({ placa: 'ABC125' }))).toBe(false);
    expect(restringe({ ...lunesCarro, vigenteHasta: '2026-11-29' }, momento())).toBe(false);
    expect(restringe({ ...lunesCarro, vigenteDesde: '2026-12-01' }, momento())).toBe(false);
    expect(restringe({ ...lunesCarro, estado: 'inactivo' }, momento())).toBe(false);
  });
  test('moto por el primer dígito', () => {
    const moto = { ...lunesCarro, tipoVehiculo: 'moto', posicionDigito: 'primero' };
    expect(restringe(moto, momento({ placa: 'QWE61A' }))).toBe(true);
    expect(restringe(moto, momento({ placa: 'QWE16A' }))).toBe(false);
  });
});

test('motivo legible', () => {
  expect(motivo(lunesCarro)).toBe('Pico y placa: carros con placa terminada en 6 o 9, lunes de 05:00 a 20:00.');
  expect(motivo({ ...lunesCarro, tipoVehiculo: 'moto', posicionDigito: 'primero', digitos: [1, 2, 3] })).toBe(
    'Pico y placa: motos con placa cuyo primer dígito es 1, 2 o 3, lunes de 05:00 a 20:00.'
  );
});
