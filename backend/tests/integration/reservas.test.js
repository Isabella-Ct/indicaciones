// Pruebas de integración de reservas (spec 012: HU-52..HU-55). El reloj del servidor queda fijo el viernes
// 27/11/2026 a las 10:00 y las reservas son para el sábado 28/11/2026 (sin pico y placa), cada prueba en su propia
// hora y en una sede propia, para no tocar las celdas de la semilla (research R-09). El control de cada minuto se
// llama directamente con `controlar(ahora)`.
const { pool } = require('../../src/config/db');
const reservas = require('../../src/modules/reservas/reservas.service');
const { bandejaMemoria, vaciarBandeja } = require('../../src/integrations/correo');
const { app, request, tokenDe, auth } = require('../setup/helpers');
const { crearVehiculo } = require('../setup/infraestructura');
const { crearSede, fijarReloj } = require('../setup/sede');
const { crearCliente } = require('../setup/cobro');

const VIERNES = '2026-11-27T10:00:00-05:00';
const sabado = (hora) => `2026-11-28T${hora}`;
const enBogota = (hora) => new Date(`${sabado(hora)}:00-05:00`);

let admin;
let operador;
let sede;
beforeAll(async () => {
  [admin, operador] = await Promise.all([tokenDe('admin'), tokenDe('operador')]);
  sede = await crearSede(admin, { carros: 8, motos: 1 });
});
beforeEach(() => {
  fijarReloj(VIERNES);
  vaciarBandeja();
});
afterEach(() => jest.restoreAllMocks());

const api = (metodo, ruta, token = operador) => request(app)[metodo](`/api/v1${ruta}`).set(auth(token));
const [C1, C2, C3, C4, C5, C6, C7] = [0, 1, 2, 3, 4, 5, 6].map((i) => () => sede.celdas.carro[i]);

/** Vehículo nuevo con propietario (o sin él, con `null`). */
async function vehiculoDe(idPropietario, tipo = 'carro') {
  const v = await crearVehiculo(tipo);
  if (idPropietario) await pool.query('UPDATE vehiculo SET id_propietario = ? WHERE id_vehiculo = ?', [idPropietario, v.id]);
  return v;
}

/** Reserva (201) y devuelve el cuerpo. */
async function reservar(token, cuerpo) {
  const res = await api('post', '/reservas', token).send({ idParqueadero: sede.idParqueadero, ...cuerpo });
  if (res.status !== 201) throw new Error(`Reserva: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data;
}

const estadoDe = async (tabla, id) => {
  const [[f]] = await pool.query(`SELECT estado FROM ${tabla} WHERE id_${tabla} = ?`, [id]);
  return f.estado;
};

// ====================================================================== HU-52
describe('HU-52 Reservar una celda', () => {
  test('HU-52 E1 mañana a las 08:00 en una celda libre: confirmada con código y aviso por correo', async () => {
    const titular = await crearCliente();
    const v = await vehiculoDe(titular.idUsuario);
    const res = await api('post', '/reservas', titular.token).send({ idVehiculo: v.id, fechaHoraInicio: sabado('08:00'), idCelda: C1() });
    expect(res.status).toBe(201);
    const r = res.body.data;
    expect(r).toMatchObject({
      estado: 'confirmada',
      fechaHoraInicio: '2026-11-28T08:00:00-05:00',
      minutosEspera: 30,
      finEspera: '2026-11-28T08:30:00-05:00',
      cliente: { idUsuario: titular.idUsuario },
      vehiculo: { idVehiculo: v.id, placa: v.placa },
      celda: { idCelda: C1() },
      idMovimiento: null,
    });
    expect(r.codigo).toMatch(/^R-\d{6}$/);
    expect(r).not.toHaveProperty('_correo');
    const [correo] = bandejaMemoria();
    expect(correo.asunto).toBe(`PARKO · Reserva ${r.codigo} confirmada`);
    expect(correo.texto).toContain(v.placa);
    const [[n]] = await pool.query("SELECT tipo, enviada FROM notificacion WHERE id_usuario = ? ORDER BY id_notificacion DESC LIMIT 1", [titular.idUsuario]);
    expect(n).toEqual({ tipo: 'reserva', enviada: 1 });
    const [[b]] = await pool.query("SELECT accion FROM bitacora WHERE entidad = 'reserva' AND id_registro = ?", [r.idReserva]);
    expect(b.accion).toBe('reservar');
  });

  test('HU-52 E2 celda reservada en esa franja → 409 «La celda no está disponible en ese horario» con otra sugerida', async () => {
    const res = await api('post', '/reservas').send({ idVehiculo: (await vehiculoDe(5)).id, fechaHoraInicio: sabado('08:20'), idCelda: C1() });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'CELDA_NO_DISPONIBLE', message: 'La celda no está disponible en ese horario' });
    expect(res.body.error.details[0].sugerida.idCelda).toBe(C2());
    // Sin celda elegida, el sistema asigna la libre de menor código; a las 08:31 la primera ya está libre.
    const asignada = await reservar(operador, { idVehiculo: (await vehiculoDe(5)).id, fechaHoraInicio: sabado('08:20') });
    expect(asignada.celda.idCelda).toBe(C2());
    const despues = await reservar(operador, { idVehiculo: (await vehiculoDe(5)).id, fechaHoraInicio: sabado('08:31') });
    expect(despues.celda.idCelda).toBe(C1());
    const libres = await api('get', `/celdas/disponibles?fecha=${sabado('08:10')}&tipo=carro&idParqueadero=${sede.idParqueadero}`);
    expect(libres.status).toBe(200);
    expect(libres.body.data.map((c) => c.idCelda)).not.toEqual(expect.arrayContaining([C1(), C2()]));
    expect(libres.body.data.map((c) => c.idCelda)).toContain(C3());
  });

  test('HU-52 E3 fecha pasada, a más de 7 días o mal escrita → 422', async () => {
    const id = (await vehiculoDe(5)).id;
    const pasada = await api('post', '/reservas').send({ idVehiculo: id, fechaHoraInicio: '2026-11-27T09:00' });
    expect(pasada.body.error.details).toEqual([{ campo: 'fechaHoraInicio', mensaje: 'La hora de inicio debe ser futura.' }]);
    const lejana = await api('post', '/reservas').send({ idVehiculo: id, fechaHoraInicio: '2026-12-04T10:30' });
    expect(lejana.status).toBe(422);
    expect(lejana.body.error.details[0].mensaje).toBe('La reserva debe ser para los próximos 7 días.');
    expect((await api('post', '/reservas').send({ idVehiculo: id, fechaHoraInicio: '28/11/2026 08:00' })).status).toBe(422);
  });

  test('HU-52 E4 un cliente sin vehículos no tiene con qué reservar', async () => {
    const titular = await crearCliente();
    const vehiculos = await api('get', '/usuarios/me/vehiculos', titular.token);
    expect(vehiculos.body.data).toEqual([]);
    const res = await api('post', '/reservas', titular.token).send({ idVehiculo: 99999999, fechaHoraInicio: sabado('08:00') });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([{ campo: 'idVehiculo', mensaje: 'El vehículo no existe.' }]);
  });

  test('HU-52 E5 ajeno → 403; sin propietario → 422; el vehículo con otra reserva cruzada → 409; celda de otro tipo → 422', async () => {
    const titular = await crearCliente();
    const ajeno = await vehiculoDe(5);
    expect((await api('post', '/reservas', titular.token).send({ idVehiculo: ajeno.id, fechaHoraInicio: sabado('09:00') })).status).toBe(403);
    const sinDueno = await vehiculoDe(null);
    const r1 = await api('post', '/reservas').send({ idVehiculo: sinDueno.id, fechaHoraInicio: sabado('09:00') });
    expect(r1.body.error.details).toEqual([{ campo: 'idVehiculo', mensaje: 'Asocie primero el vehículo a un cliente.' }]);
    const primera = await reservar(operador, { idVehiculo: ajeno.id, fechaHoraInicio: sabado('09:00'), idCelda: C4() });
    const cruzada = await api('post', '/reservas').send({ idVehiculo: ajeno.id, idParqueadero: sede.idParqueadero, fechaHoraInicio: sabado('09:20') });
    expect(cruzada.status).toBe(409);
    expect(cruzada.body.error).toMatchObject({ code: 'RESERVA_VEHICULO_CRUZADA', message: `El vehículo ${ajeno.placa} ya tiene la reserva ${primera.codigo} en ese horario.` });
    const otroTipo = await api('post', '/reservas').send({ idVehiculo: (await vehiculoDe(5)).id, fechaHoraInicio: sabado('09:00'), idCelda: sede.celdas.moto[0] });
    expect(otroTipo.status).toBe(422);
    expect(otroTipo.body.error.details[0].campo).toBe('idCelda');
    expect((await api('get', '/celdas/disponibles?fecha=2026-11-28T09:00')).status).toBe(422);
  });
});

// ====================================================================== HU-53
describe('HU-53 Cancelar mi reserva', () => {
  test('HU-53 E1 confirmada que aún no inicia: cancelada, la celda libre en esa franja y aviso por correo', async () => {
    const titular = await crearCliente();
    const v = await vehiculoDe(titular.idUsuario);
    const r = await reservar(titular.token, { idVehiculo: v.id, fechaHoraInicio: sabado('10:00'), idCelda: C5() });
    vaciarBandeja();
    const res = await api('patch', `/reservas/${r.idReserva}/cancelacion`, titular.token);
    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe('cancelada');
    expect(bandejaMemoria()[0].asunto).toBe(`PARKO · Reserva ${r.codigo} cancelada`);
    const libres = await api('get', `/celdas/disponibles?fecha=${sabado('10:00')}&tipo=carro&idParqueadero=${sede.idParqueadero}`, titular.token);
    expect(libres.body.data.map((c) => c.idCelda)).toContain(C5());
    const mias = await api('get', '/usuarios/me/reservas', titular.token);
    expect(mias.body.data.map((x) => [x.codigo, x.estado])).toEqual([[r.codigo, 'cancelada']]);
  });

  test('HU-53 E2 cumplida, vencida, cancelada o ya iniciada → 409', async () => {
    const r = await reservar(operador, { idVehiculo: (await vehiculoDe(5)).id, fechaHoraInicio: sabado('15:00'), idCelda: C6() });
    fijarReloj('2026-11-28T15:05:00-05:00');
    const iniciada = await api('patch', `/reservas/${r.idReserva}/cancelacion`);
    expect(iniciada.status).toBe(409);
    expect(iniciada.body.error.code).toBe('RESERVA_INICIADA');
    await reservas.controlar(enBogota('15:31'));
    const vencida = await api('patch', `/reservas/${r.idReserva}/cancelacion`);
    expect(vencida.status).toBe(409);
    expect(vencida.body.error).toMatchObject({ code: 'RESERVA_NO_CANCELABLE', message: 'La reserva está vencida: no se puede cancelar.' });
    expect((await api('patch', '/reservas/99999999/cancelacion')).status).toBe(404);
  });

  test('HU-53 E3 la reserva de otro cliente → 403; el personal puede cancelarla', async () => {
    const titular = await crearCliente();
    const otro = await crearCliente();
    const r = await reservar(titular.token, { idVehiculo: (await vehiculoDe(titular.idUsuario)).id, fechaHoraInicio: sabado('16:00') });
    expect((await api('patch', `/reservas/${r.idReserva}/cancelacion`, otro.token)).status).toBe(403);
    expect((await api('get', '/usuarios/me/reservas', otro.token)).body.data).toEqual([]);
    expect((await api('patch', `/reservas/${r.idReserva}/cancelacion`)).status).toBe(200);
  });
});

// ====================================================================== HU-54
describe('HU-54 Consultar las reservas del día', () => {
  test('HU-54 E1 y E2 las del día ordenadas por hora con código, placa, cliente, celda y estado; filtro confirmada', async () => {
    // Una pendiente propia (el control de otras pruebas ya venció las anteriores) y una cancelada.
    const pendiente = await reservar(operador, { idVehiculo: (await vehiculoDe(5)).id, fechaHoraInicio: sabado('20:00') });
    const res = await api('get', '/reservas?fecha=2026-11-28&limit=100');
    expect(res.status).toBe(200);
    const horas = res.body.data.map((r) => r.fechaHoraInicio);
    expect(horas).toEqual([...horas].sort());
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({ codigo: expect.any(String), vehiculo: expect.objectContaining({ placa: expect.any(String) }), cliente: expect.any(Object), celda: expect.any(Object) })
    );
    expect(res.body.meta.fecha).toBe('2026-11-28');
    const confirmadas = await api('get', '/reservas?fecha=2026-11-28&estado=confirmada&limit=100');
    expect(confirmadas.body.data.map((r) => r.codigo)).toContain(pendiente.codigo);
    expect(confirmadas.body.data.every((r) => r.estado === 'confirmada')).toBe(true);
    expect(confirmadas.body.data.length).toBeLessThan(res.body.data.length);
    const hoy = await api('get', '/reservas');
    expect(hoy.body.meta.fecha).toBe('2026-11-27');
    expect((await api('get', '/reservas', (await crearCliente()).token)).status).toBe(403);
  });
});

// ====================================================================== HU-55
describe('HU-55 Cumplir o vencer una reserva', () => {
  const entrar = (placa, cambios = {}) => api('post', '/movimientos').send({ placa, idPuerta: sede.puertas.mixta, ...cambios });
  const salir = (idMovimiento) => api('post', `/movimientos/${idMovimiento}/salida`).send({ idPuerta: sede.puertas.mixta });

  test('HU-55 E1 la entrada a las 08:10 de una reserva de las 08:00 usa la celda reservada y la cumple', async () => {
    const v = await vehiculoDe(5);
    const r = await reservar(operador, { idVehiculo: v.id, fechaHoraInicio: sabado('11:00'), idCelda: C7() });
    expect(await reservas.controlar(enBogota('11:00'))).toMatchObject({ activadas: expect.any(Number) });
    expect(await estadoDe('celda', C7())).toBe('reservada');
    fijarReloj('2026-11-28T11:10:00-05:00');
    const entrada = await entrar(v.placa, { idCelda: C3() });
    expect(entrada.status).toBe(201);
    expect(entrada.body.data).toMatchObject({ celda: { idCelda: C7() }, reserva: { idReserva: r.idReserva, codigo: r.codigo } });
    const [[fila]] = await pool.query('SELECT estado, id_movimiento FROM reserva WHERE id_reserva = ?', [r.idReserva]);
    expect(fila).toEqual({ estado: 'cumplida', id_movimiento: entrada.body.data.idMovimiento });
    expect(await estadoDe('celda', C7())).toBe('ocupada');
    await salir(entrada.body.data.idMovimiento).expect(200);
  });

  test('HU-55 E2 sin llegada antes del fin de la espera: vencida, la celda libre y aviso al cliente', async () => {
    const titular = await crearCliente();
    const r = await reservar(titular.token, { idVehiculo: (await vehiculoDe(titular.idUsuario)).id, fechaHoraInicio: sabado('12:00'), idCelda: C1() });
    await reservas.controlar(enBogota('12:00'));
    expect(await estadoDe('celda', C1())).toBe('reservada');
    await reservas.controlar(enBogota('12:30'));
    expect(await estadoDe('reserva', r.idReserva)).toBe('confirmada');
    vaciarBandeja();
    const resultado = await reservas.controlar(enBogota('12:31'));
    expect(resultado.vencidas).toBeGreaterThanOrEqual(1);
    expect(await estadoDe('reserva', r.idReserva)).toBe('vencida');
    expect(await estadoDe('celda', C1())).toBe('disponible');
    expect(bandejaMemoria().map((c) => c.asunto)).toContain(`PARKO · Reserva ${r.codigo} vencida`);
    const [[b]] = await pool.query("SELECT accion, id_usuario FROM bitacora WHERE entidad = 'reserva' AND id_registro = ? ORDER BY id_bitacora DESC LIMIT 1", [r.idReserva]);
    expect(b).toEqual({ accion: 'vencer', id_usuario: null });
  });

  test('HU-55 E3 la celda reservada desde el inicio no se ofrece a otro vehículo', async () => {
    const r = await reservar(operador, { idVehiculo: (await vehiculoDe(5)).id, fechaHoraInicio: sabado('13:00'), idCelda: C1() });
    await reservas.controlar(enBogota('13:00'));
    fijarReloj('2026-11-28T13:05:00-05:00');
    const otro = await vehiculoDe(5);
    const elegida = await entrar(otro.placa, { idCelda: C1() });
    expect(elegida.status).toBe(409);
    expect(elegida.body.error.code).toBe('CELDA_NO_DISPONIBLE');
    const asignada = await entrar(otro.placa);
    expect(asignada.status).toBe(201);
    expect(asignada.body.data.celda.idCelda).not.toBe(C1());
    expect(asignada.body.data.reserva).toBeNull();
    expect(await estadoDe('reserva', r.idReserva)).toBe('confirmada');
    await salir(asignada.body.data.idMovimiento).expect(200);
  });

  test('si la celda está ocupada al iniciar la franja, la reserva pasa a otra libre y se avisa', async () => {
    const titular = await crearCliente();
    const r = await reservar(titular.token, { idVehiculo: (await vehiculoDe(titular.idUsuario)).id, fechaHoraInicio: sabado('14:00'), idCelda: C2() });
    fijarReloj('2026-11-28T13:50:00-05:00');
    const intruso = await entrar((await vehiculoDe(5)).placa, { idCelda: C2() });
    expect(intruso.status).toBe(201);
    vaciarBandeja();
    const resultado = await reservas.controlar(enBogota('14:00'));
    expect(resultado.reasignadas).toBe(1);
    const [[fila]] = await pool.query('SELECT id_celda FROM reserva WHERE id_reserva = ?', [r.idReserva]);
    expect(fila.id_celda).not.toBe(C2());
    expect(await estadoDe('celda', fila.id_celda)).toBe('reservada');
    expect(bandejaMemoria().map((c) => c.asunto)).toContain(`PARKO · Reserva ${r.codigo}: nueva celda`);
    await salir(intruso.body.data.idMovimiento).expect(200);
    await reservas.controlar(enBogota('14:31'));
    expect(await estadoDe('celda', fila.id_celda)).toBe('disponible');
  });
});
