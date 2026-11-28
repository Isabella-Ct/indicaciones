// Pruebas de integración de membresías (spec 010: HU-46, HU-47, HU-48). El reloj del servidor queda fijo
// (research R-09): la suscripción del 16/11/2026 vence el 15/12/2026 y su renovación va del 16/12/2026 al
// 14/01/2027. Cada prueba usa vehículos y clientes propios para poder repetir la suite.
const { pool } = require('../../src/config/db');
const membresias = require('../../src/modules/membresias/membresias.service');
const { app, request, tokenDe, auth } = require('../setup/helpers');
const { crearVehiculo } = require('../setup/infraestructura');
const { crearSede, fijarReloj } = require('../setup/sede');
const { estadia, crearCliente } = require('../setup/cobro');

const SUSCRIPCION = '2026-11-16T10:00:00-05:00';

let admin;
let operador;
let cliente;
let sede;
const planes = {};
beforeAll(async () => {
  [admin, operador, cliente] = await Promise.all([tokenDe('admin'), tokenDe('operador'), tokenDe('cliente')]);
  sede = await crearSede(admin, { carros: 4, motos: 1 });
  const [filas] = await pool.query('SELECT id_plan, nombre FROM plan_membresia');
  for (const f of filas) planes[f.nombre] = f.id_plan;
});
beforeEach(() => fijarReloj(SUSCRIPCION));
afterEach(() => jest.restoreAllMocks());

const api = (metodo, ruta, token = operador) => request(app)[metodo](`/api/v1${ruta}`).set(auth(token));
const EFECTIVO = { metodo: 'efectivo', valorRecibido: 200000 };
const TARJETA = { metodo: 'tarjeta', referencia: 'AUT-90817' };

/** Vehículo nuevo con propietario (o sin él, con `null`). */
async function vehiculoDe(idPropietario, tipo = 'carro') {
  const v = await crearVehiculo(tipo);
  if (idPropietario) await pool.query('UPDATE vehiculo SET id_propietario = ? WHERE id_vehiculo = ?', [idPropietario, v.id]);
  return v;
}

/** Suscribe y devuelve el cuerpo (falla la prueba si no responde 201). */
async function suscribir(idVehiculo, { idPlan = planes['Mensual carro'], pago = TARJETA, token = operador } = {}) {
  const res = await api('post', '/membresias', token).send({ idVehiculo, idPlan, pago });
  if (res.status !== 201) throw new Error(`Suscripción: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data;
}

const contar = async (tabla, idVehiculo) => {
  const sql =
    tabla === 'membresia'
      ? 'SELECT COUNT(*) AS n FROM membresia WHERE id_vehiculo = ?'
      : 'SELECT COUNT(*) AS n FROM factura f JOIN membresia m ON m.id_membresia = f.id_membresia WHERE m.id_vehiculo = ?';
  const [[{ n }]] = await pool.query(sql, [idVehiculo]);
  return Number(n);
};

// ====================================================================== HU-46
describe('HU-46 Suscribir un cliente a un plan', () => {
  test('HU-46 E1 carro sin membresía + «Mensual carro» con pago → activa por 30 días, factura y en el detalle del cliente', async () => {
    const titular = await crearCliente();
    const v = await vehiculoDe(titular.idUsuario);
    const res = await api('post', '/membresias').send({ idVehiculo: v.id, idPlan: planes['Mensual carro'], pago: EFECTIVO });
    expect(res.status).toBe(201);
    expect(res.body.data.membresia).toMatchObject({
      estado: 'activa',
      plan: { idPlan: planes['Mensual carro'], nombre: 'Mensual carro', valorMensual: 180000, diasVigencia: 30 },
      cliente: { idUsuario: titular.idUsuario },
      vehiculo: { idVehiculo: v.id, placa: v.placa, tipo: 'carro' },
      fechaInicio: '2026-11-16',
      fechaFin: '2026-12-15',
      diasRestantes: 30,
      avisoRenovacion: false,
    });
    const { factura } = res.body.data;
    expect(factura).toMatchObject({ total: 180000, estado: 'emitida', membresia: { plan: 'Mensual carro', placa: v.placa, fechaFin: '2026-12-15' } });
    expect(factura.numero).toMatch(/^FV-\d+$/);
    expect(factura.pago).toMatchObject({ metodo: 'efectivo', valorRecibido: 200000, cambio: 20000 });

    const mias = await api('get', '/usuarios/me/membresias', titular.token);
    expect(mias.status).toBe(200);
    expect(mias.body.data.membresias).toHaveLength(1);
    expect(mias.body.data.membresias[0].facturas.map((f) => f.numero)).toEqual([factura.numero]);
    const [[b]] = await pool.query("SELECT accion FROM bitacora WHERE entidad = 'membresia' AND id_registro = ? ORDER BY id_bitacora DESC LIMIT 1", [
      res.body.data.membresia.idMembresia,
    ]);
    expect(b.accion).toBe('suscribir');
  });

  test('HU-46 E2 ya tiene una activa → 409 «El vehículo ya tiene una membresía activa hasta 15/12/2026»', async () => {
    const v = await vehiculoDe(5);
    await suscribir(v.id);
    const res = await api('post', '/membresias').send({ idVehiculo: v.id, idPlan: planes['Trimestral carro'], pago: TARJETA });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'MEMBRESIA_ACTIVA', message: 'El vehículo ya tiene una membresía activa hasta 15/12/2026' });
    expect(await contar('membresia', v.id)).toBe(1);
  });

  test('HU-46 E3 una moto en un plan de carros → 422 en idPlan', async () => {
    const moto = await vehiculoDe(5, 'moto');
    const res = await api('post', '/membresias').send({ idVehiculo: moto.id, idPlan: planes['Mensual carro'], pago: TARJETA });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([{ campo: 'idPlan', mensaje: 'El plan es para carros: el vehículo es una moto.' }]);
    const ok = await suscribir(moto.id, { idPlan: planes['Mensual moto'] });
    expect(ok.membresia.fechaFin).toBe('2026-12-15');
  });

  test('HU-46 E4 pago incompleto (efectivo insuficiente o sin referencia) → 422 y no queda membresía ni factura', async () => {
    const v = await vehiculoDe(5);
    const [[{ antes }]] = await pool.query("SELECT siguiente AS antes FROM consecutivo WHERE clave = 'factura'");
    const corto = await api('post', '/membresias').send({ idVehiculo: v.id, idPlan: planes['Mensual carro'], pago: { metodo: 'efectivo', valorRecibido: 150000 } });
    expect(corto.status).toBe(422);
    expect(corto.body.error.details).toEqual([{ campo: 'pago.valorRecibido', mensaje: 'El valor recibido no alcanza: faltan $ 30.000.' }]);
    const sinReferencia = await api('post', '/membresias').send({ idVehiculo: v.id, idPlan: planes['Mensual carro'], pago: { metodo: 'transferencia' } });
    expect(sinReferencia.status).toBe(422);
    expect(sinReferencia.body.error.details.map((d) => d.campo)).toEqual(['pago.referencia']);
    expect(await contar('membresia', v.id)).toBe(0);
    expect(await contar('factura', v.id)).toBe(0);
    const [[{ despues }]] = await pool.query("SELECT siguiente AS despues FROM consecutivo WHERE clave = 'factura'");
    expect(despues).toBe(antes);
  });

  test('HU-46 E5 vehículo sin propietario → 422; el Cliente con un vehículo ajeno → 403 y con el suyo → 201', async () => {
    const sinDueno = await vehiculoDe(null);
    const res = await api('post', '/membresias').send({ idVehiculo: sinDueno.id, idPlan: planes['Mensual carro'], pago: TARJETA });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([{ campo: 'idVehiculo', mensaje: 'Asocie primero el vehículo a un cliente.' }]);

    const titular = await crearCliente();
    const ajeno = await vehiculoDe(5);
    const prohibido = await api('post', '/membresias', titular.token).send({ idVehiculo: ajeno.id, idPlan: planes['Mensual carro'], pago: TARJETA });
    expect(prohibido.status).toBe(403);
    const propio = await vehiculoDe(titular.idUsuario);
    const creada = await suscribir(propio.id, { token: titular.token });
    expect(creada.membresia.cliente.idUsuario).toBe(titular.idUsuario);
    expect((await api('post', '/membresias').send({ idVehiculo: 99999999, idPlan: planes['Mensual carro'], pago: TARJETA })).status).toBe(422);
    expect((await api('get', '/membresias', titular.token)).status).toBe(403);
  });

  test('listado del personal: búsqueda por placa con días restantes', async () => {
    const v = await vehiculoDe(5);
    const { membresia } = await suscribir(v.id);
    const res = await api('get', `/membresias?q=${v.placa}&estado=activa`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((m) => m.idMembresia)).toEqual([membresia.idMembresia]);
    expect(res.body.data[0]).toMatchObject({ diasRestantes: 30, cliente: { idUsuario: 5 } });
    expect(res.body.meta).toMatchObject({ page: 1, total: 1 });
  });
});

// ====================================================================== HU-47
describe('HU-47 Renovar o cancelar una membresía', () => {
  test('HU-47 E1 la que vence el 15/12/2026 se renueva del 16/12/2026 al 14/01/2027 con su factura', async () => {
    const v = await vehiculoDe(5);
    const { membresia } = await suscribir(v.id);
    fijarReloj('2026-12-10T09:00:00-05:00');
    const res = await api('post', `/membresias/${membresia.idMembresia}/renovacion`).send({ pago: EFECTIVO });
    expect(res.status).toBe(201);
    expect(res.body.data.periodo).toEqual({ desde: '2026-12-16', hasta: '2027-01-14' });
    expect(res.body.data.membresia).toMatchObject({ estado: 'activa', fechaInicio: '2026-11-16', fechaFin: '2027-01-14' });
    expect(res.body.data.factura).toMatchObject({ total: 180000, membresia: { fechaFin: '2027-01-14' } });
    expect(await contar('factura', v.id)).toBe(2);
  });

  test('renovar una vencida empieza hoy (no cubre el hueco)', async () => {
    const v = await vehiculoDe(5);
    const { membresia } = await suscribir(v.id);
    await membresias.vencer('2026-12-20');
    fijarReloj('2026-12-20T09:00:00-05:00');
    const res = await api('post', `/membresias/${membresia.idMembresia}/renovacion`).send({ pago: TARJETA });
    expect(res.status).toBe(201);
    expect(res.body.data.periodo).toEqual({ desde: '2026-12-20', hasta: '2027-01-18' });
    expect(res.body.data.membresia).toMatchObject({ estado: 'activa', fechaInicio: '2026-12-20', fechaFin: '2027-01-18' });
  });

  test('HU-47 E2 cancelada con motivo: las siguientes salidas se liquidan con tarifa normal', async () => {
    const v = await vehiculoDe(5);
    const { membresia } = await suscribir(v.id);
    // Domingo 22/11/2026: sin pico y placa en la semilla.
    const cubierta = await estadia(sede, operador, { minutos: 120, placa: v.placa, inicio: '2026-11-22T09:00:00-05:00' });
    expect(cubierta.liquidacion).toMatchObject({ cubiertoPorMembresia: true, total: 0 });

    fijarReloj('2026-11-22T12:00:00-05:00');
    const res = await api('patch', `/membresias/${membresia.idMembresia}/cancelacion`).send({ motivo: 'El cliente vendió el vehículo' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ estado: 'cancelada', motivoCancelacion: 'El cliente vendió el vehículo', diasRestantes: 0 });

    const normal = await estadia(sede, operador, { minutos: 120, placa: v.placa, inicio: '2026-11-22T13:00:00-05:00' });
    expect(normal.liquidacion.cubiertoPorMembresia).toBe(false);
    expect(normal.liquidacion.total).toBeGreaterThan(0);
  });

  test('HU-47 E3 con la fecha de fin cumplida, el proceso diario la marca vencida', async () => {
    const v = await vehiculoDe(5);
    const { membresia } = await suscribir(v.id);
    await membresias.vencer('2026-12-15');
    let [[m]] = await pool.query('SELECT estado FROM membresia WHERE id_membresia = ?', [membresia.idMembresia]);
    expect(m.estado).toBe('activa');
    expect(await membresias.vencer('2026-12-16')).toBeGreaterThanOrEqual(1);
    [[m]] = await pool.query('SELECT estado FROM membresia WHERE id_membresia = ?', [membresia.idMembresia]);
    expect(m.estado).toBe('vencida');
    const [[b]] = await pool.query("SELECT accion, id_usuario FROM bitacora WHERE entidad = 'membresia' AND id_registro = ? ORDER BY id_bitacora DESC LIMIT 1", [
      membresia.idMembresia,
    ]);
    expect(b).toEqual({ accion: 'vencer', id_usuario: null });
  });

  test('HU-47 E4 cancelada, plan inactivo o motivo corto → 409 o 422; el Cliente no renueva (403)', async () => {
    const v = await vehiculoDe(5);
    const { membresia } = await suscribir(v.id);
    const corto = await api('patch', `/membresias/${membresia.idMembresia}/cancelacion`).send({ motivo: 'Vendido' });
    expect(corto.status).toBe(422);
    expect((await api('post', `/membresias/${membresia.idMembresia}/renovacion`, cliente).send({ pago: TARJETA })).status).toBe(403);
    await api('patch', `/membresias/${membresia.idMembresia}/cancelacion`).send({ motivo: 'Solicitud del cliente en caja' }).expect(200);
    const renovar = await api('post', `/membresias/${membresia.idMembresia}/renovacion`).send({ pago: TARJETA });
    expect(renovar.status).toBe(409);
    expect(renovar.body.error.code).toBe('MEMBRESIA_CANCELADA');
    const otraVez = await api('patch', `/membresias/${membresia.idMembresia}/cancelacion`).send({ motivo: 'Solicitud del cliente en caja' });
    expect(otraVez.status).toBe(409);
    expect(otraVez.body.error.code).toBe('MEMBRESIA_NO_ACTIVA');
    expect((await api('patch', '/membresias/99999999/cancelacion').send({ motivo: 'Solicitud del cliente en caja' })).status).toBe(404);

    // Plan inactivo: no se renueva.
    const [p] = await pool.query("INSERT INTO plan_membresia (nombre, tipo_vehiculo, valor_mensual) VALUES (?, 'carro', 100000)", [`Plan a inactivar ${Date.now()}`]);
    const otro = await vehiculoDe(5);
    const suscrita = await suscribir(otro.id, { idPlan: p.insertId });
    await api('patch', `/planes-membresia/${p.insertId}/estado`, admin).send({ estado: 'inactivo' }).expect(200);
    const sinPlan = await api('post', `/membresias/${suscrita.membresia.idMembresia}/renovacion`).send({ pago: TARJETA });
    expect(sinPlan.status).toBe(409);
    expect(sinPlan.body.error.code).toBe('PLAN_INACTIVO');
  });
});

// ====================================================================== HU-48
describe('HU-48 Consultar mi membresía', () => {
  test('HU-48 E1 con membresía activa: plan, vehículo, inicio, fin, días restantes e historial de pagos', async () => {
    const titular = await crearCliente();
    const v = await vehiculoDe(titular.idUsuario);
    const { membresia, factura } = await suscribir(v.id);
    fijarReloj('2026-12-01T08:00:00-05:00');
    const renovada = await api('post', `/membresias/${membresia.idMembresia}/renovacion`).send({ pago: TARJETA });
    const res = await api('get', '/usuarios/me/membresias', titular.token);
    expect(res.status).toBe(200);
    expect(res.body.data.planesDisponibles).toEqual([]);
    const [mia] = res.body.data.membresias;
    expect(mia).toMatchObject({
      estado: 'activa',
      plan: { nombre: 'Mensual carro' },
      vehiculo: { placa: v.placa },
      fechaInicio: '2026-11-16',
      fechaFin: '2027-01-14',
      diasRestantes: 45,
      avisoRenovacion: false,
    });
    expect(mia.facturas.map((f) => f.numero)).toEqual([renovada.body.data.factura.numero, factura.numero]);
    expect(mia.facturas[0]).toMatchObject({ total: 180000, estado: 'emitida' });
  });

  test('HU-48 E2 sin membresía vigente: ve los planes activos', async () => {
    const titular = await crearCliente();
    const res = await api('get', '/usuarios/me/membresias', titular.token);
    expect(res.status).toBe(200);
    expect(res.body.data.membresias).toEqual([]);
    const nombres = res.body.data.planesDisponibles.map((p) => p.nombre);
    expect(nombres).toEqual(expect.arrayContaining(['Mensual carro', 'Mensual moto', 'Trimestral carro', 'Anual moto']));
    expect(nombres).not.toContain('Mensual carro nocturno');
    expect(res.body.data.planesDisponibles.every((p) => p.estado === 'activo')).toBe(true);
  });

  test('HU-48 E3 a 5 días del vencimiento aparece el aviso de renovación (a 6, no)', async () => {
    const titular = await crearCliente();
    const v = await vehiculoDe(titular.idUsuario);
    await suscribir(v.id);
    fijarReloj('2026-12-10T08:00:00-05:00');
    let [mia] = (await api('get', '/usuarios/me/membresias', titular.token)).body.data.membresias;
    expect(mia).toMatchObject({ diasRestantes: 6, avisoRenovacion: false });
    fijarReloj('2026-12-11T08:00:00-05:00');
    [mia] = (await api('get', '/usuarios/me/membresias', titular.token)).body.data.membresias;
    expect(mia).toMatchObject({ diasRestantes: 5, avisoRenovacion: true });
  });
});
