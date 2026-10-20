// Fase 3 — pico y placa, entradas, salidas y tickets. Requiere `npm run db:reset`.
// Para que el resultado no dependa del día ni de la hora, las reglas de pico y placa
// de la semilla se desactivan durante la prueba; todo se restaura al final.
const request = require('supertest');
const { crearApp } = require('../src/app');
const { pool } = require('../src/config/db');
const { enBogota } = require('../src/utils/fechas');

const app = crearApp();

const ADMIN = { tipo_documento: 'CC', numero_documento: '1000000001', contrasena: 'Admin2026*' };
const OPERADOR = {
  tipo_documento: 'CC',
  numero_documento: '1000000002',
  contrasena: 'Operador2026*',
};
const CLIENTE = {
  tipo_documento: 'CC',
  numero_documento: '1000000004',
  contrasena: 'Cliente2026*',
};
const NORTE = 1;
const SUR = 2;

let admin;
let operador;
let cliente;
const antes = {};
const ids = { celdas: {}, vehiculos: {} };
const estadias = {};

async function iniciarSesion(credenciales) {
  const agente = request.agent(app);
  expect((await agente.post('/api/v1/auth/login').send(credenciales)).status).toBe(200);
  return agente;
}

/** Entrada multipart, como la envía el modal. */
function entrada(agente, campos) {
  const req = agente.post('/api/v1/estadias/entrada');
  for (const [k, v] of Object.entries({ puerta_id: NORTE, ...campos })) req.field(k, String(v));
  return req;
}

const maxId = async (tabla) =>
  (await pool.query(`SELECT COALESCE(MAX(id), 0) AS m FROM ${tabla}`))[0][0].m;
const celda = async (codigo) =>
  (await pool.query('SELECT * FROM celdas WHERE codigo = ?', [codigo]))[0][0];

beforeAll(async () => {
  admin = await iniciarSesion(ADMIN);
  operador = await iniciarSesion(OPERADOR);
  cliente = await iniciarSesion(CLIENTE);
  for (const tabla of [
    'estadias',
    'lecturas_placa',
    'accesos_denegados',
    'notificaciones',
    'reservas',
    'pico_placa',
  ]) {
    antes[tabla] = await maxId(tabla);
  }
  [antes.celdas] = await pool.query(
    'SELECT id, codigo, estado, vehiculo_actual_id, nota FROM celdas'
  );
  antes.celdas.forEach((c) => (ids.celdas[c.codigo] = c.id));
  const [vs] = await pool.query('SELECT id, placa FROM vehiculos');
  vs.forEach((v) => (ids.vehiculos[v.placa] = v.id));
  [antes.reglasActivas] = await pool.query('SELECT id FROM pico_placa WHERE activa = 1');
  await pool.query('UPDATE pico_placa SET activa = 0');
});

afterAll(async () => {
  await pool.query('DELETE FROM lecturas_placa WHERE id > ?', [antes.lecturas_placa]);
  await pool.query('DELETE FROM estadias WHERE id > ?', [antes.estadias]);
  await pool.query('DELETE FROM reservas WHERE id > ?', [antes.reservas]);
  await pool.query('DELETE FROM accesos_denegados WHERE id > ?', [antes.accesos_denegados]);
  await pool.query('DELETE FROM notificaciones WHERE id > ?', [antes.notificaciones]);
  await pool.query('DELETE FROM pico_placa WHERE id > ?', [antes.pico_placa]);
  await pool.query("DELETE FROM vehiculos WHERE placa IN ('PRB901', 'PRB902')");
  if (antes.reglasActivas.length) {
    await pool.query('UPDATE pico_placa SET activa = 1 WHERE id IN (?)', [
      antes.reglasActivas.map((r) => r.id),
    ]);
  }
  await pool.query('UPDATE celdas SET vehiculo_actual_id = NULL');
  for (const c of antes.celdas) {
    await pool.query(
      'UPDATE celdas SET estado = ?, vehiculo_actual_id = ?, nota = ? WHERE id = ?',
      [c.estado, c.vehiculo_actual_id, c.nota, c.id]
    );
  }
  await pool.end();
});

describe('Pico y placa (REQ-CAR-4)', () => {
  test('reglas de hoy y validaciones del CRUD', async () => {
    const hoy = await operador.get('/api/v1/pico-placa/hoy');
    expect(hoy.status).toBe(200);
    expect(hoy.body.data.dia_semana).toBe(enBogota().diaSemana);

    const malHorario = await operador.post('/api/v1/pico-placa').send({
      tipo_vehiculo: 'carro',
      dia_semana: 1,
      digito: 3,
      hora_inicio: '10:00',
      hora_fin: '08:00',
    });
    expect(malHorario.status).toBe(422);

    const nueva = {
      tipo_vehiculo: 'moto',
      dia_semana: 6,
      digito: 3,
      hora_inicio: '06:00',
      hora_fin: '10:00',
    };
    const creada = await operador.post('/api/v1/pico-placa').send(nueva);
    expect(creada.status).toBe(201);
    expect(creada.body.data.descripcion).toMatch(/motos con primer dígito 3/);
    const solapada = await operador
      .post('/api/v1/pico-placa')
      .send({ ...nueva, hora_inicio: '09:00', hora_fin: '12:00' });
    expect(solapada.status).toBe(409);
    expect(solapada.body.error.codigo).toBe('REGLA_DUPLICADA');
    expect((await cliente.get('/api/v1/pico-placa')).status).toBe(403);
  });

  test('entrada rechazada por pico y placa → 403 y queda en accesos_denegados', async () => {
    const regla = await admin.post('/api/v1/pico-placa').send({
      tipo_vehiculo: 'carro',
      dia_semana: enBogota().diaSemana,
      digito: 5, // CVB275
      hora_inicio: '00:00',
      hora_fin: '23:59',
    });
    expect(regla.status).toBe(201);

    const res = await entrada(operador, { placa: 'CVB275' });
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('PICO_Y_PLACA');
    expect(res.body.error.detalles[0].regla.digito).toBe(5);

    const [denegados] = await pool.query(
      'SELECT * FROM accesos_denegados WHERE id > ? AND placa = ?',
      [antes.accesos_denegados, 'CVB275']
    );
    expect(denegados).toHaveLength(1);
    expect(denegados[0].regla_pico_placa_id).toBe(regla.body.data.id);
    const [avisos] = await pool.query(
      "SELECT * FROM notificaciones WHERE id > ? AND tipo = 'pico_placa'",
      [antes.notificaciones]
    );
    expect(avisos.length).toBeGreaterThan(0);

    const apagar = await operador
      .patch(`/api/v1/pico-placa/${regla.body.data.id}/activa`)
      .send({ activa: false });
    expect(apagar.body.data.activa).toBe(false);
  });
});

describe('Entradas (REQ-INEX-1, REQ-PLA-1, REQ-TCK-1)', () => {
  test('el cliente no puede registrar entradas → 403', async () => {
    expect((await entrada(cliente, { placa: 'MNP908' })).status).toBe(403);
  });

  test('placa no registrada → 404 VEHICULO_NO_REGISTRADO y la lectura queda guardada', async () => {
    const res = await entrada(operador, { placa: 'zzz-999' });
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('VEHICULO_NO_REGISTRADO');
    const [lecturas] = await pool.query(
      'SELECT * FROM lecturas_placa WHERE id > ? AND placa_leida = ?',
      [antes.lecturas_placa, 'ZZZ999']
    );
    expect(lecturas).toHaveLength(1);
  });

  test('previsualización: tipo de cliente y celda fija detectados', async () => {
    const res = await operador.get('/api/v1/estadias/previsualizar?placa=MNP908');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      registrado: true,
      tipo_cliente: 'mensualidad',
      titular: 'Andrea Salcedo',
      celda_sugerida: { codigo: 'A-04' },
    });
    const desconocida = await operador.get('/api/v1/estadias/previsualizar?placa=ZZZ999');
    expect(desconocida.body.data.registrado).toBe(false);
  });

  test('una mensualidad con celda fija entra a su celda (A-04)', async () => {
    const res = await entrada(operador, {
      placa: 'MNP908',
      observaciones_entrada: 'Rayón leve',
      deja_llaves: 'true',
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      codigo_ticket: expect.stringMatching(/^T-\d{6}$/),
      tipo_cliente: 'mensualidad',
      celda: { codigo: 'A-04' },
      deja_llaves: true,
      observaciones_entrada: 'Rayón leve',
      tarifa: { valor_fraccion: 120 },
    });
    estadias.MNP908 = res.body.data;
    const a04 = await celda('A-04');
    expect(a04.estado).toBe('ocupada');
    expect(a04.vehiculo_actual_id).toBe(ids.vehiculos.MNP908);
  });

  test('la fecha de entrada la pone el servidor (se ignora la del cliente)', async () => {
    const entradaReal = new Date(estadias.MNP908.fecha_hora_entrada);
    expect(Math.abs(Date.now() - entradaReal.getTime())).toBeLessThan(60 * 1000);
  });

  test('doble entrada del mismo vehículo → 409', async () => {
    const res = await entrada(operador, { placa: 'MNP908' });
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('ESTADIA_ABIERTA');
  });

  test('una entrada con reserva vigente usa la celda reservada y la reserva queda cumplida', async () => {
    await pool.query("UPDATE celdas SET estado = 'reservada' WHERE codigo = 'M-05'");
    const [r] = await pool.query(
      `INSERT INTO reservas (usuario_id, vehiculo_id, celda_id, fecha_hora_reserva, fecha_hora_expiracion, estado)
       VALUES (5, ?, ?, NOW(), NOW() + INTERVAL 30 MINUTE, 'pendiente')`,
      [ids.vehiculos.GMR58K, ids.celdas['M-05']]
    );
    const res = await entrada(operador, { placa: 'GMR58K' });
    expect(res.status).toBe(201);
    expect(res.body.data.celda.codigo).toBe('M-05');
    const [[reserva]] = await pool.query('SELECT estado FROM reservas WHERE id = ?', [r.insertId]);
    expect(reserva.estado).toBe('cumplida');
  });

  test('sin celdas libres del tipo → 409 SIN_CUPO', async () => {
    const [libres] = await pool.query(
      "SELECT id FROM celdas WHERE tipo = 'moto' AND estado = 'disponible'"
    );
    await pool.query(
      "UPDATE celdas SET estado = 'fuera_servicio', nota = 'prueba' WHERE id IN (?)",
      [libres.map((c) => c.id)]
    );
    try {
      const res = await entrada(operador, { placa: 'BQS19E' });
      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe('SIN_CUPO');
    } finally {
      await pool.query("UPDATE celdas SET estado = 'disponible', nota = NULL WHERE id IN (?)", [
        libres.map((c) => c.id),
      ]);
    }
  });

  test('la mensualidad con celda fija tiene prioridad sobre "requiere accesible"', async () => {
    const res = await entrada(operador, { placa: 'CVB275', requiere_accesible: 'true' });
    expect(res.status).toBe(201);
    expect(res.body.data.celda.codigo).toBe('B-09');
  });

  test('quien requiere celda accesible recibe una accesible', async () => {
    const vehiculo = await admin
      .post('/api/v1/vehiculos')
      .send({ placa: 'PRB902', tipo: 'carro', color: 'Azul', marca: 'Renault', modelo: 'Logan' });
    expect(vehiculo.status).toBe(201);
    const res = await entrada(operador, {
      placa: 'PRB902',
      requiere_accesible: 'true',
      puerta_id: SUR,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.celda.codigo).toBe('A-01');
    estadias.PRB902 = res.body.data;
  });

  test('pedir una celda accesible sin requerirla, habiendo otras libres → 409', async () => {
    const vehiculo = await admin
      .post('/api/v1/vehiculos')
      .send({ placa: 'PRB901', tipo: 'carro', color: 'Gris', marca: 'Kia', modelo: 'Rio' });
    expect(vehiculo.status).toBe(201);
    const res = await entrada(operador, { placa: 'PRB901', celda_id: ids.celdas['B-01'] });
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('CELDA_ACCESIBLE');
  });

  test('una celda de otro tipo no se puede elegir; la del tipo correcto sí', async () => {
    const otroTipo = await entrada(operador, { placa: 'RTV82G', celda_id: ids.celdas['B-02'] });
    expect(otroTipo.status).toBe(409);
    expect(otroTipo.body.error.codigo).toBe('CELDA_NO_DISPONIBLE');
    const moto = await entrada(operador, { placa: 'RTV82G', celda_id: ids.celdas['M-02'] });
    expect(moto.status).toBe(201);
    expect(moto.body.data.celda.codigo).toBe('M-02');
  });
});

describe('Salidas (REQ-INEX-2, REQ-INEX-3)', () => {
  test('la liquidación preliminar calcula los minutos y no cierra la estadía', async () => {
    await pool.query(
      'UPDATE estadias SET fecha_hora_entrada = NOW() - INTERVAL 95 MINUTE WHERE id = ?',
      [estadias.MNP908.id]
    );
    const res = await operador
      .post('/api/v1/estadias/salida')
      .send({ puerta_id: SUR, placa: 'mnp-908' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ minutos: 95, tiempo: '1 h 35 min' });
    expect(res.body.data.estadia.estado).toBe('en_curso');

    const porTicket = await operador
      .post('/api/v1/estadias/salida')
      .send({ puerta_id: SUR, codigo_ticket: estadias.MNP908.codigo_ticket });
    expect(porTicket.body.data.estadia.id).toBe(estadias.MNP908.id);
  });

  test('salida de un vehículo que no está dentro → 404', async () => {
    const res = await operador
      .post('/api/v1/estadias/salida')
      .send({ puerta_id: SUR, placa: 'BQS19E' });
    expect(res.status).toBe(404);
  });

  test('cerrar la estadía: finalizada y la celda fija vuelve a "reservada"', async () => {
    const res = await operador
      .post(`/api/v1/estadias/${estadias.MNP908.id}/cerrar`)
      .send({ puerta_id: SUR });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      estado: 'finalizada',
      minutos: 95,
      puerta_salida: 'Sur',
    });
    const a04 = await celda('A-04');
    expect(a04.estado).toBe('reservada');
    expect(a04.vehiculo_actual_id).toBeNull();

    const otraVez = await operador
      .post(`/api/v1/estadias/${estadias.MNP908.id}/cerrar`)
      .send({ puerta_id: SUR });
    expect(otraVez.status).toBe(409);
  });

  test('cerrar libera una celda normal ("disponible")', async () => {
    const res = await operador
      .post(`/api/v1/estadias/${estadias.PRB902.id}/cerrar`)
      .send({ puerta_id: NORTE });
    expect(res.status).toBe(200);
    expect((await celda('A-01')).estado).toBe('disponible');
  });
});

describe('Consultas, ticket y portal', () => {
  test('últimos movimientos: entradas y salidas, de la más reciente a la más antigua', async () => {
    const res = await operador.get('/api/v1/estadias/ultimos-movimientos?limite=5');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ movimiento: 'salida', placa: 'PRB902', celda: 'A-01' }),
      ])
    );
    const fechas = res.body.data.map((m) => new Date(m.fecha).getTime());
    expect([...fechas].sort((a, b) => b - a)).toEqual(fechas);
  });

  test('vehículos en curso con tiempo transcurrido', async () => {
    const res = await operador.get('/api/v1/estadias/en-curso');
    const gmr = res.body.data.find((e) => e.vehiculo.placa === 'GMR58K');
    expect(gmr).toMatchObject({ estado: 'en_curso', celda: { codigo: 'M-05' } });
    expect(typeof gmr.minutos).toBe('number');
  });

  test('historial filtrado por placa', async () => {
    const res = await operador.get('/api/v1/estadias?placa=MNP908&limite=5');
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({
      codigo_ticket: estadias.MNP908.codigo_ticket,
      estado: 'finalizada',
    });
    expect(res.body.meta.total).toBeGreaterThan(1);
  });

  test('ticket PDF', async () => {
    const res = await operador
      .get(`/api/v1/estadias/${estadias.MNP908.id}/ticket.pdf`)
      .buffer(true)
      .parse((r, cb) => {
        const partes = [];
        r.on('data', (p) => partes.push(p));
        r.on('end', () => cb(null, Buffer.concat(partes)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  test('el cliente ve solo las estadías de sus vehículos', async () => {
    const res = await cliente.get('/api/v1/usuarios/me/estadias?limite=50');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((e) => ['MNP908', 'XKP45F'].includes(e.vehiculo.placa))).toBe(true);
    expect((await cliente.get('/api/v1/estadias')).status).toBe(403);
  });

  test('accesos denegados: solo el administrador', async () => {
    const res = await admin.get('/api/v1/accesos-denegados?placa=CVB275');
    expect(res.status).toBe(200);
    expect(res.body.data[0].motivo).toMatch(/Pico y placa/);
    expect((await operador.get('/api/v1/accesos-denegados')).status).toBe(403);
  });
});
