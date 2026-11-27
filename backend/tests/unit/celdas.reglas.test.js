const { normalizarCodigo, codigosDelRango, transicionManual } = require('../../src/modules/celdas/celdas.reglas');

describe('Reglas puras de celdas (spec 004 R-05)', () => {
  test('RF-CLD-10 normalizarCodigo en mayúsculas y sin espacios extremos', () => {
    expect(normalizarCodigo(' a-01 ')).toBe('A-01');
  });

  test('RF-CLD-12 codigosDelRango rellena con ceros', () => {
    expect(codigosDelRango('m-', 1, 3)).toEqual(['M-01', 'M-02', 'M-03']);
    expect(codigosDelRango('B-', 99, 101)).toEqual(['B-099', 'B-100', 'B-101']);
  });

  test.each([
    [5, 1, 'hasta'],
    [1, 300, 'hasta'],
    [-1, 2, 'hasta'],
  ])('codigosDelRango(%i, %i) rechaza el rango', (desde, hasta, campo) => {
    expect(() => codigosDelRango('A-', desde, hasta)).toThrow(expect.objectContaining({ campo }));
  });

  test('codigosDelRango rechaza códigos de más de 10 caracteres o con símbolos', () => {
    expect(() => codigosDelRango('PISO-ESTE-', 1, 2)).toThrow(expect.objectContaining({ campo: 'prefijo' }));
    expect(() => codigosDelRango('A#', 1, 2)).toThrow(expect.objectContaining({ campo: 'prefijo' }));
  });

  test.each([
    ['disponible', 'inhabilitada', { permitido: true }],
    ['inhabilitada', 'disponible', { permitido: true }],
    ['disponible', 'disponible', { permitido: true, sinCambios: true }],
    ['disponible', 'ocupada', { permitido: false, code: 'CAMBIO_ESTADO_NO_PERMITIDO' }],
    ['disponible', 'reservada', { permitido: false, code: 'CAMBIO_ESTADO_NO_PERMITIDO' }],
    ['ocupada', 'disponible', { permitido: false, code: 'CELDA_OCUPADA' }],
    ['ocupada', 'inhabilitada', { permitido: false, code: 'CELDA_OCUPADA' }],
    ['reservada', 'inhabilitada', { permitido: false, code: 'CELDA_RESERVADA' }],
  ])('RN-09 transicionManual(%s → %s)', (actual, pedido, esperado) => {
    expect(transicionManual(actual, pedido)).toEqual(esperado);
  });
});
