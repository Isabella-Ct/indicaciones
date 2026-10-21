// Fase 8 — flujo completo de punta a punta y concurrencia.
// Crear cliente → vehículos → membresía y reserva → entrada → salida → pago → factura
// → aparece en "mis facturas" y en los reportes. Además: dos operadores a la vez en la
// misma celda y dos clientes reservando la misma celda.
// Requiere `npm run db:reset`. Apaga pico y placa mientras corre y al final restaura todo.
const request = require('supertest');
const { crearApp } = require('../src/app');
const { pool } = require('../src/config/db');
const { enBogota } = require('../src/utils/fechas');

const app = crearApp();

const cred = (doc, contrasena) => ({ tipo_documento: 'CC', numero_documento: doc, contrasena });
const ADMIN = cred('1000000001', 'Admin2026*');
const OPERADOR = cred('1000000002', 'Operador2026*');
const OPERADOR_2 = cred('1000000003', 'Operador2026*');
const PAULA = cred('1000000005', 'Cliente2026*');
const HERNAN = cred('1000000006', 'Cliente2026*');
const NUEVO = { documento: '1099887766', temporal: 'Temporal2026*', definitiva: 'MiClave2026*' };
const NORTE = 1;
const SUR = 2;

let admin;
let operador;
let operador2;
const antes = {};
const flujo = {};

async function iniciarSesion(credenciales) {
  const agente = request.agent(app);
  const res = await agente.post('/api/v1/auth/login').send(credenciales);
  expect(res.status).toBe(200);
  return agente;
}
const maxId = async (tabla) =>
  (await pool.query(`SELECT COALESCE(MAX(id), 0) AS m FROM ${tabla}`))[0][0].m;
const celda = async (id) => (await pool.query('SELECT * FROM celdas WHERE id = ?', [id]))[0][0];
const vehiculoId = async (placa) =>
  (await pool.query('SELECT id FROM vehiculos WHERE placa = ?', [placa]))[0][0].id;
async function celdaLibre(tipo) {
  const [[fila]] = await pool.query(
    `SELECT id, codigo FROM celdas WHERE tipo = ? AND estado = 'disponible' AND activa = 1
       AND es_accesible = 0 ORDER BY codigo LIMIT 1`,
    [tipo]
  );
  return fila;
}
/** Entrada multipart, como la envía el modal. */
function entrada(agente, campos) {
  const req = agente.post('/api/v1/estadias/entrada');
  for (const [k, v] of Object.entries({ puerta_id: NORTE, ...campos })) req.field(k, String(v));
  return req;
}
const totalFinancieroHoy = async () => {
  const hoy = enBogota().fecha;
  const r = await admin.get(`/api/v1/reportes/financiero?desde=${hoy}&hasta=${hoy}`);
  expect(r.status).toBe(200);
  return r.body.meta.total;
};

beforeAll(async () => {
  [admin, operador, operador2] = await Promise.all(
    [ADMIN, OPERADOR, OPERADOR_2].map(iniciarSesion)
  );
  for (const t of [
    'usuarios',
    'vehiculos',
    'membresias',
    'reservas',
    'estadias',
    'facturas',
    'lecturas_placa',
    'notificaciones',
  ])
    antes[t] = await maxId(t);
  [antes.celdas] = await pool.query('SELECT id, estado, vehiculo_actual_id, nota FROM celdas');
  [antes.reglasActivas] = await pool.query('SELECT id FROM pico_placa WHERE activa = 1');
  await pool.query('UPDATE pico_placa SET activa = 0');
  antes.financiero = await totalFinancieroHoy();
});

afterAll(async () => {
  await pool.query('DELETE FROM facturas WHERE id > ?', [antes.facturas]);
  await pool.query(
    "UPDATE consecutivos SET ultimo = (SELECT COUNT(*) FROM facturas) WHERE nombre = 'factura'"
  );
  await pool.query('DELETE FROM lecturas_placa WHERE id > ?', [antes.lecturas_placa]);
  await pool.query('DELETE FROM estadias WHERE id > ?', [antes.estadias]);
  await pool.query('DELETE FROM reservas WHERE id > ?', [antes.reservas]);
  await pool.query('DELETE FROM membresias WHERE id > ?', [antes.membresias]);
  await pool.query('DELETE FROM notificaciones WHERE id > ?', [antes.notificaciones]);
  await pool.query('UPDATE celdas SET vehiculo_actual_id = NULL');
  for (const c of antes.celdas) {
    await pool.query(
      'UPDATE celdas SET estado = ?, vehiculo_actual_id = ?, nota = ? WHERE id = ?',
      [c.estado, c.vehiculo_actual_id, c.nota, c.id]
    );
  }
  await pool.query('DELETE FROM vehiculos_historial_propietario WHERE vehiculo_id > ?', [
    antes.vehiculos,
  ]);
  await pool.query('DELETE FROM vehiculos WHERE id > ?', [antes.vehiculos]);
  await pool.query('DELETE FROM usuarios WHERE id > ?', [antes.usuarios]);
  if (antes.reglasActivas.length) {
    await pool.query('UPDATE pico_placa SET activa = 1 WHERE id IN (?)', [
      antes.reglasActivas.map((x) => x.id),
    ]);
  }
  await pool.end();
});

describe('Flujo completo de un cliente nuevo', () => {
  test('1. el operador crea el cliente con contraseña temporal', async () => {
    const req = operador.post('/api/v1/usuarios');
    const datos = {
      tipo_documento: 'CC',
      numero_documento: NUEVO.documento,
      primer_nombre: 'Mariana',
      primer_apellido: 'Flujo',
      correo: 'mariana.flujo@correo.test',
      celular: '3107654321',
      rol_id: '3',
      contrasena_temporal: NUEVO.temporal,
    };
    for (const [k, v] of Object.entries(datos)) req.field(k, v);
    const res = await req;
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ rol: 'usuario', debe_cambiar_contrasena: true });
    expect(res.body.data.contrasena_hash).toBeUndefined();
    flujo.usuarioId = res.body.data.id;
  });

  test('2. el cliente entra, debe cambiar la contraseña y luego usa la cuenta', async () => {
    const cliente = await iniciarSesion(cred(NUEVO.documento, NUEVO.temporal));
    expect((await cliente.get('/api/v1/usuarios/me/vehiculos')).body.error.codigo).toBe(
      'DEBE_CAMBIAR_CONTRASENA'
    );
    const cambio = await cliente
      .post('/api/v1/auth/cambiar-contrasena')
      .send({ contrasena_actual: NUEVO.temporal, contrasena_nueva: NUEVO.definitiva });
    expect(cambio.status).toBe(200);
    flujo.cliente = await iniciarSesion(cred(NUEVO.documento, NUEVO.definitiva));
    expect((await flujo.cliente.get('/api/v1/usuarios/me/vehiculos')).status).toBe(200);
  });

  test('3. el operador registra un carro y una moto a su nombre', async () => {
    for (const [placa, tipo] of [
      ['FLJ528', 'carro'],
      ['FLJ27K', 'moto'],
    ]) {
      const res = await operador.post('/api/v1/vehiculos').send({
        placa,
        tipo,
        color: 'Gris',
        marca: 'Marca',
        modelo: '2024',
        usuario_id: flujo.usuarioId,
      });
      expect(res.status).toBe(201);
      flujo[placa] = res.body.data.id;
    }
    const mios = (await flujo.cliente.get('/api/v1/usuarios/me/vehiculos')).body.data;
    expect(mios.map((v) => v.placa).sort()).toEqual(['FLJ27K', 'FLJ528']);
  });

  test('4. el administrador le vende una mensualidad a la moto (con su factura)', async () => {
    const res = await admin.post('/api/v1/membresias').send({
      usuario_id: flujo.usuarioId,
      vehiculo_id: flujo.FLJ27K,
      tipo: 'mensual',
      fecha_inicio: enBogota().fecha,
      metodo_pago: 'efectivo',
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ estado: 'activa', vigente: true });
    flujo.valorMembresia = Number(res.body.data.valor);
  });

  test('5. el cliente reserva una celda para el carro', async () => {
    const libre = await celdaLibre('carro');
    const res = await flujo.cliente
      .post('/api/v1/reservas')
      .send({ vehiculo_id: flujo.FLJ528, celda_id: libre.id });
    expect(res.status).toBe(201);
    flujo.reserva = res.body.data;
    flujo.celdaCarro = libre.id;
    expect((await celda(libre.id)).estado).toBe('reservada');
  });

  test('6. el operador registra la entrada: usa la celda reservada y la reserva queda cumplida', async () => {
    const res = await entrada(operador, { placa: 'FLJ528' });
    expect(res.status).toBe(201);
    expect(res.body.data.celda.id).toBe(flujo.celdaCarro);
    expect(res.body.data.codigo_ticket).toMatch(/^T-\d{6}$/);
    flujo.ticket = res.body.data.codigo_ticket;
    flujo.estadiaCarro = res.body.data.id;
    const [[r]] = await pool.query('SELECT estado FROM reservas WHERE id = ?', [flujo.reserva.id]);
    expect(r.estado).toBe('cumplida');
    expect((await celda(flujo.celdaCarro)).estado).toBe('ocupada');
  });

  test('7. salida por ticket a los 90 minutos: 90 × $120 = $10.800', async () => {
    await pool.query(
      'UPDATE estadias SET fecha_hora_entrada = NOW() - INTERVAL 90 MINUTE WHERE id = ?',
      [flujo.estadiaCarro]
    );
    const res = await operador
      .post('/api/v1/estadias/salida')
      .send({ puerta_id: SUR, codigo_ticket: flujo.ticket });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ minutos: 90, membresia: null, cobro: { total: 10800 } });
  });

  test('8. pago con tarjeta: factura consecutiva, celda libre y estadía finalizada', async () => {
    const res = await operador
      .post(`/api/v1/estadias/${flujo.estadiaCarro}/pagar`)
      .send({ puerta_id: SUR, metodo_pago: 'tarjeta' });
    expect(res.status).toBe(200);
    expect(res.body.data.factura).toMatchObject({ total: 10800, metodo_pago: 'tarjeta' });
    expect(res.body.data.factura.numero).toMatch(/^FAC-\d{6}$/);
    flujo.factura = res.body.data.factura;
    expect(res.body.data.estadia.estado).toBe('finalizada');
    const c = await celda(flujo.celdaCarro);
    expect(c.estado).toBe('disponible');
    expect(c.vehiculo_actual_id).toBeNull();
  });

  test('9. la moto con mensualidad entra y sale con factura en $0', async () => {
    const dentro = await entrada(operador, { placa: 'FLJ27K' });
    expect(dentro.status).toBe(201);
    expect(dentro.body.data.tipo_cliente).toBe('mensualidad');
    const pago = await operador
      .post(`/api/v1/estadias/${dentro.body.data.id}/pagar`)
      .send({ puerta_id: SUR, metodo_pago: 'efectivo' });
    expect(pago.status).toBe(200);
    expect(pago.body.data.factura).toMatchObject({ total: 0, observacion: 'membresía' });
  });

  test('10. el cliente ve sus facturas y descarga el PDF; otro cliente no puede', async () => {
    const mias = (await flujo.cliente.get('/api/v1/usuarios/me/facturas')).body.data;
    expect(mias.map((f) => f.numero)).toContain(flujo.factura.numero);
    expect(mias).toHaveLength(3); // mensualidad + estadía del carro + estadía de la moto ($0)
    const pdf = await flujo.cliente.get(`/api/v1/facturas/${flujo.factura.id}/pdf`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toMatch(/application\/pdf/);
    const ajeno = await iniciarSesion(PAULA);
    expect((await ajeno.get(`/api/v1/facturas/${flujo.factura.id}/pdf`)).status).toBe(403);
  });

  test('11. todo aparece en los reportes del administrador', async () => {
    const hoy = enBogota().fecha;
    const salidas = await admin.get(
      `/api/v1/reportes/salidas?desde=${hoy}&hasta=${hoy}&placa=FLJ528`
    );
    expect(salidas.body.data).toEqual([
      expect.objectContaining({ codigo_ticket: flujo.ticket, valor: 10800, minutos_estadia: 90 }),
    ]);
    const entradas = await admin.get(`/api/v1/reportes/entradas?desde=${hoy}&hasta=${hoy}`);
    expect(entradas.body.data.map((e) => e.codigo_ticket)).toContain(flujo.ticket);
    const vehiculos = await admin.get('/api/v1/reportes/vehiculos?limite=100&pagina=1');
    expect(vehiculos.status).toBe(200);
    const usuarios = await admin.get('/api/v1/reportes/usuarios?rol=usuario&limite=100');
    expect(usuarios.body.data.map((u) => u.numero_documento)).toContain(NUEVO.documento);
    expect(await totalFinancieroHoy()).toBe(antes.financiero + 10800 + flujo.valorMembresia);
  });
});

describe('Concurrencia', () => {
  test('dos operadores registran a la vez dos vehículos en la misma celda: uno entra, el otro 409', async () => {
    const libre = await celdaLibre('carro');
    // Carros de visitantes sin estadía abierta, creados para la prueba.
    for (const placa of ['CNC101', 'CNC202']) {
      await operador
        .post('/api/v1/vehiculos')
        .send({ placa, tipo: 'carro', color: 'Rojo', marca: 'Kia', modelo: 'Picanto' });
    }
    const [a, b] = await Promise.all([
      entrada(operador, { placa: 'CNC101', celda_id: libre.id }),
      entrada(operador2, { placa: 'CNC202', celda_id: libre.id }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const perdedor = a.status === 409 ? a : b;
    expect(perdedor.body.error.codigo).toBe('CELDA_NO_DISPONIBLE');
    const [[{ n }]] = await pool.query(
      "SELECT COUNT(*) AS n FROM estadias WHERE celda_id = ? AND estado = 'en_curso'",
      [libre.id]
    );
    expect(n).toBe(1);
  });

  test('el mismo vehículo por dos puertas a la vez: una sola estadía abierta', async () => {
    await operador
      .post('/api/v1/vehiculos')
      .send({ placa: 'CNC303', tipo: 'carro', color: 'Azul', marca: 'Kia', modelo: 'Rio' });
    const [a, b] = await Promise.all([
      entrada(operador, { placa: 'CNC303' }),
      entrada(operador2, { placa: 'CNC303', puerta_id: SUR }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const [[{ n }]] = await pool.query(
      "SELECT COUNT(*) AS n FROM estadias WHERE vehiculo_id = ? AND estado = 'en_curso'",
      [await vehiculoId('CNC303')]
    );
    expect(n).toBe(1);
  });

  test('dos clientes reservan la misma celda a la vez: una reserva, la otra 409', async () => {
    const libre = await celdaLibre('moto');
    const [paula, hernan] = await Promise.all([PAULA, HERNAN].map(iniciarSesion));
    const [a, b] = await Promise.all([
      paula
        .post('/api/v1/reservas')
        .send({ vehiculo_id: await vehiculoId('GMR58K'), celda_id: libre.id }),
      hernan
        .post('/api/v1/reservas')
        .send({ vehiculo_id: await vehiculoId('BQS19E'), celda_id: libre.id }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const [[{ n }]] = await pool.query(
      "SELECT COUNT(*) AS n FROM reservas WHERE celda_id = ? AND estado IN ('pendiente', 'confirmada')",
      [libre.id]
    );
    expect(n).toBe(1);
  });
});
