// Pruebas unitarias de las reglas de descuentos (spec 011: RF-DES-03, RN-25).
const { corresponde, valorDe, elegir, situacion } = require('../../src/modules/descuentos/descuentos.reglas');

const base = {
  idDescuento: 1,
  estado: 'activo',
  tipo: 'porcentaje',
  valor: 20,
  aplicaTipoCliente: 'todos',
  aplicaTipoVehiculo: 'moto',
  minutosMinimos: null,
  vigenteDesde: new Date('2026-12-01T00:00:00-05:00'),
  vigenteHasta: new Date('2026-12-31T23:59:59-05:00'),
};
const moto = { tipoVehiculo: 'moto', tipoCliente: 'ocasional', minutos: 270, fecha: new Date('2026-12-05T12:00:00-05:00') };

describe('corresponde', () => {
  test('activo, vigente y del tipo de vehículo', () => expect(corresponde(base, moto)).toBe(true));
  test('los dos extremos de la vigencia cuentan', () => {
    expect(corresponde(base, { ...moto, fecha: base.vigenteDesde })).toBe(true);
    expect(corresponde(base, { ...moto, fecha: base.vigenteHasta })).toBe(true);
    expect(corresponde(base, { ...moto, fecha: new Date('2027-01-01T00:00:00-05:00') })).toBe(false);
  });
  test('otro tipo de vehículo o de cliente, inactivo o con menos minutos que los mínimos → no', () => {
    expect(corresponde(base, { ...moto, tipoVehiculo: 'carro' })).toBe(false);
    expect(corresponde({ ...base, aplicaTipoCliente: 'registrado' }, moto)).toBe(false);
    expect(corresponde({ ...base, estado: 'inactivo' }, moto)).toBe(false);
    expect(corresponde({ ...base, minutosMinimos: 300 }, moto)).toBe(false);
    expect(corresponde({ ...base, minutosMinimos: 270 }, moto)).toBe(true);
  });
});

describe('valorDe y elegir (RN-25)', () => {
  test('HU-50 E1: 20 % de $ 9.000 = $ 1.800; redondeo al peso', () => {
    expect(valorDe(base, 9000)).toBe(1800);
    expect(valorDe({ ...base, valor: 15 }, 4333)).toBe(650);
  });
  test('el fijo no pasa del bruto; sin bruto no hay descuento', () => {
    expect(valorDe({ ...base, tipo: 'valor_fijo', valor: 2000 }, 1500)).toBe(1500);
    expect(valorDe(base, 0)).toBe(0);
  });
  test('HU-50 E2: entre 10 % y $ 2.000 sobre $ 9.000 gana el de $ 2.000', () => {
    const diez = { ...base, idDescuento: 1, valor: 10 };
    const fijo = { ...base, idDescuento: 2, tipo: 'valor_fijo', valor: 2000 };
    expect(elegir([diez, fijo], 9000)).toEqual({ descuento: fijo, valor: 2000 });
  });
  test('empate → el más antiguo; sin candidatos o sin bruto → null', () => {
    const a = { ...base, idDescuento: 7, tipo: 'valor_fijo', valor: 1800 };
    const b = { ...base, idDescuento: 3 };
    expect(elegir([a, b], 9000).descuento.idDescuento).toBe(3);
    expect(elegir([], 9000)).toBeNull();
    expect(elegir([a], 0)).toBeNull();
  });
});

test('situación respecto al reloj', () => {
  expect(situacion(base, new Date('2026-11-27T10:00:00-05:00'))).toBe('programado');
  expect(situacion(base, new Date('2026-12-10T10:00:00-05:00'))).toBe('vigente');
  expect(situacion(base, new Date('2027-01-02T10:00:00-05:00'))).toBe('vencido');
  expect(situacion({ ...base, estado: 'inactivo' }, new Date('2026-12-10T10:00:00-05:00'))).toBe('inactivo');
});
