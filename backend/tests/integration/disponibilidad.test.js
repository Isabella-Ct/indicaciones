// Pruebas de la disponibilidad pública (spec 004: HU-24).
const { pool } = require('../../src/config/db');
const { app, request, tokenDe } = require('../setup/helpers');
const { crearParqueadero, crearCeldas, crearVehiculo, ocuparPorSql } = require('../setup/infraestructura');

const consultar = (query = '') => request(app).get(`/api/v1/disponibilidad${query}`);

describe('HU-24 Consultar la disponibilidad en tiempo real', () => {
  let id;
  let celdas;
  beforeAll(async () => {
    const admin = await tokenDe('admin');
    id = await crearParqueadero(admin);
    celdas = {
      carro: await crearCeldas(admin, id, { prefijo: 'D-', cantidad: 3 }),
      moto: await crearCeldas(admin, id, { prefijo: 'E-', cantidad: 2, tipoVehiculo: 'moto' }),
    };
    await pool.query("UPDATE celda SET estado = 'inhabilitada', motivo_inhabilitacion = 'Prueba' WHERE id_celda = ?", [celdas.carro[2]]);
    await ocuparPorSql(celdas.carro[0], (await crearVehiculo()).id);
  });

  test('HU-24 E1 sin sesión: disponibles y totales por tipo, con la hora de actualización', async () => {
    const res = await consultar(`?parqueadero=${id}`);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.data.actualizadoEn).toMatch(/-05:00$/);
    expect(res.body.data.parqueaderos).toHaveLength(1);
    expect(res.body.data.parqueaderos[0].tipos).toEqual({
      carro: { disponibles: 1, total: 2, lleno: false },
      moto: { disponibles: 2, total: 2, lleno: false },
    });
    const todos = await consultar();
    const nombres = todos.body.data.parqueaderos.map((p) => p.nombre);
    expect(nombres).toContain('Parqueadero ABC');
    expect(nombres).not.toContain('Parqueadero ABC · Zona anexa');
  });

  test('HU-24 E2 sin motos disponibles el indicador muestra «Lleno»', async () => {
    await pool.query("UPDATE celda SET estado = 'reservada' WHERE id_celda IN (?)", [celdas.moto]);
    const res = await consultar(`?parqueadero=${id}`);
    expect(res.body.data.parqueaderos[0].tipos.moto).toEqual({ disponibles: 0, total: 2, lleno: true });
    await pool.query("UPDATE celda SET estado = 'disponible' WHERE id_celda IN (?)", [celdas.moto]);
  });

  test('HU-24 E3 no se muestra ninguna placa ni dato personal; parámetro inválido → 422', async () => {
    const res = await consultar();
    const texto = JSON.stringify(res.body);
    const [placas] = await pool.query('SELECT placa FROM vehiculo');
    for (const { placa } of placas) expect(texto).not.toContain(placa);
    expect(texto).not.toMatch(/correo|documento|celular|placa/i);
    expect((await consultar('?parqueadero=abc')).status).toBe(422);
  });
});
