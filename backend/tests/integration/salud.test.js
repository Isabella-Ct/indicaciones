const { app, request } = require('../setup/helpers');

describe('GET /api/v1/health', () => {
  test('200 con estado de la BD y hora de Bogotá', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, data: { estado: 'ok', baseDatos: 'ok' } });
    expect(res.body.data.hora).toMatch(/-05:00$/);
  });

  test('ruta de API inexistente → 404 JSON', async () => {
    const res = await request(app).get('/api/v1/no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      ok: false,
      error: { code: 'RUTA_NO_ENCONTRADA', message: 'La ruta solicitada no existe.' },
    });
  });
});
