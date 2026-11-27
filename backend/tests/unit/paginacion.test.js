const { z } = require('zod');
const { camposPaginacion, aLimites, meta } = require('../../src/utils/paginacion');
const { escapeLike, aCamel } = require('../../src/utils/sql');

const esquema = z.object(camposPaginacion);

describe('Paginación ?page&limit&q (research R-07)', () => {
  test('valores por defecto: page 1, limit 10', () => {
    expect(esquema.parse({})).toEqual({ page: 1, limit: 10, q: undefined });
  });

  test.each([
    ['1', true],
    ['100', true],
    ['101', false],
    ['0', false],
    ['abc', false],
  ])('limit=%s válido=%s', (limit, valido) => {
    expect(esquema.safeParse({ limit }).success).toBe(valido);
  });

  test('q vacío se trata como ausente y se recorta', () => {
    expect(esquema.parse({ q: '   ' }).q).toBeUndefined();
    expect(esquema.parse({ q: ' oper ' }).q).toBe('oper');
  });

  test('aLimites y meta', () => {
    expect(aLimites({ page: 3, limit: 10 })).toEqual({ limit: 10, offset: 20 });
    expect(meta({ page: 2, limit: 10 }, 34)).toEqual({ page: 2, limit: 10, total: 34 });
  });

  test('escapeLike escapa los comodines de LIKE', () => {
    expect(escapeLike('50%_a')).toBe('50\\%\\_a');
    expect(escapeLike('a\\b')).toBe('a\\\\b');
  });

  test('aCamel convierte claves y booleanos indicados', () => {
    expect(aCamel({ id_rol: 1, es_base: 1 }, ['es_base'])).toEqual({ idRol: 1, esBase: true });
  });
});
