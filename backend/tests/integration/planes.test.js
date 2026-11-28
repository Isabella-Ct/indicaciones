// Pruebas de integración de planes de membresía (spec 010: HU-45). Los nombres se generan únicos para que
// la suite se pueda repetir sin reiniciar la base de datos.
const { pool } = require('../../src/config/db');
const { app, request, tokenDe, auth, unico } = require('../setup/helpers');
const { crearVehiculo } = require('../setup/infraestructura');
const { fijarReloj } = require('../setup/sede');

let admin;
let operador;
let cliente;
beforeAll(async () => {
  [admin, operador, cliente] = await Promise.all([tokenDe('admin'), tokenDe('operador'), tokenDe('cliente')]);
});
afterEach(() => jest.restoreAllMocks());

const api = (metodo, ruta, token = admin) => request(app)[metodo](`/api/v1${ruta}`).set(auth(token));
const plan = (cambios = {}) => ({ nombre: unico('Mensual carro'), tipoVehiculo: 'carro', valorMensual: 180000, diasVigencia: 30, beneficios: 'Entradas y salidas ilimitadas', ...cambios });

describe('HU-45 Configurar planes de membresía', () => {
  test('HU-45 E1 «Mensual carro» de $ 180.000 por 30 días queda activo y se lista', async () => {
    const datos = plan();
    const res = await api('post', '/planes-membresia').send(datos);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ ...datos, estado: 'activo', membresiasActivas: 0 });
    const lista = await api('get', `/planes-membresia?estado=activo&q=${encodeURIComponent(datos.nombre)}`);
    expect(lista.status).toBe(200);
    expect(lista.body.data.map((p) => p.idPlan)).toEqual([res.body.data.idPlan]);
    expect(lista.body.meta).toMatchObject({ page: 1, total: 1 });
    const [[b]] = await pool.query("SELECT accion FROM bitacora WHERE entidad = 'plan_membresia' AND id_registro = ? ORDER BY id_bitacora DESC LIMIT 1", [res.body.data.idPlan]);
    expect(b.accion).toBe('crear');
  });

  test('HU-45 E2 nombre repetido → 409 PLAN_DUPLICADO', async () => {
    const datos = plan();
    await api('post', '/planes-membresia').send(datos).expect(201);
    const res = await api('post', '/planes-membresia').send({ ...datos, valorMensual: 99000 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PLAN_DUPLICADO');
  });

  test('HU-45 E3 inactivar un plan con membresías activas: deja de ofrecerse y la vigente se mantiene', async () => {
    fijarReloj('2026-11-16T10:00:00-05:00');
    const creado = (await api('post', '/planes-membresia').send(plan()).expect(201)).body.data;
    const vehiculo = await crearVehiculo('carro');
    await pool.query('UPDATE vehiculo SET id_propietario = 5 WHERE id_vehiculo = ?', [vehiculo.id]);
    const suscrita = await api('post', '/membresias', operador).send({ idVehiculo: vehiculo.id, idPlan: creado.idPlan, pago: { metodo: 'tarjeta', referencia: 'AUT-4455' } });
    expect(suscrita.status).toBe(201);

    const inactivo = await api('patch', `/planes-membresia/${creado.idPlan}/estado`).send({ estado: 'inactivo' });
    expect(inactivo.status).toBe(200);
    expect(inactivo.body.data).toMatchObject({ estado: 'inactivo', membresiasActivas: 1 });
    const [[m]] = await pool.query('SELECT estado FROM membresia WHERE id_membresia = ?', [suscrita.body.data.membresia.idMembresia]);
    expect(m.estado).toBe('activa');

    const otro = await crearVehiculo('carro');
    await pool.query('UPDATE vehiculo SET id_propietario = 5 WHERE id_vehiculo = ?', [otro.id]);
    const nueva = await api('post', '/membresias', operador).send({ idVehiculo: otro.id, idPlan: creado.idPlan, pago: { metodo: 'tarjeta', referencia: 'AUT-4456' } });
    expect(nueva.status).toBe(409);
    expect(nueva.body.error.code).toBe('PLAN_INACTIVO');
    const activos = await api('get', '/planes-membresia?estado=activo&limit=100', cliente);
    expect(activos.status).toBe(200);
    expect(activos.body.data.map((p) => p.idPlan)).not.toContain(creado.idPlan);
  });

  test('HU-45 E4 valores inválidos → 422 por campo; el Operador → 403; se edita valor, días y beneficios', async () => {
    const invalido = await api('post', '/planes-membresia').send(plan({ valorMensual: 0, diasVigencia: 0, nombre: 'AB' }));
    expect(invalido.status).toBe(422);
    expect(invalido.body.error.details.map((d) => d.campo).sort()).toEqual(['diasVigencia', 'nombre', 'valorMensual']);
    expect((await api('post', '/planes-membresia', operador).send(plan())).status).toBe(403);
    expect((await api('post', '/planes-membresia', cliente).send(plan())).status).toBe(403);

    const creado = (await api('post', '/planes-membresia').send(plan())).body.data;
    const editado = await api('put', `/planes-membresia/${creado.idPlan}`).send({ ...plan({ nombre: creado.nombre }), valorMensual: 190000, diasVigencia: 31, beneficios: 'Lavado mensual' });
    expect(editado.status).toBe(200);
    expect(editado.body.data).toMatchObject({ valorMensual: 190000, diasVigencia: 31, beneficios: 'Lavado mensual' });
    const [[b]] = await pool.query("SELECT valor_anterior, valor_nuevo FROM bitacora WHERE entidad = 'plan_membresia' AND accion = 'editar' AND id_registro = ?", [creado.idPlan]);
    expect(b.valor_anterior).toEqual({ valorMensual: 180000, diasVigencia: 30, beneficios: 'Entradas y salidas ilimitadas' });
    expect((await api('put', `/planes-membresia/${creado.idPlan}`, operador).send(plan())).status).toBe(403);
    expect((await api('put', '/planes-membresia/999999').send(plan())).status).toBe(404);
    expect((await api('patch', `/planes-membresia/${creado.idPlan}/estado`).send({ estado: 'borrado' })).status).toBe(422);
  });

  test('la semilla trae 4 planes activos y «Mensual carro nocturno» inactivo; el Operador los consulta', async () => {
    const res = await api('get', '/planes-membresia?limit=100', operador);
    expect(res.status).toBe(200);
    const nombres = res.body.data.map((p) => `${p.nombre}:${p.estado}`);
    expect(nombres).toEqual(expect.arrayContaining(['Mensual carro:activo', 'Mensual moto:activo', 'Trimestral carro:activo', 'Anual moto:activo', 'Mensual carro nocturno:inactivo']));
  });
});
