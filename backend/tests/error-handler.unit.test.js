// Manejo centralizado de errores: formato JSON en la API, páginas PARKO fuera de ella.
const path = require('node:path');
const { noEncontrado, errorHandler } = require('../src/middlewares/error-handler');
const { AppError } = require('../src/utils/errores');

function respuestaFalsa() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.sendFile = jest.fn(() => res);
  return res;
}

beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterAll(() => console.error.mockRestore());

test('AppError conserva su código, mensaje y detalles', () => {
  const res = respuestaFalsa();
  errorHandler(
    new AppError(409, 'X', 'Conflicto', [{ campo: 'a' }]),
    { originalUrl: '/api/v1/x' },
    res
  );
  expect(res.status).toHaveBeenCalledWith(409);
  expect(res.json).toHaveBeenCalledWith({
    error: { codigo: 'X', mensaje: 'Conflicto', detalles: [{ campo: 'a' }] },
  });
});

test('error inesperado en la API: 500 en JSON sin stack fuera de desarrollo', () => {
  const res = respuestaFalsa();
  errorHandler(new Error('boom'), { method: 'GET', originalUrl: '/api/v1/x' }, res);
  expect(res.status).toHaveBeenCalledWith(500);
  const { error } = res.json.mock.calls[0][0];
  expect(error.codigo).toBe('ERROR_INTERNO');
  expect(error.detalles).toBeUndefined();
});

test('error inesperado fuera de la API: página de error PARKO', () => {
  const res = respuestaFalsa();
  errorHandler(new Error('boom'), { method: 'GET', originalUrl: '/app/inicio.html' }, res);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(path.basename(res.sendFile.mock.calls[0][0])).toBe('error.html');
});

test('JSON mal formado → 400 y duplicado no controlado → 409', () => {
  const r1 = respuestaFalsa();
  errorHandler({ type: 'entity.parse.failed' }, { originalUrl: '/api/v1/x' }, r1);
  expect(r1.status).toHaveBeenCalledWith(400);
  const r2 = respuestaFalsa();
  errorHandler({ code: 'ER_DUP_ENTRY' }, { originalUrl: '/api/v1/x' }, r2);
  expect(r2.status).toHaveBeenCalledWith(409);
});

test('404: JSON en la API y página PARKO fuera de ella', () => {
  const api = respuestaFalsa();
  noEncontrado({ originalUrl: '/api/v1/nada' }, api);
  expect(api.json.mock.calls[0][0].error.codigo).toBe('RUTA_NO_ENCONTRADA');
  const web = respuestaFalsa();
  noEncontrado({ originalUrl: '/nada' }, web);
  expect(path.basename(web.sendFile.mock.calls[0][0])).toBe('404.html');
});
