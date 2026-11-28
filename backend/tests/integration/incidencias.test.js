// Pruebas de integración de incidencias (spec 013: HU-56, HU-57, HU-58). El reloj del servidor queda fijo el viernes
// 27/11/2026 a las 10:00; cada prueba usa vehículos propios (research R-06). La evidencia es un PNG mínimo (firma +
// bytes) y un JPG de más de 5 MB para el error.
const fs = require('node:fs');
const { pool } = require('../../src/config/db');
const { rutaArchivo } = require('../../src/utils/archivos');
const { app, request, tokenDe, auth } = require('../setup/helpers');
const { crearVehiculo, placaAleatoria, crearParqueadero, crearCeldas, abrirMovimiento } = require('../setup/infraestructura');
const { fijarReloj } = require('../setup/sede');

const VIERNES = '2026-11-27T10:00:00-05:00';
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const JPG_GRANDE = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(5 * 1024 * 1024 + 10, 1)]);

let admin;
let operador;
let cliente;
beforeAll(async () => {
  [admin, operador, cliente] = await Promise.all([tokenDe('admin'), tokenDe('operador'), tokenDe('cliente')]);
});
beforeEach(() => fijarReloj(VIERNES));
afterEach(() => jest.restoreAllMocks());

const api = (metodo, ruta, token = operador) => request(app)[metodo](`/api/v1${ruta}`).set(auth(token));
const datos = (cambios = {}) => ({ tipo: 'rayon', fechaHoraEvento: '2026-11-27T09:40', descripcion: 'Rayón en la puerta del conductor al maniobrar', ...cambios });

/** Registra (201) y devuelve el detalle. */
async function registrar(cambios = {}, token = operador) {
  const res = await api('post', '/incidencias', token).send(datos(cambios));
  if (res.status !== 201) throw new Error(`Incidencia: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data;
}

// ====================================================================== HU-56
describe('HU-56 Registrar una incidencia', () => {
  test('HU-56 E1 «Rayón» de una placa registrada: abierta con código INC- y alerta al Administrador', async () => {
    const v = await crearVehiculo();
    const res = await api('post', '/incidencias').send(datos({ placa: v.placa.toLowerCase() }));
    expect(res.status).toBe(201);
    const i = res.body.data;
    expect(i).toMatchObject({
      tipo: 'rayon',
      tipoNombre: 'Rayón',
      estado: 'abierta',
      fechaHoraEvento: '2026-11-27T09:40:00-05:00',
      vehiculo: { idVehiculo: v.id, placa: v.placa },
      celda: null,
      operador: { idUsuario: 2 },
      tieneEvidencia: false,
      solucion: null,
      seguimientos: [],
    });
    expect(i.codigo).toMatch(/^INC-\d{6}$/);
    expect(i).not.toHaveProperty('_evidencia');
    const [[alerta]] = await pool.query("SELECT tipo, mensaje, leida FROM alerta WHERE referencia = ?", [`incidencia:${i.idIncidencia}`]);
    expect(alerta).toEqual({ tipo: 'incidencia', mensaje: `Incidencia ${i.codigo}: Rayón de ${v.placa}`, leida: 0 });
    const [[b]] = await pool.query("SELECT accion FROM bitacora WHERE entidad = 'incidencia' AND id_registro = ?", [i.idIncidencia]);
    expect(b.accion).toBe('registrar');
  });

  test('HU-56 E2 sin tipo ni vehículo → 422 en los campos obligatorios', async () => {
    const res = await api('post', '/incidencias').send({ fechaHoraEvento: '2026-11-27T09:40', descripcion: 'Golpe en el parachoques trasero' });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        { campo: 'tipo', mensaje: 'Seleccione el tipo de incidencia.' },
        { campo: 'placa', mensaje: 'Ingrese la placa del vehículo afectado.' },
      ])
    );
  });

  test('HU-56 E3 fecha y hora futura → 422; la hora actual sí vale', async () => {
    const v = await crearVehiculo();
    const futura = await api('post', '/incidencias').send(datos({ placa: v.placa, fechaHoraEvento: '2026-11-27T10:01' }));
    expect(futura.status).toBe(422);
    expect(futura.body.error.details).toEqual([{ campo: 'fechaHoraEvento', mensaje: 'La fecha y hora del evento no puede ser futura.' }]);
    expect((await api('post', '/incidencias').send(datos({ placa: v.placa, fechaHoraEvento: '2026-11-27T10:00' }))).status).toBe(201);
  });

  test('HU-56 E4 foto de evidencia (multipart): queda asociada y se descarga solo con permiso', async () => {
    const v = await crearVehiculo();
    const res = await api('post', '/incidencias')
      .field('tipo', 'choque')
      .field('placa', v.placa)
      .field('fechaHoraEvento', '2026-11-27T08:15')
      .field('descripcion', 'Choque contra la columna C-03 al parquear')
      .attach('evidencia', PNG, { filename: 'evidencia.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.data.tieneEvidencia).toBe(true);
    const [[f]] = await pool.query('SELECT evidencia_url FROM incidencia WHERE id_incidencia = ?', [res.body.data.idIncidencia]);
    expect(f.evidencia_url).toMatch(/^incidencias\/[0-9a-f-]{36}\.png$/);
    const imagen = await api('get', `/incidencias/${res.body.data.idIncidencia}/evidencia`).buffer(true);
    expect(imagen.status).toBe(200);
    expect(imagen.headers['content-type']).toBe('image/png');
    expect(imagen.headers['cache-control']).toBe('private, no-store');
    expect((await api('get', `/incidencias/${res.body.data.idIncidencia}/evidencia`, cliente)).status).toBe(403);
  });

  test('HU-56 E5 placa nueva sin tipo → 422 y con tipo queda ocasional; archivo no imagen o > 5 MB → 422; Cliente → 403', async () => {
    const placa = placaAleatoria('moto');
    const sinTipo = await api('post', '/incidencias').send(datos({ placa }));
    expect(sinTipo.body.error.details).toEqual([{ campo: 'tipoVehiculo', mensaje: 'La placa no está registrada: indique si es carro o moto.' }]);
    const conTipo = await registrar({ placa, tipoVehiculo: 'moto', tipo: 'atropellamiento' });
    const [[v]] = await pool.query('SELECT tipo, id_propietario FROM vehiculo WHERE placa = ?', [placa]);
    expect(v).toEqual({ tipo: 'moto', id_propietario: null });
    expect(conTipo.vehiculo.placa).toBe(placa);

    const base = (r) => r.field('tipo', 'rayon').field('placa', placa).field('fechaHoraEvento', '2026-11-27T09:00').field('descripcion', 'Rayón en el tanque de la moto');
    const texto = await base(api('post', '/incidencias')).attach('evidencia', Buffer.from('no soy una imagen'), { filename: 'nota.png', contentType: 'image/png' });
    expect(texto.body.error.details).toEqual([{ campo: 'evidencia', mensaje: 'La evidencia debe ser JPG o PNG.' }]);
    const grande = await base(api('post', '/incidencias')).attach('evidencia', JPG_GRANDE, { filename: 'grande.jpg', contentType: 'image/jpeg' });
    expect(grande.body.error.details).toEqual([{ campo: 'evidencia', mensaje: 'La evidencia supera 5 MB.' }]);
    expect((await api('post', '/incidencias', cliente).send(datos({ placa }))).status).toBe(403);
    expect((await api('post', '/incidencias').send(datos({ placa, descripcion: 'Corta' }))).status).toBe(422);
  });

  test('sin celda indicada, toma la celda que ocupa el vehículo dentro; si el registro falla, la evidencia se borra', async () => {
    const idParqueadero = await crearParqueadero(admin);
    const [idCelda] = await crearCeldas(admin, idParqueadero, { prefijo: 'I-', cantidad: 1 });
    const v = await crearVehiculo();
    await abrirMovimiento(v.id, idCelda);
    const i = await registrar({ placa: v.placa, tipo: 'golpe_muro' });
    expect(i.celda).toEqual({ idCelda, codigo: 'I-01' });

    const antes = fs.readdirSync(require('node:path').dirname(rutaArchivo('incidencias/00000000-0000-0000-0000-000000000000.png'))).length;
    const falla = await api('post', '/incidencias')
      .field('tipo', 'rayon')
      .field('placa', v.placa)
      .field('idCelda', '99999999')
      .field('fechaHoraEvento', '2026-11-27T09:00')
      .field('descripcion', 'Rayón con celda inexistente')
      .attach('evidencia', PNG, { filename: 'e.png', contentType: 'image/png' });
    expect(falla.status).toBe(422);
    const despues = fs.readdirSync(require('node:path').dirname(rutaArchivo('incidencias/00000000-0000-0000-0000-000000000000.png'))).length;
    expect(despues).toBe(antes);
  });
});

// ====================================================================== HU-57
describe('HU-57 Consultar incidencias', () => {
  test('HU-57 E1 por placa: código, tipo, fecha, estado y operador; filtros de tipo, estado y fechas', async () => {
    const v = await crearVehiculo();
    const a = await registrar({ placa: v.placa, fechaHoraEvento: '2026-11-26T18:00' });
    const b = await registrar({ placa: v.placa, tipo: 'choque', fechaHoraEvento: '2026-11-27T07:30' });
    const res = await api('get', `/incidencias?q=${v.placa}`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((i) => i.codigo)).toEqual([b.codigo, a.codigo]);
    expect(res.body.data[0]).toMatchObject({ tipo: 'choque', estado: 'abierta', fechaHoraEvento: '2026-11-27T07:30:00-05:00', operador: { nombre: expect.any(String) } });
    expect(res.body.meta.total).toBe(2);
    expect((await api('get', `/incidencias?q=${v.placa}&tipo=rayon`)).body.data.map((i) => i.codigo)).toEqual([a.codigo]);
    expect((await api('get', `/incidencias?q=${v.placa}&desde=2026-11-27&hasta=2026-11-27`)).body.data.map((i) => i.codigo)).toEqual([b.codigo]);
    expect((await api('get', `/incidencias?q=${a.codigo}`, admin)).body.data.map((i) => i.codigo)).toEqual([a.codigo]);
    expect((await api('get', '/incidencias?desde=2026-11-27&hasta=2026-11-01')).status).toBe(422);
    expect((await api('get', '/incidencias', cliente)).status).toBe(403);
  });

  test('HU-57 E2 el detalle trae la descripción, la evidencia y el seguimiento', async () => {
    const i = await registrar({ placa: (await crearVehiculo()).placa });
    await api('post', `/incidencias/${i.idIncidencia}/seguimientos`, admin).send({ nota: 'Se llamó al cliente' }).expect(201);
    const res = await api('get', `/incidencias/${i.idIncidencia}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ descripcion: i.descripcion, tieneEvidencia: false, seguimientos: [{ nota: 'Se llamó al cliente', usuario: { idUsuario: 1 } }] });
    const sin = await api('get', `/incidencias/${i.idIncidencia}/evidencia`);
    expect(sin.status).toBe(404);
    expect(sin.body.error.code).toBe('SIN_EVIDENCIA');
    expect((await api('get', '/incidencias/99999999')).status).toBe(404);
  });
});

// ====================================================================== HU-58
describe('HU-58 Dar seguimiento y cerrar una incidencia', () => {
  test('HU-58 E1 la nota queda con fecha y usuario y la incidencia pasa a en seguimiento', async () => {
    const i = await registrar({ placa: (await crearVehiculo()).placa });
    fijarReloj('2026-11-27T11:30:00-05:00');
    const res = await api('post', `/incidencias/${i.idIncidencia}/seguimientos`, admin).send({ nota: 'Se revisaron las cámaras del sótano' });
    expect(res.status).toBe(201);
    expect(res.body.data.estado).toBe('en_seguimiento');
    expect(res.body.data.seguimientos).toEqual([
      expect.objectContaining({ nota: 'Se revisaron las cámaras del sótano', fecha: '2026-11-27T11:30:00-05:00', usuario: expect.objectContaining({ idUsuario: 1 }) }),
    ]);
    expect((await api('post', `/incidencias/${i.idIncidencia}/seguimientos`).send({ nota: 'El operador no puede' })).status).toBe(403);
    expect((await api('post', `/incidencias/${i.idIncidencia}/seguimientos`, admin).send({ nota: 'No' })).status).toBe(422);
  });

  test('HU-58 E2 cerrada con la solución: ya no admite notas ni otro cierre', async () => {
    const i = await registrar({ placa: (await crearVehiculo()).placa });
    await api('post', `/incidencias/${i.idIncidencia}/seguimientos`, admin).send({ nota: 'Se cotizó la reparación' }).expect(201);
    fijarReloj('2026-11-27T15:00:00-05:00');
    const res = await api('patch', `/incidencias/${i.idIncidencia}/cierre`, admin).send({ solucion: 'El parqueadero pagó la reparación de la puerta' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ estado: 'cerrada', solucion: 'El parqueadero pagó la reparación de la puerta', fechaCierre: '2026-11-27T15:00:00-05:00' });
    const nota = await api('post', `/incidencias/${i.idIncidencia}/seguimientos`, admin).send({ nota: 'Otra nota después del cierre' });
    expect(nota.status).toBe(409);
    expect(nota.body.error.code).toBe('INCIDENCIA_CERRADA');
    expect((await api('patch', `/incidencias/${i.idIncidencia}/cierre`, admin).send({ solucion: 'Cerrar de nuevo la incidencia' })).status).toBe(409);
    const [[b]] = await pool.query("SELECT accion FROM bitacora WHERE entidad = 'incidencia' AND id_registro = ? ORDER BY id_bitacora DESC LIMIT 1", [i.idIncidencia]);
    expect(b.accion).toBe('cerrar');
  });

  test('HU-58 E3 cerrar sin solución → 422; desde abierta con solución se puede cerrar', async () => {
    const i = await registrar({ placa: (await crearVehiculo()).placa });
    const sin = await api('patch', `/incidencias/${i.idIncidencia}/cierre`, admin).send({});
    expect(sin.status).toBe(422);
    expect(sin.body.error.details).toEqual([{ campo: 'solucion', mensaje: 'Escriba la solución para cerrar la incidencia.' }]);
    expect((await api('patch', `/incidencias/${i.idIncidencia}/cierre`, admin).send({ solucion: 'Corta' })).status).toBe(422);
    expect((await api('patch', `/incidencias/${i.idIncidencia}/cierre`).send({ solucion: 'El operador no puede cerrar' })).status).toBe(403);
    const ok = await api('patch', `/incidencias/${i.idIncidencia}/cierre`, admin).send({ solucion: 'El cliente retiró el reclamo' });
    expect(ok.body.data.estado).toBe('cerrada');
  });
});
