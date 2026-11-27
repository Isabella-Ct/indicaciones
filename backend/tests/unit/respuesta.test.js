const { ok, creado, cuerpoError } = require('../../src/utils/respuesta');

function resFalsa() {
  return {
    estado: null,
    cuerpo: null,
    status(s) {
      this.estado = s;
      return this;
    },
    json(c) {
      this.cuerpo = c;
      return this;
    },
  };
}

describe('Sobre de respuesta { ok, data, meta, error } (constitución §II)', () => {
  test('ok() responde 200 con data y sin meta cuando no hay meta', () => {
    const res = ok(resFalsa(), { a: 1 });
    expect(res.estado).toBe(200);
    expect(res.cuerpo).toEqual({ ok: true, data: { a: 1 } });
  });

  test('ok() incluye meta en los listados', () => {
    const res = ok(resFalsa(), [], { page: 1, limit: 10, total: 0 });
    expect(res.cuerpo.meta).toEqual({ page: 1, limit: 10, total: 0 });
  });

  test('creado() responde 201', () => {
    expect(creado(resFalsa(), { id: 3 }).estado).toBe(201);
  });

  test('cuerpoError() omite details vacíos', () => {
    expect(cuerpoError('X', 'm', [])).toEqual({ ok: false, error: { code: 'X', message: 'm' } });
    expect(cuerpoError('X', 'm', [{ campo: 'a', mensaje: 'b' }]).error.details).toHaveLength(1);
  });
});
