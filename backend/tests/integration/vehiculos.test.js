// Pruebas de integración de vehículos (spec 005: HU-25, HU-26, HU-27, HU-28).
// Usuarios de la semilla: 4 Andrea (cliente de las pruebas), 5 Carlos, 6 Valentina, 7 Mateo (inactivo).
const { pool } = require('../../src/config/db');
const { app, request, tokenDe, auth } = require('../setup/helpers');
const { crearParqueadero, crearCeldas, placaAleatoria, abrirMovimiento } = require('../setup/infraestructura');

let admin;
let operador;
let cliente;
beforeAll(async () => {
  [admin, operador, cliente] = await Promise.all([tokenDe('admin'), tokenDe('operador'), tokenDe('cliente')]);
});

const api = (metodo, ruta, token = admin) => request(app)[metodo](`/api/v1${ruta}`).set(auth(token));
const datos = (cambios = {}) => ({ placa: placaAleatoria(), tipo: 'carro', color: 'Rojo', marca: 'Chevrolet', modelo: 2018, ...cambios });

/** Registra un vehículo por la API (como Operador) y devuelve su cuerpo. */
async function nuevo(cambios = {}, token = operador) {
  const res = await api('post', '/vehiculos', token).send(datos(cambios));
  if (res.status !== 201) throw new Error(`No se registró el vehículo: ${JSON.stringify(res.body)}`);
  return res.body.data;
}

const periodos = async (id) =>
  (await pool.query('SELECT id_usuario, fecha_hasta FROM historial_propietario WHERE id_vehiculo = ? ORDER BY id_historial', [id]))[0];

// ====================================================================== HU-25
describe('HU-25 Registrar un vehículo', () => {
  test('HU-25 E1 guarda la placa normalizada y responde 201', async () => {
    const placa = placaAleatoria();
    const res = await api('post', '/vehiculos', operador).send(datos({ placa: `${placa.slice(0, 3).toLowerCase()} ${placa.slice(3)}` }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ placa, tipo: 'carro', color: 'Rojo', marca: 'Chevrolet', modelo: 2018, propietario: null, dentro: false });
    const [[b]] = await pool.query("SELECT COUNT(*) AS n FROM bitacora WHERE entidad = 'vehiculo' AND accion = 'crear' AND id_registro = ?", [
      res.body.data.idVehiculo,
    ]);
    expect(b.n).toBe(1);
  });

  test('HU-25 E2 la placa ya registrada (con guion o minúsculas) → 409', async () => {
    const res = await api('post', '/vehiculos', operador).send(datos({ placa: 'abc-123' }));
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'PLACA_DUPLICADA', message: 'La placa ya está registrada.' });
  });

  test('HU-25 E3 formato inválido según el tipo → 422 en placa', async () => {
    const carro = await api('post', '/vehiculos', operador).send(datos({ placa: 'AB1234' }));
    expect(carro.status).toBe(422);
    expect(carro.body.error.details).toEqual([{ campo: 'placa', mensaje: 'Formato de placa inválido para carro (AAA123).' }]);
    const moto = await api('post', '/vehiculos', operador).send(datos({ placa: 'QWE456', tipo: 'moto' }));
    expect(moto.body.error.details[0].mensaje).toBe('Formato de placa inválido para moto (AAA12 o AAA12A).');
  });

  test('HU-25 E4 aparece entre los vehículos sin propietario', async () => {
    const v = await nuevo();
    const res = await api('get', `/vehiculos?propietario=ninguno&q=${v.placa}`, operador);
    expect(res.body.data.map((x) => x.idVehiculo)).toEqual([v.idVehiculo]);
    const sin = await api('get', '/vehiculos?propietario=ninguno&limit=100', operador);
    expect(sin.body.data.every((x) => x.propietario === null)).toBe(true);
    expect(sin.body.data.map((x) => x.placa)).toContain('MNP908');
  });

  test('HU-25 E5 color, marca y modelo fuera de rango → 422; Cliente → 403; con propietario abre su periodo', async () => {
    const res = await api('post', '/vehiculos', operador).send(datos({ color: 'R', marca: '', modelo: 1949 }));
    expect(res.status).toBe(422);
    expect(res.body.error.details.map((d) => d.campo).sort()).toEqual(['color', 'marca', 'modelo']);
    const siguiente = new Date().getFullYear() + 2;
    expect((await api('post', '/vehiculos', operador).send(datos({ modelo: siguiente }))).status).toBe(422);
    expect((await api('post', '/vehiculos', cliente).send(datos())).status).toBe(403);
    const conDueno = await nuevo({ idPropietario: 5 });
    expect(conDueno.propietario).toMatchObject({ idUsuario: 5, nombre: 'Carlos Medina Toro' });
    expect(await periodos(conDueno.idVehiculo)).toEqual([{ id_usuario: 5, fecha_hasta: null }]);
  });
});

// ====================================================================== HU-26
describe('HU-26 Asociar un vehículo a su propietario', () => {
  test('HU-26 E1 asocia por documento y aparece en el detalle del usuario y en Mis vehículos', async () => {
    const v = await nuevo();
    const res = await api('patch', `/vehiculos/${v.idVehiculo}/propietario`, operador).send({ tipoDocumento: 'CC', numeroDocumento: '1000000004' });
    expect(res.status).toBe(200);
    expect(res.body.data.propietario).toMatchObject({ idUsuario: 4, nombre: 'Andrea Salcedo Ríos' });
    const delUsuario = await api('get', '/vehiculos?propietario=4&limit=100', operador);
    expect(delUsuario.body.data.map((x) => x.placa)).toContain(v.placa);
    const mios = await api('get', '/usuarios/me/vehiculos', cliente);
    expect(mios.body.data.map((x) => x.placa)).toContain(v.placa);
    expect(await periodos(v.idVehiculo)).toEqual([{ id_usuario: 4, fecha_hasta: null }]);
  });

  test('HU-26 E2 vehículo no registrado → 404 «Registre primero el vehículo»', async () => {
    const res = await api('patch', '/vehiculos/999999/propietario', operador).send({ idUsuario: 4 });
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: 'VEHICULO_NO_ENCONTRADO', message: 'Registre primero el vehículo.' });
  });

  test('HU-26 E3 usuario inexistente → 404; inactivo → 409; cuerpo ambiguo → 422', async () => {
    const v = await nuevo();
    const ruta = `/vehiculos/${v.idVehiculo}/propietario`;
    const noExiste = await api('patch', ruta, operador).send({ tipoDocumento: 'CC', numeroDocumento: '999999999' });
    expect(noExiste.status).toBe(404);
    expect(noExiste.body.error.code).toBe('USUARIO_NO_ENCONTRADO');
    const inactivo = await api('patch', ruta, operador).send({ idUsuario: 7 });
    expect(inactivo.status).toBe(409);
    expect(inactivo.body.error).toEqual({ code: 'USUARIO_INACTIVO', message: 'El usuario está inactivo.' });
    expect((await api('patch', ruta, operador).send({ idUsuario: 4, tipoDocumento: 'CC', numeroDocumento: '1' })).status).toBe(422);
    expect((await api('patch', ruta, operador).send({ tipoDocumento: 'CC' })).status).toBe(422);
    expect((await api('patch', ruta, operador).send({})).status).toBe(422);
  });

  test('HU-26 E4 el Operador no reasigna un vehículo con propietario (403); el mismo propietario → 200 sin cambios', async () => {
    const v = await nuevo({ idPropietario: 5 });
    const ruta = `/vehiculos/${v.idVehiculo}/propietario`;
    const res = await api('patch', ruta, operador).send({ idUsuario: 6 });
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: 'SOLO_ADMIN_REASIGNA', message: 'Solo el Administrador puede reasignar el vehículo.' });
    expect((await api('patch', ruta, operador).send({ idUsuario: null })).status).toBe(403);
    const mismo = await api('patch', ruta, operador).send({ idUsuario: 5 });
    expect(mismo.status).toBe(200);
    expect(await periodos(v.idVehiculo)).toHaveLength(1);
    expect((await api('patch', ruta, cliente).send({ idUsuario: 4 })).status).toBe(403);
  });
});

// ====================================================================== HU-28
describe('HU-28 Consultar vehículos', () => {
  let dentro;
  beforeAll(async () => {
    const idParqueadero = await crearParqueadero(admin);
    const [idCelda] = await crearCeldas(admin, idParqueadero, { prefijo: 'V-', cantidad: 1 });
    dentro = await nuevo({ idPropietario: 5 });
    await abrirMovimiento(dentro.idVehiculo, idCelda);
  });

  test('HU-28 E1 busca por parte de la placa con tipo, propietario y presencia; filtros', async () => {
    const res = await api('get', '/vehiculos?q=abc1', operador);
    expect(res.status).toBe(200);
    expect(res.body.data.every((v) => v.placa.includes('ABC1'))).toBe(true);
    expect(res.body.data.find((v) => v.placa === 'ABC123')).toMatchObject({
      tipo: 'carro',
      color: 'Rojo',
      marca: 'Chevrolet',
      dentro: false,
      propietario: { nombre: 'Andrea Salcedo Ríos' },
    });
    const adentro = await api('get', '/vehiculos?dentro=true&limit=100', operador);
    expect(adentro.body.data.map((v) => v.placa)).toContain(dentro.placa);
    expect(adentro.body.data.find((v) => v.placa === dentro.placa).celdaActual).toBe('V-01');
    expect(adentro.body.data.every((v) => v.dentro)).toBe(true);
    const motos = await api('get', '/vehiculos?tipo=moto&limit=100', operador);
    expect(motos.body.data.every((v) => v.tipo === 'moto')).toBe(true);
    const porNombre = await api('get', '/vehiculos?q=Medina&limit=100', operador);
    expect(porNombre.body.data.every((v) => v.propietario?.nombre === 'Carlos Medina Toro')).toBe(true);
    expect((await api('get', '/vehiculos?dentro=quizas', operador)).status).toBe(422);
    expect((await api('get', '/vehiculos?propietario=nadie', operador)).status).toBe(422);
  });

  test('HU-28 E2 detalle con propietario, historial y últimos movimientos; inexistente → 404', async () => {
    const res = await api('get', `/vehiculos/${dentro.idVehiculo}`, operador);
    expect(res.status).toBe(200);
    expect(res.body.data.propietario.idUsuario).toBe(5);
    expect(res.body.data.historialPropietarios).toEqual([expect.objectContaining({ idUsuario: 5, hasta: null })]);
    expect(res.body.data.ultimosMovimientos).toEqual([expect.objectContaining({ celda: 'V-01', estado: 'abierto', fechaHoraSalida: null })]);
    expect((await api('get', '/vehiculos/999999', operador)).status).toBe(404);
  });

  test('HU-28 E3 el Cliente solo ve los suyos; el listado y el detalle generales le responden 403', async () => {
    const res = await api('get', '/usuarios/me/vehiculos', cliente);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.every((v) => v.propietario.idUsuario === 4)).toBe(true);
    expect(res.body.data.map((v) => v.placa)).toEqual(expect.arrayContaining(['ABC123', 'QWE45A']));
    expect((await api('get', '/vehiculos', cliente)).status).toBe(403);
    expect((await api('get', '/vehiculos/1', cliente)).status).toBe(403);
    expect((await request(app).get('/api/v1/usuarios/me/vehiculos')).status).toBe(401);
  });
});

// ====================================================================== HU-27
describe('HU-27 Actualizar o reasignar un vehículo', () => {
  test('HU-27 E1 cambia el color y la bitácora guarda solo la diferencia', async () => {
    const v = await nuevo();
    const res = await api('put', `/vehiculos/${v.idVehiculo}`).send({ placa: v.placa, tipo: 'carro', color: 'Azul', marca: 'Chevrolet', modelo: 2018 });
    expect(res.status).toBe(200);
    expect(res.body.data.color).toBe('Azul');
    const [[b]] = await pool.query(
      "SELECT valor_anterior, valor_nuevo FROM bitacora WHERE entidad = 'vehiculo' AND accion = 'editar' AND id_registro = ?",
      [v.idVehiculo]
    );
    expect(b).toEqual({ valor_anterior: { color: 'Rojo' }, valor_nuevo: { color: 'Azul' } });
  });

  test('HU-27 E2 reasigna de Carlos a Valentina: cierra el periodo anterior y sale de la lista de Carlos', async () => {
    const v = await nuevo({ idPropietario: 5 });
    const res = await api('patch', `/vehiculos/${v.idVehiculo}/propietario`).send({ idUsuario: 6 });
    expect(res.status).toBe(200);
    expect(res.body.data.propietario.idUsuario).toBe(6);
    const historial = await periodos(v.idVehiculo);
    expect(historial.map((h) => h.id_usuario)).toEqual([5, 6]);
    expect(historial[0].fecha_hasta).not.toBeNull();
    expect(historial[1].fecha_hasta).toBeNull();
    const deCarlos = await api('get', '/vehiculos?propietario=5&limit=100');
    expect(deCarlos.body.data.map((x) => x.placa)).not.toContain(v.placa);
    const detalle = await api('get', `/vehiculos/${v.idVehiculo}`);
    expect(detalle.body.data.historialPropietarios.map((h) => h.idUsuario)).toEqual([6, 5]);
    const [[b]] = await pool.query(
      "SELECT valor_anterior, valor_nuevo FROM bitacora WHERE entidad = 'vehiculo' AND accion = 'asignar_propietario' AND id_registro = ? ORDER BY id_bitacora DESC LIMIT 1",
      [v.idVehiculo]
    );
    expect(b).toEqual({ valor_anterior: { idPropietario: 5 }, valor_nuevo: { idPropietario: 6 } });
    // Por PUT también se reasigna; y quitar el propietario deja el vehículo sin dueño.
    const porPut = await api('put', `/vehiculos/${v.idVehiculo}`).send({ ...datos({ placa: v.placa }), idPropietario: 4 });
    expect(porPut.body.data.propietario.idUsuario).toBe(4);
    const quitar = await api('patch', `/vehiculos/${v.idVehiculo}/propietario`).send({ idUsuario: null });
    expect(quitar.body.data.propietario).toBeNull();
    expect((await periodos(v.idVehiculo)).every((h) => h.fecha_hasta !== null)).toBe(true);
  });

  test('HU-27 E3 Operador o Cliente no actualizan (403)', async () => {
    const v = await nuevo();
    for (const token of [operador, cliente]) {
      expect((await api('put', `/vehiculos/${v.idVehiculo}`, token).send(datos({ placa: v.placa }))).status).toBe(403);
    }
  });

  test('HU-27 E4 cambiar la placa por una registrada → 409; inexistente → 404', async () => {
    const v = await nuevo();
    const res = await api('put', `/vehiculos/${v.idVehiculo}`).send(datos({ placa: 'ABC123' }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PLACA_DUPLICADA');
    expect((await api('put', '/vehiculos/999999').send(datos())).status).toBe(404);
  });

  test('HU-27 E5 con el vehículo dentro no cambia placa ni tipo (409), sí el color', async () => {
    const idParqueadero = await crearParqueadero(admin);
    const [idCelda] = await crearCeldas(admin, idParqueadero, { prefijo: 'W-', cantidad: 1 });
    const v = await nuevo();
    await abrirMovimiento(v.idVehiculo, idCelda);
    const placa = await api('put', `/vehiculos/${v.idVehiculo}`).send(datos());
    expect(placa.status).toBe(409);
    expect(placa.body.error).toEqual({ code: 'VEHICULO_DENTRO', message: 'El vehículo está dentro del parqueadero.' });
    const color = await api('put', `/vehiculos/${v.idVehiculo}`).send(datos({ placa: v.placa, color: 'Verde' }));
    expect(color.status).toBe(200);
    expect(color.body.data).toMatchObject({ color: 'Verde', dentro: true });
  });
});
