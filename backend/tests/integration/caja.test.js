// Pruebas de integración de la caja (spec 009: HU-44). Cada prueba usa un operador nuevo para que su turno
// empiece vacío (los demás archivos cobran con el Operador de la semilla).
const { pool } = require('../../src/config/db');
const { app, request, tokenDe, auth } = require('../setup/helpers');
const { crearSede, fijarReloj } = require('../setup/sede');
const { estadia, crearOperador } = require('../setup/cobro');

let admin;
let sede;
beforeAll(async () => {
  admin = await tokenDe('admin');
  sede = await crearSede(admin, { carros: 10 });
});
afterEach(() => jest.restoreAllMocks());

const api = (metodo, ruta, token) => request(app)[metodo](`/api/v1${ruta}`).set(auth(token));

async function cobrar(token, { minutos, metodo = 'efectivo', referencia } = {}) {
  const salida = await estadia(sede, token, { minutos });
  fijarReloj(salida.fechaHoraSalida);
  const cuerpo = metodo === 'efectivo' ? { metodo, valorRecibido: salida.liquidacion.total } : { metodo, referencia };
  const res = await api('post', '/pagos', token).send({ idMovimiento: salida.idMovimiento, ...cuerpo });
  jest.restoreAllMocks();
  return res.body.data.factura;
}

describe('HU-44 Cuadrar la caja del turno', () => {
  test('HU-44 E1 cuadre: totales por método, servicios y efectivo esperado (sin anuladas)', async () => {
    const op = await crearOperador();
    await cobrar(op, { minutos: 135 }); // 9.000 efectivo
    await cobrar(op, { minutos: 61 }); // 5.000 efectivo
    await cobrar(op, { minutos: 90, metodo: 'tarjeta', referencia: 'AUT-9876' }); // 6.000 tarjeta
    const anulada = await cobrar(op, { minutos: 70 }); // 5.000 efectivo, luego anulada
    await api('patch', `/facturas/${anulada.idFactura}/anulacion`, admin).send({ motivo: 'Cobro duplicado de prueba' });
    const res = await api('get', '/caja/turno-actual', op);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      servicios: 3,
      totalesPorMetodo: { efectivo: 14000, tarjeta: 6000, transferencia: 0, qr: 0 },
      total: 20000,
      efectivoEsperado: 14000,
      anuladas: 1,
    });
    expect(res.body.data.facturas).toHaveLength(4);
  });

  test('HU-44 E2 cierre con la diferencia; los pagos nuevos abren otro turno', async () => {
    const op = await crearOperador();
    await cobrar(op, { minutos: 135 });
    fijarReloj('2026-11-29T18:00:00-05:00');
    const res = await api('post', '/caja/cierres', op).send({ efectivoContado: 8500, observaciones: 'Faltó cambio de $ 500' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ efectivoEsperado: 9000, efectivoContado: 8500, diferencia: -500, finTurno: '2026-11-29T18:00:00-05:00' });
    jest.restoreAllMocks();
    const vacio = await api('get', '/caja/turno-actual', op);
    expect(vacio.body.data).toMatchObject({ servicios: 0, total: 0, inicio: null });
    await cobrar(op, { minutos: 61 });
    const nuevo = await api('get', '/caja/turno-actual', op);
    expect(nuevo.body.data.servicios).toBe(1);
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM pago WHERE id_cierre = ?', [res.body.data.idCierre]);
    expect(n).toBe(1);
  });

  test('HU-44 E3 el Administrador ve los cierres de todos con sus facturas; el Operador solo los suyos', async () => {
    const op1 = await crearOperador();
    const op2 = await crearOperador();
    const f1 = await cobrar(op1, { minutos: 135 });
    await cobrar(op2, { minutos: 135 });
    fijarReloj('2026-11-29T20:00:00-05:00');
    const c1 = (await api('post', '/caja/cierres', op1).send({ efectivoContado: 9000 })).body.data;
    const c2 = (await api('post', '/caja/cierres', op2).send({ efectivoContado: 9000 })).body.data;
    const todos = await api('get', '/caja/cierres?limit=100', admin);
    const ids = todos.body.data.map((c) => c.idCierre);
    expect(ids).toEqual(expect.arrayContaining([c1.idCierre, c2.idCierre]));
    expect(todos.body.data.find((c) => c.idCierre === c1.idCierre).facturas).toEqual([expect.objectContaining({ numero: f1.numero, total: 9000, estado: 'emitida' })]);
    const propios = await api('get', '/caja/cierres?limit=100', op1);
    expect(propios.body.data.map((c) => c.idCierre)).toEqual([c1.idCierre]);
  });

  test('HU-44 E4 cerrar un turno sin pagos → 409; datos inválidos → 422; Cliente → 403', async () => {
    const op = await crearOperador();
    const res = await api('post', '/caja/cierres', op).send({ efectivoContado: 0 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TURNO_SIN_PAGOS');
    expect((await api('post', '/caja/cierres', op).send({ efectivoContado: -1 })).status).toBe(422);
    const cliente = await tokenDe('cliente');
    expect((await api('get', '/caja/turno-actual', cliente)).status).toBe(403);
    expect((await api('post', '/caja/cierres', cliente).send({ efectivoContado: 0 })).status).toBe(403);
  });
});
