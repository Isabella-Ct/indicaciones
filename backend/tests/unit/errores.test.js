const { errorHandler, noEncontrado } = require('../../src/middlewares/error-handler');
const { errores } = require('../../src/utils/errores');

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
    sendFile() {
      return this;
    },
  };
}
const req = { originalUrl: '/api/v1/roles', method: 'GET' };

describe('Manejo de errores (research R-03)', () => {
  test.each([
    [errores.validacion([{ campo: 'nombre', mensaje: 'x' }]), 422, 'VALIDACION'],
    [errores.conflicto('dup', 'ROL_DUPLICADO'), 409, 'ROL_DUPLICADO'],
    [errores.noEncontrado('no', 'ROL_NO_ENCONTRADO'), 404, 'ROL_NO_ENCONTRADO'],
    [errores.sinPermiso(), 403, 'SIN_PERMISO'],
    [errores.noAutenticado(), 401, 'NO_AUTENTICADO'],
  ])('AppError %#: status y code', (error, status, code) => {
    const res = errorHandler(error, req, resFalsa(), () => {});
    expect(res.estado).toBe(status);
    expect(res.cuerpo).toMatchObject({ ok: false, error: { code } });
  });

  test('JSON mal formado → 400 JSON_INVALIDO', () => {
    const res = errorHandler({ type: 'entity.parse.failed' }, req, resFalsa(), () => {});
    expect(res.estado).toBe(400);
    expect(res.cuerpo.error.code).toBe('JSON_INVALIDO');
  });

  test('ER_DUP_ENTRY sin traducir → 409 DUPLICADO', () => {
    const res = errorHandler({ code: 'ER_DUP_ENTRY' }, req, resFalsa(), () => {});
    expect(res.estado).toBe(409);
  });

  test('error inesperado → 500 sin traza', () => {
    const res = errorHandler(new Error('secreto interno'), req, resFalsa(), () => {});
    expect(res.estado).toBe(500);
    expect(JSON.stringify(res.cuerpo)).not.toContain('secreto interno');
  });

  test('ruta de API inexistente → 404 JSON', () => {
    const res = noEncontrado(req, resFalsa());
    expect(res.estado).toBe(404);
    expect(res.cuerpo.error.code).toBe('RUTA_NO_ENCONTRADA');
  });
});
