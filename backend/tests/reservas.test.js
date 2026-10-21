// Fase 7 — reservas (REQ-RES-1), mapa del cliente (REQ-CLD-02) y endpoints públicos (REQ-WEB-1).
// Requiere `npm run db:reset`. Desactiva pico y placa mientras corre y al final restaura todo.
const http = require('node:http');
const request = require('supertest');
const { crearApp } = require('../src/app');
const { pool } = require('../src/config/db');
const reservasService = require('../src/modules/reservas/reservas.service');

const app = crearApp();

const cred = (doc, contrasena) => ({ tipo_documento: 'CC', numero_documento: doc, contrasena });
const OPERADOR = cred('1000000002', 'Operador2026*');
const ANDREA = cred('1000000004', 'Cliente2026*');
const PAULA = cred('1000000005', 'Cliente2026*');
const HERNAN = cred('1000000006', 'Cliente2026*');
const NORTE = 1;

let operador;
let andrea;
let paula;
let hernan;
const antes = {};
const ids = {};

async function iniciarSesion(credenciales) {
  const agente = request.agent(app);
  expect((await agente.post('/api/v1/auth/login').send(credenciales)).status).toBe(200);
  return agente;
}
const maxId = async (tabla) =>
  (await pool.query(`SELECT COALESCE(MAX(id), 0) AS m FROM ${tabla}`))[0][0].m;
const celda = async (id) => (await pool.query('SELECT * FROM celdas WHERE id = ?', [id]))[0][0];
const vehiculoId = async (placa) =>
  (await pool.query('SELECT id FROM vehiculos WHERE placa = ?', [placa]))[0][0].id;
/** Primera celda libre (no accesible) del tipo, distinta de las dadas. */
async function celdaLibre(tipo, excluir = []) {
  const [filas] = await pool.query(
    `SELECT id, codigo FROM celdas WHERE tipo = ? AND estado = 'disponible' AND activa = 1
       AND es_accesible = 0 ${excluir.length ? 'AND id NOT IN (?)' : ''} ORDER BY codigo LIMIT 1`,
    excluir.length ? [tipo, excluir] : [tipo]
  );
  return filas[0];
}
const reservar = (agente, datos) => agente.post('/api/v1/reservas').send(datos);

beforeAll(async () => {
  [operador, andrea, paula, hernan] = await Promise.all(
    [OPERADOR, ANDREA, PAULA, HERNAN].map(iniciarSesion)
  );
  for (const t of [
    'reservas',
    'notificaciones',
    'estadias',
    'lecturas_placa',
    'pico_placa',
    'vehiculos',
  ])
    antes[t] = await maxId(t);
  [antes.celdas] = await pool.query('SELECT id, estado, vehiculo_actual_id, nota FROM celdas');
  // Pico y placa depende del día y la hora en que corran las pruebas: se apaga y se usa una regla propia.
  [antes.reglasActivas] = await pool.query('SELECT id FROM pico_placa WHERE activa = 1');
  await pool.query('UPDATE pico_placa SET activa = 0');
  ids.GMR58K = await vehiculoId('GMR58K'); // moto de Paula
  ids.BQS19E = await vehiculoId('BQS19E'); // moto de Hernán
  ids.XKP45F = await vehiculoId('XKP45F'); // moto de Andrea (está dentro)
  ids.MNP908 = await vehiculoId('MNP908'); // carro de Andrea (mensualidad con A-04)
  // Carro de Hernán terminado en 3 (para la regla de pico y placa de prueba).
  const [r] = await pool.query(
    `INSERT INTO vehiculos (placa, tipo, color, marca, modelo, usuario_id, creado_por)
     VALUES ('RSV123', 'carro', 'Azul', 'Kia', 'Rio', 6, 1)`
  );
  ids.RSV123 = r.insertId;
});

afterAll(async () => {
  await pool.query('DELETE FROM lecturas_placa WHERE id > ?', [antes.lecturas_placa]);
  await pool.query('DELETE FROM estadias WHERE id > ?', [antes.estadias]);
  await pool.query('DELETE FROM reservas WHERE id > ?', [antes.reservas]);
  await pool.query('DELETE FROM notificaciones WHERE id > ?', [antes.notificaciones]);
  await pool.query('DELETE FROM pico_placa WHERE id > ?', [antes.pico_placa]);
  await pool.query('UPDATE celdas SET vehiculo_actual_id = NULL');
  for (const c of antes.celdas) {
    await pool.query(
      'UPDATE celdas SET estado = ?, vehiculo_actual_id = ?, nota = ? WHERE id = ?',
      [c.estado, c.vehiculo_actual_id, c.nota, c.id]
    );
  }
  await pool.query('DELETE FROM accesos_denegados WHERE placa = ?', ['RSV123']);
  await pool.query('DELETE FROM vehiculos WHERE id > ?', [antes.vehiculos]);
  if (antes.reglasActivas.length) {
    await pool.query('UPDATE pico_placa SET activa = 1 WHERE id IN (?)', [
      antes.reglasActivas.map((x) => x.id),
    ]);
  }
  await pool.end();
});

describe('Crear y validar reservas', () => {
  let reserva;

  test('el cliente reserva una celda libre para su vehículo: celda reservada, vence en 30 min', async () => {
    const libre = await celdaLibre('moto');
    const res = await reservar(paula, { vehiculo_id: ids.GMR58K, celda_id: libre.id });
    expect(res.status).toBe(201);
    reserva = res.body.data;
    expect(reserva).toMatchObject({
      estado: 'confirmada',
      activa: true,
      vehiculo: { placa: 'GMR58K' },
      celda: { codigo: libre.codigo },
    });
    expect(reserva.segundos_restantes).toBeGreaterThan(29 * 60);
    expect(reserva.segundos_restantes).toBeLessThanOrEqual(30 * 60);
    expect((await celda(libre.id)).estado).toBe('reservada');
  });

  test('segunda reserva activa del mismo vehículo → 409', async () => {
    const otra = await celdaLibre('moto');
    const res = await reservar(paula, { vehiculo_id: ids.GMR58K, celda_id: otra.id });
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('RESERVA_ACTIVA');
  });

  test('vehículo ajeno → 403; vehículo dentro o con celda fija → 409', async () => {
    const libre = await celdaLibre('moto');
    expect((await reservar(paula, { vehiculo_id: ids.BQS19E, celda_id: libre.id })).status).toBe(
      403
    );
    const dentro = await reservar(andrea, { vehiculo_id: ids.XKP45F, celda_id: libre.id });
    expect(dentro.status).toBe(409);
    expect(dentro.body.error.codigo).toBe('VEHICULO_DENTRO');
    const carro = await celdaLibre('carro');
    const fija = await reservar(andrea, { vehiculo_id: ids.MNP908, celda_id: carro.id });
    expect(fija.body.error.codigo).toBe('TIENE_CELDA_FIJA');
  });

  test('celda de otro tipo → 422; celda ocupada → 409; accesible sin necesitarla → 409', async () => {
    const carro = await celdaLibre('carro');
    expect((await reservar(hernan, { vehiculo_id: ids.BQS19E, celda_id: carro.id })).status).toBe(
      422
    );
    const ocupada = (
      await pool.query("SELECT id FROM celdas WHERE estado = 'ocupada' AND tipo = 'moto' LIMIT 1")
    )[0][0];
    const r = await reservar(hernan, { vehiculo_id: ids.BQS19E, celda_id: ocupada.id });
    expect(r.body.error.codigo).toBe('CELDA_NO_DISPONIBLE');
    const accesible = (await pool.query("SELECT id FROM celdas WHERE codigo = 'B-01'"))[0][0];
    const sinMarcar = await reservar(hernan, { vehiculo_id: ids.RSV123, celda_id: accesible.id });
    expect(sinMarcar.body.error.codigo).toBe('CELDA_ACCESIBLE');
  });

  test('con pico y placa en este momento no se puede reservar (avisa el motivo)', async () => {
    const [regla] = await pool.query(
      `INSERT INTO pico_placa (tipo_vehiculo, dia_semana, digito, hora_inicio, hora_fin, activa, creado_por)
       VALUES ('carro', WEEKDAY(CURDATE()) + 1, 3, '00:00:00', '23:59:59', 1, 1)`
    );
    const libre = await celdaLibre('carro');
    const res = await reservar(hernan, { vehiculo_id: ids.RSV123, celda_id: libre.id });
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('PICO_Y_PLACA');
    expect(res.body.error.mensaje).toMatch(/terminada en 3/);
    await pool.query('UPDATE pico_placa SET activa = 0 WHERE id = ?', [regla.insertId]);
  });

  test('mapa del cliente: su reserva y su celda fija vienen marcadas; nada de placas ajenas', async () => {
    const dePaula = (await paula.get('/api/v1/celdas')).body.data;
    const suya = dePaula.find((c) => c.id === reserva.celda.id);
    expect(suya).toMatchObject({
      estado: 'reservada',
      propia: 'reserva',
      reserva_origen: 'reserva',
    });
    expect(new Date(suya.reserva.expira).getTime()).toBeGreaterThan(Date.now());
    expect(dePaula.find((c) => c.codigo === 'B-09').propia).toBe('mensualidad');
    expect(dePaula.find((c) => c.codigo === 'A-04').propia).toBeUndefined(); // de Andrea

    const deAndrea = (await andrea.get('/api/v1/celdas')).body.data;
    const ajena = deAndrea.find((c) => c.id === reserva.celda.id);
    expect(ajena.propia).toBeUndefined();
    expect(ajena.reserva).toBeUndefined();
    expect(deAndrea.find((c) => c.codigo === 'M-01').propia).toBe('vehiculo'); // su moto está dentro
    expect(JSON.stringify(deAndrea)).not.toMatch(/GMR58K|placa|ocupante|titular/);
  });

  test('el titular ve sus reservas; otro cliente no la puede cancelar (403); el titular sí', async () => {
    const mias = await paula.get('/api/v1/usuarios/me/reservas');
    expect(mias.body.data[0]).toMatchObject({ id: reserva.id, activa: true });
    expect(mias.body.data[0].titular).toBeUndefined();
    expect((await hernan.patch(`/api/v1/reservas/${reserva.id}/cancelar`)).status).toBe(403);
    const res = await paula.patch(`/api/v1/reservas/${reserva.id}/cancelar`);
    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe('cancelada');
    expect((await celda(reserva.celda.id)).estado).toBe('disponible');
    expect((await paula.patch(`/api/v1/reservas/${reserva.id}/cancelar`)).status).toBe(409);
  });
});

describe('Vencimiento', () => {
  test('una reserva vencida queda expirada, libera la celda y avisa al cliente', async () => {
    const libre = await celdaLibre('moto');
    const r = (await reservar(paula, { vehiculo_id: ids.GMR58K, celda_id: libre.id })).body.data;
    await pool.query(
      `UPDATE reservas SET fecha_hora_reserva = NOW() - INTERVAL 31 MINUTE,
              fecha_hora_expiracion = NOW() - INTERVAL 1 MINUTE WHERE id = ?`,
      [r.id]
    );
    expect((await reservasService.expirarVencidas()).expiradas).toBe(1);
    const [[fila]] = await pool.query('SELECT estado FROM reservas WHERE id = ?', [r.id]);
    expect(fila.estado).toBe('expirada');
    expect((await celda(libre.id)).estado).toBe('disponible');
    const [avisos] = await pool.query(
      "SELECT usuario_id FROM notificaciones WHERE id > ? AND tipo = 'reserva_expirada'",
      [antes.notificaciones]
    );
    expect(avisos.map((a) => a.usuario_id)).toEqual([5]);
    expect((await reservasService.expirarVencidas()).expiradas).toBe(0);
  });
});

describe('Flujo completo con el operador', () => {
  test('el cliente reserva → el operador registra la entrada → reserva cumplida en la celda reservada', async () => {
    const libre = await celdaLibre('moto');
    const r = (await reservar(paula, { vehiculo_id: ids.GMR58K, celda_id: libre.id })).body.data;
    // El operador previsualiza: la celda sugerida es la reservada.
    const previa = await operador.get('/api/v1/estadias/previsualizar?placa=GMR58K');
    expect(previa.body.data.celda_sugerida.id).toBe(libre.id);

    const entrada = operador.post('/api/v1/estadias/entrada');
    for (const [k, v] of Object.entries({ puerta_id: NORTE, placa: 'GMR58K' }))
      entrada.field(k, String(v));
    const res = await entrada;
    expect(res.status).toBe(201);
    expect(res.body.data.celda.id).toBe(libre.id);

    const [[fila]] = await pool.query('SELECT estado FROM reservas WHERE id = ?', [r.id]);
    expect(fila.estado).toBe('cumplida');
    const c = await celda(libre.id);
    expect(c.estado).toBe('ocupada');
    expect(c.vehiculo_actual_id).toBe(ids.GMR58K);
    const mias = (await paula.get('/api/v1/usuarios/me/reservas')).body.data;
    expect(mias.find((x) => x.id === r.id).estadia.codigo_ticket).toMatch(/^T-/);
  });

  test('el operador lista y reserva para un cliente; el cliente no lista todas (403)', async () => {
    const libre = await celdaLibre('moto');
    const res = await reservar(operador, { vehiculo_id: ids.BQS19E, celda_id: libre.id });
    expect(res.status).toBe(201);
    expect(res.body.data.titular.nombre_completo).toMatch(/Hernán/);
    const lista = await operador.get('/api/v1/reservas?activas=1');
    expect(lista.body.data.some((x) => x.id === res.body.data.id)).toBe(true);
    expect(lista.body.data.every((x) => x.activa)).toBe(true);
    expect((await hernan.get('/api/v1/reservas')).status).toBe(403);
    expect((await operador.patch(`/api/v1/reservas/${res.body.data.id}/cancelar`)).status).toBe(
      200
    );
  });
});

describe('Endpoints públicos (REQ-WEB-1)', () => {
  test('disponibilidad, tarifas y pico y placa de hoy sin placas, nombres ni documentos', async () => {
    const [usuarios] = await pool.query(
      'SELECT primer_nombre, primer_apellido, numero_documento, correo FROM usuarios'
    );
    const [placas] = await pool.query('SELECT placa FROM vehiculos');
    for (const ruta of ['disponibilidad', 'tarifas', 'pico-placa-hoy']) {
      const res = await request(app).get(`/api/v1/publico/${ruta}`);
      expect(res.status).toBe(200);
      const texto = JSON.stringify(res.body);
      for (const p of placas) expect(texto).not.toContain(p.placa);
      for (const u of usuarios) {
        expect(texto).not.toContain(u.numero_documento);
        expect(texto).not.toContain(u.correo);
        expect(texto).not.toContain(u.primer_apellido);
      }
      expect(texto).not.toMatch(/documento|"placa"|propietario|titular|usuario/);
    }
    const tarifas = (await request(app).get('/api/v1/publico/tarifas')).body.data;
    expect(tarifas.mensualidades.carro.mensual).toBe(180000);
    const pico = (await request(app).get('/api/v1/publico/pico-placa-hoy')).body.data;
    expect(Object.keys(pico).sort()).toEqual(['carro', 'dia_nombre', 'fecha', 'moto']);
    expect(Object.keys(pico.carro).sort()).toEqual(['criterio', 'digitos', 'horarios']);
  });

  test('el stream público solo envía totales por tipo', async () => {
    const servidor = app.listen(0);
    const texto = await new Promise((resolve) => {
      const req = http.get(
        { port: servidor.address().port, path: '/api/v1/publico/disponibilidad/stream' },
        (res) => {
          let datos = '';
          res.setEncoding('utf8');
          res.on('data', (t) => {
            datos += t;
            if (datos.includes('event: disponibilidad')) {
              req.destroy();
              resolve(datos);
            }
          });
        }
      );
    });
    await new Promise((r) => servidor.close(r));
    const datos = JSON.parse(texto.match(/data: (.+)/)[1]);
    expect(Object.keys(datos).sort()).toEqual(['actualizado_en', 'carro', 'moto']);
    expect(texto).not.toMatch(/placa|codigo|A-0/);
  });
});
