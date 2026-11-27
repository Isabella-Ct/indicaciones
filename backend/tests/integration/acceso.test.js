// Pruebas de integración de la spec 003-gestion-acceso, una por escenario de aceptación (HU-xx Ey).
const jwt = require('jsonwebtoken');
const { pool } = require('../../src/config/db');
const { app, request, CREDENCIALES, sesionDe, tokenDe, auth } = require('../setup/helpers');
const { bandejaMemoria, vaciarBandeja } = require('../../src/integrations/correo');

beforeEach(() => vaciarBandeja());

const post = (ruta, body, token) => {
  const peticion = request(app).post(`/api/v1${ruta}`);
  return (token ? peticion.set(auth(token)) : peticion).send(body);
};
const login = (body) => post('/auth/login', body);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

let secuencia = 0;
/** Documento único (no existe en la semilla) para pruebas de bloqueo y registro. */
const docUnico = () => `55${Date.now() % 1e7}${++secuencia}`.slice(0, 12);

/** Datos válidos de autorregistro. */
function registro(cambios = {}) {
  const doc = docUnico();
  return {
    tipoDocumento: 'CC',
    numeroDocumento: doc,
    nombreCompleto: 'Laura Pérez Gómez',
    correo: `laura.${doc}@correo.co`,
    celular: '3157654321',
    contrasena: 'Clave2026',
    confirmacion: 'Clave2026',
    aceptaTratamientoDatos: true,
    ...cambios,
  };
}

// ====================================================================== HU-12
describe('HU-12 Iniciar sesión como Administrador u Operador', () => {
  test('HU-12 E1 el Operador recibe el token con su rol y permisos', async () => {
    const res = await login(CREDENCIALES.operador);
    expect(res.status).toBe(200);
    expect(res.body.data.usuario).toMatchObject({ rol: 'Operador', debeCambiarContrasena: false });
    expect(res.body.data.permisos).toEqual(expect.arrayContaining(['usuarios.crear', 'movimientos.crear']));
    expect(jwt.decode(res.body.data.token).exp - jwt.decode(res.body.data.token).iat).toBe(8 * 3600);
  });

  test('HU-12 E2 contraseña incorrecta o documento inexistente → mismo 401 genérico', async () => {
    const errada = await login({ ...CREDENCIALES.operador, contrasena: 'otra' });
    const inexistente = await login({ tipoDocumento: 'CC', numeroDocumento: docUnico(), contrasena: 'otra' });
    expect(errada.status).toBe(401);
    expect(errada.body).toEqual(inexistente.body);
    expect(errada.body.error).toEqual({ code: 'CREDENCIALES_INVALIDAS', message: 'Documento o contraseña incorrectos.' });
  });

  test('HU-12 E3 tras 5 fallos en 15 min el sexto intento (aun correcto) → 429; se libera a los 15 min', async () => {
    const nuevo = registro();
    expect((await post('/auth/registro', nuevo)).status).toBe(201);
    const credencial = { tipoDocumento: 'CC', numeroDocumento: nuevo.numeroDocumento, contrasena: 'Clave2026' };
    for (let i = 0; i < 5; i++) {
      expect((await login({ ...credencial, contrasena: 'errada1' })).status).toBe(401);
    }
    const bloqueado = await login(credencial);
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.error).toEqual({ code: 'CUENTA_BLOQUEADA', message: 'Demasiados intentos. Intente en 15 minutos.' });

    const [intentos] = await pool.query('SELECT exitoso, ip FROM intento_acceso WHERE numero_documento = ?', [nuevo.numeroDocumento]);
    expect(intentos).toHaveLength(5);
    expect(intentos.every((i) => i.exitoso === 0 && i.ip)).toBe(true);

    await pool.query('UPDATE intento_acceso SET fecha = fecha - INTERVAL 16 MINUTE WHERE numero_documento = ?', [nuevo.numeroDocumento]);
    expect((await login(credencial)).status).toBe(200);
  });

  test('HU-12 E3 los documentos inexistentes también se bloquean (no revela si existen)', async () => {
    const credencial = { tipoDocumento: 'CC', numeroDocumento: docUnico(), contrasena: 'x' };
    for (let i = 0; i < 5; i++) await login(credencial);
    expect((await login(credencial)).status).toBe(429);
  });

  test('HU-12 E3 un ingreso exitoso reinicia la cuenta de fallos', async () => {
    const nuevo = registro();
    await post('/auth/registro', nuevo);
    const credencial = { tipoDocumento: 'CC', numeroDocumento: nuevo.numeroDocumento, contrasena: 'Clave2026' };
    for (let i = 0; i < 4; i++) await login({ ...credencial, contrasena: 'mala2026' });
    expect((await login(credencial)).status).toBe(200);
    for (let i = 0; i < 4; i++) await login({ ...credencial, contrasena: 'mala2026' });
    expect((await login(credencial)).status).toBe(200);
  });

  test('HU-12 E4 con contraseña temporal solo puede cambiarla o cerrar sesión (403 en lo demás)', async () => {
    const sesion = await login({ tipoDocumento: 'CC', numeroDocumento: '1000000006', contrasena: 'Cliente2026*' });
    expect(sesion.body.data.usuario.debeCambiarContrasena).toBe(true);
    const token = sesion.body.data.token;
    const otra = await request(app).get('/api/v1/usuarios/me').set(auth(token));
    expect(otra.status).toBe(403);
    expect(otra.body.error).toEqual({
      code: 'CAMBIO_CONTRASENA_REQUERIDO',
      message: 'Debe cambiar su contraseña antes de continuar.',
    });
  });

  test('HU-12 E5 cambia la contraseña, deja de exigirse y el mismo token sigue sirviendo', async () => {
    const token = (await login({ tipoDocumento: 'CC', numeroDocumento: '1000000006', contrasena: 'Cliente2026*' })).body
      .data.token;
    const cambiar = (body) => request(app).put('/api/v1/auth/contrasena').set(auth(token)).send(body);

    const actualErrada = await cambiar({ contrasenaActual: 'otra', contrasenaNueva: 'NuevaClave1', confirmacion: 'NuevaClave1' });
    expect(actualErrada.status).toBe(401);
    expect(actualErrada.body.error.code).toBe('CONTRASENA_ACTUAL_INCORRECTA');
    const debil = await cambiar({ contrasenaActual: 'Cliente2026*', contrasenaNueva: 'corta', confirmacion: 'corta' });
    expect(debil.status).toBe(422);
    expect(debil.body.error.details[0].campo).toBe('contrasenaNueva');
    const distinta = await cambiar({ contrasenaActual: 'Cliente2026*', contrasenaNueva: 'NuevaClave1', confirmacion: 'NuevaClave2' });
    expect(distinta.body.error.details).toEqual([{ campo: 'confirmacion', mensaje: 'La confirmación no coincide.' }]);
    const igual = await cambiar({ contrasenaActual: 'Cliente2026*', contrasenaNueva: 'Cliente2026*', confirmacion: 'Cliente2026*' });
    expect(igual.status).toBe(422);

    const bien = await cambiar({ contrasenaActual: 'Cliente2026*', contrasenaNueva: 'NuevaClave1', confirmacion: 'NuevaClave1' });
    expect(bien.status).toBe(200);
    expect((await request(app).get('/api/v1/usuarios/me').set(auth(token))).status).toBe(200);
    const nueva = await login({ tipoDocumento: 'CC', numeroDocumento: '1000000006', contrasena: 'NuevaClave1' });
    expect(nueva.body.data.usuario.debeCambiarContrasena).toBe(false);
    const [[entrada]] = await pool.query("SELECT COUNT(*) AS n FROM bitacora WHERE accion = 'cambiar_contrasena' AND id_registro = 6");
    expect(entrada.n).toBe(1);
  });

  test('PUT /auth/contrasena sin token → 401', async () => {
    expect((await request(app).put('/api/v1/auth/contrasena').send({})).status).toBe(401);
  });
});

// ====================================================================== HU-13
describe('HU-13 Iniciar sesión como Cliente', () => {
  test('HU-13 E1 el Cliente entra y solo recibe los permisos de su rol', async () => {
    const { usuario, permisos } = await sesionDe('cliente');
    expect(usuario.rol).toBe('Cliente');
    expect(permisos).toEqual(expect.arrayContaining(['perfil.ver', 'reservas.crear']));
    expect(permisos.some((p) => p.startsWith('usuarios.') || p.startsWith('roles.'))).toBe(false);
  });

  test('HU-13 E2 documento no registrado → 401 genérico', async () => {
    const res = await login({ tipoDocumento: 'CC', numeroDocumento: docUnico(), contrasena: 'Cliente2026*' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('CREDENCIALES_INVALIDAS');
  });

  test('HU-13 E3 el Cliente en una ruta de administración → 403', async () => {
    const token = await tokenDe('cliente');
    for (const ruta of ['/usuarios', '/roles', '/permisos']) {
      expect((await request(app).get(`/api/v1${ruta}`).set(auth(token))).status).toBe(403);
    }
  });
});

// ====================================================================== HU-15
describe('HU-15 Recuperar mi contraseña', () => {
  const MENSAJE = { ok: true, data: { mensaje: 'Si el documento está registrado, recibirá un correo.' } };
  let usuario;

  beforeAll(async () => {
    usuario = registro();
    await post('/auth/registro', usuario);
  });

  async function pedirEnlace() {
    const res = await post('/auth/recuperar', { tipoDocumento: 'CC', numeroDocumento: usuario.numeroDocumento });
    await esperar(50);
    const correo = bandejaMemoria().find((c) => c.para === usuario.correo);
    return { res, correo, token: correo?.texto.match(/token=([0-9a-f]{64})/)?.[1] };
  }

  test('HU-15 E1 envía al correo registrado un enlace de 30 minutos', async () => {
    const { res, correo, token } = await pedirEnlace();
    expect(res.status).toBe(200);
    expect(res.body).toEqual(MENSAJE);
    expect(correo.texto).toContain('http://localhost:3000/restablecer.html?token=');
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const [[fila]] = await pool.query(
      `SELECT token_hash, TIMESTAMPDIFF(MINUTE, NOW(), expira_en) AS minutos FROM token_recuperacion
        WHERE id_usuario = (SELECT id_usuario FROM usuario WHERE numero_documento = ?) ORDER BY id_token DESC LIMIT 1`,
      [usuario.numeroDocumento]
    );
    expect(fila.token_hash).not.toBe(token);
    expect(fila.minutos).toBeGreaterThanOrEqual(29);
  });

  test('HU-15 E2 documento inexistente o usuario inactivo → mismo cuerpo y sin correo', async () => {
    const inexistente = await post('/auth/recuperar', { tipoDocumento: 'CC', numeroDocumento: docUnico() });
    const inactivo = await post('/auth/recuperar', { tipoDocumento: 'CC', numeroDocumento: '1000000009' });
    await esperar(50);
    expect(inexistente.status).toBe(200);
    expect(inexistente.body).toEqual(MENSAJE);
    expect(inactivo.body).toEqual(MENSAJE);
    expect(bandejaMemoria()).toHaveLength(0);
    expect((await post('/auth/recuperar', { tipoDocumento: 'CC' })).status).toBe(422);
  });

  test('HU-15 E3 con un enlace vigente restablece, invalida el enlace y cierra las sesiones', async () => {
    const tokenSesion = (await login({ tipoDocumento: 'CC', numeroDocumento: usuario.numeroDocumento, contrasena: 'Clave2026' }))
      .body.data.token;
    const { token } = await pedirEnlace();
    const res = await post('/auth/restablecer', { token, contrasenaNueva: 'Recuperada9', confirmacion: 'Recuperada9' });
    expect(res.status).toBe(200);
    expect((await request(app).get('/api/v1/usuarios/me').set(auth(tokenSesion))).status).toBe(401);
    expect((await login({ tipoDocumento: 'CC', numeroDocumento: usuario.numeroDocumento, contrasena: 'Recuperada9' })).status).toBe(200);
    usuario.contrasena = 'Recuperada9';

    const otraVez = await post('/auth/restablecer', { token, contrasenaNueva: 'OtraClave9', confirmacion: 'OtraClave9' });
    expect(otraVez.status).toBe(409);
    expect(otraVez.body.error).toEqual({ code: 'ENLACE_INVALIDO', message: 'El enlace no es válido o expiró.' });
  });

  test('HU-15 E4 enlace vencido, reemplazado o inventado → 409; contraseña débil → 422', async () => {
    const primero = (await pedirEnlace()).token;
    vaciarBandeja();
    const segundo = (await pedirEnlace()).token;
    const reemplazado = await post('/auth/restablecer', { token: primero, contrasenaNueva: 'Clave9999', confirmacion: 'Clave9999' });
    expect(reemplazado.status).toBe(409);

    await pool.query('UPDATE token_recuperacion SET expira_en = NOW() - INTERVAL 1 MINUTE WHERE usado = FALSE');
    const vencido = await post('/auth/restablecer', { token: segundo, contrasenaNueva: 'Clave9999', confirmacion: 'Clave9999' });
    expect(vencido.status).toBe(409);

    const inventado = await post('/auth/restablecer', { token: 'a'.repeat(64), contrasenaNueva: 'Clave9999', confirmacion: 'Clave9999' });
    expect(inventado.body.error.code).toBe('ENLACE_INVALIDO');
    const debil = await post('/auth/restablecer', { token: 'a'.repeat(64), contrasenaNueva: 'abc', confirmacion: 'abc' });
    expect(debil.status).toBe(422);
  });
});

// ====================================================================== HU-16
describe('HU-16 Cerrar sesión', () => {
  test('HU-16 E1 cierra la sesión en el servidor (204)', async () => {
    const token = await tokenDe('operador');
    const res = await post('/auth/logout', undefined, token);
    expect(res.status).toBe(204);
    const { jti } = jwt.decode(token);
    const [[sesion]] = await pool.query('SELECT revocada_en FROM sesion WHERE jti = ?', [jti]);
    expect(sesion.revocada_en).not.toBeNull();
  });

  test('HU-16 E2 con el token anterior la API responde 401 en todo, incluso otro logout', async () => {
    const token = await tokenDe('cliente');
    await post('/auth/logout', undefined, token);
    expect((await request(app).get('/api/v1/usuarios/me').set(auth(token))).status).toBe(401);
    expect((await post('/auth/logout', undefined, token)).status).toBe(401);
    expect((await post('/auth/logout')).status).toBe(401);
  });

  test('HU-16 con contraseña temporal pendiente también puede cerrar sesión', async () => {
    const nuevo = await request(app)
      .post('/api/v1/usuarios')
      .set(auth(await tokenDe('admin')))
      .send({
        tipoDocumento: 'CC',
        numeroDocumento: docUnico(),
        nombreCompleto: 'Temporal Prueba',
        correo: `temporal.${Date.now()}@correo.co`,
        celular: '3001234567',
        idRol: 3,
        aceptaTratamientoDatos: true,
      });
    const temporal = bandejaMemoria().at(-1).texto.match(/Contraseña temporal: (\S+)/)[1];
    const token = (await login({ tipoDocumento: 'CC', numeroDocumento: nuevo.body.data.numeroDocumento, contrasena: temporal })).body.data
      .token;
    expect((await post('/auth/logout', undefined, token)).status).toBe(204);
  });
});

// ====================================================================== HU-14
describe('HU-14 Registrarme como cliente', () => {
  test('HU-14 E1 crea la cuenta Cliente activa, sin cambio obligatorio, y permite entrar', async () => {
    const datos = registro({ nombreCompleto: '  laura   pérez ' });
    const res = await post('/auth/registro', datos);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      nombreCompleto: 'laura pérez',
      rol: { nombre: 'Cliente' },
      estado: 'activo',
      debeCambiarContrasena: false,
      aceptaTratamientoDatos: true,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/contrasena_?hash|Clave2026|\$2b\$/i);
    const sesion = await login({ tipoDocumento: 'CC', numeroDocumento: datos.numeroDocumento, contrasena: 'Clave2026' });
    expect(sesion.status).toBe(200);
    expect(sesion.body.data.usuario.rol).toBe('Cliente');
    const [[b]] = await pool.query("SELECT id_usuario, valor_nuevo FROM bitacora WHERE accion = 'autorregistro' AND id_registro = ?", [
      res.body.data.idUsuario,
    ]);
    expect(b.id_usuario).toBe(res.body.data.idUsuario);
    expect(JSON.stringify(b.valor_nuevo)).not.toMatch(/contrasena/i);
  });

  test('HU-14 E2 documento ya registrado → 409 CUENTA_EXISTENTE; correo repetido → 409', async () => {
    const documento = await post('/auth/registro', registro({ numeroDocumento: '1000000004' }));
    expect(documento.status).toBe(409);
    expect(documento.body.error).toEqual({
      code: 'CUENTA_EXISTENTE',
      message: 'Ya existe una cuenta con este documento. Use Recuperar contraseña.',
    });
    const correo = await post('/auth/registro', registro({ correo: 'andrea.salcedo@correo.co' }));
    expect(correo.body.error.code).toBe('CORREO_DUPLICADO');
  });

  test('HU-14 E3 sin autorización de tratamiento de datos → 422 en la casilla', async () => {
    const res = await post('/auth/registro', registro({ aceptaTratamientoDatos: false }));
    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([
      { campo: 'aceptaTratamientoDatos', mensaje: 'Debe aceptar la autorización de tratamiento de datos.' },
    ]);
  });

  test('HU-14 E4 contraseña débil o que no coincide → 422 junto al campo', async () => {
    const debil = await post('/auth/registro', registro({ contrasena: 'solo1', confirmacion: 'solo1' }));
    expect(debil.body.error.details[0].campo).toBe('contrasena');
    const distinta = await post('/auth/registro', registro({ confirmacion: 'Clave2027' }));
    expect(distinta.body.error.details).toEqual([{ campo: 'confirmacion', mensaje: 'La confirmación no coincide.' }]);
  });

  test('HU-14 E5 no se puede elegir otro rol (422)', async () => {
    const res = await post('/auth/registro', registro({ idRol: 1 }));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDACION');
  });
});
