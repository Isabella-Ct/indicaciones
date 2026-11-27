// Pruebas de integración de celdas (spec 004: HU-20, HU-21, HU-22, HU-23).
const { pool, withTransaction } = require('../../src/config/db');
const celdasService = require('../../src/modules/celdas/celdas.service');
const { app, request, tokenDe, auth } = require('../setup/helpers');
const { crearParqueadero, crearCeldas, crearVehiculo, ocuparPorSql } = require('../setup/infraestructura');

let admin;
let operador;
let cliente;
beforeAll(async () => {
  [admin, operador, cliente] = await Promise.all([tokenDe('admin'), tokenDe('operador'), tokenDe('cliente')]);
});

const api = (metodo, ruta, token = admin) => request(app)[metodo](`/api/v1${ruta}`).set(auth(token));
const estadoDe = async (id) => (await pool.query('SELECT estado, id_vehiculo_actual FROM celda WHERE id_celda = ?', [id]))[0][0];

// ====================================================================== HU-20
describe('HU-20 Registrar celdas de parqueo', () => {
  let id;
  beforeAll(async () => {
    id = await crearParqueadero(admin, { pisos: 3 });
  });

  test('HU-20 E1 crea la celda disponible con el código en mayúsculas', async () => {
    const res = await api('post', '/celdas').send({ idParqueadero: id, codigo: ' a-01 ', tipoVehiculo: 'carro', piso: 1, area: 'a' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ codigo: 'A-01', estado: 'disponible', tipoVehiculo: 'carro', piso: 1, area: 'A', ocupante: null });
  });

  test('HU-20 E2 la misma celda (aun en minúsculas) → 409', async () => {
    const res = await api('post', '/celdas').send({ idParqueadero: id, codigo: 'a-01', tipoVehiculo: 'carro', piso: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'CELDA_DUPLICADA', message: 'La celda ya existe en este parqueadero.' });
  });

  test('HU-20 E3 piso fuera de los pisos del parqueadero → 422', async () => {
    const res = await api('post', '/celdas').send({ idParqueadero: id, codigo: 'A-50', tipoVehiculo: 'carro', piso: 5 });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([{ campo: 'piso', mensaje: 'El parqueadero tiene 3 pisos.' }]);
  });

  test('HU-20 E4 rango M-01..M-20 crea las nuevas e informa las omitidas', async () => {
    await api('post', '/celdas/lote').send({ idParqueadero: id, prefijo: 'M-', desde: 1, hasta: 5, tipoVehiculo: 'moto', piso: 1 });
    const res = await api('post', '/celdas/lote').send({ idParqueadero: id, prefijo: 'm-', desde: 1, hasta: 20, tipoVehiculo: 'moto', piso: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data.omitidas).toEqual(['M-01', 'M-02', 'M-03', 'M-04', 'M-05']);
    expect(res.body.data.creadas).toHaveLength(15);
    expect(res.body.data.creadas[0]).toBe('M-06');
    const malo = await api('post', '/celdas/lote').send({ idParqueadero: id, prefijo: 'X-', desde: 9, hasta: 1, tipoVehiculo: 'moto', piso: 1 });
    expect(malo.status).toBe(422);
  });

  test('HU-20 E5 parqueadero inactivo (409) o inexistente (422); sin permiso (403)', async () => {
    expect((await api('post', '/celdas').send({ idParqueadero: 2, codigo: 'Z-99', tipoVehiculo: 'carro', piso: 1 })).body.error.code).toBe(
      'PARQUEADERO_INACTIVO'
    );
    expect((await api('post', '/celdas').send({ idParqueadero: 9999, codigo: 'Z-99', tipoVehiculo: 'carro', piso: 1 })).status).toBe(422);
    expect((await api('post', '/celdas', operador).send({ idParqueadero: id, codigo: 'Q-1', tipoVehiculo: 'carro', piso: 1 })).status).toBe(403);
  });
});

// ====================================================================== HU-22
describe('HU-22 Ver el mapa de celdas y su estado', () => {
  test('HU-22 E1 celdas por parqueadero y piso con código, tipo y estado', async () => {
    const res = await api('get', '/celdas?parqueadero=1&piso=1&limit=100', operador);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(24);
    expect(res.body.data.every((c) => c.piso === 1 && c.idParqueadero === 1)).toBe(true);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({ codigo: expect.any(String), tipoVehiculo: expect.any(String), estado: expect.any(String) })
    );
  });

  test('HU-22 E2 filtro por tipo moto y estado disponible', async () => {
    const res = await api('get', '/celdas?parqueadero=1&tipo=moto&estado=disponible&limit=100', operador);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((c) => c.tipoVehiculo === 'moto' && c.estado === 'disponible')).toBe(true);
  });

  test('HU-22 E3 el Operador ve placa y hora de entrada de una ocupada; el Cliente no', async () => {
    const id = await crearParqueadero(admin);
    const [celda] = await crearCeldas(admin, id, { cantidad: 1 });
    const vehiculo = await crearVehiculo();
    await ocuparPorSql(celda, vehiculo.id);
    const paraOperador = await api('get', `/celdas/${celda}`, operador);
    expect(paraOperador.body.data.ocupante).toMatchObject({ placa: vehiculo.placa, tipo: 'carro' });
    const paraCliente = await api('get', `/celdas/${celda}`, cliente);
    expect(paraCliente.status).toBe(200);
    expect(paraCliente.body.data.ocupante).toBeNull();
    expect(JSON.stringify(paraCliente.body)).not.toContain(vehiculo.placa);
  });

  test('HU-22 E4 el Cliente consulta las celdas disponibles; inexistente → 404; sin token → 401', async () => {
    const res = await api('get', '/celdas?estado=disponible&limit=100', cliente);
    expect(res.status).toBe(200);
    expect(res.body.data.every((c) => c.estado === 'disponible' && c.ocupante === null)).toBe(true);
    expect((await api('get', '/celdas/999999')).status).toBe(404);
    expect((await request(app).get('/api/v1/celdas')).status).toBe(401);
    expect((await api('get', '/celdas?estado=llena')).status).toBe(422);
  });
});

// ====================================================================== HU-23
describe('HU-23 Actualizar el estado de la celda con cada movimiento', () => {
  let carros;
  let motos;
  beforeAll(async () => {
    const id = await crearParqueadero(admin);
    carros = await crearCeldas(admin, id, { prefijo: 'C-', cantidad: 3 });
    motos = await crearCeldas(admin, id, { prefijo: 'K-', cantidad: 1, tipoVehiculo: 'moto' });
  });

  test('HU-23 E1 al ocupar, la celda pasa a ocupada con el vehículo en la misma transacción', async () => {
    const vehiculo = await crearVehiculo();
    await withTransaction((c) => celdasService.ocupar(c, { idCelda: carros[0], idVehiculo: vehiculo.id, tipoVehiculo: 'carro' }));
    expect(await estadoDe(carros[0])).toEqual({ estado: 'ocupada', id_vehiculo_actual: vehiculo.id });
  });

  test('HU-23 E2 al liberar, la celda pasa a disponible sin vehículo', async () => {
    await withTransaction((c) => celdasService.liberar(c, carros[0]));
    expect(await estadoDe(carros[0])).toEqual({ estado: 'disponible', id_vehiculo_actual: null });
    await expect(withTransaction((c) => celdasService.liberar(c, carros[0]))).rejects.toMatchObject({ code: 'CELDA_NO_OCUPADA' });
  });

  test('HU-23 E3 si la transacción de la entrada falla, la celda conserva su estado', async () => {
    const vehiculo = await crearVehiculo();
    await expect(
      withTransaction(async (c) => {
        await celdasService.ocupar(c, { idCelda: carros[1], idVehiculo: vehiculo.id, tipoVehiculo: 'carro' });
        throw new Error('falla posterior de la entrada');
      })
    ).rejects.toThrow('falla posterior');
    expect(await estadoDe(carros[1])).toEqual({ estado: 'disponible', id_vehiculo_actual: null });
  });

  test('HU-23 E5 celda ocupada, inhabilitada o de otro tipo → 409; un vehículo no ocupa dos celdas', async () => {
    const a = await crearVehiculo();
    const b = await crearVehiculo();
    await withTransaction((c) => celdasService.ocupar(c, { idCelda: carros[1], idVehiculo: a.id, tipoVehiculo: 'carro' }));
    await expect(
      withTransaction((c) => celdasService.ocupar(c, { idCelda: carros[1], idVehiculo: b.id, tipoVehiculo: 'carro' }))
    ).rejects.toMatchObject({ status: 409, code: 'CELDA_NO_DISPONIBLE' });
    await expect(
      withTransaction((c) => celdasService.ocupar(c, { idCelda: motos[0], idVehiculo: b.id, tipoVehiculo: 'carro' }))
    ).rejects.toMatchObject({ code: 'TIPO_CELDA_INCOMPATIBLE' });
    await expect(
      withTransaction((c) => celdasService.ocupar(c, { idCelda: carros[2], idVehiculo: a.id, tipoVehiculo: 'carro' }))
    ).rejects.toMatchObject({ code: 'VEHICULO_EN_OTRA_CELDA' });
    expect(await estadoDe(carros[2])).toEqual({ estado: 'disponible', id_vehiculo_actual: null });
  });

  test('sugerir (RF-MOV-04) devuelve la disponible de menor código del tipo o null', async () => {
    const [[{ id_parqueadero: idParqueadero }]] = await pool.query('SELECT id_parqueadero FROM celda WHERE id_celda = ?', [carros[0]]);
    expect(await withTransaction((c) => celdasService.sugerir(c, { idParqueadero, tipoVehiculo: 'carro' }))).toBe(carros[0]);
    await ocuparPorSql(motos[0], (await crearVehiculo('moto')).id);
    expect(await withTransaction((c) => celdasService.sugerir(c, { idParqueadero, tipoVehiculo: 'moto' }))).toBeNull();
  });
});

// ====================================================================== HU-21
describe('HU-21 Actualizar o inhabilitar una celda', () => {
  let celdas;
  let idParqueadero;
  let placa;
  beforeAll(async () => {
    idParqueadero = await crearParqueadero(admin);
    celdas = await crearCeldas(admin, idParqueadero, { prefijo: 'H-', cantidad: 4 });
    const v = await crearVehiculo();
    placa = v.placa;
    await ocuparPorSql(celdas[3], v.id);
  });

  test('HU-21 E1 inhabilita con motivo y deja de asignarla', async () => {
    const res = await api('patch', `/celdas/${celdas[0]}/estado`).send({ estado: 'inhabilitada', motivo: 'Mantenimiento' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ estado: 'inhabilitada', motivoInhabilitacion: 'Mantenimiento' });
    expect(await withTransaction((c) => celdasService.sugerir(c, { idParqueadero, tipoVehiculo: 'carro' }))).toBe(celdas[1]);
    const sinMotivo = await api('patch', `/celdas/${celdas[1]}/estado`).send({ estado: 'inhabilitada' });
    expect(sinMotivo.status).toBe(422);
    expect(sinMotivo.body.error.details[0].campo).toBe('motivo');
  });

  test('HU-21 E2 una celda ocupada no se inhabilita ni cambia de tipo (409 con la placa)', async () => {
    const inhabilitar = await api('patch', `/celdas/${celdas[3]}/estado`).send({ estado: 'inhabilitada', motivo: 'Daño' });
    expect(inhabilitar.status).toBe(409);
    expect(inhabilitar.body.error).toEqual({ code: 'CELDA_OCUPADA', message: `La celda está ocupada por ${placa}.` });
    const editar = await api('put', `/celdas/${celdas[3]}`).send({ codigo: 'H-04', tipoVehiculo: 'moto', piso: 1 });
    expect(editar.status).toBe(409);
  });

  test('HU-21 E3 al habilitar vuelve a disponible sin motivo', async () => {
    const res = await api('patch', `/celdas/${celdas[0]}/estado`).send({ estado: 'disponible' });
    expect(res.body.data).toMatchObject({ estado: 'disponible', motivoInhabilitacion: null });
  });

  test('HU-21 E4 no se puede marcar a mano como ocupada o reservada (409)', async () => {
    for (const estado of ['ocupada', 'reservada']) {
      const res = await api('patch', `/celdas/${celdas[1]}/estado`).send({ estado });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CAMBIO_ESTADO_NO_PERMITIDO');
    }
    await pool.query("UPDATE celda SET estado = 'reservada' WHERE id_celda = ?", [celdas[2]]);
    expect((await api('patch', `/celdas/${celdas[2]}/estado`).send({ estado: 'disponible' })).body.error.code).toBe('CELDA_RESERVADA');
  });

  test('HU-21 E5 edita código, tipo, piso y área de una celda libre; duplicado → 409; piso inválido → 422', async () => {
    const res = await api('put', `/celdas/${celdas[1]}`).send({ codigo: 'h-20', tipoVehiculo: 'moto', piso: 2, area: 'norte' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ codigo: 'H-20', tipoVehiculo: 'moto', piso: 2, area: 'NORTE' });
    expect((await api('put', `/celdas/${celdas[1]}`).send({ codigo: 'H-01', tipoVehiculo: 'moto', piso: 2 })).status).toBe(409);
    expect((await api('put', `/celdas/${celdas[1]}`).send({ codigo: 'H-20', tipoVehiculo: 'moto', piso: 9 })).status).toBe(422);
    expect((await api('put', `/celdas/${celdas[1]}`, operador).send({ codigo: 'H-20', tipoVehiculo: 'moto', piso: 2 })).status).toBe(403);
  });

  test('HU-21 E6 DELETE inhabilita (no borra)', async () => {
    const res = await api('delete', `/celdas/${celdas[0]}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ estado: 'inhabilitada', motivoInhabilitacion: 'Retirada por el administrador' });
    const [[fila]] = await pool.query('SELECT COUNT(*) AS n FROM celda WHERE id_celda = ?', [celdas[0]]);
    expect(fila.n).toBe(1);
    expect((await api('delete', '/celdas/999999')).status).toBe(404);
  });
});
