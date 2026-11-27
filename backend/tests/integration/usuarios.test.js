// Pruebas de integración de la spec 002-gestion-usuarios, una por escenario de aceptación (HU-xx Ey).
const crypto = require('node:crypto');
const { pool } = require('../../src/config/db');
const { app, request, tokenDe, auth, CREDENCIALES } = require('../setup/helpers');
const { bandejaMemoria, vaciarBandeja } = require('../../src/integrations/correo');

const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010806000000' +
    '1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082',
  'hex'
);

let admin;
let operador;
let cliente;

beforeAll(async () => {
  admin = await tokenDe('admin');
  operador = await tokenDe('operador');
  cliente = await tokenDe('cliente');
});
beforeEach(() => vaciarBandeja());

let secuencia = 0;
/** Datos válidos y únicos para un usuario nuevo. */
function nuevo(cambios = {}) {
  secuencia += 1;
  const sufijo = `${Date.now() % 1e6}${secuencia}`.padStart(8, '0');
  return {
    tipoDocumento: 'CC',
    numeroDocumento: `30${sufijo}`,
    nombreCompleto: 'María Fernanda Ríos',
    correo: `maria.${sufijo}@correo.co`,
    celular: `31${sufijo}`.slice(0, 10),
    idRol: 3,
    aceptaTratamientoDatos: true,
    ...cambios,
  };
}

const api = (metodo, ruta, token) => request(app)[metodo](`/api/v1${ruta}`).set(auth(token));
const crear = (datos, token = admin) => api('post', '/usuarios', token).send(datos);
const login = (tipoDocumento, numeroDocumento, contrasena) =>
  request(app).post('/api/v1/auth/login').send({ tipoDocumento, numeroDocumento, contrasena });

/** Multipart con los campos de `datos` y, si se da, un archivo `foto`. */
function multipart(metodo, ruta, datos, archivo, token = admin) {
  let peticion = api(metodo, ruta, token);
  for (const [clave, valor] of Object.entries(datos)) peticion = peticion.field(clave, String(valor));
  if (archivo) peticion = peticion.attach('foto', archivo.buffer, archivo.nombre);
  return peticion;
}

const bitacora = async (id, accion) =>
  (await pool.query("SELECT id_usuario, valor_anterior, valor_nuevo FROM bitacora WHERE entidad = 'usuario' AND id_registro = ? AND accion = ?", [id, accion]))[0];

// ====================================================================== HU-07
describe('HU-07 Registrar un usuario', () => {
  test('HU-07 E1 crea el usuario activo con código, contraseña temporal por correo y cambio obligatorio', async () => {
    const datos = nuevo({ nombreCompleto: '  maría   fernanda  ríos ', correo: 'MARIA.E1@Correo.CO' });
    const res = await crear(datos);
    expect(res.status).toBe(201);
    const u = res.body.data;
    expect(u).toMatchObject({
      nombreCompleto: 'maría fernanda ríos',
      correo: 'maria.e1@correo.co',
      estado: 'activo',
      debeCambiarContrasena: true,
      aceptaTratamientoDatos: true,
      rol: { idRol: 3, nombre: 'Cliente' },
      correoEnviado: true,
    });
    expect(u.idUsuario).toBeGreaterThan(7);
    expect(JSON.stringify(res.body)).not.toMatch(/contrasena_hash|\$2b\$/);

    const [correo] = bandejaMemoria();
    expect(correo.para).toBe('maria.e1@correo.co');
    const temporal = correo.texto.match(/Contraseña temporal: (\S+)/)[1];
    expect(JSON.stringify(res.body)).not.toContain(temporal);
    const sesion = await login('CC', datos.numeroDocumento, temporal);
    expect(sesion.status).toBe(200);
    expect(sesion.body.data.usuario.debeCambiarContrasena).toBe(true);

    const [entrada] = await bitacora(u.idUsuario, 'crear');
    expect(entrada.id_usuario).toBe(1);
    expect(JSON.stringify(entrada.valor_nuevo)).not.toMatch(/contrasena/i);
  });

  test('HU-07 E2 documento o correo ya registrados → 409', async () => {
    const documento = await crear(nuevo({ numeroDocumento: '1000000004' }));
    expect(documento.status).toBe(409);
    expect(documento.body.error).toEqual({ code: 'DOCUMENTO_DUPLICADO', message: 'El documento ya está registrado.' });
    const correo = await crear(nuevo({ correo: 'ANDREA.SALCEDO@correo.co' }));
    expect(correo.status).toBe(409);
    expect(correo.body.error).toEqual({ code: 'CORREO_DUPLICADO', message: 'El correo ya está registrado.' });
  });

  test('HU-07 E3 campos obligatorios, formatos y autorización de datos → 422 por campo', async () => {
    const res = await crear({
      tipoDocumento: 'CC',
      numeroDocumento: '12AB',
      nombreCompleto: 'X1',
      correo: 'malo',
      celular: '2101234567',
      idRol: 3,
      aceptaTratamientoDatos: false,
    });
    expect(res.status).toBe(422);
    const campos = res.body.error.details.map((d) => d.campo).sort();
    expect(campos).toEqual(['aceptaTratamientoDatos', 'celular', 'correo', 'nombreCompleto', 'numeroDocumento']);
    const vacio = await crear({});
    expect(vacio.status).toBe(422);
    expect(vacio.body.error.details.length).toBeGreaterThanOrEqual(6);
  });

  test('HU-07 E4 foto PNG se guarda y se muestra; GIF o > 2 MB se rechazan sin crear', async () => {
    const datos = nuevo();
    const res = await multipart('post', '/usuarios', datos, { buffer: PNG, nombre: 'foto.png' });
    expect(res.status).toBe(201);
    expect(res.body.data.fotoUrl).toBe(`/api/v1/usuarios/${res.body.data.idUsuario}/foto`);
    const foto = await api('get', `/usuarios/${res.body.data.idUsuario}/foto`, admin);
    expect(foto.status).toBe(200);
    expect(foto.headers['content-type']).toBe('image/png');

    const gif = nuevo();
    const malo = await multipart('post', '/usuarios', gif, { buffer: Buffer.from('GIF89a'), nombre: 'f.gif' });
    expect(malo.status).toBe(422);
    expect(malo.body.error.details).toEqual([{ campo: 'foto', mensaje: 'La foto debe ser JPG o PNG.' }]);
    const grande = await multipart('post', '/usuarios', nuevo(), {
      buffer: Buffer.concat([PNG, crypto.randomBytes(2 * 1024 * 1024)]),
      nombre: 'g.png',
    });
    expect(grande.status).toBe(422);
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM usuario WHERE numero_documento = ?', [gif.numeroDocumento]);
    expect(n).toBe(0);
  });

  test('HU-07 E5 el Operador solo asigna el rol Cliente (otro rol → 403)', async () => {
    const otroRol = await crear(nuevo({ idRol: 2 }), operador);
    expect(otroRol.status).toBe(403);
    expect(otroRol.body.error.code).toBe('SIN_PERMISO');
    const clienteNuevo = await crear(nuevo({ idRol: 3 }), operador);
    expect(clienteNuevo.status).toBe(201);
    // Sin rol: al Operador se le asigna Cliente; al Administrador se le pide (research R-08).
    const { idRol: _r, ...sinRol } = nuevo();
    const porDefecto = await crear(sinRol, operador);
    expect(porDefecto.status).toBe(201);
    expect(porDefecto.body.data.rol.nombre).toBe('Cliente');
    const adminSinRol = await crear({ ...sinRol, numeroDocumento: '4455667788', correo: 'sinrol@correo.co' });
    expect(adminSinRol.status).toBe(422);
    expect(adminSinRol.body.error.details).toEqual([{ campo: 'idRol', mensaje: 'Seleccione el rol.' }]);
    const sinPermiso = await crear(nuevo(), cliente);
    expect(sinPermiso.status).toBe(403);
  });

  test('HU-07 E6 rol inactivo o inexistente → 422 en el campo rol', async () => {
    // Rol inactivo propio (no depende del estado del rol semilla «Auditor», que otras pruebas cambian).
    const rol = await api('post', '/roles', admin).send({ nombre: `Inactivo E6 ${Date.now() % 1e6}`, permisos: [19] });
    await api('patch', `/roles/${rol.body.data.idRol}/estado`, admin).send({ estado: 'inactivo' });
    for (const idRol of [rol.body.data.idRol, 999]) {
      const res = await crear(nuevo({ idRol }));
      expect(res.status).toBe(422);
      expect(res.body.error.details).toEqual([{ campo: 'idRol', mensaje: 'Seleccione un rol activo.' }]);
    }
  });
});

// ====================================================================== HU-08
describe('HU-08 Consultar y buscar usuarios', () => {
  test('HU-08 E1 tabla paginada con código, documento, nombre, correo, celular, rol y estado', async () => {
    const res = await api('get', '/usuarios', admin);
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 10 });
    expect(res.body.data.length).toBeLessThanOrEqual(10);
    expect(Object.keys(res.body.data[0])).toEqual(
      expect.arrayContaining(['idUsuario', 'numeroDocumento', 'nombreCompleto', 'correo', 'celular', 'rol', 'estado'])
    );
  });

  test('HU-08 E2 busca por documento, nombre o correo; sin coincidencias lista vacía', async () => {
    for (const q of ['1000000004', 'SALCEDO', 'andrea.salcedo@']) {
      const res = await api('get', `/usuarios?q=${encodeURIComponent(q)}`, admin);
      expect(res.body.data.map((u) => u.idUsuario)).toContain(4);
    }
    const nada = await api('get', '/usuarios?q=zzzzzz', admin);
    expect(nada.body).toMatchObject({ data: [], meta: { total: 0 } });
  });

  test('HU-08 E3 filtros por rol y estado', async () => {
    const res = await api('get', '/usuarios?rol=3&estado=inactivo&limit=100', admin);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((u) => u.rol.idRol === 3 && u.estado === 'inactivo')).toBe(true);
  });

  test('HU-08 E4 detalle con vehículos y membresía, nunca la contraseña', async () => {
    const res = await api('get', '/usuarios/4', admin);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ idUsuario: 4, membresiaVigente: null });
    // Desde la spec 005 la semilla le da a Andrea un carro y una moto (otras pruebas pueden agregarle más).
    expect(res.body.data.vehiculos.map((v) => v.placa)).toEqual(expect.arrayContaining(['ABC123', 'QWE45A']));
    expect(JSON.stringify(res.body)).not.toMatch(/contrasena_?hash|claveFoto|\$2b\$/i);
  });

  test('HU-08 E5 el Operador solo ve Clientes y no puede abrir a un Administrador', async () => {
    const lista = await api('get', '/usuarios?rol=1&limit=100', operador);
    expect(lista.status).toBe(200);
    expect(lista.body.data.length).toBeGreaterThan(0);
    expect(lista.body.data.every((u) => u.rol.nombre === 'Cliente')).toBe(true);
    expect((await api('get', '/usuarios/1', operador)).status).toBe(403);
    expect((await api('get', '/usuarios/4', operador)).status).toBe(200);
    expect((await api('get', '/usuarios', cliente)).status).toBe(403);
  });

  test('HU-08 E6 usuario inexistente → 404; foto inexistente → 404; foto ajena del cliente → 403', async () => {
    const res = await api('get', '/usuarios/99999', admin);
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: 'USUARIO_NO_ENCONTRADO', message: 'Usuario no encontrado.' });
    expect((await api('get', '/usuarios/4/foto', admin)).body.error.code).toBe('FOTO_NO_ENCONTRADA');
    expect((await api('get', '/usuarios/5/foto', cliente)).status).toBe(403);
    expect((await api('get', '/usuarios?limit=101', admin)).status).toBe(422);
  });
});

// ====================================================================== HU-10
describe('HU-10 Activar o inactivar un usuario', () => {
  let idTemporal;
  let documento;
  let contrasena;

  beforeAll(async () => {
    const datos = nuevo();
    documento = datos.numeroDocumento;
    const res = await crear(datos);
    idTemporal = res.body.data.idUsuario;
    const temporal = bandejaMemoria().at(-1).texto.match(/Contraseña temporal: (\S+)/)[1];
    // Con la contraseña temporal solo se puede cambiarla (spec 003 RF-ACC-04): se cambia primero.
    const token = (await login('CC', documento, temporal)).body.data.token;
    contrasena = 'NuevaClave2026';
    await api('put', '/auth/contrasena', token).send({
      contrasenaActual: temporal,
      contrasenaNueva: contrasena,
      confirmacion: contrasena,
    });
  });

  test('HU-10 E1 inactiva, revoca la sesión abierta y registra en la bitácora', async () => {
    const token = (await login('CC', documento, contrasena)).body.data.token;
    expect((await api('get', '/usuarios/me', token)).status).toBe(200);
    const res = await api('patch', `/usuarios/${idTemporal}/estado`, admin).send({ estado: 'inactivo' });
    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe('inactivo');
    expect((await api('get', '/usuarios/me', token)).status).toBe(401);
    const [[{ abiertas }]] = await pool.query(
      'SELECT COUNT(*) AS abiertas FROM sesion WHERE id_usuario = ? AND revocada_en IS NULL',
      [idTemporal]
    );
    expect(abiertas).toBe(0);
    expect(await bitacora(idTemporal, 'cambiar_estado')).toEqual([
      { id_usuario: 1, valor_anterior: { estado: 'activo' }, valor_nuevo: { estado: 'inactivo' } },
    ]);
  });

  test('HU-10 E2 el usuario inactivo no puede iniciar sesión', async () => {
    const res = await login('CC', documento, contrasena);
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: 'USUARIO_INACTIVO', message: 'Usuario inactivo. Comuníquese con el administrador.' });
  });

  test('HU-10 E3 al activarlo puede volver a iniciar sesión', async () => {
    const res = await api('patch', `/usuarios/${idTemporal}/estado`, admin).send({ estado: 'activo' });
    expect(res.status).toBe(200);
    expect((await login('CC', documento, contrasena)).status).toBe(200);
  });

  test('HU-10 E4 Operador y Cliente no pueden cambiar estados (403)', async () => {
    for (const token of [operador, cliente]) {
      const res = await api('patch', `/usuarios/${idTemporal}/estado`, token).send({ estado: 'inactivo' });
      expect(res.status).toBe(403);
    }
  });

  test('HU-10 E5 el Administrador no puede inactivar su propia cuenta (409)', async () => {
    const res = await api('patch', '/usuarios/1/estado', admin).send({ estado: 'inactivo' });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'AUTOINACTIVACION', message: 'No puede inactivar su propia cuenta.' });
  });

  test('HU-10 E6 un usuario inactivo conserva sus datos; mismo estado no escribe bitácora; estado inválido 422', async () => {
    const detalle = await api('get', '/usuarios/7', admin);
    expect(detalle.body.data).toMatchObject({ idUsuario: 7, estado: 'inactivo', nombreCompleto: 'Mateo Cardona Ruiz' });
    const antes = (await bitacora(7, 'cambiar_estado')).length;
    expect((await api('patch', '/usuarios/7/estado', admin).send({ estado: 'inactivo' })).status).toBe(200);
    expect((await bitacora(7, 'cambiar_estado')).length).toBe(antes);
    expect((await api('patch', '/usuarios/7/estado', admin).send({ estado: 'borrado' })).status).toBe(422);
    expect((await api('patch', '/usuarios/99999/estado', admin).send({ estado: 'activo' })).status).toBe(404);
  });
});

// ====================================================================== HU-09
describe('HU-09 Actualizar los datos de cualquier usuario', () => {
  let id;
  let base;
  let idRolNuevo;

  beforeAll(async () => {
    base = nuevo();
    id = (await crear(base)).body.data.idUsuario;
    // Rol propio de la prueba para no alterar los conteos de los roles semilla (tests de la 001).
    const rol = await api('post', '/roles', admin).send({ nombre: `Rol HU09 ${Date.now() % 1e6}`, permisos: [19] });
    idRolNuevo = rol.body.data.idRol;
  });
  const edicion = (cambios = {}) => {
    const { aceptaTratamientoDatos: _a, ...datos } = base;
    return { ...datos, ...cambios };
  };

  test('HU-09 E1 cambia celular y rol, registra solo las diferencias en la bitácora', async () => {
    const res = await api('put', `/usuarios/${id}`, admin).send(edicion({ celular: '3209998877', idRol: idRolNuevo }));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ celular: '3209998877', rol: { idRol: idRolNuevo } });
    const [entrada] = await bitacora(id, 'editar');
    expect(entrada.valor_anterior).toEqual({ celular: base.celular, idRol: 3 });
    expect(entrada.valor_nuevo).toEqual({ celular: '3209998877', idRol: idRolNuevo });
    base = { ...base, celular: '3209998877', idRol: idRolNuevo };
  });

  test('HU-09 E2 correo o documento de otro usuario → 409', async () => {
    const correo = await api('put', `/usuarios/${id}`, admin).send(edicion({ correo: 'andrea.salcedo@correo.co' }));
    expect(correo.status).toBe(409);
    expect(correo.body.error.code).toBe('CORREO_DUPLICADO');
    const documento = await api('put', `/usuarios/${id}`, admin).send(edicion({ numeroDocumento: '1000000004' }));
    expect(documento.body.error.code).toBe('DOCUMENTO_DUPLICADO');
  });

  test('HU-09 E3 Operador y Cliente no pueden editar a otro usuario (403)', async () => {
    for (const token of [operador, cliente]) {
      expect((await api('put', `/usuarios/${id}`, token).send(edicion())).status).toBe(403);
    }
  });

  test('HU-09 E4 el código no se puede modificar (422) y la foto se reemplaza o se quita', async () => {
    const codigo = await api('put', `/usuarios/${id}`, admin).send(edicion({ idUsuario: 1 }));
    expect(codigo.status).toBe(422);
    const conFoto = await multipart('put', `/usuarios/${id}`, edicion(), { buffer: PNG, nombre: 'f.png' });
    expect(conFoto.status).toBe(200);
    expect(conFoto.body.data.fotoUrl).not.toBeNull();
    const sinFoto = await api('put', `/usuarios/${id}`, admin).send(edicion({ quitarFoto: true }));
    expect(sinFoto.body.data.fotoUrl).toBeNull();
  });

  test('HU-09 E5 usuario inexistente → 404', async () => {
    expect((await api('put', '/usuarios/99999', admin).send(edicion())).status).toBe(404);
  });
});

// ====================================================================== HU-11
describe('HU-11 Actualizar mis datos personales', () => {
  const mios = { nombreCompleto: 'Andrea Salcedo Ríos', correo: 'andrea.salcedo@correo.co', celular: '3101000004' };

  test('HU-11 E1 veo mis datos; documento, código y rol vienen como datos de solo lectura', async () => {
    const res = await api('get', '/usuarios/me', cliente);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ idUsuario: 4, numeroDocumento: '1000000004', rol: { nombre: 'Cliente' } });
  });

  test('HU-11 E2 cambiar el celular guarda, registra y avisa a cada Administrador (app + correo)', async () => {
    const res = await api('put', '/usuarios/me', cliente).send({ ...mios, celular: '3109998877' });
    expect(res.status).toBe(200);
    expect(res.body.data.celular).toBe('3109998877');
    const [notificaciones] = await pool.query(
      "SELECT id_usuario, tipo, mensaje, enviada FROM notificacion WHERE tipo = 'datos' ORDER BY id_notificacion DESC LIMIT 1"
    );
    expect(notificaciones[0]).toMatchObject({ id_usuario: 1, tipo: 'datos', enviada: 1 });
    expect(notificaciones[0].mensaje).toContain('celular 3101000004 → 3109998877');
    expect(bandejaMemoria()).toEqual([
      expect.objectContaining({ para: 'admin@parqueaderoabc.co', asunto: 'Actualización de datos personales' }),
    ]);
    const [entrada] = await bitacora(4, 'editar_perfil');
    expect(entrada.valor_nuevo).toEqual({ celular: '3109998877' });
  });

  test('HU-11 E3 correo inválido → 422; correo de otra cuenta → 409', async () => {
    const invalido = await api('put', '/usuarios/me', cliente).send({ ...mios, correo: 'sin-arroba' });
    expect(invalido.status).toBe(422);
    expect(invalido.body.error.details[0].campo).toBe('correo');
    const duplicado = await api('put', '/usuarios/me', cliente).send({ ...mios, correo: 'carlos.medina@correo.co' });
    expect(duplicado.status).toBe(409);
  });

  test('HU-11 E4 cambiar el id en la petición (PUT /usuarios/5) → 403', async () => {
    const res = await api('put', '/usuarios/5', cliente).send({ ...mios, tipoDocumento: 'CE', numeroDocumento: '1000000005', idRol: 3 });
    expect(res.status).toBe(403);
  });

  test('HU-11 E5 enviar documento, rol, estado o código → 422 sin cambios', async () => {
    for (const extra of [{ numeroDocumento: '1' }, { idRol: 1 }, { estado: 'inactivo' }, { idUsuario: 9 }]) {
      const res = await api('put', '/usuarios/me', cliente).send({ ...mios, ...extra });
      expect(res.status).toBe(422);
    }
    expect((await api('get', '/usuarios/me', cliente)).body.data.rol.nombre).toBe('Cliente');
  });

  test('HU-11 E6 sin cambios no notifica a nadie', async () => {
    const actual = (await api('get', '/usuarios/me', cliente)).body.data;
    const [[antes]] = await pool.query('SELECT COUNT(*) AS n FROM notificacion');
    const res = await api('put', '/usuarios/me', cliente).send({
      nombreCompleto: actual.nombreCompleto,
      correo: actual.correo,
      celular: actual.celular,
    });
    expect(res.status).toBe(200);
    const [[despues]] = await pool.query('SELECT COUNT(*) AS n FROM notificacion');
    expect(despues.n).toBe(antes.n);
    expect(bandejaMemoria()).toHaveLength(0);
  });

  test('HU-11 la foto propia se puede ver con perfil.ver', async () => {
    const actual = (await api('get', '/usuarios/me', cliente)).body.data;
    const res = await multipart('put', '/usuarios/me', {
      nombreCompleto: actual.nombreCompleto,
      correo: actual.correo,
      celular: actual.celular,
    }, { buffer: PNG, nombre: 'yo.png' }, cliente);
    expect(res.status).toBe(200);
    expect((await api('get', '/usuarios/4/foto', cliente)).status).toBe(200);
  });

  test('Sin sesión → 401', async () => {
    expect((await request(app).get('/api/v1/usuarios/me')).status).toBe(401);
    expect(CREDENCIALES.cliente.numeroDocumento).toBe('1000000004');
  });
});
