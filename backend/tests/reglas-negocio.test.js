// Fase 8 — casos de error y reglas de negocio que no cubren las suites de cada fase:
// celdas (REQ-CLD-03), descuentos (REQ-DES-1), puertas, pico y placa (REQ-CAR-4) y usuarios
// (REQ-USR-2..5). Requiere `npm run db:reset`; deja la BD como estaba.
const request = require('supertest');
const { crearApp } = require('../src/app');
const { pool } = require('../src/config/db');
const { enBogota } = require('../src/utils/fechas');

const app = crearApp();

const cred = (doc, contrasena) => ({ tipo_documento: 'CC', numero_documento: doc, contrasena });
const ADMIN = cred('1000000001', 'Admin2026*');
const OPERADOR = cred('1000000002', 'Operador2026*');
const ANDREA = cred('1000000004', 'Cliente2026*');

let admin;
let operador;
let andrea;
const antes = {};

async function iniciarSesion(credenciales) {
  const agente = request.agent(app);
  expect((await agente.post('/api/v1/auth/login').send(credenciales)).status).toBe(200);
  return agente;
}
const maxId = async (tabla) =>
  (await pool.query(`SELECT COALESCE(MAX(id), 0) AS m FROM ${tabla}`))[0][0].m;
const una = async (sql, valores = []) => (await pool.query(sql, valores))[0][0];
const codigoError = (res) => [res.status, res.body.error?.codigo];
const estado = (agente, id, datos) => agente.patch(`/api/v1/celdas/${id}/estado`).send(datos);

beforeAll(async () => {
  [admin, operador, andrea] = await Promise.all([ADMIN, OPERADOR, ANDREA].map(iniciarSesion));
  [antes.configuracion] = await pool.query(
    'SELECT clave, valor, actualizado_por FROM configuracion'
  );
  for (const t of [
    'descuentos',
    'puertas',
    'pico_placa',
    'vehiculos',
    'notificaciones',
    'membresias',
    'facturas',
    'tarifas',
  ])
    antes[t] = await maxId(t);
  [antes.celdas] = await pool.query(
    'SELECT id, estado, vehiculo_actual_id, nota, activa FROM celdas'
  );
  [antes.puertas] = await pool.query('SELECT id, activa FROM puertas');
  [antes.tarifasActivas] = await pool.query('SELECT id FROM tarifas WHERE activa = 1');
  antes.andrea = await una('SELECT * FROM usuarios WHERE id = 4');
  antes.lucia = await una(
    'SELECT contrasena_hash, debe_cambiar_contrasena FROM usuarios WHERE id = 7'
  );
});

afterAll(async () => {
  for (const c of antes.configuracion) {
    await pool.query('UPDATE configuracion SET valor = ?, actualizado_por = ? WHERE clave = ?', [
      c.valor,
      c.actualizado_por,
      c.clave,
    ]);
  }
  await pool.query('DELETE FROM facturas WHERE id > ?', [antes.facturas]);
  await pool.query(
    "UPDATE consecutivos SET ultimo = (SELECT COUNT(*) FROM facturas) WHERE nombre = 'factura'"
  );
  await pool.query('DELETE FROM membresias WHERE id > ?', [antes.membresias]);
  await pool.query('DELETE FROM tarifas WHERE id > ?', [antes.tarifas]);
  await pool.query('UPDATE tarifas SET activa = 1 WHERE id IN (?)', [
    antes.tarifasActivas.map((t) => t.id),
  ]);
  await pool.query('UPDATE celdas SET vehiculo_actual_id = NULL');
  for (const c of antes.celdas) {
    await pool.query(
      'UPDATE celdas SET estado = ?, vehiculo_actual_id = ?, nota = ?, activa = ? WHERE id = ?',
      [c.estado, c.vehiculo_actual_id, c.nota, c.activa, c.id]
    );
  }
  for (const p of antes.puertas)
    await pool.query('UPDATE puertas SET activa = ? WHERE id = ?', [p.activa, p.id]);
  await pool.query('DELETE FROM puertas WHERE id > ?', [antes.puertas.at(-1).id]);
  await pool.query('DELETE FROM descuentos WHERE id > ?', [antes.descuentos]);
  await pool.query('DELETE FROM pico_placa WHERE id > ?', [antes.pico_placa]);
  await pool.query('DELETE FROM vehiculos WHERE id > ?', [antes.vehiculos]);
  await pool.query('DELETE FROM notificaciones WHERE id > ?', [antes.notificaciones]);
  await pool.query(
    'UPDATE usuarios SET contrasena_hash = ?, debe_cambiar_contrasena = ? WHERE id = 7',
    [antes.lucia.contrasena_hash, antes.lucia.debe_cambiar_contrasena]
  );
  await pool.query('UPDATE usuarios SET correo = ?, celular = ? WHERE id = 4', [
    antes.andrea.correo,
    antes.andrea.celular,
  ]);
  await pool.end();
});

describe('Cambio manual de estado de celdas (REQ-CLD-03)', () => {
  let libreCarro;
  let ocupada;
  let carroSinCelda;
  let moto;

  beforeAll(async () => {
    libreCarro = await una(
      "SELECT id, codigo FROM celdas WHERE tipo = 'carro' AND estado = 'disponible' AND activa = 1 ORDER BY codigo LIMIT 1"
    );
    ocupada = await una(
      `SELECT c.id FROM celdas c JOIN estadias e ON e.celda_id = c.id AND e.estado = 'en_curso'
        LIMIT 1`
    );
    const [r] = await pool.query(
      `INSERT INTO vehiculos (placa, tipo, color, marca, modelo, creado_por)
       VALUES ('RGL111', 'carro', 'Negro', 'Kia', 'Rio', 1), ('RGL22', 'moto', 'Rojo', 'AKT', 'NKD', 1)`
    );
    carroSinCelda = r.insertId;
    moto = r.insertId + 1;
  });

  test('404 si la celda no existe; el cliente no puede cambiar estados (403)', async () => {
    expect(codigoError(await estado(operador, 999999, { estado: 'disponible' }))).toEqual([
      404,
      'NO_ENCONTRADO',
    ]);
    expect((await estado(andrea, libreCarro.id, { estado: 'disponible' })).status).toBe(403);
  });

  test('ocupar: vehículo inexistente → 422, de otro tipo → 422, ya ocupada → 409', async () => {
    expect(
      (await estado(operador, libreCarro.id, { estado: 'ocupada', vehiculo_id: 999999 })).status
    ).toBe(422);
    expect(
      codigoError(await estado(operador, libreCarro.id, { estado: 'ocupada', vehiculo_id: moto }))
    ).toEqual([422, 'TIPO_INCOMPATIBLE']);
    expect(
      codigoError(
        await estado(operador, ocupada.id, { estado: 'ocupada', vehiculo_id: carroSinCelda })
      )
    ).toEqual([409, 'CELDA_OCUPADA']);
  });

  test('ocupar a mano y luego intentar el mismo vehículo en otra celda → 409', async () => {
    const res = await estado(operador, libreCarro.id, {
      estado: 'ocupada',
      vehiculo_id: carroSinCelda,
    });
    expect(res.status).toBe(200);
    const otra = await una(
      "SELECT id FROM celdas WHERE tipo = 'carro' AND estado = 'disponible' AND activa = 1 AND id <> ? LIMIT 1",
      [libreCarro.id]
    );
    expect(
      codigoError(
        await estado(operador, otra.id, { estado: 'ocupada', vehiculo_id: carroSinCelda })
      )
    ).toEqual([409, 'VEHICULO_YA_UBICADO']);
    // Ocupada sin estadía: se puede sacar de servicio solo después de liberarla.
    expect(
      codigoError(
        await estado(operador, libreCarro.id, { estado: 'fuera_servicio', nota: 'Goteras' })
      )
    ).toEqual([409, 'CELDA_OCUPADA']);
    expect((await estado(operador, libreCarro.id, { estado: 'disponible' })).status).toBe(200);
  });

  test('liberar: con estadía en curso → 409; si ya está libre → 409 SIN_CAMBIO', async () => {
    expect(codigoError(await estado(operador, ocupada.id, { estado: 'disponible' }))).toEqual([
      409,
      'ESTADIA_EN_CURSO',
    ]);
    expect(codigoError(await estado(operador, libreCarro.id, { estado: 'disponible' }))).toEqual([
      409,
      'SIN_CAMBIO',
    ]);
  });

  test('fuera de servicio exige nota, no se puede ocupar y se rehabilita', async () => {
    expect((await estado(operador, libreCarro.id, { estado: 'fuera_servicio' })).status).toBe(422);
    expect(
      (await estado(operador, libreCarro.id, { estado: 'fuera_servicio', nota: 'Pintura' })).status
    ).toBe(200);
    expect(
      codigoError(
        await estado(operador, libreCarro.id, { estado: 'ocupada', vehiculo_id: carroSinCelda })
      )
    ).toEqual([409, 'CELDA_FUERA_SERVICIO']);
    expect((await estado(operador, libreCarro.id, { estado: 'disponible' })).status).toBe(200);
  });

  test('celda desactivada: el cambio de estado da 409 y el cliente no la ve (404)', async () => {
    expect(
      (await admin.patch(`/api/v1/celdas/${libreCarro.id}/activa`).send({ activa: false })).status
    ).toBe(200);
    expect(codigoError(await estado(operador, libreCarro.id, { estado: 'disponible' }))).toEqual([
      409,
      'CELDA_INACTIVA',
    ]);
    expect((await andrea.get(`/api/v1/celdas/${libreCarro.id}`)).status).toBe(404);
    expect((await admin.get(`/api/v1/celdas/${libreCarro.id}`)).status).toBe(200);
    await admin.patch(`/api/v1/celdas/${libreCarro.id}/activa`).send({ activa: true });
  });
});

describe('Descuentos (REQ-DES-1)', () => {
  test('crear, nombre duplicado, editar, inactivar y 404', async () => {
    const creado = await admin
      .post('/api/v1/descuentos')
      .send({ nombre: 'Prueba fase 8', descripcion: 'Temporal', porcentaje: 15 });
    expect(creado.status).toBe(201);
    const { id } = creado.body.data;
    expect(
      codigoError(
        await admin.post('/api/v1/descuentos').send({ nombre: 'Prueba fase 8', porcentaje: 5 })
      )
    ).toEqual([409, 'NOMBRE_DUPLICADO']);
    const editado = await admin
      .put(`/api/v1/descuentos/${id}`)
      .send({ nombre: 'Prueba fase 8 bis', porcentaje: 20 });
    expect(editado.body.data).toMatchObject({ porcentaje: 20, activo: true });
    const otro = (await admin.get('/api/v1/descuentos')).body.data.find((d) => d.id !== id);
    expect(
      codigoError(
        await admin.put(`/api/v1/descuentos/${id}`).send({ nombre: otro.nombre, porcentaje: 1 })
      )
    ).toEqual([409, 'NOMBRE_DUPLICADO']);
    expect(
      (await admin.patch(`/api/v1/descuentos/${id}/activo`).send({ activo: false })).body.data
        .activo
    ).toBe(false);
    const activos = (await operador.get('/api/v1/descuentos')).body.data;
    expect(activos.find((d) => d.id === id)).toBeUndefined();
    expect(
      (await admin.put('/api/v1/descuentos/999999').send({ nombre: 'Nada', porcentaje: 1 })).status
    ).toBe(404);
    expect(
      (await admin.patch('/api/v1/descuentos/999999/activo').send({ activo: true })).status
    ).toBe(404);
    expect(
      (await operador.post('/api/v1/descuentos').send({ nombre: 'Op', porcentaje: 1 })).status
    ).toBe(403);
  });
});

describe('Puertas', () => {
  test('crear, duplicada, editar, 404 y siempre queda al menos una activa', async () => {
    const creada = await admin
      .post('/api/v1/puertas')
      .send({ nombre: 'Oriental', tipo: 'entrada' });
    expect(creada.status).toBe(201);
    const { id } = creada.body.data;
    expect(
      codigoError(await admin.post('/api/v1/puertas').send({ nombre: 'Oriental', tipo: 'mixta' }))
    ).toEqual([409, 'NOMBRE_DUPLICADO']);
    expect(
      (await admin.put(`/api/v1/puertas/${id}`).send({ nombre: 'Oriental 2', tipo: 'salida' })).body
        .data
    ).toMatchObject({ nombre: 'Oriental 2', tipo: 'salida' });
    expect(
      (await admin.put('/api/v1/puertas/999999').send({ nombre: 'X1', tipo: 'mixta' })).status
    ).toBe(404);

    const todas = (await admin.get('/api/v1/puertas?incluir_inactivas=1')).body.data;
    const [ultima, ...resto] = todas.filter((p) => p.activa);
    for (const p of resto)
      await admin.patch(`/api/v1/puertas/${p.id}/activa`).send({ activa: false });
    expect(
      codigoError(await admin.patch(`/api/v1/puertas/${ultima.id}/activa`).send({ activa: false }))
    ).toEqual([409, 'ULTIMA_PUERTA']);
    // El operador solo ve las activas aunque pida las inactivas.
    const vistas = (await operador.get('/api/v1/puertas?incluir_inactivas=1')).body.data;
    expect(vistas.map((p) => p.id)).toEqual([ultima.id]);
  });
});

describe('Pico y placa (REQ-CAR-4)', () => {
  const regla = {
    tipo_vehiculo: 'moto',
    dia_semana: 7,
    digito: 4,
    hora_inicio: '06:00',
    hora_fin: '08:00',
  };

  test('crear, solape → 409, editar, 404 e inactivar', async () => {
    const creada = await operador.post('/api/v1/pico-placa').send(regla);
    expect(creada.status).toBe(201);
    const { id } = creada.body.data;
    expect(
      codigoError(
        await operador
          .post('/api/v1/pico-placa')
          .send({ ...regla, hora_inicio: '07:00', hora_fin: '09:00' })
      )
    ).toEqual([409, 'REGLA_DUPLICADA']);
    const editada = await operador
      .put(`/api/v1/pico-placa/${id}`)
      .send({ ...regla, hora_inicio: '05:30', hora_fin: '07:30' });
    expect(editada.body.data).toMatchObject({ hora_inicio: '05:30', hora_fin: '07:30' });
    expect((await operador.put('/api/v1/pico-placa/999999').send(regla)).status).toBe(404);
    expect(
      (await operador.patch('/api/v1/pico-placa/999999/activa').send({ activa: false })).status
    ).toBe(404);
    const inactiva = await operador
      .patch(`/api/v1/pico-placa/${id}/activa`)
      .send({ activa: false });
    expect(inactiva.body.data.activa).toBe(false);
    const domingo = (await operador.get('/api/v1/pico-placa?dia_semana=7&activa=0')).body.data;
    expect(domingo.map((r) => r.id)).toContain(id);
    expect(
      (await operador.post('/api/v1/pico-placa').send({ ...regla, hora_fin: '05:00' })).status
    ).toBe(422);
    expect((await andrea.post('/api/v1/pico-placa').send(regla)).status).toBe(403);
  });
});

describe('Usuarios (REQ-USR-2..5)', () => {
  test('el admin restablece la contraseña: temporal, obliga a cambiarla y avisa al usuario', async () => {
    const url = '/api/v1/usuarios/7/contrasena';
    expect((await operador.patch(url).send({ contrasena_temporal: 'Temporal2026*' })).status).toBe(
      403
    );
    expect((await admin.patch(url).send({ contrasena_temporal: 'corta' })).status).toBe(422);
    expect(
      codigoError(
        await admin
          .patch('/api/v1/usuarios/1/contrasena')
          .send({ contrasena_temporal: 'Temporal2026*' })
      )
    ).toEqual([409, 'ACCION_SOBRE_SI_MISMO']);
    expect(
      (
        await admin
          .patch('/api/v1/usuarios/999999/contrasena')
          .send({ contrasena_temporal: 'Temporal2026*' })
      ).status
    ).toBe(404);

    const res = await admin.patch(url).send({ contrasena_temporal: 'Temporal2026*' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 7, debe_cambiar_contrasena: true });
    expect(res.body.data.contrasena_hash).toBeUndefined();
    // La clave anterior ya no sirve; la temporal sí, pero obliga a cambiarla.
    expect(
      (
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            tipo_documento: 'CE',
            numero_documento: '1000000007',
            contrasena: 'Cliente2026*',
          })
      ).status
    ).toBe(401);
    const lucia = request.agent(app);
    expect(
      (
        await lucia
          .post('/api/v1/auth/login')
          .send({
            tipo_documento: 'CE',
            numero_documento: '1000000007',
            contrasena: 'Temporal2026*',
          })
      ).status
    ).toBe(200);
    expect(codigoError(await lucia.get('/api/v1/usuarios/me/vehiculos'))).toEqual([
      403,
      'DEBE_CAMBIAR_CONTRASENA',
    ]);
    const [[aviso]] = await pool.query(
      "SELECT * FROM notificaciones WHERE usuario_id = 7 AND tipo = 'contrasena_restablecida' ORDER BY id DESC LIMIT 1"
    );
    expect(aviso.enviada_por).toBe(1);
  });

  const datosAndrea = (extra = {}) => ({
    tipo_documento: 'CC',
    numero_documento: '1000000004',
    primer_nombre: 'Andrea',
    primer_apellido: 'Salcedo',
    segundo_apellido: 'Vélez',
    correo: 'andrea.salcedo@correo.test',
    celular: '3101000004',
    rol_id: 3,
    ...extra,
  });

  test('el operador no crea administradores (403); rol inexistente → 422', async () => {
    const base = {
      tipo_documento: 'CC',
      numero_documento: '1077777777',
      primer_nombre: 'Otro',
      primer_apellido: 'Admin',
      correo: 'otro.admin@parko.test',
      celular: '3001112233',
      contrasena_temporal: 'Temporal2026*',
    };
    expect((await operador.post('/api/v1/usuarios').send({ ...base, rol_id: 1 })).status).toBe(403);
    expect((await admin.post('/api/v1/usuarios').send({ ...base, rol_id: 99 })).status).toBe(422);
  });

  test('el admin no puede quitarse su rol ni inactivarse; rol inexistente al editar → 422', async () => {
    const yo = (await admin.get('/api/v1/usuarios/me')).body.data;
    const misDatos = {
      tipo_documento: yo.tipo_documento,
      numero_documento: yo.numero_documento,
      primer_nombre: 'Laura',
      segundo_nombre: 'Marcela',
      primer_apellido: 'Gómez',
      segundo_apellido: 'Ríos',
      correo: yo.correo,
      celular: yo.celular,
    };
    expect(
      codigoError(await admin.put(`/api/v1/usuarios/${yo.id}`).send({ ...misDatos, rol_id: 2 }))
    ).toEqual([409, 'ACCION_SOBRE_SI_MISMO']);
    expect(
      codigoError(
        await admin.patch(`/api/v1/usuarios/${yo.id}/estado`).send({ estado: 'inactivo' })
      )
    ).toEqual([409, 'ACCION_SOBRE_SI_MISMO']);
    expect((await admin.put('/api/v1/usuarios/4').send(datosAndrea({ rol_id: 99 }))).status).toBe(
      422
    );
    expect((await admin.put('/api/v1/usuarios/999999').send(datosAndrea())).status).toBe(404);
  });

  test('mis datos: correo ajeno → 409; sin cambios no notifica; con cambios avisa al admin', async () => {
    const mis = {
      primer_nombre: 'Andrea',
      primer_apellido: 'Salcedo',
      segundo_apellido: 'Vélez',
      correo: antes.andrea.correo,
      celular: antes.andrea.celular,
    };
    expect(
      codigoError(
        await andrea.put('/api/v1/usuarios/me').send({ ...mis, correo: 'laura.gomez@parko.test' })
      )
    ).toEqual([409, 'CORREO_DUPLICADO']);
    const igual = await andrea.put('/api/v1/usuarios/me').send(mis);
    expect(igual.status).toBe(200);
    expect(igual.body.meta?.cambiados ?? []).toEqual([]);
    const otro = await andrea.put('/api/v1/usuarios/me').send({ ...mis, celular: '3101999999' });
    expect(otro.status).toBe(200);
    const [[aviso]] = await pool.query(
      "SELECT * FROM notificaciones WHERE tipo = 'perfil_actualizado' AND id > ? ORDER BY id DESC LIMIT 1",
      [antes.notificaciones]
    );
    expect(aviso.mensaje).toMatch(/Celular/i);
  });

  test('un cliente no consulta datos ajenos (403) pero sí los suyos', async () => {
    expect((await andrea.get('/api/v1/usuarios/1')).status).toBe(403);
    expect((await andrea.get('/api/v1/usuarios/4')).status).toBe(200);
  });
});

describe('Membresías (REQ-MEM-1) y puertas en la entrada', () => {
  let vehiculo;
  const hoy = () => enBogota().fecha;

  beforeAll(async () => {
    const [r] = await pool.query(
      `INSERT INTO vehiculos (placa, tipo, color, marca, modelo, usuario_id, creado_por)
       VALUES ('RGL333', 'carro', 'Blanco', 'Mazda', '3', 7, 1)`
    );
    vehiculo = r.insertId;
  });

  const membresia = (extra = {}) => ({
    usuario_id: 7,
    vehiculo_id: vehiculo,
    tipo: 'mensual',
    fecha_inicio: hoy(),
    metodo_pago: 'efectivo',
    ...extra,
  });

  test('validaciones al crear: fecha pasada, titular que no es cliente y celda fija de otro tipo', async () => {
    expect(
      (await admin.post('/api/v1/membresias').send(membresia({ fecha_inicio: '2020-01-01' })))
        .status
    ).toBe(422);
    expect((await admin.post('/api/v1/membresias').send(membresia({ usuario_id: 2 }))).status).toBe(
      422
    );
    const moto = await una("SELECT id FROM celdas WHERE tipo = 'moto' AND activa = 1 LIMIT 1");
    expect(
      (await admin.post('/api/v1/membresias').send(membresia({ celda_asignada_id: moto.id })))
        .status
    ).toBe(422);
  });

  test('con celda fija: la celda queda reservada y al cancelar se libera; cancelar dos veces → 409', async () => {
    const libre = await una(
      "SELECT id FROM celdas WHERE tipo = 'carro' AND estado = 'disponible' AND activa = 1 AND es_accesible = 0 ORDER BY codigo DESC LIMIT 1"
    );
    const res = await admin
      .post('/api/v1/membresias')
      .send(membresia({ celda_asignada_id: libre.id }));
    expect(res.status).toBe(201);
    expect((await una('SELECT estado FROM celdas WHERE id = ?', [libre.id])).estado).toBe(
      'reservada'
    );
    const cancelada = await admin.patch(`/api/v1/membresias/${res.body.data.id}/cancelar`);
    expect(cancelada.body.data.estado).toBe('cancelada');
    expect((await una('SELECT estado FROM celdas WHERE id = ?', [libre.id])).estado).toBe(
      'disponible'
    );
    expect(
      codigoError(await admin.patch(`/api/v1/membresias/${res.body.data.id}/cancelar`))
    ).toEqual([409, 'MEMBRESIA_NO_ACTIVA']);
    expect((await admin.patch('/api/v1/membresias/999999/cancelar')).status).toBe(404);
    expect((await admin.get('/api/v1/membresias/999999')).status).toBe(404);
  });

  test('vista previa de una placa nueva: trae la tarifa de cada tipo para el ticket', async () => {
    const res = await operador.get('/api/v1/estadias/previsualizar?placa=NUE123');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ registrado: false, vehiculo: null });
    expect(res.body.data.tarifas.carro.valor_fraccion).toBeGreaterThan(0);
    expect(res.body.data.tarifas.moto.unidad).toBeDefined();
  });

  test('la entrada exige una puerta activa que permita entradas', async () => {
    const salida = await admin
      .post('/api/v1/puertas')
      .send({ nombre: 'Solo salida', tipo: 'salida' });
    const req = operador.post('/api/v1/estadias/entrada');
    for (const [k, v] of Object.entries({ puerta_id: salida.body.data.id, placa: 'RGL333' }))
      req.field(k, String(v));
    const res = await req;
    expect(res.status).toBe(422);
    expect(res.body.error.detalles[0].campo).toBe('puerta_id');
  });

  test('simular una tarifa propuesta y crear una con fracción de 15 min y gracia', async () => {
    const tarifa = {
      valor_fraccion: 1000,
      minutos_fraccion: 15,
      minutos_gracia: 10,
      valor_dia_maximo: 20000,
    };
    const sim = await admin
      .post('/api/v1/tarifas/simular')
      .send({ tipo_vehiculo: 'carro', minutos: 50, tarifa });
    expect(sim.status).toBe(200);
    expect(sim.body.data.cobro.total).toBe(4000);
    const nueva = await admin.post('/api/v1/tarifas').send({ tipo_vehiculo: 'moto', ...tarifa });
    expect(nueva.status).toBe(201);
    expect(nueva.body.data.descripcion).toMatch(/15 min · tope .* · 10 min de gracia/);
    expect(
      (await operador.post('/api/v1/tarifas').send({ tipo_vehiculo: 'moto', ...tarifa })).status
    ).toBe(403);
  });
});

describe('Parámetros del negocio (configuracion)', () => {
  test('solo el administrador los ve y edita; cada tipo se valida', async () => {
    const lista = await admin.get('/api/v1/configuracion');
    expect(lista.status).toBe(200);
    expect(lista.body.data.find((c) => c.clave === 'reserva_minutos_expiracion')).toMatchObject({
      tipo: 'entero',
      valor: 30,
    });
    expect((await operador.get('/api/v1/configuracion')).status).toBe(403);
    expect(
      (await andrea.put('/api/v1/configuracion/reserva_minutos_expiracion').send({ valor: 5 }))
        .status
    ).toBe(403);

    const put = (clave, valor) => admin.put(`/api/v1/configuracion/${clave}`).send({ valor });
    expect((await put('reserva_minutos_expiracion', '0')).status).toBe(422);
    expect((await put('reserva_minutos_expiracion', 'diez')).status).toBe(422);
    expect((await put('membresia_valor_mensual_moto', -5)).status).toBe(422);
    expect((await put('ticket_mensaje_pie', '   ')).status).toBe(422);
    expect((await put('no_existe', '1')).status).toBe(404);

    const ok = await put('reserva_minutos_expiracion', 45);
    expect(ok.body.data).toMatchObject({ valor: 45, actualizado_por: { id: 1 } });
    expect((await put('membresia_valor_mensual_moto', '75000.50')).body.data.valor).toBe(75000.5);
  });

  test('un parámetro booleano solo acepta sí o no', async () => {
    await pool.query(
      "INSERT INTO configuracion (clave, valor, tipo, descripcion) VALUES ('prueba_booleano', 'true', 'booleano', 'Prueba')"
    );
    try {
      const put = (valor) => admin.put('/api/v1/configuracion/prueba_booleano').send({ valor });
      expect((await put('quizás')).status).toBe(422);
      expect((await put(false)).body.data.valor).toBe(false);
      expect((await put('1')).body.data.valor).toBe(true);
    } finally {
      await pool.query("DELETE FROM configuracion WHERE clave = 'prueba_booleano'");
    }
  });
});

describe('Pico y placa de hoy en la página pública', () => {
  test('muestra los dígitos y el horario de las reglas activas de hoy, por tipo', async () => {
    const { diaSemana } = enBogota();
    await pool.query(
      `INSERT INTO pico_placa (tipo_vehiculo, dia_semana, digito, hora_inicio, hora_fin, activa, creado_por)
       VALUES ('moto', ?, 9, '21:10', '21:40', 1, 1)`,
      [diaSemana]
    );
    const res = await request(app).get('/api/v1/publico/pico-placa-hoy');
    expect(res.status).toBe(200);
    expect(res.body.data.moto.digitos).toContain(9);
    expect(res.body.data.moto.horarios).toContain('21:10–21:40');
    expect(res.body.data.moto.criterio).toMatch(/primer dígito/);
  });
});
