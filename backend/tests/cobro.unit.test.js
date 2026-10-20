// calcularCobro (función pura) — REQ-TAR-2, con las tarifas de la semilla.
const { calcularCobro } = require('../src/modules/tarifas/tarifas.calculo');

const CARRO = {
  valor_fraccion: 120,
  minutos_fraccion: 1,
  minutos_gracia: 0,
  valor_dia_maximo: 28000,
};
const MOTO = {
  valor_fraccion: 60,
  minutos_fraccion: 1,
  minutos_gracia: 0,
  valor_dia_maximo: 12000,
};
const DIEZ = { id: 1, nombre: 'Cliente frecuente', porcentaje: 10 };

describe('calcularCobro', () => {
  test('ejemplo de la maqueta: carro 157 min = $18.840 (67 % del tope)', () => {
    const r = calcularCobro({ minutos: 157, tarifa: CARRO });
    expect(r).toMatchObject({
      subtotal: 18840,
      total: 18840,
      valorDescuento: 0,
      fracciones: 157,
      porcentajeTope: 67,
    });
    expect(r.nota).toBe('157 min × $ 120 = $ 18.840');
  });

  test('0 minutos = $0', () => {
    expect(calcularCobro({ minutos: 0, tarifa: CARRO }).total).toBe(0);
  });

  test('tope del día alcanzado: carro 300 min = $28.000', () => {
    const r = calcularCobro({ minutos: 300, tarifa: CARRO });
    expect(r.total).toBe(28000);
    expect(r.porcentajeTope).toBe(100);
    expect(r.detalle[0].texto).toMatch(/tope del día/);
  });

  test('25 h = 1 tope + 60 min', () => {
    const r = calcularCobro({ minutos: 25 * 60, tarifa: CARRO });
    expect(r.total).toBe(28000 + 60 * 120);
    expect(r.detalle.map((d) => d.paso)).toEqual(['tope', 'fracciones', 'total']);
  });

  test('exactamente 24 h = un tope', () => {
    expect(calcularCobro({ minutos: 1440, tarifa: CARRO }).total).toBe(28000);
  });

  test('moto 100 min = $6.000', () => {
    expect(calcularCobro({ minutos: 100, tarifa: MOTO }).total).toBe(6000);
  });

  test('membresía activa: total $0 aunque haya descuento', () => {
    const r = calcularCobro({
      minutos: 157,
      tarifa: CARRO,
      membresiaActiva: { titular: 'Andrea Salcedo' },
      descuento: DIEZ,
    });
    expect(r).toMatchObject({
      subtotal: 0,
      total: 0,
      membresia: true,
      nota: 'Mensualidad activa · Andrea Salcedo',
    });
  });

  test('descuento del 10 % redondeado a la centena (18.840 → 17.000)', () => {
    const r = calcularCobro({ minutos: 157, tarifa: CARRO, descuento: DIEZ });
    expect(r).toMatchObject({
      subtotal: 18840,
      total: 17000,
      valorDescuento: 1840,
      porcentajeDescuento: 10,
    });
  });

  test('descuento del 100 % = $0', () => {
    const r = calcularCobro({
      minutos: 157,
      tarifa: CARRO,
      descuento: { nombre: 'Cortesía', porcentaje: 100 },
    });
    expect(r).toMatchObject({ subtotal: 18840, total: 0, valorDescuento: 18840 });
  });

  describe('modelo por fracción: 15 min con 10 min de gracia', () => {
    const FRACCION = {
      valor_fraccion: 1500,
      minutos_fraccion: 15,
      minutos_gracia: 10,
      valor_dia_maximo: 20000,
    };

    test('dentro de la gracia → $0', () => {
      expect(calcularCobro({ minutos: 10, tarifa: FRACCION }).total).toBe(0);
    });

    test('11 min = 1 fracción; 15 min = 1; 16 min = 2', () => {
      expect(calcularCobro({ minutos: 11, tarifa: FRACCION }).total).toBe(1500);
      expect(calcularCobro({ minutos: 15, tarifa: FRACCION }).total).toBe(1500);
      expect(calcularCobro({ minutos: 16, tarifa: FRACCION })).toMatchObject({
        total: 3000,
        fracciones: 2,
      });
    });

    test('fracción exacta: 60 min = 4 fracciones = $6.000', () => {
      expect(calcularCobro({ minutos: 60, tarifa: FRACCION }).total).toBe(6000);
    });

    test('el tope también aplica (300 min = 20 fracciones = $30.000 → $20.000)', () => {
      expect(calcularCobro({ minutos: 300, tarifa: FRACCION }).total).toBe(20000);
    });
  });
});
