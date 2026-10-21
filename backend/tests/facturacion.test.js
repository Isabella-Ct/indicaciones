// Fase 4 — tarifas, descuentos, cobro, facturas y membresías. Requiere `npm run db:reset`.
// Cobra estadías de la semilla y crea datos propios; al final restaura todo.
const request = require('supertest');
const { crearApp } = require('../src/app');
const { pool } = require('../src/config/db');
const { enBogota } = require('../src/utils/fechas');
const membresiasService = require('../src/modules/membresias/membresias.service');

const app = crearApp();

const ADMIN = { tipo_documento: 'CC', numero_documento: '1000000001', contrasena: 'Admin2026*' };
const OPERADOR = {
  tipo_documento: 'CC',
  numero_documento: '1000000002',
  contrasena: 'Operador2026*',
};
const ANDREA = { tipo_documento: 'CC', numero_documento: '1000000004', contrasena: 'Cliente2026*' };
const SUR = 2;
/** Número de factura n posiciones después del último de la semilla. */
const fac = (n) => `FAC-${String(antes.ultimoFactura + n).padStart(6, '0')}`;

let admin;
let operador;
let andrea;
const antes = {};
const ids = { celdas: {}, vehiculos: {}, estadias: {} };

async function iniciarSesion(credenciales) {
  const agente = request.agent(app);
  expect((await agente.post('/api/v1/auth/login').send(credenciales)).status).toBe(200);
  return agente;
}
const maxId = async (tabla) =>
  (await pool.query(`SELECT COALESCE(MAX(id), 0) AS m FROM ${tabla}`))[0][0].m;
const celda = async (codigo) =>
  (await pool.query('SELECT * FROM celdas WHERE codigo = ?', [codigo]))[0][0];
const pdf = (agente, ruta) =>
  agente
    .get(ruta)
    .buffer(true)
    .parse((r, cb) => {
      const partes = [];
      r.on('data', (p) => partes.push(p));
      r.on('end', () => cb(null, Buffer.concat(partes)));
    });

beforeAll(async () => {
  admin = await iniciarSesion(ADMIN);
  operador = await iniciarSesion(OPERADOR);
  andrea = await iniciarSesion(ANDREA);
  for (const t of ['facturas', 'membresias', 'notificaciones', 'tarifas', 'descuentos'])
    antes[t] = await maxId(t);
  [antes.celdas] = await pool.query(
    'SELECT id, codigo, estado, vehiculo_actual_id, nota FROM celdas'
  );
  antes.celdas.forEach((c) => (ids.celdas[c.codigo] = c.id));
  [antes.abiertas] = await pool.query("SELECT * FROM estadias WHERE estado = 'en_curso'");
  const [vs] = await pool.query('SELECT id, placa FROM vehiculos');
  vs.forEach((v) => (ids.vehiculos[v.placa] = v.id));
  antes.abiertas.forEach(
    (e) => (ids.estadias[vs.find((v) => v.id === e.vehiculo_id).placa] = e.id)
  );
  [antes.tarifasActivas] = await pool.query('SELECT id FROM tarifas WHERE activa = 1');
  [[{ ultimo: antes.ultimoFactura }]] = await pool.query(
    "SELECT ultimo FROM consecutivos WHERE nombre = 'factura'"
  );
});

afterAll(async () => {
  await pool.query('DELETE FROM facturas WHERE id > ?', [antes.facturas]);
  await pool.query(
    "UPDATE consecutivos SET ultimo = (SELECT COUNT(*) FROM facturas) WHERE nombre = 'factura'"
  );
  await pool.query('DELETE FROM membresias WHERE id > ?', [antes.membresias]);
  await pool.query('DELETE FROM notificaciones WHERE id > ?', [antes.notificaciones]);
  await pool.query('DELETE FROM descuentos WHERE id > ?', [antes.descuentos]);
  await pool.query('DELETE FROM tarifas WHERE id > ?', [antes.tarifas]);
  await pool.query('UPDATE tarifas SET activa = 1 WHERE id IN (?)', [
    antes.tarifasActivas.map((t) => t.id),
  ]);
  for (const e of antes.abiertas) {
    await pool.query(
      `UPDATE estadias SET estado = 'en_curso', fecha_hora_entrada = ?, fecha_hora_salida = NULL, minutos_estadia = NULL,
              puerta_salida_id = NULL, registrada_salida_por = NULL WHERE id = ?`,
      [e.fecha_hora_entrada, e.id]
    );
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

describe('Tarifas (REQ-TAR-1)', () => {
  test('vigentes para cualquiera con sesión y en el endpoint público', async () => {
    const res = await andrea.get('/api/v1/tarifas');
    expect(res.status).toBe(200);
    expect(res.body.data.vigentes.carro).toMatchObject({
      valor_fraccion: 120,
      valor_dia_maximo: 28000,
    });
    expect(res.body.data.historial).toBeUndefined();
    const publico = await request(app).get('/api/v1/publico/tarifas');
    expect(publico.status).toBe(200);
    expect(publico.body.data.moto).toMatchObject({ valor_fraccion: 60, valor_dia_maximo: 12000 });
    expect(publico.body.data.moto.id).toBeUndefined();
  });

  test('simulador: un carro de 157 min paga $18.840', async () => {
    const res = await operador
      .post('/api/v1/tarifas/simular')
      .send({ tipo_vehiculo: 'carro', minutos: 157 });
    expect(res.status).toBe(200);
    expect(res.body.data.cobro.total).toBe(18840);
  });

  test('solo el administrador crea tarifas', async () => {
    const nueva = {
      tipo_vehiculo: 'moto',
      valor_fraccion: 70,
      minutos_fraccion: 1,
      minutos_gracia: 0,
      valor_dia_maximo: 13000,
    };
    expect((await operador.post('/api/v1/tarifas').send(nueva)).status).toBe(403);
  });
});

describe('Descuentos (REQ-DES-1)', () => {
  test('CRUD, porcentaje 0–100 y nombres únicos', async () => {
    const res = await admin
      .post('/api/v1/descuentos')
      .send({ nombre: 'Prueba fase 4', porcentaje: 25 });
    expect(res.status).toBe(201);
    expect(
      (await admin.post('/api/v1/descuentos').send({ nombre: 'Prueba fase 4', porcentaje: 5 }))
        .status
    ).toBe(409);
    expect(
      (await admin.post('/api/v1/descuentos').send({ nombre: 'Excesivo', porcentaje: 120 })).status
    ).toBe(422);
    expect(
      (await operador.post('/api/v1/descuentos').send({ nombre: 'Op', porcentaje: 5 })).status
    ).toBe(403);

    const baja = await admin
      .patch(`/api/v1/descuentos/${res.body.data.id}/activo`)
      .send({ activo: false });
    expect(baja.body.data.activo).toBe(false);
    const delOperador = await operador.get('/api/v1/descuentos');
    expect(delOperador.body.data.every((d) => d.activo)).toBe(true);
    expect(delOperador.body.data.find((d) => d.nombre === 'Prueba fase 4')).toBeUndefined();
  });
});

describe('Cobro y facturas (REQ-TAR-2, REQ-FAC-1, REQ-FAC-2)', () => {
  let factura;

  test('la salida devuelve la liquidación con dinero (157 min de carro = $18.840)', async () => {
    await pool.query(
      'UPDATE estadias SET fecha_hora_entrada = NOW() - INTERVAL 157 MINUTE WHERE id = ?',
      [ids.estadias.JKL482]
    );
    const res = await operador
      .post('/api/v1/estadias/salida')
      .send({ puerta_id: SUR, placa: 'JKL482' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      minutos: 157,
      membresia: null,
      cobro: { total: 18840, porcentajeTope: 67 },
    });
    expect(res.body.data.descuentos.length).toBeGreaterThan(0);
    expect(res.body.data.estadia.estado).toBe('en_curso');
  });

  test('liquidar con descuento del 10 % recalcula y redondea a la centena', async () => {
    const res = await operador
      .post(`/api/v1/estadias/${ids.estadias.JKL482}/liquidar`)
      .send({ descuento_id: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.cobro).toMatchObject({
      subtotal: 18840,
      total: 17000,
      valorDescuento: 1840,
    });
  });

  test('pagar ignora un total manipulado por el cliente', async () => {
    const res = await operador.post(`/api/v1/estadias/${ids.estadias.JKL482}/pagar`).send({
      puerta_id: SUR,
      metodo_pago: 'tarjeta',
      descuento_id: 1,
      total: 1,
      subtotal: 1,
      valor_descuento: 18839,
    });
    expect(res.status).toBe(200);
    factura = res.body.data.factura;
    expect(factura).toMatchObject({
      numero: fac(1),
      total: 17000,
      subtotal: 18840,
      valor_descuento: 1840,
      metodo_pago: 'tarjeta',
      descuento: { id: 1, porcentaje: 10 },
    });
    expect(factura.detalle_calculo.detalle.map((d) => d.paso)).toEqual([
      'fracciones',
      'descuento',
      'total',
    ]);
    expect((await celda('A-03')).estado).toBe('disponible');
    expect(res.body.data.estadia).toMatchObject({ estado: 'finalizada', valor_pagado: 17000 });
  });

  test('dos pagos simultáneos no repiten el número de factura', async () => {
    const [a, b] = await Promise.all([
      operador
        .post(`/api/v1/estadias/${ids.estadias.BNM350}/pagar`)
        .send({ puerta_id: SUR, metodo_pago: 'efectivo' }),
      operador
        .post(`/api/v1/estadias/${ids.estadias.HJK740}/pagar`)
        .send({ puerta_id: SUR, metodo_pago: 'efectivo' }),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    const numeros = [a.body.data.factura.numero, b.body.data.factura.numero].sort();
    expect(numeros).toEqual([fac(2), fac(3)]);
  });

  test('dos cobros simultáneos de la misma estadía: uno pasa, el otro 409', async () => {
    const [a, b] = await Promise.all([
      operador
        .post(`/api/v1/estadias/${ids.estadias.OPQ119}/pagar`)
        .send({ puerta_id: SUR, metodo_pago: 'efectivo' }),
      operador
        .post(`/api/v1/estadias/${ids.estadias.OPQ119}/pagar`)
        .send({ puerta_id: SUR, metodo_pago: 'efectivo' }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM facturas WHERE estadia_id = ?', [
      ids.estadias.OPQ119,
    ]);
    expect(n).toBe(1);
  });

  test('una mensualidad paga $0 con factura y motivo "membresía"', async () => {
    const res = await operador
      .post(`/api/v1/estadias/${ids.estadias.QWE731}/pagar`)
      .send({ puerta_id: SUR, metodo_pago: 'efectivo', descuento_id: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data.factura).toMatchObject({
      total: 0,
      subtotal: 0,
      observacion: 'membresía',
      descuento: null,
    });
  });

  test('cambiar una tarifa no altera las facturas anteriores', async () => {
    const [[vieja]] = await pool.query(
      'SELECT total, detalle_calculo FROM facturas WHERE numero = ?',
      [fac(1)]
    );
    const nueva = await admin.post('/api/v1/tarifas').send({
      tipo_vehiculo: 'carro',
      valor_fraccion: 150,
      minutos_fraccion: 1,
      minutos_gracia: 5,
      valor_dia_maximo: 30000,
    });
    expect(nueva.status).toBe(201);
    const historial = await admin.get('/api/v1/tarifas?historial=1&tipo_vehiculo=carro');
    expect(historial.body.data.historial.filter((t) => t.activa)).toHaveLength(1);
    expect(historial.body.data.vigentes.carro.valor_fraccion).toBe(150);

    const [[despues]] = await pool.query(
      'SELECT total, detalle_calculo FROM facturas WHERE numero = ?',
      [fac(1)]
    );
    expect(despues).toEqual(vieja);
    const detalle = await admin.get(`/api/v1/facturas/${factura.id}`);
    expect(detalle.body.data.detalle_calculo.tarifa.valor_fraccion).toBe(120);

    const sim = await operador
      .post('/api/v1/tarifas/simular')
      .send({ tipo_vehiculo: 'carro', minutos: 157 });
    expect(sim.body.data.cobro.total).toBe(157 * 150);
  });

  test('PDF de la factura (interno, no DIAN)', async () => {
    const res = await pdf(operador, `/api/v1/facturas/${factura.id}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  test('operador: solo las facturas del día; admin: con filtros y total del período', async () => {
    const hoy = enBogota().fecha;
    const delOperador = await operador.get('/api/v1/facturas?desde=2020-01-01&limite=100');
    expect(delOperador.body.meta).toMatchObject({ desde: hoy, hasta: hoy });
    expect(delOperador.body.data.length).toBeGreaterThanOrEqual(5);

    const delAdmin = await admin.get(
      '/api/v1/facturas?metodo_pago=tarjeta&concepto=estadia&limite=100'
    );
    expect(
      delAdmin.body.data.every((f) => f.metodo_pago === 'tarjeta' && f.concepto === 'estadia')
    ).toBe(true);
    // El total es del período completo (todas las páginas), no solo de la página.
    const [[{ suma }]] = await pool.query(
      "SELECT COALESCE(SUM(total), 0) AS suma FROM facturas WHERE metodo_pago = 'tarjeta' AND concepto = 'estadia'"
    );
    expect(delAdmin.body.meta.suma_total).toBe(Number(suma));

    const resumen = await operador.get('/api/v1/facturas/resumen-hoy');
    expect(resumen.body.data.salidas_cobradas).toBeGreaterThanOrEqual(5);
    expect(resumen.body.data.recaudo).toBeGreaterThanOrEqual(17000);
  });

  test('el cliente ve y descarga solo sus facturas', async () => {
    const mias = await andrea.get('/api/v1/usuarios/me/facturas?limite=100');
    expect(mias.status).toBe(200);
    expect(mias.body.data.length).toBeGreaterThan(0);
    expect(mias.body.data.every((f) => f.cliente.id === 4)).toBe(true);
    expect((await pdf(andrea, `/api/v1/facturas/${mias.body.data[0].id}/pdf`)).status).toBe(200);

    const [[ajena]] = await pool.query('SELECT id FROM facturas WHERE cliente_id = 7 LIMIT 1');
    expect((await andrea.get(`/api/v1/facturas/${ajena.id}/pdf`)).status).toBe(403);
    expect((await andrea.get('/api/v1/facturas')).status).toBe(403);
  });
});

describe('Membresías (REQ-MEM-1)', () => {
  let creada;
  const hoy = () => enBogota().fecha;

  test('cotización: fecha fin y valor desde configuración', async () => {
    const res = await admin.get(
      `/api/v1/membresias/cotizar?vehiculo_id=${ids.vehiculos.RTV82G}&tipo=mensual&fecha_inicio=2026-01-31`
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      fecha_fin: '2026-02-28',
      valor: 70000,
      tipo_vehiculo: 'moto',
    });
  });

  test('el admin crea una mensualidad con celda fija: factura propia y celda reservada', async () => {
    const res = await admin.post('/api/v1/membresias').send({
      usuario_id: 7,
      vehiculo_id: ids.vehiculos.RTV82G,
      tipo: 'mensual',
      fecha_inicio: hoy(),
      celda_asignada_id: ids.celdas['M-06'],
      metodo_pago: 'transferencia',
    });
    expect(res.status).toBe(201);
    creada = res.body.data;
    expect(creada).toMatchObject({
      estado: 'activa',
      vigente: true,
      valor: 70000,
      celda: { codigo: 'M-06' },
    });
    expect(creada.factura.numero).toMatch(/^FAC-\d{6}$/);
    expect((await celda('M-06')).estado).toBe('reservada');
    const [[f]] = await pool.query(
      'SELECT concepto, total, cliente_id FROM facturas WHERE id = ?',
      [creada.factura.id]
    );
    expect(f).toMatchObject({ concepto: 'membresia', total: 70000, cliente_id: 7 });
  });

  test('no se pueden traslapar membresías del mismo vehículo → 409', async () => {
    const res = await admin.post('/api/v1/membresias').send({
      usuario_id: 7,
      vehiculo_id: ids.vehiculos.RTV82G,
      tipo: 'anual',
      fecha_inicio: hoy(),
      metodo_pago: 'efectivo',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('MEMBRESIA_TRASLAPADA');
  });

  test('la celda fija no se comparte; el vehículo debe ser del cliente; el operador no crea', async () => {
    const otra = await admin.post('/api/v1/membresias').send({
      usuario_id: 5,
      vehiculo_id: ids.vehiculos.GMR58K,
      tipo: 'mensual',
      fecha_inicio: hoy(),
      celda_asignada_id: ids.celdas['M-06'],
      metodo_pago: 'efectivo',
    });
    expect(otra.status).toBe(409);
    expect(otra.body.error.codigo).toBe('CELDA_CON_MENSUALIDAD');
    const ajeno = await admin.post('/api/v1/membresias').send({
      usuario_id: 4,
      vehiculo_id: ids.vehiculos.GMR58K,
      tipo: 'mensual',
      fecha_inicio: hoy(),
      metodo_pago: 'efectivo',
    });
    expect(ajeno.status).toBe(422);
    expect((await operador.post('/api/v1/membresias').send({})).status).toBe(403);
  });

  test('cancelar libera la celda fija', async () => {
    const res = await admin.patch(`/api/v1/membresias/${creada.id}/cancelar`);
    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe('cancelada');
    expect((await celda('M-06')).estado).toBe('disponible');
  });

  test('tarea programada: vence las expiradas, libera su celda y avisa sin duplicar', async () => {
    await pool.query("UPDATE celdas SET estado = 'reservada' WHERE codigo = 'M-07'");
    const [vencida] = await pool.query(
      `INSERT INTO membresias (usuario_id, vehiculo_id, celda_asignada_id, tipo, valor, fecha_inicio, fecha_fin, estado)
       VALUES (6, ?, ?, 'mensual', 70000, CURDATE() - INTERVAL 40 DAY, CURDATE() - INTERVAL 1 DAY, 'activa')`,
      [ids.vehiculos.BQS19E, ids.celdas['M-07']]
    );
    const [porVencer] = await pool.query(
      `INSERT INTO membresias (usuario_id, vehiculo_id, tipo, valor, fecha_inicio, fecha_fin, estado)
       VALUES (4, ?, 'mensual', 70000, CURDATE() - INTERVAL 28 DAY, CURDATE() + INTERVAL 2 DAY, 'activa')`,
      [ids.vehiculos.XKP45F]
    );

    const r1 = await membresiasService.ejecutarMantenimiento();
    const r2 = await membresiasService.ejecutarMantenimiento();
    expect(r1.vencidas).toBeGreaterThanOrEqual(1);
    expect(r2.avisos).toBe(0);

    const [[m]] = await pool.query('SELECT estado FROM membresias WHERE id = ?', [
      vencida.insertId,
    ]);
    expect(m.estado).toBe('vencida');
    expect((await celda('M-07')).estado).toBe('disponible');
    const [avisos] = await pool.query(
      "SELECT * FROM notificaciones WHERE tipo = 'membresia_por_vencer' AND enlace = ?",
      [`/app/mis-movimientos.html?membresia=${porVencer.insertId}`]
    );
    expect(avisos).toHaveLength(1);
    expect(avisos[0].usuario_id).toBe(4);
    // La mensualidad de la semilla que vence en 2 días ya tenía su aviso: no se duplica.
    const [[{ n }]] = await pool.query(
      "SELECT COUNT(*) AS n FROM notificaciones WHERE tipo = 'membresia_por_vencer' AND enlace = '/app/mis-movimientos.html?membresia=2'"
    );
    expect(n).toBe(1);
  });

  test('el cliente ve sus membresías', async () => {
    const res = await andrea.get('/api/v1/usuarios/me/membresias');
    expect(res.status).toBe(200);
    expect(
      res.body.data.some((m) => m.vehiculo.placa === 'MNP908' && m.celda.codigo === 'A-04')
    ).toBe(true);
    expect(res.body.data.every((m) => m.titular.id === 4)).toBe(true);
  });
});
