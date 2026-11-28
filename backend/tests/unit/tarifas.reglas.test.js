// Pruebas unitarias de las reglas de tarifas (spec 008: RN-18, RN-19, RF-TAR-04).
const {
  vigenciasSeCruzan,
  contiene,
  situacion,
  tipoClienteDe,
  cambiosNoPermitidosEnUsada,
  etiqueta,
} = require('../../src/modules/tarifas/tarifas.reglas');

const d = (iso) => new Date(`${iso}-05:00`);
const v = (desde, hasta = null) => ({ vigenteDesde: d(desde), vigenteHasta: hasta ? d(hasta) : null });

describe('vigenciasSeCruzan [desde, hasta)', () => {
  test.each([
    [v('2026-01-01T00:00:00'), v('2030-01-01T00:00:00'), true],
    [v('2026-01-01T00:00:00', '2026-06-01T00:00:00'), v('2026-06-01T00:00:00'), false],
    [v('2026-01-01T00:00:00', '2026-06-01T00:00:01'), v('2026-06-01T00:00:00'), true],
    [v('2027-01-01T00:00:00', '2027-02-01T00:00:00'), v('2026-01-01T00:00:00', '2026-12-31T00:00:00'), false],
  ])('%#', (a, b, esperado) => {
    expect(vigenciasSeCruzan(a, b)).toBe(esperado);
    expect(vigenciasSeCruzan(b, a)).toBe(esperado);
  });
});

test('contiene: desde incluido, hasta excluido', () => {
  const t = v('2026-01-01T00:00:00', '2026-02-01T00:00:00');
  expect(contiene(t, d('2026-01-01T00:00:00'))).toBe(true);
  expect(contiene(t, d('2026-01-31T23:59:59'))).toBe(true);
  expect(contiene(t, d('2026-02-01T00:00:00'))).toBe(false);
  expect(contiene(v('2026-01-01T00:00:00'), d('2099-01-01T00:00:00'))).toBe(true);
});

test('situación respecto al reloj', () => {
  const ahora = d('2026-11-29T10:00:00');
  expect(situacion({ ...v('2026-01-01T00:00:00'), estado: 'activo' }, ahora)).toBe('vigente');
  expect(situacion({ ...v('2026-11-30T00:00:00'), estado: 'activo' }, ahora)).toBe('programada');
  expect(situacion({ ...v('2025-01-01T00:00:00', '2026-01-01T00:00:00'), estado: 'activo' }, ahora)).toBe('vencida');
  expect(situacion({ ...v('2026-01-01T00:00:00'), estado: 'inactivo' }, ahora)).toBe('inactiva');
});

test('tipo de cliente: registrado con propietario, ocasional sin él', () => {
  expect(tipoClienteDe({ propietario: { idUsuario: 4 } })).toBe('registrado');
  expect(tipoClienteDe({ idPropietario: 4 })).toBe('registrado');
  expect(tipoClienteDe({ propietario: null })).toBe('ocasional');
});

test('en una tarifa usada solo cambian el nombre y la vigencia hasta', () => {
  const actual = { nombre: 'A', tipoVehiculo: 'carro', tipoCliente: 'ocasional', valorPrimeraHora: 4000, minutosFraccion: 15, valorFraccion: 1000, topeDiario: 30000, minutosGracia: 10, vigenteDesde: d('2026-01-01T00:00:00'), vigenteHasta: null };
  expect(cambiosNoPermitidosEnUsada(actual, { ...actual, nombre: 'B', vigenteHasta: d('2027-01-01T00:00:00'), vigenteDesde: d('2026-01-01T00:00:00') })).toEqual([]);
  expect(cambiosNoPermitidosEnUsada(actual, { ...actual, valorFraccion: 1200, topeDiario: null })).toEqual(['valorFraccion', 'topeDiario']);
});

test('etiqueta', () => expect(etiqueta('carro', 'ocasional')).toBe('carro ocasional'));
