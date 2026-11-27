const jwt = require('jsonwebtoken');
const { app, request, CREDENCIALES, sesionDe, auth } = require('../setup/helpers');

const login = (body) => request(app).post('/api/v1/auth/login').send(body);

describe('POST /api/v1/auth/login (fundación, RF-ACC-01/02/05)', () => {
  test('200 con token Bearer, permisos y datos mínimos, sin contrasena_hash', async () => {
    const res = await login(CREDENCIALES.admin);
    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(data.token).toEqual(expect.any(String));
    expect(data.expiraEn).toMatch(/-05:00$/);
    expect(data.usuario).toMatchObject({
      idUsuario: 1,
      rol: 'Administrador',
      debeCambiarContrasena: false,
    });
    expect(data.permisos).toContain('roles.ver');
    expect(JSON.stringify(res.body)).not.toMatch(/contrasena_hash|contrasenaHash|\$2b\$/);
    const carga = jwt.decode(data.token);
    expect(carga).toMatchObject({ sub: '1', rol: 'Administrador' });
    expect(carga.jti).toEqual(expect.any(String));
    expect(carga.exp - carga.iat).toBe(8 * 3600);
  });

  test('401 genérico con contraseña errada', async () => {
    const res = await login({ ...CREDENCIALES.admin, contrasena: 'otra-clave' });
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({
      code: 'CREDENCIALES_INVALIDAS',
      message: 'Documento o contraseña incorrectos.',
    });
  });

  test('401 genérico para documento inexistente y para inactivo con contraseña errada (RF-ACC-02)', async () => {
    const inexistente = await login({ ...CREDENCIALES.admin, numeroDocumento: '9999999999' });
    const inactivoErrado = await login({ ...CREDENCIALES.inactivo, contrasena: 'otra-clave' });
    expect(inexistente.status).toBe(401);
    expect(inactivoErrado.body).toEqual(inexistente.body);
    expect(inexistente.body.error.code).toBe('CREDENCIALES_INVALIDAS');
  });

  test('HU-10 E2 usuario inactivo con contraseña correcta → 401 USUARIO_INACTIVO (spec 002 R-05)', async () => {
    const res = await login(CREDENCIALES.inactivo);
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({
      code: 'USUARIO_INACTIVO',
      message: 'Usuario inactivo. Comuníquese con el administrador.',
    });
  });

  test('422 sin documento ni contraseña, con detalle por campo', async () => {
    const res = await login({ tipoDocumento: 'CC' });
    expect(res.status).toBe(422);
    const campos = res.body.error.details.map((d) => d.campo);
    expect(campos).toEqual(expect.arrayContaining(['numeroDocumento', 'contrasena']));
  });

  test('400 con JSON mal formado', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"tipoDocumento":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('JSON_INVALIDO');
  });
});

describe('Rutas protegidas (RNF-SEG-03)', () => {
  test('401 sin token, con token alterado y con token firmado sin sesión', async () => {
    const { token } = await sesionDe('admin');
    const falso = jwt.sign({ rol: 'Administrador', permisos: ['roles.ver'] }, 'x'.repeat(40), {
      subject: '1',
      jwtid: '00000000-0000-0000-0000-000000000000',
    });
    for (const cabecera of [{}, auth(`${token}x`), auth(falso)]) {
      const res = await request(app).get('/api/v1/roles').set(cabecera);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('NO_AUTENTICADO');
    }
  });
});
