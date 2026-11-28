// Pruebas de integración del pago (spec 009: HU-40). Cada pago crea su factura numerada en la misma transacción.
const { pool } = require('../../src/config/db');
const { app, request, tokenDe, auth } = require('../setup/helpers');
const { placaAleatoria } = require('../setup/infraestructura');
const { crearSede, fijarReloj, DOMINGO_10AM } = require('../setup/sede');
const { estadia } = require('../setup/cobro');

let admin;
let operador;
let cliente;
let sede;
beforeAll(async () => {
  [admin, operador, cliente] = await Promise.all([tokenDe('admin'), tokenDe('operador'), tokenDe('cliente')]);
  sede = await crearSede(admin, { carros: 10 });
});
afterEach(() => jest.restoreAllMocks());

const pagar = (cuerpo, token = operador) => request(app).post('/api/v1/pagos').set(auth(token)).send(cuerpo);

describe('HU-40 Registrar el pago del servicio', () => {
  test('HU-40 E1 efectivo: $ 10.000 sobre $ 9.000 → cambio $ 1.000 y factura numerada', async () => {
    const salida = await estadia(sede, operador, { minutos: 135 });
    fijarReloj('2026-11-29T10:26:00-05:00');
    const res = await pagar({ idMovimiento: salida.idMovimiento, metodo: 'efectivo', valorRecibido: 10000 });
    expect(res.status).toBe(201);
    expect(res.body.data.pago).toMatchObject({ metodo: 'efectivo', valor: 9000, valorRecibido: 10000, cambio: 1000, referencia: null, fecha: '2026-11-29T10:26:00-05:00' });
    expect(res.body.data.factura).toMatchObject({ estado: 'emitida', total: 9000, electronica: { estado: 'pendiente', cufe: null } });
    expect(res.body.data.factura.numero).toMatch(/^FV-\d{6}$/);
    const [[p]] = await pool.query('SELECT id_cierre, id_operador FROM pago WHERE id_pago = ?', [res.body.data.pago.idPago]);
    expect(p).toEqual({ id_cierre: null, id_operador: 2 });
    // La liquidación queda pagada.
    const liq = await request(app).get(`/api/v1/movimientos/${salida.idMovimiento}/liquidacion`).set(auth(operador));
    expect(liq.body.data).toMatchObject({ pagada: true, idFactura: res.body.data.factura.idFactura });
  });

  test('HU-40 E2 tarjeta, transferencia o QR exigen la referencia (4–40)', async () => {
    const salida = await estadia(sede, operador, { minutos: 61 });
    for (const metodo of ['tarjeta', 'transferencia', 'qr']) {
      const res = await pagar({ idMovimiento: salida.idMovimiento, metodo });
      expect(res.status).toBe(422);
      expect(res.body.error.details).toEqual([{ campo: 'referencia', mensaje: 'Ingrese el número de referencia o autorización (4 a 40 caracteres).' }]);
    }
    expect((await pagar({ idMovimiento: salida.idMovimiento, metodo: 'tarjeta', referencia: '123' })).status).toBe(422);
    const ok = await pagar({ idMovimiento: salida.idMovimiento, metodo: 'tarjeta', referencia: 'AUT-55821' });
    expect(ok.status).toBe(201);
    expect(ok.body.data.pago).toMatchObject({ metodo: 'tarjeta', valor: 5000, referencia: 'AUT-55821', cambio: null });
  });

  test('HU-40 E3 efectivo menor que el total → 422 con el faltante y sin pago', async () => {
    const salida = await estadia(sede, operador, { minutos: 135 });
    const res = await pagar({ idMovimiento: salida.idMovimiento, metodo: 'efectivo', valorRecibido: 8000 });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([{ campo: 'valorRecibido', mensaje: 'El valor recibido no alcanza: faltan $ 1.000.' }]);
    expect((await pagar({ idMovimiento: salida.idMovimiento, metodo: 'efectivo' })).body.error.details[0].campo).toBe('valorRecibido');
    const [[n]] = await pool.query('SELECT COUNT(*) AS n FROM factura f JOIN liquidacion l ON l.id_liquidacion = f.id_liquidacion WHERE l.id_movimiento = ?', [salida.idMovimiento]);
    expect(n.n).toBe(0);
  });

  test('HU-40 E4 un segundo pago → 409 «El servicio ya fue pagado»; la numeración no tiene huecos', async () => {
    const salida = await estadia(sede, operador, { minutos: 135 });
    const primero = await pagar({ idMovimiento: salida.idMovimiento, metodo: 'efectivo', valorRecibido: 9000 });
    const segundo = await pagar({ idMovimiento: salida.idMovimiento, metodo: 'efectivo', valorRecibido: 9000 });
    expect(segundo.status).toBe(409);
    expect(segundo.body.error).toEqual({ code: 'YA_PAGADO', message: 'El servicio ya fue pagado' });
    // El siguiente pago toma el número siguiente (el rechazo no consumió ninguno).
    const otra = await estadia(sede, operador, { minutos: 30 });
    const tercero = await pagar({ idMovimiento: otra.idMovimiento, metodo: 'qr', referencia: 'QR-778899' });
    expect(Number(tercero.body.data.factura.numero.slice(3))).toBe(Number(primero.body.data.factura.numero.slice(3)) + 1);
  });

  test('HU-40 E5 abierto → 409; total $ 0 admite un comprobante en $ 0; Cliente → 403; inexistente → 404', async () => {
    const reloj = fijarReloj(DOMINGO_10AM);
    const abierto = (await request(app).post('/api/v1/movimientos').set(auth(operador)).send({ placa: placaAleatoria(), tipo: 'carro', idPuerta: sede.puertas.mixta })).body.data;
    reloj.sumarMinutos(30);
    const res = await pagar({ idMovimiento: abierto.idMovimiento, metodo: 'efectivo', valorRecibido: 5000 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('MOVIMIENTO_NO_CERRADO');
    const gratis = await estadia(sede, operador, { minutos: 5 });
    const cero = await pagar({ idMovimiento: gratis.idMovimiento, metodo: 'efectivo', valorRecibido: 0 });
    expect(cero.status).toBe(201);
    expect(cero.body.data.factura.total).toBe(0);
    expect((await pagar({ idMovimiento: gratis.idMovimiento, metodo: 'efectivo', valorRecibido: 0 }, cliente)).status).toBe(403);
    expect((await pagar({ idMovimiento: 999999, metodo: 'efectivo', valorRecibido: 0 })).status).toBe(404);
    expect((await pagar({ idMovimiento: gratis.idMovimiento, metodo: 'bitcoin' })).status).toBe(422);
  });
});
