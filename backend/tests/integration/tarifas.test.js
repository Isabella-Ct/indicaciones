// Pruebas de integración de tarifas (spec 008: HU-36, HU-37, HU-38). La semilla tiene las cuatro combinaciones
// vigentes sin fin, así que cada tarifa nueva empieza después de la más reciente de su combinación y cierra la
// anterior (research R-08). El reloj del servidor queda fijo en el domingo 29 de noviembre de 2026.
const { pool } = require('../../src/config/db');
const tarifas = require('../../src/modules/tarifas/tarifas.service');
const { enBogota, sumarDias } = require('../../src/utils/fechas');
const { app, request, tokenDe, auth } = require('../setup/helpers');
const { crearParqueadero, crearCeldas, crearVehiculo, abrirMovimiento } = require('../setup/infraestructura');
const { fijarReloj, DOMINGO_10AM } = require('../setup/sede');

let admin;
let operador;
let cliente;
beforeAll(async () => {
  [admin, operador, cliente] = await Promise.all([tokenDe('admin'), tokenDe('operador'), tokenDe('cliente')]);
});
beforeEach(() => fijarReloj(DOMINGO_10AM));
afterEach(() => jest.restoreAllMocks());

const api = (metodo, ruta, token = admin) => request(app)[metodo](`/api/v1${ruta}`).set(auth(token));

/** Día siguiente al inicio más reciente de la combinación (o mañana), como 'AAAA-MM-DD'. */
async function siguienteInicio(tipoVehiculo, tipoCliente) {
  const [[{ maximo }]] = await pool.query(
    "SELECT MAX(vigente_desde) AS maximo FROM tarifa WHERE tipo_vehiculo = ? AND tipo_cliente = ? AND estado = 'activo'",
    [tipoVehiculo, tipoCliente]
  );
  const base = maximo && maximo > new Date(DOMINGO_10AM) ? enBogota(maximo).fecha : '2026-11-29';
  return sumarDias(base, 1);
}

const datos = (cambios = {}) => ({
  nombre: 'Carro ocasional',
  tipoVehiculo: 'carro',
  tipoCliente: 'ocasional',
  valorPrimeraHora: 4000,
  minutosFraccion: 15,
  valorFraccion: 1000,
  topeDiario: 30000,
  minutosGracia: 10,
  ...cambios,
});

/** Crea una tarifa nueva de moto ocasional cerrando la anterior; devuelve su cuerpo. */
async function nuevaMoto(cambios = {}) {
  const res = await api('post', '/tarifas').send(
    datos({ nombre: 'Moto ocasional nueva', tipoVehiculo: 'moto', valorPrimeraHora: 2500, topeDiario: 13000, vigenteDesde: await siguienteInicio('moto', 'ocasional'), cerrarAnterior: true, ...cambios })
  );
  if (res.status !== 201) throw new Error(JSON.stringify(res.body));
  return res.body.data;
}

// ====================================================================== HU-36
describe('HU-36 Configurar una tarifa', () => {
  test('HU-36 E1 vigente desde mañana: queda programada y cierra la anterior en ese instante', async () => {
    const desde = await siguienteInicio('carro', 'ocasional');
    const res = await api('post', '/tarifas').send(datos({ vigenteDesde: desde, cerrarAnterior: true }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      tipoVehiculo: 'carro',
      tipoCliente: 'ocasional',
      valorPrimeraHora: 4000,
      minutosFraccion: 15,
      valorFraccion: 1000,
      topeDiario: 30000,
      minutosGracia: 10,
      vigenteDesde: `${desde}T00:00:00-05:00`,
      vigenteHasta: null,
      estado: 'activo',
      situacion: 'programada',
      usada: false,
    });
    const [[anterior]] = await pool.query(
      "SELECT vigente_hasta FROM tarifa WHERE tipo_vehiculo = 'carro' AND tipo_cliente = 'ocasional' AND estado = 'activo' AND id_tarifa <> ? ORDER BY vigente_desde DESC LIMIT 1",
      [res.body.data.idTarifa]
    );
    expect(enBogota(anterior.vigente_hasta).fecha).toBe(desde);
    const [[b]] = await pool.query("SELECT COUNT(*) AS n FROM bitacora WHERE entidad = 'tarifa' AND accion = 'cerrar_vigencia'");
    expect(b.n).toBeGreaterThan(0);
  });

  test('HU-36 E2 superpuesta sin cerrar la anterior → 409 con la tarifa existente', async () => {
    const res = await api('post', '/tarifas').send(datos({ tipoVehiculo: 'moto', tipoCliente: 'registrado', valorPrimeraHora: 1800, topeDiario: 10000, vigenteDesde: '2026-12-01' }));
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'TARIFA_SUPERPUESTA', message: 'Ya existe una tarifa activa para moto registrado en ese periodo.' });
    const [[semilla]] = await pool.query("SELECT id_tarifa FROM tarifa WHERE nombre = 'Moto registrado' AND vigente_desde = '2026-01-01 00:00:00'");
    expect(res.body.error.details).toEqual([{ campo: 'idTarifa', mensaje: String(semilla.id_tarifa) }]);
    // Una que empieza antes que la existente no se puede «cerrar»: también 409.
    expect((await api('post', '/tarifas').send(datos({ tipoVehiculo: 'moto', tipoCliente: 'registrado', valorPrimeraHora: 1800, topeDiario: 10000, vigenteDesde: '2025-06-01', cerrarAnterior: true }))).status).toBe(409);
  });

  test('HU-36 E3 valores incoherentes → 422 en el campo', async () => {
    const casos = [
      [{ valorPrimeraHora: 0 }, 'valorPrimeraHora'],
      [{ topeDiario: 3000 }, 'topeDiario'],
      [{ minutosFraccion: 0 }, 'minutosFraccion'],
      [{ minutosFraccion: 61 }, 'minutosFraccion'],
      [{ valorFraccion: -1 }, 'valorFraccion'],
      [{ minutosGracia: 31 }, 'minutosGracia'],
      [{ vigenteHasta: '2030-01-01' }, 'vigenteHasta'],
      [{ vigenteDesde: '2030-02-30' }, 'vigenteDesde'],
      [{ nombre: 'AB' }, 'nombre'],
      [{ tipoCliente: 'vip' }, 'tipoCliente'],
    ];
    for (const [cambios, campo] of casos) {
      const res = await api('post', '/tarifas').send(datos({ vigenteDesde: '2030-06-01', ...cambios }));
      expect(res.status).toBe(422);
      expect(res.body.error.details.map((d) => d.campo)).toContain(campo);
    }
  });

  test('HU-36 E4 el Operador y el Cliente no crean tarifas (403)', async () => {
    for (const token of [operador, cliente]) {
      expect((await api('post', '/tarifas', token).send(datos({ vigenteDesde: '2030-06-01' }))).status).toBe(403);
    }
  });
});

// ====================================================================== HU-37
describe('HU-37 Actualizar o inactivar una tarifa', () => {
  test('HU-37 E1 cambiar la fracción de una tarifa sin uso queda en la bitácora', async () => {
    const t = await nuevaMoto();
    const desde = t.vigenteDesde.slice(0, 10);
    const res = await api('put', `/tarifas/${t.idTarifa}`).send(datos({ nombre: t.nombre, tipoVehiculo: 'moto', valorPrimeraHora: 2500, topeDiario: 13000, valorFraccion: 700, vigenteDesde: desde }));
    expect(res.status).toBe(200);
    expect(res.body.data.valorFraccion).toBe(700);
    const [[b]] = await pool.query("SELECT valor_anterior, valor_nuevo FROM bitacora WHERE entidad = 'tarifa' AND accion = 'editar' AND id_registro = ?", [t.idTarifa]);
    expect(b).toEqual({ valor_anterior: { valorFraccion: 1000 }, valor_nuevo: { valorFraccion: 700 } });
  });

  test('HU-37 E2 una tarifa usada solo cambia nombre y cierre de vigencia', async () => {
    const t = await nuevaMoto();
    const desde = t.vigenteDesde.slice(0, 10);
    const idParqueadero = await crearParqueadero(admin);
    const [idCelda] = await crearCeldas(admin, idParqueadero, { prefijo: 'L-', cantidad: 1, tipoVehiculo: 'moto' });
    const vehiculo = await crearVehiculo('moto');
    const idMovimiento = await abrirMovimiento(vehiculo.id, idCelda);
    await pool.query('INSERT INTO liquidacion (id_movimiento, id_tarifa, minutos_cobrados, valor_bruto, valor_total) VALUES (?, ?, 60, 2500, 2500)', [idMovimiento, t.idTarifa]);

    const base = datos({ nombre: t.nombre, tipoVehiculo: 'moto', valorPrimeraHora: 2500, topeDiario: 13000, vigenteDesde: desde });
    const precio = await api('put', `/tarifas/${t.idTarifa}`).send({ ...base, valorPrimeraHora: 3000 });
    expect(precio.status).toBe(409);
    expect(precio.body.error).toEqual({ code: 'TARIFA_USADA', message: 'La tarifa ya se usó en liquidaciones: cree una tarifa nueva con vigencia y cierre la actual.' });
    const nombre = await api('put', `/tarifas/${t.idTarifa}`).send({ ...base, nombre: 'Moto ocasional (usada)', vigenteHasta: sumarDias(desde, 30) });
    expect(nombre.status).toBe(200);
    expect(nombre.body.data).toMatchObject({ nombre: 'Moto ocasional (usada)', usada: true, vigenteHasta: `${sumarDias(desde, 30)}T00:00:00-05:00` });
    // Reabrir la vigencia (sin fin) también es solo un cambio de cierre: se permite.
    const reabierta = await api('put', `/tarifas/${t.idTarifa}`).send({ ...base, nombre: 'Moto ocasional (usada)', vigenteHasta: null });
    expect(reabierta.status).toBe(200);
    expect(reabierta.body.data.vigenteHasta).toBeNull();
  });

  test('HU-37 E3 inactivar la única vigente pide confirmación; con ella se inactiva', async () => {
    const [[t]] = await pool.query("SELECT id_tarifa FROM tarifa WHERE nombre = 'Carro registrado' AND vigente_desde = '2026-01-01 00:00:00'");
    const sinConfirmar = await api('patch', `/tarifas/${t.id_tarifa}/estado`).send({ estado: 'inactivo' });
    expect(sinConfirmar.status).toBe(409);
    expect(sinConfirmar.body.error.code).toBe('UNICA_TARIFA_VIGENTE');
    expect(sinConfirmar.body.error.message).toContain('carro registrado');
    const confirmada = await api('patch', `/tarifas/${t.id_tarifa}/estado`).send({ estado: 'inactivo', confirmar: true });
    expect(confirmada.status).toBe(200);
    expect(confirmada.body.data).toMatchObject({ estado: 'inactivo', situacion: 'inactiva' });
    // Se reactiva (no se superpone con nada) para no dejar el tipo sin tarifa.
    expect((await api('patch', `/tarifas/${t.id_tarifa}/estado`).send({ estado: 'activo' })).status).toBe(200);
    expect((await api('patch', `/tarifas/${t.id_tarifa}/estado`, operador).send({ estado: 'inactivo' })).status).toBe(403);
  });

  test('HU-37 E4 edición superpuesta → 409; inválida → 422; inexistente → 404; reactivar superpuesta → 409', async () => {
    const t = await nuevaMoto();
    const desde = t.vigenteDesde.slice(0, 10);
    const base = datos({ nombre: t.nombre, tipoVehiculo: 'moto', valorPrimeraHora: 2500, topeDiario: 13000, vigenteDesde: desde });
    expect((await api('put', `/tarifas/${t.idTarifa}`).send({ ...base, vigenteDesde: '2026-01-01' })).status).toBe(409);
    expect((await api('put', `/tarifas/${t.idTarifa}`).send({ ...base, topeDiario: 100 })).status).toBe(422);
    expect((await api('put', '/tarifas/999999').send(base)).status).toBe(404);
    expect((await api('patch', '/tarifas/999999/estado').send({ estado: 'activo' })).status).toBe(404);
    // La de 2025 está inactiva y no choca con nada al reactivarla… pero su periodo ya pasó: solo se prueba el choque
    // inactivando la nueva, creando otra en su lugar y reactivando la primera.
    await api('patch', `/tarifas/${t.idTarifa}/estado`).send({ estado: 'inactivo', confirmar: true });
    const reemplazo = await api('post', '/tarifas').send({ ...base, nombre: 'Reemplazo' });
    expect(reemplazo.status).toBe(201);
    const reactivar = await api('patch', `/tarifas/${t.idTarifa}/estado`).send({ estado: 'activo' });
    expect(reactivar.status).toBe(409);
    expect(reactivar.body.error.code).toBe('TARIFA_SUPERPUESTA');
  });
});

// ====================================================================== HU-38
describe('HU-38 Consultar las tarifas vigentes', () => {
  test('HU-38 E1 sin sesión: vigentes por tipo de vehículo y cliente, sin datos internos', async () => {
    const res = await request(app).get('/api/v1/tarifas?vigentes=true');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    const vigentes = res.body.data.filter((t) => t.situacion === 'vigente');
    expect(vigentes.map((t) => `${t.tipoVehiculo} ${t.tipoCliente}`).sort()).toEqual(['carro ocasional', 'carro registrado', 'moto ocasional', 'moto registrado']);
    expect(vigentes.find((t) => t.tipoVehiculo === 'carro' && t.tipoCliente === 'ocasional')).toMatchObject({ valorPrimeraHora: 4000, valorFraccion: 1000, minutosFraccion: 15, topeDiario: 30000, minutosGracia: 10 });
    for (const t of res.body.data) {
      expect(t).not.toHaveProperty('usada');
      expect(t).not.toHaveProperty('estado');
    }
    expect(res.body.data.map((t) => t.nombre)).not.toContain('Carro ocasional 2025');
    expect((await request(app).get('/api/v1/tarifas?vigentes=true&tipoVehiculo=bus')).status).toBe(422);
  });

  test('HU-38 E2 la programada aparece con su fecha de inicio', async () => {
    const res = await request(app).get('/api/v1/tarifas?vigentes=true&tipoVehiculo=carro&tipoCliente=ocasional');
    const programada = res.body.data.find((t) => t.situacion === 'programada');
    expect(programada).toBeDefined();
    expect(programada.vigenteDesde).toMatch(/T00:00:00-05:00$/);
    // El listado administrativo exige sesión y permiso; el Cliente lo ve (tarifas.ver).
    expect((await request(app).get('/api/v1/tarifas')).status).toBe(401);
    const admin = await api('get', '/tarifas?estado=inactivo', cliente);
    expect(admin.status).toBe(200);
    expect(admin.body.data.map((t) => t.nombre)).toContain('Carro ocasional 2025');
  });

  test('HU-38 E3 vigenteEn: la tarifa activa que contiene el instante, o ninguna', async () => {
    const enJunio = await tarifas.vigenteEn({ tipoVehiculo: 'carro', tipoCliente: 'ocasional', fechaHora: new Date('2026-06-01T08:00:00-05:00') });
    expect(enJunio).toMatchObject({ nombre: 'Carro ocasional', valorPrimeraHora: 4000 });
    expect(await tarifas.vigenteEn({ tipoVehiculo: 'carro', tipoCliente: 'ocasional', fechaHora: new Date('2025-06-01T08:00:00-05:00') })).toBeNull();
    const futuro = await tarifas.vigenteEn({ tipoVehiculo: 'carro', tipoCliente: 'ocasional', fechaHora: new Date('2099-06-01T08:00:00-05:00') });
    expect(futuro.vigenteDesde > new Date(DOMINGO_10AM)).toBe(true);
  });
});
