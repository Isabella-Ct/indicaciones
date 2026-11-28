// Pruebas unitarias del cálculo de la liquidación (spec 009: RN-20, RN-21; casos límite de la constitución).
const { calcular, valorTramo, pesos } = require('../../src/modules/liquidaciones/liquidaciones.reglas');

// Carro ocasional de la semilla: primera hora $ 4.000, fracción de 15 min a $ 1.000, tope $ 30.000, gracia 10 min.
const carro = { valorPrimeraHora: 4000, minutosFraccion: 15, valorFraccion: 1000, topeDiario: 30000, minutosGracia: 10 };

test('pesos sin decimales con punto de miles', () => {
  expect(pesos(9000)).toBe('$ 9.000');
  expect(pesos(1234567)).toBe('$ 1.234.567');
  expect(pesos(0)).toBe('$ 0');
});

test('HU-39 E1: 135 min → $ 4.000 + 5 fracciones × $ 1.000 = $ 9.000', () => {
  expect(calcular({ minutos: 135, tarifa: carro })).toMatchObject({
    fracciones: 5,
    valorBruto: 9000,
    total: 9000,
    explicacion: '$ 4.000 + 5 fracciones × $ 1.000 = $ 9.000',
  });
});

describe('gracia y primera hora', () => {
  test.each([
    [8, 0],
    [10, 0],
    [11, 4000],
    [60, 4000],
    [61, 5000],
    [75, 5000],
    [76, 6000],
  ])('%i min → %i', (minutos, total) => expect(calcular({ minutos, tarifa: carro }).total).toBe(total));
  test('dentro de la gracia explica el motivo', () => {
    expect(calcular({ minutos: 8, tarifa: carro }).explicacion).toBe('Dentro del tiempo de gracia (8 de 10 min): sin cobro');
  });
});

describe('tope diario por cada 24 horas (HU-39 E4)', () => {
  test('una estadía larga del mismo día no pasa del tope', () => {
    // 60 + 26 × 15 = 450 min → 4.000 + 26.000 = 30.000; 600 min → 4.000 + 36.000 = 40.000 → tope 30.000.
    expect(calcular({ minutos: 600, tarifa: carro })).toMatchObject({ total: 30000, topeAplicado: true, explicacion: '$ 30.000 (tope diario) = $ 30.000' });
  });
  test('30 horas: un día con tope + 6 horas', () => {
    // 6 h = 360 min → 4.000 + 20 × 1.000 = 24.000.
    const r = calcular({ minutos: 30 * 60, tarifa: carro });
    expect(r).toMatchObject({ dias: 1, total: 54000 });
    expect(r.explicacion).toBe('1 día × $ 30.000 (tope diario) + $ 4.000 + 20 fracciones × $ 1.000 = $ 54.000');
  });
  test('48 horas exactas: dos días con tope y nada más', () => {
    expect(calcular({ minutos: 2880, tarifa: carro })).toMatchObject({ dias: 2, total: 60000 });
  });
  test('sin tope: se cobra todo con la fórmula', () => {
    const sinTope = { ...carro, topeDiario: null };
    expect(calcular({ minutos: 1500, tarifa: sinTope }).total).toBe(valorTramo(1500, sinTope));
    expect(valorTramo(1500, sinTope)).toBe(4000 + 96 * 1000);
  });
});

test('HU-39 E3: membresía → $ 0 «Cubierto por membresía»', () => {
  expect(calcular({ minutos: 500, tarifa: carro, cubiertoPorMembresia: true })).toMatchObject({ total: 0, valorBruto: 0, cubiertoPorMembresia: true, explicacion: 'Cubierto por membresía' });
});

test('fracción de 1 minuto (cobro por minuto) y una sola fracción', () => {
  const porMinuto = { valorPrimeraHora: 3000, minutosFraccion: 1, valorFraccion: 50, topeDiario: null, minutosGracia: 0 };
  expect(calcular({ minutos: 61, tarifa: porMinuto })).toMatchObject({ total: 3050, explicacion: '$ 3.000 + 1 fracción × $ 50 = $ 3.050' });
  expect(calcular({ minutos: 45, tarifa: porMinuto }).explicacion).toBe('$ 3.000 (primera hora) = $ 3.000');
});
