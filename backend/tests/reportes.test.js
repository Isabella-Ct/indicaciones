// Fase 6 — reportes (REQ-REP-01…11) y dashboard. Requiere `npm run db:reset`.
// Los cálculos de REP-10/11 se prueban con datos propios en marzo de 2024 (la semilla
// solo cubre los últimos 60 días), y se borran al final.
const request = require('supertest');
const { crearApp } = require('../src/app');
const { pool } = require('../src/config/db');

const app = crearApp();

const ADMIN = { tipo_documento: 'CC', numero_documento: '1000000001', contrasena: 'Admin2026*' };
const OPERADOR = {
  tipo_documento: 'CC',
  numero_documento: '1000000002',
  contrasena: 'Operador2026*',
};
const ANDREA = { tipo_documento: 'CC', numero_documento: '1000000004', contrasena: 'Cliente2026*' };

const REPORTES = [
  'usuarios',
  'vehiculos',
  'entradas',
  'salidas',
  'incidencias',
  'pico-placa',
  'celdas-ocupadas',
  'celdas-mas-usadas',
  'vehiculos-frecuentes',
  'ocupacion',
  'financiero',
];
// Semana controlada: lunes 4 a domingo 10 de marzo de 2024.
const LUNES = '2024-03-04';
const DOMINGO = '2024-03-10';

let admin;
let operador;
let andrea;
const creados = { estadias: [], facturas: [], vehiculos: [], reglas: [], denegados: [] };

async function iniciarSesion(credenciales) {
  const agente = request.agent(app);
  expect((await agente.post('/api/v1/auth/login').send(credenciales)).status).toBe(200);
  return agente;
}
const idCelda = async (codigo) =>
  (await pool.query('SELECT id FROM celdas WHERE codigo = ?', [codigo]))[0][0].id;

async function estadia(ticket, vehiculoId, celdaId, entrada, salida) {
  const [r] = await pool.query(
    `INSERT INTO estadias (codigo_ticket, vehiculo_id, celda_id, puerta_entrada_id, puerta_salida_id,
       fecha_hora_entrada, fecha_hora_salida, minutos_estadia, estado, registrada_entrada_por, registrada_salida_por)
     VALUES (?, ?, ?, 1, 1, ?, ?, TIMESTAMPDIFF(MINUTE, ?, ?), 'finalizada', 2, 2)`,
    [ticket, vehiculoId, celdaId, entrada, salida, entrada, salida]
  );
  creados.estadias.push(r.insertId);
  return r.insertId;
}

async function factura(numero, estadiaId, { total, descuento = 0, metodo, fecha }) {
  const [r] = await pool.query(
    `INSERT INTO facturas (numero, concepto, estadia_id, subtotal, descuento_id, porcentaje_descuento,
       valor_descuento, total, metodo_pago, fecha_pago, registrada_por)
     VALUES (?, 'estadia', ?, ?, ?, ?, ?, ?, ?, ?, 2)`,
    [
      numero,
      estadiaId,
      total + descuento,
      descuento ? 1 : null,
      descuento ? 10 : 0,
      descuento,
      total,
      metodo,
      fecha,
    ]
  );
  creados.facturas.push(r.insertId);
}

beforeAll(async () => {
  admin = await iniciarSesion(ADMIN);
  operador = await iniciarSesion(OPERADOR);
  andrea = await iniciarSesion(ANDREA);

  // Datos controlados para REP-10 y REP-11 (lunes 4 y martes 5 de marzo de 2024).
  const [a02, a03, m05] = [await idCelda('A-02'), await idCelda('A-03'), await idCelda('M-05')];
  const carro = (await pool.query("SELECT id FROM vehiculos WHERE placa = 'MNP908'"))[0][0].id;
  const otroCarro = (await pool.query("SELECT id FROM vehiculos WHERE placa = 'HJK740'"))[0][0].id;
  const moto = (await pool.query("SELECT id FROM vehiculos WHERE placa = 'XKP45F'"))[0][0].id;
  // Lunes: A-02 08:00–10:00 y A-03 09:30–11:00 → 8 h: 1 celda, 9 h: 2, 10 h: 1.
  const e1 = await estadia('T-TEST01', carro, a02, `${LUNES} 08:00:00`, `${LUNES} 10:00:00`);
  const e2 = await estadia('T-TEST02', otroCarro, a03, `${LUNES} 09:30:00`, `${LUNES} 11:00:00`);
  // Martes: M-05 14:00–14:45 (moto).
  const e3 = await estadia('T-TEST03', moto, m05, '2024-03-05 14:00:00', '2024-03-05 14:45:00');
  await factura('FAC-TEST01', e1, { total: 10000, metodo: 'efectivo', fecha: `${LUNES} 10:00:00` });
  await factura('FAC-TEST02', e2, { total: 8000, metodo: 'efectivo', fecha: `${LUNES} 11:00:00` });
  await factura('FAC-TEST03', e3, {
    total: 4500,
    descuento: 500,
    metodo: 'tarjeta',
    fecha: '2024-03-05 14:45:00',
  });
});

afterAll(async () => {
  if (creados.facturas.length)
    await pool.query('DELETE FROM facturas WHERE id IN (?)', [creados.facturas]);
  if (creados.estadias.length)
    await pool.query('DELETE FROM estadias WHERE id IN (?)', [creados.estadias]);
  if (creados.denegados.length)
    await pool.query('DELETE FROM accesos_denegados WHERE id IN (?)', [creados.denegados]);
  if (creados.reglas.length)
    await pool.query('DELETE FROM pico_placa WHERE id IN (?)', [creados.reglas]);
  if (creados.vehiculos.length)
    await pool.query('DELETE FROM vehiculos WHERE id IN (?)', [creados.vehiculos]);
  await pool.end();
});

describe('Permisos', () => {
  test.each(REPORTES)('/reportes/%s: 200 admin, 403 operador y cliente', async (reporte) => {
    expect((await admin.get(`/api/v1/reportes/${reporte}`)).status).toBe(200);
    expect((await operador.get(`/api/v1/reportes/${reporte}`)).status).toBe(403);
    expect((await andrea.get(`/api/v1/reportes/${reporte}`)).status).toBe(403);
  });

  test('sin sesión: 401', async () => {
    expect((await request(app).get('/api/v1/reportes/usuarios')).status).toBe(401);
  });
});

describe('Validación de rangos', () => {
  test('más de 366 días o desde > hasta → 422', async () => {
    const largo = await admin.get('/api/v1/reportes/entradas?desde=2024-01-01&hasta=2025-01-02');
    expect(largo.status).toBe(422);
    expect(largo.body.error.detalles[0].mensaje).toMatch(/366/);
    expect(
      (await admin.get('/api/v1/reportes/salidas?desde=2026-02-10&hasta=2026-02-01')).status
    ).toBe(422);
    expect((await admin.get('/api/v1/reportes/financiero?desde=2026-02-30')).status).toBe(422);
  });

  test('sin fechas: los últimos 30 días hasta hoy', async () => {
    const r = await admin.get('/api/v1/reportes/entradas');
    expect(r.body.meta.dias).toBe(30);
  });
});

describe('Listados (REP-01…05)', () => {
  test('REP-01 usuarios con su rol y sin hash', async () => {
    const r = await admin.get('/api/v1/reportes/usuarios?limite=100');
    expect(r.body.meta.total).toBe(9);
    expect(r.body.data[0]).toMatchObject({ rol: 'administrador', numero_documento: '1000000001' });
    expect(JSON.stringify(r.body)).not.toMatch(/contrasena_hash|\$2[aby]\$/);
  });

  test('REP-02 vehículos con propietario', async () => {
    const r = await admin.get('/api/v1/reportes/vehiculos?propietario=con&limite=100');
    expect(r.body.data.every((v) => v.propietario)).toBe(true);
    expect(r.body.data.find((v) => v.placa === 'MNP908').propietario.nombre_completo).toMatch(
      /Andrea/
    );
  });

  test('REP-03/04 entradas y salidas del rango, con puerta, celda y valor', async () => {
    const entradas = await admin.get(`/api/v1/reportes/entradas?desde=${LUNES}&hasta=${DOMINGO}`);
    expect(entradas.body.data.map((e) => e.codigo_ticket).sort()).toEqual([
      'T-TEST01',
      'T-TEST02',
      'T-TEST03',
    ]);
    expect(entradas.body.data[0]).toMatchObject({ puerta: 'Norte' });
    const salidas = await admin.get(`/api/v1/reportes/salidas?desde=${LUNES}&hasta=${LUNES}`);
    expect(salidas.body.meta.total).toBe(2);
    expect(salidas.body.meta.recaudado).toBe(18000);
    expect(salidas.body.data.find((s) => s.codigo_ticket === 'T-TEST02')).toMatchObject({
      minutos_estadia: 90,
      valor: 8000,
      tiempo: '1 h 30 min',
    });
  });
});

describe('REP-06 pico y placa', () => {
  test('con reglas de prueba devuelve exactamente los vehículos restringidos', async () => {
    // Sábado 9 de marzo de 2024: la semilla no tiene reglas los sábados.
    const sabado = '2024-03-09';
    const regla = async (tipo, digito) => {
      const [r] = await pool.query(
        `INSERT INTO pico_placa (tipo_vehiculo, dia_semana, digito, hora_inicio, hora_fin, activa, creado_por)
         VALUES (?, 6, ?, '06:00:00', '10:00:00', 1, 1)`,
        [tipo, digito]
      );
      creados.reglas.push(r.insertId);
    };
    await regla('carro', 8);
    await regla('moto', 4);
    // Una regla inactiva no cuenta.
    const [inactiva] = await pool.query(
      `INSERT INTO pico_placa (tipo_vehiculo, dia_semana, digito, hora_inicio, hora_fin, activa, creado_por)
       VALUES ('carro', 6, 3, '06:00:00', '10:00:00', 0, 1)`
    );
    creados.reglas.push(inactiva.insertId);
    // Un vehículo inactivo con dígito restringido no cuenta.
    const [v] = await pool.query(
      `INSERT INTO vehiculos (placa, tipo, color, marca, modelo, activo, creado_por)
       VALUES ('QQQ998', 'carro', 'Gris', 'Kia', 'Rio', 0, 1)`
    );
    creados.vehiculos.push(v.insertId);
    const [d] = await pool.query(
      `INSERT INTO accesos_denegados (placa, tipo_vehiculo, puerta_id, fecha_hora, motivo, registrado_por)
       VALUES ('QQQ998', 'carro', 1, '${sabado} 07:10:00', 'Pico y placa: prueba', 2)`
    );
    creados.denegados.push(d.insertId);

    const [todos] = await pool.query('SELECT placa, tipo FROM vehiculos WHERE activo = 1');
    const esperados = todos
      .filter((x) =>
        x.tipo === 'carro' ? x.placa.endsWith('8') : x.placa.replace(/\D/g, '')[0] === '4'
      )
      .map((x) => x.placa)
      .sort();

    const r = await admin.get(`/api/v1/reportes/pico-placa?fecha=${sabado}`);
    expect(r.status).toBe(200);
    expect(r.body.data.vehiculos.map((x) => x.placa).sort()).toEqual(esperados);
    expect(r.body.meta.total_restringidos).toBe(esperados.length);
    expect(r.body.meta.dia_nombre).toBe('sábado');
    expect(r.body.data.vehiculos.some((x) => x.placa === 'QQQ998')).toBe(false);
    expect(r.body.data.reglas).toHaveLength(2);
    expect(r.body.data.denegados.map((x) => x.placa)).toEqual(['QQQ998']);
    expect(r.body.data.vehiculos[0].horario).toBe('06:00–10:00');
  });
});

describe('REP-07…09 con datos controlados', () => {
  test('REP-07 celdas ocupadas y máximo simultáneo del lunes', async () => {
    const r = await admin.get(`/api/v1/reportes/celdas-ocupadas?fecha=${LUNES}`);
    expect(r.body.meta).toMatchObject({
      total_celdas_ocupadas: 2,
      estadias: 2,
      maximo_simultaneo: 2,
    });
    expect(new Date(r.body.meta.momento_maximo).toISOString()).toBe('2024-03-04T14:30:00.000Z');
    expect(r.body.data.por_hora.find((h) => h.hora === 9).celdas).toBe(2);
    expect(r.body.data.por_hora.find((h) => h.hora === 12).celdas).toBe(0);
  });

  test('REP-08/09 rankings', async () => {
    const celdas = await admin.get(
      `/api/v1/reportes/celdas-mas-usadas?desde=${LUNES}&hasta=${DOMINGO}`
    );
    expect(celdas.body.meta.total_estadias).toBe(3);
    // Empate a 1 estadía: desempata el tiempo (A-02: 120 min; A-03: 90 min).
    expect(celdas.body.data.slice(0, 2)).toEqual([
      expect.objectContaining({ puesto: 1, codigo: 'A-02', minutos: 120 }),
      expect.objectContaining({ puesto: 2, codigo: 'A-03', minutos: 90 }),
    ]);
    const vehiculos = await admin.get(
      `/api/v1/reportes/vehiculos-frecuentes?desde=${LUNES}&hasta=${DOMINGO}&tipo=moto`
    );
    expect(vehiculos.body.data).toHaveLength(1);
    expect(vehiculos.body.data[0]).toMatchObject({
      placa: 'XKP45F',
      visitas: 1,
      minutos: 45,
      pagado: 4500,
    });
  });
});

describe('REP-10 ocupación día × hora', () => {
  test('promedios, hora pico y día pico con una semana controlada', async () => {
    const r = await admin.get(`/api/v1/reportes/ocupacion?desde=${LUNES}&hasta=${DOMINGO}`);
    expect(r.status).toBe(200);
    const celda = (dia, hora) => r.body.data.matriz.find((c) => c.dia === dia && c.hora === hora);
    expect(celda(1, 8)).toMatchObject({ promedio: 1, muestras: 1 });
    expect(celda(1, 9)).toMatchObject({ promedio: 2, maximo: 2 });
    expect(celda(1, 10).promedio).toBe(1);
    expect(celda(1, 11).promedio).toBe(0);
    expect(celda(2, 14).promedio).toBe(1);
    expect(r.body.data.matriz).toHaveLength(7 * 24);
    expect(r.body.meta.hora_pico.hora).toBe(9);
    expect(r.body.meta.dia_pico.dia_nombre).toBe('lunes');
    expect(r.body.meta.franja_pico).toMatchObject({ dia: 1, hora: 9, promedio: 2 });
    const habilitadas = r.body.meta.habilitadas;
    expect(celda(1, 9).porcentaje).toBe(Math.round((2 / habilitadas) * 1000) / 10);
  });

  test('con dos semanas el promedio se divide entre los dos lunes', async () => {
    const r = await admin.get(`/api/v1/reportes/ocupacion?desde=${LUNES}&hasta=2024-03-17`);
    const lunes9 = r.body.data.matriz.find((c) => c.dia === 1 && c.hora === 9);
    expect(lunes9).toMatchObject({ muestras: 2, promedio: 1 });
  });
});

describe('REP-11 financiero', () => {
  test('totales por período, método, tipo, concepto y descuentos', async () => {
    const r = await admin.get(`/api/v1/reportes/financiero?desde=${LUNES}&hasta=${DOMINGO}`);
    expect(r.status).toBe(200);
    expect(r.body.meta).toMatchObject({
      facturas: 3,
      total: 22500,
      subtotal: 23000,
      descuentos: 500,
      ticket_promedio: 7500,
    });
    const { por_periodo: periodos, por_metodo: metodos, por_tipo_vehiculo: tipos } = r.body.data;
    expect(periodos).toHaveLength(7); // también los días sin facturas
    expect(periodos[0]).toMatchObject({ periodo: LUNES, total: 18000, facturas: 2 });
    expect(periodos[1]).toMatchObject({ periodo: '2024-03-05', total: 4500 });
    expect(periodos[6]).toMatchObject({ periodo: DOMINGO, total: 0, facturas: 0 });
    expect(metodos).toEqual([
      expect.objectContaining({ metodo_pago: 'efectivo', total: 18000, participacion: 80 }),
      expect.objectContaining({ metodo_pago: 'tarjeta', total: 4500, participacion: 20 }),
    ]);
    expect(tipos).toEqual([
      expect.objectContaining({ tipo: 'carro', total: 18000 }),
      expect.objectContaining({ tipo: 'moto', total: 4500 }),
    ]);
    expect(r.body.data.descuentos).toEqual([
      expect.objectContaining({ nombre: 'Cliente frecuente', descuentos: 500, facturas: 1 }),
    ]);
  });

  test('agrupado por semana y por mes', async () => {
    const semana = await admin.get(
      `/api/v1/reportes/financiero?desde=${LUNES}&hasta=${DOMINGO}&agrupar=semana`
    );
    expect(semana.body.data.por_periodo).toEqual([
      expect.objectContaining({ periodo: LUNES, total: 22500, facturas: 3 }),
    ]);
    const mes = await admin.get(
      '/api/v1/reportes/financiero?desde=2024-02-15&hasta=2024-03-31&agrupar=mes'
    );
    expect(mes.body.data.por_periodo.map((p) => [p.periodo, p.total])).toEqual([
      ['2024-02', 0],
      ['2024-03', 22500],
    ]);
  });
});

describe('CSV', () => {
  test('UTF-8 con BOM, separador ";" y tildes', async () => {
    const r = await admin.get('/api/v1/reportes/usuarios?formato=csv');
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toMatch(/text\/csv; charset=utf-8/);
    expect(r.headers['content-disposition']).toMatch(
      /attachment; filename="reporte-usuarios\.csv"/
    );
    expect(r.text.charCodeAt(0)).toBe(0xfeff);
    const lineas = r.text.slice(1).trim().split('\r\n');
    expect(lineas[0].split(';')).toEqual(
      expect.arrayContaining(['Código', 'Número documento', 'Último acceso', 'Vehículos'])
    );
    expect(lineas).toHaveLength(10); // encabezado + 9 usuarios (sin paginar)
    expect(lineas.some((l) => l.includes('Hernán'))).toBe(true);
    expect(r.text).not.toMatch(/\$2[aby]\$/);
  });

  test('los textos con ";" o comillas van entre comillas; sin fórmulas', async () => {
    const { aCsv } = require('../src/utils/csv');
    const csv = aCsv(
      [
        { titulo: 'A', valor: (f) => f.a },
        { titulo: 'B', valor: (f) => f.b },
      ],
      [{ a: 'Rayón; puerta "trasera"', b: '=SUMA(A1)' }]
    );
    expect(csv).toBe('﻿A;B\r\n"Rayón; puerta ""trasera""";\'=SUMA(A1)\r\n');
  });

  test('REP-11 en CSV trae todas las secciones y el total', async () => {
    const r = await admin.get(
      `/api/v1/reportes/financiero?desde=${LUNES}&hasta=${DOMINGO}&formato=csv`
    );
    expect(r.text).toMatch(/Por método de pago;Efectivo;2;18000;0;18000/);
    expect(r.text).toMatch(/Total;2024-03-04 a 2024-03-10;3;23000;500;22500/);
  });
});

describe('Rendimiento', () => {
  test('cada reporte responde en menos de 1 s con la semilla (rango de 366 días)', async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const hace = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    for (const reporte of REPORTES) {
      const t = Date.now();
      const r = await admin.get(`/api/v1/reportes/${reporte}?desde=${hace}&hasta=${hoy}`);
      expect(r.status).toBe(200);
      expect(Date.now() - t).toBeLessThan(1000);
    }
  });
});

describe('Dashboard por rol', () => {
  test('admin: negocio; operador: turno; cliente: sus vehículos', async () => {
    const a = (await admin.get('/api/v1/dashboard')).body.data;
    expect(a.rol).toBe('administrador');
    expect(a).toHaveProperty('ingresos.hoy');
    expect(a).toHaveProperty('accesos_denegados_hoy');
    expect(a.ocupacion_por_hora.map((f) => f.hora)).toEqual([6, 8, 10, 12, 14, 16, 18, 20, 22]);
    expect(a.ultimos_movimientos.length).toBeGreaterThan(0);

    const o = (await operador.get('/api/v1/dashboard')).body.data;
    expect(o.rol).toBe('operador');
    expect(o).toHaveProperty('turno.mis_entradas');
    expect(o).toHaveProperty('pico_placa_hoy.reglas');
    expect(o).not.toHaveProperty('ingresos');

    const c = (await andrea.get('/api/v1/dashboard')).body.data;
    expect(c.rol).toBe('usuario');
    expect(c.vehiculos.map((v) => v.placa).sort()).toEqual(['MNP908', 'XKP45F']);
    expect(c.vehiculos.find((v) => v.placa === 'XKP45F')).toMatchObject({
      dentro: true,
      estadia: { celda: 'M-01' },
    });
    expect(c.membresia_activa.vehiculo.placa).toBe('MNP908');
    expect(c).not.toHaveProperty('ingresos');
    expect(c).not.toHaveProperty('ultimos_movimientos');
  });
});
