const { app, request, tokenDe, auth } = require('../setup/helpers');

describe('HU-06 Consultar el catálogo de permisos', () => {
  test('HU-06 E1 catálogo agrupado por módulo con código y descripción', async () => {
    const res = await request(app).get('/api/v1/permisos').set(auth(await tokenDe('admin')));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(21);
    const permisos = res.body.data.flatMap((g) => g.permisos.map((p) => ({ ...p, modulo: g.modulo })));
    expect(permisos).toHaveLength(63);
    for (const p of permisos) {
      expect(p.codigo).toBe(`${p.modulo}.${p.accion}`);
      expect(p.descripcion).toEqual(expect.any(String));
    }
    expect(res.body.data[0].modulo).toBe('roles');
  });

  test('HU-06 E2 un usuario sin roles.ver recibe 403', async () => {
    for (const quien of ['operador', 'cliente']) {
      const res = await request(app).get('/api/v1/permisos').set(auth(await tokenDe(quien)));
      expect(res.status).toBe(403);
      expect(res.body.error).toEqual({ code: 'SIN_PERMISO', message: 'No tiene permiso para esta acción.' });
    }
  });

  test('HU-06 E3 sin sesión válida → 401', async () => {
    const res = await request(app).get('/api/v1/permisos');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NO_AUTENTICADO');
  });
});
