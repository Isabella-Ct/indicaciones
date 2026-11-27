// Pruebas de integración de entradas y salidas (spec 007: HU-31, HU-33, HU-34, HU-35). Cada bloque usa
// su propia sede y fija el reloj del servidor (RN-16), así no depende del día real ni del pico y placa.
const { pool } = require('../../src/config/db');
const { app, request, tokenDe, auth } = require('../setup/helpers');
const { placaAleatoria } = require('../setup/infraestructura');
const { crearSede, fijarReloj, DOMINGO_10AM, LUNES_8AM } = require('../setup/sede');

let admin;
let operador;
let cliente;
beforeAll(async () => {
  [admin, operador, cliente] = await Promise.all([tokenDe('admin'), tokenDe('operador'), tokenDe('cliente')]);
});
afterEach(() => jest.restoreAllMocks());

const api = (metodo, ruta, token = operador) => request(app)[metodo](`/api/v1${ruta}`).set(auth(token));
const estadoCelda = async (id) => (await pool.query('SELECT estado, id_vehiculo_actual FROM celda WHERE id_celda = ?', [id]))[0][0];

/** Placa de carro cuyo último dígito es `digito`. */
const placaTerminadaEn = (digito) => `${placaAleatoria().slice(0, 5)}${digito}`;

/** Registra un carro existente (creado por la API) y su entrada; devuelve el cuerpo del movimiento. */
async function entrar(sede, cambios = {}) {
  const res = await api('post', '/movimientos').send({ placa: placaAleatoria(), tipo: 'carro', idPuerta: sede.puertas.mixta, ...cambios });
  if (res.status !== 201) throw new Error(`No se registró la entrada: ${JSON.stringify(res.body)}`);
  return res.body.data;
}

// ====================================================================== HU-31
describe('HU-31 Registrar la entrada de un vehículo', () => {
  let sede;
  beforeAll(async () => {
    sede = await crearSede(admin);
  });

  test('HU-31 E1 movimiento abierto con la hora del servidor, celda de menor código y ticket', async () => {
    fijarReloj(DOMINGO_10AM);
    const placa = placaAleatoria();
    await api('post', '/vehiculos').send({ placa, tipo: 'carro', color: 'Rojo', marca: 'Kia', modelo: 2020 });
    const res = await api('post', '/movimientos').send({ placa: placa.toLowerCase(), idPuerta: sede.puertas.mixta });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      estado: 'abierto',
      vehiculo: { placa, tipo: 'carro', ocasional: true },
      celda: { idCelda: sede.celdas.carro[0], codigo: 'C-01' },
      puertaEntrada: { idPuerta: sede.puertas.mixta, nombre: 'Principal' },
      fechaHoraEntrada: '2026-11-29T10:00:00-05:00',
      operadorEntrada: { idUsuario: 2 },
      minutosTranscurridos: 0,
      masDe24h: false,
      ticket: { valido: true, extraviado: false },
    });
    expect(res.body.data.ticket.codigo).toMatch(/^T-\d{6}$/);
    expect(await estadoCelda(sede.celdas.carro[0])).toEqual({ estado: 'ocupada', id_vehiculo_actual: res.body.data.vehiculo.idVehiculo });
    // La celda elegida por el operador también sirve.
    const elegida = await entrar(sede, { idCelda: sede.celdas.carro[2] });
    expect(elegida.celda.codigo).toBe('C-03');
    const [[b]] = await pool.query("SELECT COUNT(*) AS n FROM bitacora WHERE entidad = 'movimiento' AND accion = 'registrar_entrada' AND id_registro = ?", [
      res.body.data.idMovimiento,
    ]);
    expect(b.n).toBe(1);
  });

  test('HU-31 E2 placa restringida por pico y placa → 409, sin ocupar celda y con el intento guardado', async () => {
    fijarReloj(LUNES_8AM);
    const placa = placaTerminadaEn(6);
    const libres = async () => (await pool.query("SELECT COUNT(*) AS n FROM celda WHERE id_parqueadero = ? AND estado = 'disponible'", [sede.idParqueadero]))[0][0].n;
    const antes = await libres();
    const res = await api('post', '/movimientos').send({ placa, tipo: 'carro', idPuerta: sede.puertas.mixta });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'PICO_Y_PLACA', message: 'Vehículo con restricción de pico y placa hoy (dígito 6)' });
    expect(res.body.error.details[0].mensaje).toBe('Pico y placa: carros con placa terminada en 6 o 9, lunes de 05:00 a 20:00.');
    expect(await libres()).toBe(antes);
    const [[rechazo]] = await pool.query('SELECT tipo_vehiculo, id_puerta, motivo, id_operador FROM ingreso_rechazado WHERE placa = ?', [placa]);
    expect(rechazo).toMatchObject({ tipo_vehiculo: 'carro', id_puerta: sede.puertas.mixta, id_operador: 2 });
    expect(rechazo.motivo).toContain('terminada en 6 o 9');
    // La placa no quedó registrada (la transacción se revirtió).
    expect((await pool.query('SELECT COUNT(*) AS n FROM vehiculo WHERE placa = ?', [placa]))[0][0].n).toBe(0);
  });

  test('HU-31 E3 placa con movimiento abierto → 409 con su celda', async () => {
    fijarReloj(DOMINGO_10AM);
    const dentro = await entrar(sede);
    const res = await api('post', '/movimientos').send({ placa: dentro.vehiculo.placa, idPuerta: sede.puertas.entrada });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'VEHICULO_DENTRO', message: `El vehículo ya se encuentra dentro (celda ${dentro.celda.codigo})` });
  });

  test('HU-31 E4 placa no registrada con su tipo → vehículo ocasional; sin tipo → 422', async () => {
    fijarReloj(DOMINGO_10AM);
    const placa = placaAleatoria('moto');
    const sinTipo = await api('post', '/movimientos').send({ placa, idPuerta: sede.puertas.mixta });
    expect(sinTipo.status).toBe(422);
    expect(sinTipo.body.error.details).toEqual([{ campo: 'tipo', mensaje: 'Indique el tipo del vehículo: la placa no está registrada.' }]);
    const res = await api('post', '/movimientos').send({ placa, tipo: 'moto', idPuerta: sede.puertas.mixta });
    expect(res.status).toBe(201);
    expect(res.body.data.vehiculo).toMatchObject({ placa, tipo: 'moto', ocasional: true });
    const [[v]] = await pool.query('SELECT id_propietario, color, marca, modelo FROM vehiculo WHERE placa = ?', [placa]);
    expect(v).toEqual({ id_propietario: null, color: 'Sin registrar', marca: 'Sin registrar', modelo: 2026 });
    // Tipo distinto al registrado o formato inválido → 422.
    expect((await api('post', '/movimientos').send({ placa: 'ABC123', tipo: 'moto', idPuerta: sede.puertas.mixta })).body.error.details[0].mensaje).toBe(
      'La placa ABC123 está registrada como carro.'
    );
    expect((await api('post', '/movimientos').send({ placa: 'AB1234', tipo: 'carro', idPuerta: sede.puertas.mixta })).status).toBe(422);
  });

  test('HU-31 E5 sin celdas de moto disponibles → 409 «Sin celdas disponibles para moto»', async () => {
    fijarReloj(DOMINGO_10AM);
    // La única celda de moto la ocupó la prueba anterior.
    const res = await api('post', '/movimientos').send({ placa: placaAleatoria('moto'), tipo: 'moto', idPuerta: sede.puertas.mixta });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'SIN_CELDAS', message: 'Sin celdas disponibles para moto' });
  });

  test('HU-31 E6 puerta de salida, celda ocupada o de otro tipo → rechazo; Cliente → 403', async () => {
    fijarReloj(DOMINGO_10AM);
    const salida = await api('post', '/movimientos').send({ placa: placaAleatoria(), tipo: 'carro', idPuerta: sede.puertas.salida });
    expect(salida.status).toBe(409);
    expect(salida.body.error.code).toBe('PUERTA_NO_VALIDA');
    const ocupada = await api('post', '/movimientos').send({ placa: placaAleatoria(), tipo: 'carro', idPuerta: sede.puertas.mixta, idCelda: sede.celdas.carro[0] });
    expect(ocupada.body.error.code).toBe('CELDA_NO_DISPONIBLE');
    const otroTipo = await api('post', '/movimientos').send({ placa: placaAleatoria(), tipo: 'carro', idPuerta: sede.puertas.mixta, idCelda: sede.celdas.moto[0] });
    expect(otroTipo.status).toBe(422);
    const otraSede = await api('post', '/movimientos').send({ placa: placaAleatoria(), tipo: 'carro', idPuerta: sede.puertas.mixta, idCelda: 1 });
    expect(otraSede.body.error.details[0].campo).toBe('idCelda');
    expect((await api('post', '/movimientos').send({ placa: placaAleatoria(), tipo: 'carro', idPuerta: 999999 })).status).toBe(422);
    expect((await api('post', '/movimientos', cliente).send({ placa: placaAleatoria(), tipo: 'carro', idPuerta: sede.puertas.mixta })).status).toBe(403);
  });
});

// ====================================================================== HU-33
describe('HU-33 Registrar la salida de un vehículo', () => {
  let sede;
  beforeAll(async () => {
    sede = await crearSede(admin);
  });

  test('HU-33 E1 y E2 entra 08:10 y sale 10:25: cerrado con 135 minutos, celda disponible y mismo movimiento', async () => {
    const reloj = fijarReloj('2026-11-29T08:10:00-05:00');
    const m = await entrar(sede);
    reloj.en('2026-11-29T10:25:00-05:00');
    const res = await api('post', `/movimientos/${m.idMovimiento}/salida`).send({ idPuerta: sede.puertas.mixta });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      idMovimiento: m.idMovimiento,
      estado: 'cerrado',
      vehiculo: { idVehiculo: m.vehiculo.idVehiculo },
      celda: { idCelda: m.celda.idCelda },
      puertaSalida: { idPuerta: sede.puertas.mixta },
      fechaHoraSalida: '2026-11-29T10:25:00-05:00',
      minutosEstadia: 135,
      ticket: { extraviado: false },
      liquidacion: null,
    });
    expect(await estadoCelda(m.celda.idCelda)).toEqual({ estado: 'disponible', id_vehiculo_actual: null });
  });

  test('HU-33 E3 sin movimiento abierto → 404 «El vehículo no tiene una entrada registrada»', async () => {
    fijarReloj(DOMINGO_10AM);
    const m = await entrar(sede);
    await api('post', `/movimientos/${m.idMovimiento}/salida`).send({ idPuerta: sede.puertas.salida });
    const otra = await api('post', `/movimientos/${m.idMovimiento}/salida`).send({ idPuerta: sede.puertas.salida });
    expect(otra.status).toBe(404);
    expect(otra.body.error).toEqual({ code: 'MOVIMIENTO_NO_ABIERTO', message: 'El vehículo no tiene una entrada registrada' });
    expect((await api('post', '/movimientos/999999/salida').send({ idPuerta: sede.puertas.salida })).status).toBe(404);
    const porPlaca = await api('get', `/movimientos?placa=${m.vehiculo.placa}&estado=abierto`);
    expect(porPlaca.body.data).toEqual([]);
  });

  test('HU-33 E4 sin ticket: búsqueda por placa y salida con el ticket marcado extraviado', async () => {
    fijarReloj(DOMINGO_10AM);
    const m = await entrar(sede);
    const encontrado = await api('get', `/movimientos?placa=${m.vehiculo.placa.toLowerCase()}&estado=abierto`);
    expect(encontrado.body.data.map((x) => x.idMovimiento)).toEqual([m.idMovimiento]);
    const res = await api('post', `/movimientos/${m.idMovimiento}/salida`).send({ idPuerta: sede.puertas.mixta, ticketExtraviado: true });
    expect(res.status).toBe(200);
    expect(res.body.data.ticket).toMatchObject({ extraviado: true, valido: true });
  });

  test('HU-33 E5 puerta de solo entrada o de otro parqueadero → 409 y nada cambia', async () => {
    fijarReloj(DOMINGO_10AM);
    const m = await entrar(sede);
    const entrada = await api('post', `/movimientos/${m.idMovimiento}/salida`).send({ idPuerta: sede.puertas.entrada });
    expect(entrada.status).toBe(409);
    expect(entrada.body.error.code).toBe('PUERTA_NO_VALIDA');
    const ajena = await api('post', `/movimientos/${m.idMovimiento}/salida`).send({ idPuerta: 3 });
    expect(ajena.status).toBe(409);
    expect(await estadoCelda(m.celda.idCelda)).toMatchObject({ estado: 'ocupada' });
    expect((await api('post', `/movimientos/${m.idMovimiento}/salida`).send({})).status).toBe(422);
  });
});

// ====================================================================== HU-34
describe('HU-34 Consultar los vehículos dentro del parqueadero', () => {
  let sede;
  let antiguo;
  let reciente;
  beforeAll(async () => {
    sede = await crearSede(admin);
  });

  test('HU-34 E1 abiertos del más antiguo al más reciente con su tiempo transcurrido', async () => {
    const reloj = fijarReloj('2026-11-28T09:00:00-05:00');
    antiguo = await entrar(sede);
    reloj.en('2026-11-29T09:30:00-05:00');
    reciente = await entrar(sede);
    reloj.en('2026-11-29T10:00:00-05:00');
    const res = await api('get', '/movimientos?estado=abierto&limit=100');
    expect(res.status).toBe(200);
    const ids = res.body.data.map((m) => m.idMovimiento);
    expect(ids.indexOf(antiguo.idMovimiento)).toBeLessThan(ids.indexOf(reciente.idMovimiento));
    const fila = res.body.data.find((m) => m.idMovimiento === reciente.idMovimiento);
    expect(fila).toMatchObject({ vehiculo: { placa: reciente.vehiculo.placa, tipo: 'carro' }, celda: { codigo: reciente.celda.codigo }, minutosTranscurridos: 30, masDe24h: false });
    const fechas = res.body.data.map((m) => m.fechaHoraEntrada);
    expect([...fechas].sort()).toEqual(fechas);
  });

  test('HU-34 E2 búsqueda por placa: su movimiento abierto o lista vacía', async () => {
    fijarReloj(DOMINGO_10AM);
    const parte = reciente.vehiculo.placa.slice(1, 5).toLowerCase();
    const res = await api('get', `/movimientos?q=${parte}`);
    expect(res.body.data.map((m) => m.idMovimiento)).toContain(reciente.idMovimiento);
    expect((await api('get', '/movimientos?placa=ZZZ000')).body.data).toEqual([]);
    expect((await api('get', '/movimientos?estado=perdido')).status).toBe(422);
    expect((await api('get', '/movimientos', cliente)).status).toBe(403);
    expect((await request(app).get('/api/v1/movimientos')).status).toBe(401);
  });

  test('HU-34 E3 más de 24 horas dentro → marcado', async () => {
    fijarReloj('2026-11-29T09:00:00-05:00');
    const res = await api('get', '/movimientos?estado=abierto&limit=100');
    const fila = res.body.data.find((m) => m.idMovimiento === antiguo.idMovimiento);
    expect(fila).toMatchObject({ minutosTranscurridos: 1440, masDe24h: true });
    // Los cerrados se consultan aparte, del más reciente al más antiguo.
    expect((await api('get', '/movimientos?estado=cerrado')).status).toBe(200);
  });
});

// ====================================================================== HU-35
describe('HU-35 Anular un registro de entrada erróneo', () => {
  let sede;
  beforeAll(async () => {
    sede = await crearSede(admin);
  });

  test('HU-35 E1 el Operador anula a los 5 minutos: anulado, celda disponible, ticket inválido y datos conservados', async () => {
    const reloj = fijarReloj(DOMINGO_10AM);
    const m = await entrar(sede);
    reloj.sumarMinutos(5);
    const res = await api('patch', `/movimientos/${m.idMovimiento}/anulacion`).send({ motivo: 'Placa mal digitada' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      estado: 'anulado',
      ticket: { valido: false },
      anulacion: { motivo: 'Placa mal digitada', usuario: 'Juan Pérez Álvarez', fecha: '2026-11-29T10:05:00-05:00' },
    });
    expect(await estadoCelda(m.celda.idCelda)).toEqual({ estado: 'disponible', id_vehiculo_actual: null });
    const [[fila]] = await pool.query('SELECT COUNT(*) AS n FROM movimiento WHERE id_movimiento = ?', [m.idMovimiento]);
    expect(fila.n).toBe(1);
    // El vehículo puede volver a entrar.
    expect((await api('post', '/movimientos').send({ placa: m.vehiculo.placa, idPuerta: sede.puertas.mixta })).status).toBe(201);
  });

  test('HU-35 E2 a los 16 minutos el Operador recibe 403; el Administrador sí puede', async () => {
    const reloj = fijarReloj(DOMINGO_10AM);
    const m = await entrar(sede);
    reloj.sumarMinutos(16);
    const operadorTarde = await api('patch', `/movimientos/${m.idMovimiento}/anulacion`).send({ motivo: 'Entrada duplicada por error' });
    expect(operadorTarde.status).toBe(403);
    expect(operadorTarde.body.error.code).toBe('SOLO_ADMIN_ANULA');
    const deAdmin = await api('patch', `/movimientos/${m.idMovimiento}/anulacion`, admin).send({ motivo: 'Entrada duplicada por error' });
    expect(deAdmin.status).toBe(200);
    expect((await api('patch', `/movimientos/${m.idMovimiento}/anulacion`, cliente).send({ motivo: 'Entrada duplicada por error' })).status).toBe(403);
  });

  test('HU-35 E3 sin motivo o con menos de 10 caracteres → 422', async () => {
    fijarReloj(DOMINGO_10AM);
    const m = await entrar(sede);
    for (const cuerpo of [{}, { motivo: 'Error' }, { motivo: 'x'.repeat(201) }]) {
      const res = await api('patch', `/movimientos/${m.idMovimiento}/anulacion`).send(cuerpo);
      expect(res.status).toBe(422);
      expect(res.body.error.details[0].campo).toBe('motivo');
    }
  });

  test('HU-35 E4 un movimiento cerrado o ya anulado no se anula (409); inexistente → 404', async () => {
    fijarReloj(DOMINGO_10AM);
    const m = await entrar(sede);
    await api('post', `/movimientos/${m.idMovimiento}/salida`).send({ idPuerta: sede.puertas.salida });
    const res = await api('patch', `/movimientos/${m.idMovimiento}/anulacion`, admin).send({ motivo: 'Intento sobre un cerrado' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('MOVIMIENTO_NO_ANULABLE');
    expect((await api('patch', '/movimientos/999999/anulacion', admin).send({ motivo: 'Movimiento inexistente' })).status).toBe(404);
  });
});
