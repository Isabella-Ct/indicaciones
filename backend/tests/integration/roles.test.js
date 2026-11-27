// Pruebas de integración de la spec 001-roles-permisos, una por escenario de aceptación (HU-xx Ey).
const { pool } = require('../../src/config/db');
const { app, request, tokenDe, auth } = require('../setup/helpers');

let admin;
let operador;

beforeAll(async () => {
  admin = await tokenDe('admin');
  operador = await tokenDe('operador');
});

const get = (ruta, token = admin) => request(app).get(`/api/v1${ruta}`).set(auth(token));
const send = (metodo, ruta, body, token = admin) =>
  request(app)[metodo](`/api/v1${ruta}`).set(auth(token)).send(body);

async function rolPorNombre(nombre) {
  const res = await get(`/roles?q=${encodeURIComponent(nombre)}&limit=100`);
  return res.body.data.find((r) => r.nombre === nombre);
}

async function codigosDe(nombre) {
  const rol = await rolPorNombre(nombre);
  const res = await get(`/roles/${rol.idRol}`);
  return res.body.data.permisos.flatMap((g) => g.permisos.map((p) => p.codigo));
}

async function idsPermisos(codigos) {
  const res = await get('/permisos');
  const todos = res.body.data.flatMap((g) => g.permisos);
  return codigos.map((c) => todos.find((p) => p.codigo === c).idPermiso);
}

describe('HU-01 Contar con los perfiles iniciales del sistema', () => {
  test('HU-01 E1 existen solo Administrador, Operador y Cliente como roles base activos', async () => {
    const res = await get('/roles?limit=100');
    expect(res.status).toBe(200);
    const base = res.body.data.filter((r) => r.esBase);
    expect(base.map((r) => r.nombre).sort()).toEqual(['Administrador', 'Cliente', 'Operador']);
    expect(base.every((r) => r.estado === 'activo')).toBe(true);
  });

  test('HU-01 E2 el Operador registra la operación diaria y no configura ni ve reportes', async () => {
    const codigos = await codigosDe('Operador');
    expect(codigos).toEqual(
      expect.arrayContaining([
        'usuarios.crear',
        'vehiculos.crear',
        'movimientos.crear',
        'facturas.crear',
        'reservas.crear',
        'incidencias.crear',
      ])
    );
    const prohibidos = codigos.filter(
      (c) =>
        c.startsWith('roles.') ||
        c.startsWith('reportes.') ||
        c.startsWith('indicadores.') ||
        ['tarifas.crear', 'descuentos.crear', 'planes.crear', 'restricciones.crear', 'parqueaderos.crear'].includes(c)
    );
    expect(prohibidos).toEqual([]);
    expect(codigos).toHaveLength(30);
  });

  test('HU-01 E3 el Administrador tiene los 63 permisos del catálogo', async () => {
    expect(await codigosDe('Administrador')).toHaveLength(63);
  });

  test('HU-01 E4 el Cliente solo tiene consultas propias, reservas y sus datos', async () => {
    const codigos = await codigosDe('Cliente');
    expect(codigos.sort()).toEqual(
      [
        'celdas.ver',
        'membresias.crear',
        'notificaciones.editar',
        'notificaciones.ver',
        'perfil.editar',
        'perfil.ver',
        'planes.ver',
        'reservas.crear',
        'reservas.editar',
        'restricciones.ver',
        'tarifas.ver',
      ].sort()
    );
  });

  test('HU-01 E5 un rol base no se puede inactivar ni renombrar (409)', async () => {
    const operadorRol = await rolPorNombre('Operador');
    const inactivar = await send('patch', `/roles/${operadorRol.idRol}/estado`, { estado: 'inactivo' });
    expect(inactivar.status).toBe(409);
    expect(inactivar.body.error).toEqual({
      code: 'ROL_BASE_INMUTABLE',
      message: 'Los roles base no se pueden modificar.',
    });

    const permisos = await idsPermisos(await codigosDe('Operador'));
    const renombrar = await send('put', `/roles/${operadorRol.idRol}`, { nombre: 'Operario', permisos });
    expect(renombrar.status).toBe(409);
    expect(renombrar.body.error.code).toBe('ROL_BASE_INMUTABLE');
    expect((await rolPorNombre('Operador')).estado).toBe('activo');
  });
});

describe('HU-02 Registrar un rol con sus permisos', () => {
  test('HU-02 E1 crea el rol activo, no base, con sus permisos y lo registra en la bitácora', async () => {
    const permisos = await idsPermisos(['vehiculos.ver', 'movimientos.ver']);
    const res = await send('post', '/roles', {
      nombre: '  Supervisor  ',
      descripcion: 'Supervisa el turno',
      permisos: [...permisos, permisos[0]],
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      nombre: 'Supervisor',
      descripcion: 'Supervisa el turno',
      esBase: false,
      estado: 'activo',
      usuariosAsignados: 0,
    });
    const codigos = res.body.data.permisos.flatMap((g) => g.permisos.map((p) => p.codigo));
    expect(codigos.sort()).toEqual(['movimientos.ver', 'vehiculos.ver']);
    const [bitacora] = await pool.query(
      "SELECT accion, id_usuario, valor_nuevo FROM bitacora WHERE entidad = 'rol' AND id_registro = ?",
      [res.body.data.idRol]
    );
    expect(bitacora).toHaveLength(1);
    expect(bitacora[0]).toMatchObject({ accion: 'crear', id_usuario: 1 });
  });

  test('HU-02 E2 rechaza un nombre existente sin distinguir mayúsculas ni espacios (409)', async () => {
    const permisos = await idsPermisos(['vehiculos.ver']);
    const res = await send('post', '/roles', { nombre: ' SUPERVISOR ', permisos });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: 'ROL_DUPLICADO',
      message: 'Ya existe un rol con ese nombre.',
    });
  });

  test('HU-02 E3 rechaza un rol sin permisos (422) indicando el campo', async () => {
    const res = await send('post', '/roles', { nombre: 'Sin permisos', permisos: [] });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([
      { campo: 'permisos', mensaje: 'El rol debe tener al menos un permiso.' },
    ]);
  });

  test.each([
    ['nombre de 2 caracteres', { nombre: 'ab' }, 'nombre'],
    ['nombre de 41 caracteres', { nombre: 'x'.repeat(41) }, 'nombre'],
    ['descripción de 151 caracteres', { descripcion: 'd'.repeat(151) }, 'descripcion'],
    ['permiso inexistente', { permisos: [99999] }, 'permisos'],
    ['campo no permitido', { esBase: true }, null],
  ])('HU-02 E4 rechaza %s (422)', async (_caso, cambio, campo) => {
    const permisos = await idsPermisos(['vehiculos.ver']);
    const res = await send('post', '/roles', { nombre: 'Rol válido E4', permisos, ...cambio });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDACION');
    if (campo) expect(res.body.error.details.map((d) => d.campo)).toContain(campo);
  });

  test('HU-02 el Operador no puede crear roles (403)', async () => {
    const res = await send('post', '/roles', { nombre: 'Intruso', permisos: [1] }, operador);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SIN_PERMISO');
  });
});

describe('HU-03 Consultar y buscar roles', () => {
  test('HU-03 E1 tabla paginada de 10 con meta y conteo de usuarios', async () => {
    const res = await get('/roles');
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 10 });
    expect(res.body.meta.total).toBeGreaterThanOrEqual(5);
    const operadorRol = res.body.data.find((r) => r.nombre === 'Operador');
    expect(operadorRol).toMatchObject({ usuariosAsignados: 1, usuariosActivos: 1 });
    expect(Object.keys(operadorRol)).toEqual(
      expect.arrayContaining(['idRol', 'nombre', 'descripcion', 'esBase', 'estado', 'createdAt'])
    );
  });

  test('HU-03 E2 buscar «OPER» muestra solo los roles que contienen ese texto', async () => {
    const res = await get('/roles?q=OPER');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((r) => r.nombre.toLowerCase().includes('oper'))).toBe(true);
  });

  test('HU-03 E3 filtrar por estado inactivo', async () => {
    const res = await get('/roles?estado=inactivo&limit=100');
    expect(res.body.data.map((r) => r.nombre)).toContain('Auditor');
    expect(res.body.data.every((r) => r.estado === 'inactivo')).toBe(true);
  });

  test('HU-03 E4 detalle con permisos agrupados por módulo y usuarios sin datos sensibles', async () => {
    const supervisor = await rolPorNombre('Supervisor de turno');
    const res = await get(`/roles/${supervisor.idRol}`);
    expect(res.status).toBe(200);
    expect(res.body.data.permisos[0]).toEqual({
      modulo: expect.any(String),
      permisos: expect.any(Array),
    });
    expect(res.body.data.usuarios).toEqual([
      { idUsuario: 3, nombreCompleto: 'Sebastián Duque Mejía', estado: 'activo' },
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/correo|documento|contrasena/i);
  });

  test('HU-03 E5 rol inexistente → 404', async () => {
    const res = await get('/roles/9999');
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: 'ROL_NO_ENCONTRADO', message: 'Rol no encontrado.' });
  });

  test('HU-03 limit mayor que 100 o id no numérico → 422', async () => {
    expect((await get('/roles?limit=101')).status).toBe(422);
    expect((await get('/roles/abc')).status).toBe(422);
  });
});

describe('HU-04 Actualizar un rol y sus permisos', () => {
  test('HU-04 E1 agrega reportes.ver; aplica en el siguiente inicio de sesión y queda en bitácora', async () => {
    const tokenViejo = await tokenDe('supervisor');
    const supervisor = await rolPorNombre('Supervisor de turno');
    const actuales = await codigosDe('Supervisor de turno');
    const nuevos = [...new Set([...actuales, 'reportes.ver', 'reportes.exportar'])];
    const res = await send('put', `/roles/${supervisor.idRol}`, {
      nombre: 'Supervisor de turno',
      descripcion: 'Operación diaria y reportes',
      permisos: await idsPermisos(nuevos),
    });
    expect(res.status).toBe(200);
    expect(res.body.data.descripcion).toBe('Operación diaria y reportes');

    const jwt = require('jsonwebtoken');
    expect(jwt.decode(tokenViejo).permisos).not.toContain('reportes.exportar');
    const tokenNuevo = await tokenDe('supervisor');
    expect(jwt.decode(tokenNuevo).permisos).toContain('reportes.exportar');

    const [bitacora] = await pool.query(
      "SELECT valor_anterior, valor_nuevo FROM bitacora WHERE entidad = 'rol' AND id_registro = ? AND accion = 'editar'",
      [supervisor.idRol]
    );
    expect(bitacora).toHaveLength(1);
    expect(bitacora[0].valor_nuevo.permisos).toContain('reportes.exportar');
    expect(bitacora[0].valor_anterior.permisos).not.toContain('reportes.exportar');
  });

  test('HU-04 E2 nombre de otro rol → 409', async () => {
    const supervisor = await rolPorNombre('Supervisor de turno');
    const res = await send('put', `/roles/${supervisor.idRol}`, {
      nombre: 'auditor',
      permisos: await idsPermisos(['vehiculos.ver']),
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROL_DUPLICADO');
  });

  test('HU-04 E3 quitar todos los permisos → 422', async () => {
    const supervisor = await rolPorNombre('Supervisor de turno');
    const res = await send('put', `/roles/${supervisor.idRol}`, {
      nombre: 'Supervisor de turno',
      permisos: [],
    });
    expect(res.status).toBe(422);
    expect(res.body.error.details[0]).toEqual({
      campo: 'permisos',
      mensaje: 'El rol debe tener al menos un permiso.',
    });
  });

  test('HU-04 E4 el Administrador no puede perder roles.editar (409)', async () => {
    const adminRol = await rolPorNombre('Administrador');
    const sinEditar = (await codigosDe('Administrador')).filter((c) => c !== 'roles.editar');
    const res = await send('put', `/roles/${adminRol.idRol}`, {
      nombre: 'Administrador',
      permisos: await idsPermisos(sinEditar),
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: 'PERMISOS_ADMIN_PROTEGIDOS',
      message:
        'El rol Administrador no puede perder los permisos de gestión de roles y usuarios (roles.editar).',
    });
    expect(await codigosDe('Administrador')).toContain('roles.editar');
  });

  test('HU-04 E5 a un rol base se le pueden cambiar la descripción y los permisos', async () => {
    const clienteRol = await rolPorNombre('Cliente');
    const actuales = await codigosDe('Cliente');
    const res = await send('put', `/roles/${clienteRol.idRol}`, {
      nombre: ' cliente ',
      descripcion: 'Clientes registrados',
      permisos: await idsPermisos(actuales),
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ nombre: 'Cliente', descripcion: 'Clientes registrados', esBase: true });
  });

  test('HU-04 E6 rol inexistente → 404', async () => {
    const res = await send('put', '/roles/9999', { nombre: 'Nada', permisos: [1] });
    expect(res.status).toBe(404);
  });
});

describe('HU-05 Activar o inactivar un rol', () => {
  test('HU-05 E1 inactiva un rol sin usuarios activos, lo registra y deja de ofrecerlo', async () => {
    const creado = await send('post', '/roles', {
      nombre: 'Temporal HU05',
      permisos: await idsPermisos(['vehiculos.ver']),
    });
    const id = creado.body.data.idRol;
    const res = await send('patch', `/roles/${id}/estado`, { estado: 'inactivo' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ idRol: id, estado: 'inactivo' });

    const activos = await get('/roles?estado=activo&limit=100');
    expect(activos.body.data.map((r) => r.idRol)).not.toContain(id);
    const [bitacora] = await pool.query(
      "SELECT valor_anterior, valor_nuevo FROM bitacora WHERE entidad = 'rol' AND id_registro = ? AND accion = 'cambiar_estado'",
      [id]
    );
    expect(bitacora).toEqual([
      { valor_anterior: { estado: 'activo' }, valor_nuevo: { estado: 'inactivo' } },
    ]);
  });

  test('HU-05 E2 rol con usuarios activos → 409 con la cantidad', async () => {
    const supervisor = await rolPorNombre('Supervisor de turno');
    const res = await send('patch', `/roles/${supervisor.idRol}/estado`, { estado: 'inactivo' });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: 'ROL_CON_USUARIOS_ACTIVOS',
      message: 'El rol tiene 1 usuarios activos.',
    });
  });

  test('HU-05 E3 rol base → 409', async () => {
    const clienteRol = await rolPorNombre('Cliente');
    const res = await send('patch', `/roles/${clienteRol.idRol}/estado`, { estado: 'inactivo' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROL_BASE_INMUTABLE');
  });

  test('HU-05 E4 activar un rol inactivo lo vuelve a ofrecer', async () => {
    const auditor = await rolPorNombre('Auditor');
    const res = await send('patch', `/roles/${auditor.idRol}/estado`, { estado: 'activo' });
    expect(res.status).toBe(200);
    const activos = await get('/roles?estado=activo&limit=100');
    expect(activos.body.data.map((r) => r.nombre)).toContain('Auditor');
  });

  test('HU-05 E5 estado inválido → 422; mismo estado → 200 sin nueva bitácora', async () => {
    const auditor = await rolPorNombre('Auditor');
    const invalido = await send('patch', `/roles/${auditor.idRol}/estado`, { estado: 'borrado' });
    expect(invalido.status).toBe(422);
    expect(invalido.body.error.details[0].campo).toBe('estado');

    const [[antes]] = await pool.query('SELECT COUNT(*) AS n FROM bitacora');
    const igual = await send('patch', `/roles/${auditor.idRol}/estado`, { estado: 'activo' });
    expect(igual.status).toBe(200);
    const [[despues]] = await pool.query('SELECT COUNT(*) AS n FROM bitacora');
    expect(despues.n).toBe(antes.n);
  });

  test('HU-05 el Operador no puede cambiar estados (403)', async () => {
    const res = await send('patch', '/roles/5/estado', { estado: 'inactivo' }, operador);
    expect(res.status).toBe(403);
  });
});
