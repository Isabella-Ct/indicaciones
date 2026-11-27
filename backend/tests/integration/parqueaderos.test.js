// Pruebas de integración de parqueaderos y puertas (spec 004: HU-17, HU-18, HU-19).
const { pool } = require('../../src/config/db');
const { app, request, tokenDe, auth } = require('../setup/helpers');
const { crearParqueadero, crearCeldas, crearVehiculo, ocuparPorSql, sufijo } = require('../setup/infraestructura');

let admin;
let operador;
let cliente;
beforeAll(async () => {
  [admin, operador, cliente] = await Promise.all([tokenDe('admin'), tokenDe('operador'), tokenDe('cliente')]);
});

const api = (metodo, ruta, token = admin) => request(app)[metodo](`/api/v1${ruta}`).set(auth(token));

// ====================================================================== HU-17
describe('HU-17 Registrar un parqueadero', () => {
  test('HU-17 E1 crea el parqueadero activo con horario por defecto', async () => {
    const res = await api('post', '/parqueaderos').send({ nombre: `  Sede Norte ${sufijo()} `, direccion: 'Calle 50 # 40-20', pisos: 3 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ estado: 'activo', pisos: 3, horario: '24 horas', celdas: { carro: 0, moto: 0, total: 0 } });
    expect(res.body.data.nombre).toMatch(/^Sede Norte \d+$/);
    const [[b]] = await pool.query("SELECT COUNT(*) AS n FROM bitacora WHERE entidad = 'parqueadero' AND id_registro = ?", [
      res.body.data.idParqueadero,
    ]);
    expect(b.n).toBe(1);
  });

  test('HU-17 E2 nombre repetido (sin distinguir mayúsculas) → 409', async () => {
    const res = await api('post', '/parqueaderos').send({ nombre: 'PARQUEADERO abc', direccion: 'Calle 1 # 2-3', pisos: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'PARQUEADERO_DUPLICADO', message: 'Ya existe un parqueadero con ese nombre.' });
  });

  test('HU-17 E3 dirección vacía o 0 pisos → 422 en el campo', async () => {
    const res = await api('post', '/parqueaderos').send({ nombre: `Sin datos ${sufijo()}`, direccion: '', pisos: 0 });
    expect(res.status).toBe(422);
    expect(res.body.error.details.map((d) => d.campo).sort()).toEqual(['direccion', 'pisos']);
    expect((await api('post', '/parqueaderos').send({ nombre: 'Muchos', direccion: 'Calle 1 # 2-3', pisos: 21 })).status).toBe(422);
  });

  test('HU-17 E4 listado paginado con total de celdas por tipo y búsqueda por nombre', async () => {
    const res = await api('get', '/parqueaderos?q=abc', operador);
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 10 });
    const abc = res.body.data.find((p) => p.nombre === 'Parqueadero ABC');
    expect(abc).toMatchObject({ estado: 'activo', direccion: 'Carrera 43 # 47-53, Medellín', pisos: 2 });
    expect(abc.celdas.carro).toBeGreaterThanOrEqual(24);
    expect(abc.celdas.moto).toBeGreaterThanOrEqual(12);
    expect(res.body.data.every((p) => /abc/i.test(p.nombre))).toBe(true);
    expect((await api('get', '/parqueaderos', cliente)).status).toBe(403);
  });

  test('HU-17 E5 detalle con puertas y resumen por piso; inexistente → 404', async () => {
    const res = await api('get', '/parqueaderos/1');
    expect(res.status).toBe(200);
    expect(res.body.data.puertas.map((p) => p.nombre)).toEqual(expect.arrayContaining(['Carrera 43', 'Calle 47', 'Calle 48']));
    expect(res.body.data.resumen).toEqual(
      expect.arrayContaining([expect.objectContaining({ piso: 1, tipoVehiculo: 'moto', total: expect.any(Number) })])
    );
    const no = await api('get', '/parqueaderos/9999');
    expect(no.status).toBe(404);
    expect(no.body.error.code).toBe('PARQUEADERO_NO_ENCONTRADO');
  });
});

// ====================================================================== HU-18
describe('HU-18 Actualizar o inactivar un parqueadero', () => {
  const datos = (cambios = {}) => ({ nombre: `Editable ${sufijo()}`, direccion: 'Calle 10 # 20-30', pisos: 3, ...cambios });

  test('HU-18 E1 cambia el horario y registra solo la diferencia', async () => {
    const id = await crearParqueadero(admin);
    const actual = (await api('get', `/parqueaderos/${id}`)).body.data;
    const res = await api('put', `/parqueaderos/${id}`).send({
      nombre: actual.nombre,
      direccion: actual.direccion,
      pisos: actual.pisos,
      horario: '6:00 a. m. – 10:00 p. m.',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.horario).toBe('6:00 a. m. – 10:00 p. m.');
    const [[b]] = await pool.query("SELECT valor_anterior, valor_nuevo FROM bitacora WHERE entidad = 'parqueadero' AND id_registro = ? AND accion = 'editar'", [id]);
    expect(b.valor_nuevo).toEqual({ horario: '6:00 a. m. – 10:00 p. m.' });
  });

  test('HU-18 E2 inactivar saca de servicio sus celdas y reactivar las devuelve', async () => {
    const id = await crearParqueadero(admin);
    const celdas = await crearCeldas(admin, id, { cantidad: 3 });
    await api('patch', `/celdas/${celdas[2]}/estado`).send({ estado: 'inhabilitada', motivo: 'Mantenimiento' });

    const inactivo = await api('delete', `/parqueaderos/${id}`);
    expect(inactivo.status).toBe(200);
    expect(inactivo.body.data.estado).toBe('inactivo');
    const [enServicio] = await pool.query('SELECT estado, motivo_inhabilitacion FROM celda WHERE id_parqueadero = ? ORDER BY codigo', [id]);
    expect(enServicio.map((c) => c.motivo_inhabilitacion)).toEqual(['Parqueadero inactivo', 'Parqueadero inactivo', 'Mantenimiento']);

    const nombre = (await api('get', `/parqueaderos/${id}`)).body.data.nombre;
    const activo = await api('put', `/parqueaderos/${id}`).send({ nombre, direccion: 'Calle 10 # 20-30', pisos: 2, estado: 'activo' });
    expect(activo.status).toBe(200);
    const [despues] = await pool.query('SELECT estado FROM celda WHERE id_parqueadero = ? ORDER BY codigo', [id]);
    expect(despues.map((c) => c.estado)).toEqual(['disponible', 'disponible', 'inhabilitada']);
  });

  test('HU-18 E3 con vehículos dentro no se inactiva (409 con la cantidad)', async () => {
    const id = await crearParqueadero(admin);
    const celdas = await crearCeldas(admin, id, { cantidad: 2 });
    await ocuparPorSql(celdas[0], (await crearVehiculo()).id);
    await ocuparPorSql(celdas[1], (await crearVehiculo()).id);
    const res = await api('delete', `/parqueaderos/${id}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'PARQUEADERO_CON_VEHICULOS', message: 'Hay 2 vehículos dentro del parqueadero.' });
  });

  test('HU-18 E4 no se reducen los pisos por debajo del piso más alto con celdas (409)', async () => {
    const id = await crearParqueadero(admin, { pisos: 3 });
    await crearCeldas(admin, id, { cantidad: 1, piso: 3 });
    const nombre = (await api('get', `/parqueaderos/${id}`)).body.data.nombre;
    const res = await api('put', `/parqueaderos/${id}`).send({ nombre, direccion: 'Calle 10 # 20-30', pisos: 2 });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'PISOS_CON_CELDAS', message: 'Hay celdas registradas en el piso 3.' });
  });

  test('HU-18 E5 nombre de otro → 409; datos inválidos → 422; inexistente → 404; sin cambiar_estado → 403', async () => {
    const id = await crearParqueadero(admin);
    expect((await api('put', `/parqueaderos/${id}`).send(datos({ nombre: 'Parqueadero ABC' }))).status).toBe(409);
    expect((await api('put', `/parqueaderos/${id}`).send(datos({ pisos: 'muchos' }))).status).toBe(422);
    expect((await api('put', '/parqueaderos/9999').send(datos())).status).toBe(404);
    expect((await api('delete', `/parqueaderos/${id}`, operador)).status).toBe(403);
  });
});

// ====================================================================== HU-19
describe('HU-19 Configurar las puertas de acceso', () => {
  test('HU-19 E1 agrega una puerta mixta disponible para entradas y salidas', async () => {
    const id = await crearParqueadero(admin);
    const res = await api('post', `/parqueaderos/${id}/puertas`).send({ nombre: 'Carrera 43', tipo: 'mixta' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ nombre: 'Carrera 43', tipo: 'mixta', estado: 'activo', idParqueadero: id });
    for (const uso of ['entrada', 'salida']) {
      const lista = await api('get', `/parqueaderos/${id}/puertas?uso=${uso}`, operador);
      expect(lista.body.data.map((p) => p.nombre)).toContain('Carrera 43');
    }
  });

  test('HU-19 E2 nombre repetido en el mismo parqueadero → 409', async () => {
    const res = await api('post', '/parqueaderos/1/puertas').send({ nombre: 'carrera 43', tipo: 'entrada' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PUERTA_DUPLICADA');
  });

  test('HU-19 E3 para entradas no aparecen las puertas de salida ni las inactivas', async () => {
    const res = await api('get', '/parqueaderos/1/puertas?uso=entrada', operador);
    expect(res.status).toBe(200);
    const nombres = res.body.data.map((p) => p.nombre);
    expect(nombres).toEqual(expect.arrayContaining(['Carrera 43', 'Calle 47']));
    expect(nombres).not.toContain('Calle 48');
    expect((await api('get', '/parqueaderos/1/puertas?uso=lateral')).status).toBe(422);
  });

  test('HU-19 E4 edita e inactiva una puerta; parqueadero inactivo no admite puertas', async () => {
    const id = await crearParqueadero(admin);
    const puerta = (await api('post', `/parqueaderos/${id}/puertas`).send({ nombre: 'Lateral', tipo: 'entrada' })).body.data;
    const res = await api('put', `/puertas/${puerta.idPuerta}`).send({ nombre: 'Lateral norte', tipo: 'salida', estado: 'inactivo' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ nombre: 'Lateral norte', tipo: 'salida', estado: 'inactivo' });
    expect((await api('get', `/parqueaderos/${id}/puertas?uso=salida`)).body.data).toHaveLength(0);
    expect((await api('put', '/puertas/9999').send({ nombre: 'X1', tipo: 'mixta' })).status).toBe(404);
    expect((await api('post', '/parqueaderos/2/puertas').send({ nombre: 'Nueva', tipo: 'mixta' })).body.error.code).toBe('PARQUEADERO_INACTIVO');
  });
});
