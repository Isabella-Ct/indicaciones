// Requiere la BD cargada con `npm run db:reset` (usuarios de prueba del README).
const request = require('supertest');
const { crearApp } = require('../src/app');
const { pool } = require('../src/config/db');

const app = crearApp();

const ADMIN = { tipo_documento: 'CC', numero_documento: '1000000001', contrasena: 'Admin2026*' };
const OPERADOR = {
  tipo_documento: 'CC',
  numero_documento: '1000000002',
  contrasena: 'Operador2026*',
};
const CLIENTE = {
  tipo_documento: 'CC',
  numero_documento: '1000000004',
  contrasena: 'Cliente2026*',
};
const CLIENTE_TEMPORAL = {
  tipo_documento: 'CC',
  numero_documento: '1000000008',
  contrasena: 'Cliente2026*',
};
const INACTIVO = {
  tipo_documento: 'CC',
  numero_documento: '1000000009',
  contrasena: 'Cliente2026*',
};

async function iniciarSesion(credenciales) {
  const agente = request.agent(app);
  const res = await agente.post('/api/v1/auth/login').send(credenciales);
  expect(res.status).toBe(200);
  return agente;
}

afterAll(async () => {
  await pool.end();
});

describe('GET /api/v1/salud', () => {
  test('responde ok con la BD conectada', async () => {
    const res = await request(app).get('/api/v1/salud');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { estado: 'ok', bd: 'ok' } });
  });
});

describe('POST /api/v1/auth/login', () => {
  test('login correcto: cookie httpOnly + usuario con permisos, sin hash', async () => {
    const res = await request(app).post('/api/v1/auth/login').send(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.data.rol).toBe('administrador');
    expect(res.body.data.permisos).toContain('reportes.ver');

    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/parko_sesion=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);

    const cuerpo = JSON.stringify(res.body);
    expect(cuerpo).not.toMatch(/contrasena_hash/);
    expect(cuerpo).not.toMatch(/\$2[aby]\$/);
    expect(cuerpo).not.toContain(ADMIN.contrasena);
  });

  test('el cliente no recibe permisos de administración', async () => {
    const res = await request(app).post('/api/v1/auth/login').send(CLIENTE);
    expect(res.status).toBe(200);
    expect(res.body.data.rol).toBe('usuario');
    expect(res.body.data.permisos).toContain('portal.ver');
    expect(res.body.data.permisos).not.toContain('reportes.ver');
    expect(res.body.data.permisos).not.toContain('usuarios.ver');
  });

  test('contraseña incorrecta → 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ ...OPERADOR, contrasena: 'equivocada123' });
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('CREDENCIALES_INVALIDAS');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  test('documento inexistente → 401 con el mismo mensaje', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ tipo_documento: 'CC', numero_documento: '5555555', contrasena: 'cualquiera1' });
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('CREDENCIALES_INVALIDAS');
  });

  test('usuario inactivo → 403 con mensaje claro', async () => {
    const res = await request(app).post('/api/v1/auth/login').send(INACTIVO);
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('USUARIO_INACTIVO');
    expect(res.body.error.mensaje).toMatch(/inactivo/i);
  });

  test('datos inválidos → 422 con detalles por campo', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ tipo_documento: 'XX', numero_documento: '', contrasena: '' });
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('VALIDACION');
    const campos = res.body.error.detalles.map((d) => d.campo);
    expect(campos).toEqual(
      expect.arrayContaining(['tipo_documento', 'numero_documento', 'contrasena'])
    );
  });

  test('5 intentos fallidos bloquean el documento temporalmente (429)', async () => {
    const intento = { tipo_documento: 'CC', numero_documento: '7777777', contrasena: 'malamala1' };
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/v1/auth/login').send(intento);
      expect(res.status).toBe(401);
    }
    const bloqueado = await request(app).post('/api/v1/auth/login').send(intento);
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.error.codigo).toBe('DEMASIADOS_INTENTOS');
  });
});

describe('Rutas protegidas', () => {
  test('sin token → 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('NO_AUTENTICADO');
  });

  test('token inválido → 401', async () => {
    const res = await request(app)
      .get('/api/v1/roles')
      .set('Cookie', 'parko_sesion=token.falso.123');
    expect(res.status).toBe(401);
  });

  test('GET /auth/me devuelve la sesión', async () => {
    const agente = await iniciarSesion(OPERADOR);
    const res = await agente.get('/api/v1/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.numero_documento).toBe(OPERADOR.numero_documento);
    expect(res.body.data.rol).toBe('operador');
  });

  test('sin permiso → 403 (cliente pide roles)', async () => {
    const agente = await iniciarSesion(CLIENTE);
    const res = await agente.get('/api/v1/roles');
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('PROHIBIDO');
  });

  test('con permiso → 200 (operador pide roles)', async () => {
    const agente = await iniciarSesion(OPERADOR);
    const res = await agente.get('/api/v1/roles');
    expect(res.status).toBe(200);
    expect(res.body.data.map((r) => r.nombre)).toEqual(['administrador', 'operador', 'usuario']);
  });

  test('con contraseña temporal solo puede usar /auth/me hasta cambiarla', async () => {
    const agente = await iniciarSesion(CLIENTE_TEMPORAL);
    const me = await agente.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.debe_cambiar_contrasena).toBe(true);
  });

  test('logout borra la cookie y la sesión deja de funcionar', async () => {
    const agente = await iniciarSesion(ADMIN);
    const res = await agente.post('/api/v1/auth/logout');
    expect(res.status).toBe(200);
    const me = await agente.get('/api/v1/auth/me');
    expect(me.status).toBe(401);
  });
});

describe('POST /api/v1/auth/cambiar-contrasena', () => {
  test('rechaza la contraseña actual incorrecta (422)', async () => {
    const agente = await iniciarSesion(OPERADOR);
    const res = await agente
      .post('/api/v1/auth/cambiar-contrasena')
      .send({ contrasena_actual: 'noEsLaMia1', contrasena_nueva: 'NuevaClave2026' });
    expect(res.status).toBe(422);
    expect(res.body.error.detalles[0].campo).toBe('contrasena_actual');
  });

  test('exige mínimo 8 caracteres (422)', async () => {
    const agente = await iniciarSesion(OPERADOR);
    const res = await agente
      .post('/api/v1/auth/cambiar-contrasena')
      .send({ contrasena_actual: OPERADOR.contrasena, contrasena_nueva: 'corta' });
    expect(res.status).toBe(422);
    expect(res.body.error.detalles[0].campo).toBe('contrasena_nueva');
  });
});

describe('Errores generales', () => {
  test('ruta de API inexistente → 404 JSON', async () => {
    const res = await request(app).get('/api/v1/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('RUTA_NO_ENCONTRADA');
  });

  test('JSON mal formado → 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"tipo_documento":');
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('JSON_INVALIDO');
  });

  test('GET /parqueadero devuelve la sede desde la BD', async () => {
    const res = await request(app).get('/api/v1/parqueadero');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      nombre: 'Parqueadero ABC',
      ciudad: 'Medellín',
      ubicacion: { lat: 6.2462, lon: -75.5617 },
    });
    expect(res.body.data.latitud).toBeUndefined();
  });
});
