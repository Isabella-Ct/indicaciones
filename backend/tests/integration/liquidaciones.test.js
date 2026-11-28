// Pruebas de integración de la liquidación (spec 009: HU-39). Estadías del 29 de noviembre de 2026 (domingo,
// sin pico y placa) con las tarifas de la semilla: carro ocasional $ 4.000 + $ 1.000 / 15 min, tope $ 30.000,
// gracia 10 min.
const { pool } = require('../../src/config/db');
const { app, request, tokenDe, auth } = require('../setup/helpers');
const { placaAleatoria } = require('../setup/infraestructura');
const { crearSede, fijarReloj, DOMINGO_10AM } = require('../setup/sede');
const { estadia, crearMembresia } = require('../setup/cobro');

let admin;
let operador;
let sede;
beforeAll(async () => {
  [admin, operador] = await Promise.all([tokenDe('admin'), tokenDe('operador')]);
  sede = await crearSede(admin, { carros: 8, motos: 3 });
});
afterEach(() => jest.restoreAllMocks());

const api = (metodo, ruta, token = operador) => request(app)[metodo](`/api/v1${ruta}`).set(auth(token));

describe('HU-39 Liquidar el valor del servicio', () => {
  test('HU-39 E1 135 minutos → $ 4.000 + 5 fracciones × $ 1.000 = $ 9.000 con el detalle; se guarda una vez', async () => {
    const salida = await estadia(sede, operador, { minutos: 135 });
    expect(salida.minutosEstadia).toBe(135);
    expect(salida.liquidacion).toMatchObject({
      persistida: true,
      tipoCliente: 'ocasional',
      tarifa: { nombre: 'Carro ocasional', valorPrimeraHora: 4000, minutosFraccion: 15, valorFraccion: 1000, topeDiario: 30000, minutosGracia: 10 },
      minutos: 135,
      fracciones: 5,
      valorBruto: 9000,
      valorDescuento: 0,
      cubiertoPorMembresia: false,
      total: 9000,
      explicacion: '$ 4.000 + 5 fracciones × $ 1.000 = $ 9.000',
      pagada: false,
    });
    const otra = await api('get', `/movimientos/${salida.idMovimiento}/liquidacion`);
    expect(otra.status).toBe(200);
    expect(otra.body.data).toMatchObject({ idLiquidacion: salida.liquidacion.idLiquidacion, total: 9000 });
    const [[n]] = await pool.query('SELECT COUNT(*) AS n FROM liquidacion WHERE id_movimiento = ?', [salida.idMovimiento]);
    expect(n.n).toBe(1);
  });

  test('HU-39 E2 8 minutos con 10 de gracia → $ 0 sin cobro', async () => {
    const salida = await estadia(sede, operador, { minutos: 8 });
    expect(salida.liquidacion).toMatchObject({ total: 0, explicacion: 'Dentro del tiempo de gracia (8 de 10 min): sin cobro' });
  });

  test('HU-39 E3 membresía activa vigente → $ 0 «Cubierto por membresía»', async () => {
    const placa = placaAleatoria();
    fijarReloj(DOMINGO_10AM);
    await api('post', '/vehiculos').send({ placa, tipo: 'carro', color: 'Azul', marca: 'Kia', modelo: 2021, idPropietario: 5 });
    const [[v]] = await pool.query('SELECT id_vehiculo FROM vehiculo WHERE placa = ?', [placa]);
    await crearMembresia({ idVehiculo: v.id_vehiculo, idCliente: 5 });
    jest.restoreAllMocks();
    const salida = await estadia(sede, operador, { minutos: 300, placa, inicio: DOMINGO_10AM });
    expect(salida.liquidacion).toMatchObject({ tipoCliente: 'registrado', cubiertoPorMembresia: true, valorBruto: 0, total: 0, explicacion: 'Cubierto por membresía' });
    expect(salida.liquidacion.tarifa.nombre).toBe('Carro registrado');
  });

  test('HU-39 E4 30 horas no superan el tope por cada 24 horas', async () => {
    const salida = await estadia(sede, operador, { minutos: 30 * 60, inicio: '2026-11-28T04:00:00-05:00' });
    expect(salida.liquidacion).toMatchObject({ dias: 1, topeAplicado: true, total: 54000 });
    expect(salida.liquidacion.explicacion).toBe('1 día × $ 30.000 (tope diario) + $ 4.000 + 20 fracciones × $ 1.000 = $ 54.000');
  });

  test('HU-39 E5 sin tarifa vigente → 409 «No hay tarifa vigente para moto», la salida queda y se alerta al Administrador', async () => {
    // En junio de 2025 no hay tarifa activa (la de 2025 de la semilla está inactiva y es de carros).
    const salida = await estadia(sede, operador, { minutos: 60, tipo: 'moto', placa: placaAleatoria('moto'), inicio: '2025-06-01T10:00:00-05:00' });
    expect(salida.estado).toBe('cerrado');
    expect(salida.liquidacion).toBeNull();
    expect(salida.liquidacionError).toEqual({ code: 'SIN_TARIFA', message: 'No hay tarifa vigente para moto' });
    const res = await api('get', `/movimientos/${salida.idMovimiento}/liquidacion`);
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'SIN_TARIFA', message: 'No hay tarifa vigente para moto' });
    const [alertas] = await pool.query("SELECT mensaje FROM alerta WHERE tipo = 'sin_tarifa' AND referencia = ?", [`movimiento:${salida.idMovimiento}`]);
    expect(alertas).toHaveLength(1);
    expect(alertas[0].mensaje).toContain('moto ocasional');
  });

  test('HU-39 E6 abierto → vista previa sin guardar; anulado → 409; inexistente → 404; Cliente → 403', async () => {
    const reloj = fijarReloj(DOMINGO_10AM);
    const m = (await api('post', '/movimientos').send({ placa: placaAleatoria(), tipo: 'carro', idPuerta: sede.puertas.mixta })).body.data;
    reloj.sumarMinutos(75);
    const previa = await api('get', `/movimientos/${m.idMovimiento}/liquidacion`);
    expect(previa.body.data).toMatchObject({ persistida: false, minutos: 75, total: 5000, idLiquidacion: null });
    const [[n]] = await pool.query('SELECT COUNT(*) AS n FROM liquidacion WHERE id_movimiento = ?', [m.idMovimiento]);
    expect(n.n).toBe(0);
    await api('patch', `/movimientos/${m.idMovimiento}/anulacion`, admin).send({ motivo: 'Entrada de prueba anulada' });
    const anulado = await api('get', `/movimientos/${m.idMovimiento}/liquidacion`);
    expect(anulado.status).toBe(409);
    expect(anulado.body.error.code).toBe('MOVIMIENTO_ANULADO');
    expect((await api('get', '/movimientos/999999/liquidacion')).status).toBe(404);
    expect((await api('get', `/movimientos/${m.idMovimiento}/liquidacion`, await tokenDe('cliente'))).status).toBe(403);
  });
});
