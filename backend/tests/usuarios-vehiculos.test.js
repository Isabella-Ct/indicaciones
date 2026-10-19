// Fase 1 — usuarios y vehículos. Requiere la BD cargada con `npm run db:reset`.
// Crea sus propios datos (documentos/placas únicos) y los borra al final.
const request = require('supertest');
const { crearApp } = require('../src/app');
const { pool } = require('../src/config/db');
const { eliminarArchivo } = require('../src/utils/archivos');

const app = crearApp();

const ADMIN = { tipo_documento: 'CC', numero_documento: '1000000001', contrasena: 'Admin2026*' };
const OPERADOR = {
  tipo_documento: 'CC',
  numero_documento: '1000000002',
  contrasena: 'Operador2026*',
};
const CLIENTE = {
  tipo_documento: 'CC',
  numero_documento: '1000000004',
  contrasena: 'Cliente2026*',
};

const sufijo = String(Date.now()).slice(-7);
const letras = (n) =>
  Array.from({ length: n }, (_, i) =>
    String.fromCharCode(65 + ((Number(sufijo[i]) * 7 + i * 3) % 26))
  ).join('');
const PLACA_CARRO = `${letras(3)}${sufijo.slice(-3)}`;
const PLACA_MOTO = `${letras(3)}${sufijo.slice(-2)}Q`;

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64),
]);
const GIF = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(64)]);

const creados = { usuarios: [], vehiculos: [], fotos: [] };
let admin;
let operador;
let cliente;

async function iniciarSesion(credenciales) {
  const agente = request.agent(app);
  const res = await agente.post('/api/v1/auth/login').send(credenciales);
  expect(res.status).toBe(200);
  return agente;
}

function datosCliente(extra = {}) {
  const n = `${creados.usuarios.length}${sufijo}`;
  return {
    tipo_documento: 'CC',
    numero_documento: `8${n}`,
    primer_nombre: 'Prueba',
    primer_apellido: `Fase${n}`,
    correo: `prueba${n}@correo.test`,
    celular: '3009998877',
    rol_id: '3',
    contrasena_temporal: 'Temporal2026*',
    ...extra,
  };
}

/** POST multipart (como lo envía el formulario). */
function enviarUsuario(agente, datos, foto) {
  const req = agente.post('/api/v1/usuarios');
  for (const [k, v] of Object.entries(datos)) req.field(k, v);
  if (foto) req.attach('foto', foto.buffer, { filename: foto.nombre, contentType: foto.tipo });
  return req;
}

async function registrarCreado(res) {
  if (res.body?.data?.id) {
    creados.usuarios.push(res.body.data.id);
    if (res.body.data.foto_url) creados.fotos.push(res.body.data.foto_url);
  }
  return res;
}

beforeAll(async () => {
  admin = await iniciarSesion(ADMIN);
  operador = await iniciarSesion(OPERADOR);
  cliente = await iniciarSesion(CLIENTE);
});

afterAll(async () => {
  if (creados.vehiculos.length) {
    await pool.query('DELETE FROM vehiculos_historial_propietario WHERE vehiculo_id IN (?)', [
      creados.vehiculos,
    ]);
    await pool.query('DELETE FROM vehiculos WHERE id IN (?)', [creados.vehiculos]);
  }
  if (creados.usuarios.length) {
    await pool.query(
      "DELETE FROM notificaciones WHERE tipo = 'perfil_actualizado' AND enlace IN (?)",
      [creados.usuarios.map((id) => `/app/usuarios.html?id=${id}`)]
    );
    await pool.query('DELETE FROM usuarios WHERE id IN (?)', [creados.usuarios]);
  }
  await Promise.all(creados.fotos.map(eliminarArchivo));
  await pool.end();
});

describe('Usuarios — creación (REQ-USR-2)', () => {
  test('el operador NO puede crear un administrador → 403', async () => {
    const res = await enviarUsuario(operador, datosCliente({ rol_id: '1' })).then(registrarCreado);
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('PROHIBIDO');
  });

  test('el operador crea un cliente con contraseña temporal', async () => {
    const res = await enviarUsuario(operador, datosCliente()).then(registrarCreado);
    expect(res.status).toBe(201);
    expect(res.body.data.rol).toBe('usuario');
    expect(res.body.data.debe_cambiar_contrasena).toBe(true);
    expect(JSON.stringify(res.body)).not.toMatch(/contrasena_hash|\$2b\$/);
  });

  test('documento duplicado → 409', async () => {
    const res = await enviarUsuario(admin, datosCliente({ numero_documento: '1000000004' })).then(
      registrarCreado
    );
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('DOCUMENTO_DUPLICADO');
  });

  test('correo duplicado → 409', async () => {
    const res = await enviarUsuario(
      admin,
      datosCliente({ correo: 'andrea.salcedo@correo.test' })
    ).then(registrarCreado);
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('CORREO_DUPLICADO');
  });

  test('celular y correo inválidos → 422 con detalle por campo', async () => {
    const res = await enviarUsuario(
      admin,
      datosCliente({ celular: '12345', correo: 'no-es-correo' })
    ).then(registrarCreado);
    expect(res.status).toBe(422);
    expect(res.body.error.detalles.map((d) => d.campo)).toEqual(
      expect.arrayContaining(['celular', 'correo'])
    );
  });
});

describe('Usuarios — foto', () => {
  test('acepta PNG y la sirve solo con sesión', async () => {
    const res = await enviarUsuario(admin, datosCliente(), {
      buffer: PNG,
      nombre: 'foto.png',
      tipo: 'image/png',
    }).then(registrarCreado);
    expect(res.status).toBe(201);
    expect(res.body.data.foto_url).toMatch(/^\/uploads\/usuarios\/[0-9a-f-]+\.png$/);

    expect((await request(app).get(res.body.data.foto_url)).status).toBe(401);
    expect((await admin.get(res.body.data.foto_url)).status).toBe(200);
  });

  test('rechaza un archivo que no es JPG/PNG aunque diga image/png → 422', async () => {
    const res = await enviarUsuario(admin, datosCliente(), {
      buffer: GIF,
      nombre: 'falsa.png',
      tipo: 'image/png',
    }).then(registrarCreado);
    expect(res.status).toBe(422);
    expect(res.body.error.detalles[0].campo).toBe('foto');
  });

  test('rechaza fotos de más de 2 MB → 422', async () => {
    const grande = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
    const res = await enviarUsuario(admin, datosCliente(), {
      buffer: grande,
      nombre: 'grande.png',
      tipo: 'image/png',
    }).then(registrarCreado);
    expect(res.status).toBe(422);
    expect(res.body.error.mensaje).toMatch(/2 MB/);
  });
});

describe('Usuarios — consulta, edición y estado', () => {
  test('el operador no ve el listado completo, pero sí busca clientes por documento', async () => {
    expect((await operador.get('/api/v1/usuarios')).status).toBe(403);
    const res = await operador.get('/api/v1/usuarios/buscar?documento=100000000');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const u of res.body.data) {
      expect(Object.keys(u).sort()).toEqual([
        'id',
        'nombre_completo',
        'numero_documento',
        'tipo_documento',
      ]);
    }
    // Solo clientes activos: ni el admin (…001) ni el inactivo (…009)
    const docs = res.body.data.map((u) => u.numero_documento);
    expect(docs).not.toContain('1000000001');
    expect(docs).not.toContain('1000000009');
  });

  test('el administrador lista con filtros y paginación', async () => {
    const res = await admin.get('/api/v1/usuarios?rol=usuario&estado=activo&limite=2&pagina=1');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ pagina: 1, limite: 2 });
    expect(res.body.data.every((u) => u.rol === 'usuario' && u.estado === 'activo')).toBe(true);
  });

  test('un cliente solo puede ver sus propios datos', async () => {
    expect((await cliente.get('/api/v1/usuarios/5')).status).toBe(403);
    expect((await cliente.get('/api/v1/usuarios/4')).status).toBe(200);
  });

  test('el administrador no puede inactivarse a sí mismo → 409', async () => {
    const res = await admin.patch('/api/v1/usuarios/1/estado').send({ estado: 'inactivo' });
    expect(res.status).toBe(409);
  });

  test('el administrador inactiva un usuario y este ya no puede entrar', async () => {
    const creado = await enviarUsuario(admin, datosCliente()).then(registrarCreado);
    const id = creado.body.data.id;
    expect(
      (await operador.patch(`/api/v1/usuarios/${id}/estado`).send({ estado: 'inactivo' })).status
    ).toBe(403);
    const res = await admin.patch(`/api/v1/usuarios/${id}/estado`).send({ estado: 'inactivo' });
    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe('inactivo');
    const login = await request(app).post('/api/v1/auth/login').send({
      tipo_documento: 'CC',
      numero_documento: creado.body.data.numero_documento,
      contrasena: 'Temporal2026*',
    });
    expect(login.status).toBe(403);
  });

  test('solo el administrador edita usuarios (REQ-USR-5)', async () => {
    const creado = await enviarUsuario(admin, datosCliente()).then(registrarCreado);
    const u = creado.body.data;
    const id = u.id;
    const cambios = {
      tipo_documento: u.tipo_documento,
      numero_documento: u.numero_documento,
      primer_nombre: 'Editado',
      primer_apellido: u.primer_apellido,
      correo: u.correo,
      celular: u.celular,
      rol_id: String(u.rol_id),
    };
    const req = (agente) => {
      const r = agente.put(`/api/v1/usuarios/${id}`);
      for (const [k, v] of Object.entries(cambios)) r.field(k, v);
      return r;
    };
    expect((await req(operador)).status).toBe(403);
    const res = await req(admin);
    expect(res.status).toBe(200);
    expect(res.body.data.primer_nombre).toBe('Editado');
  });
});

describe('Mis datos (REQ-USR-4)', () => {
  test('al editar sus datos se notifica a todos los administradores', async () => {
    const creado = await enviarUsuario(admin, datosCliente()).then(registrarCreado);
    const u = creado.body.data;
    await pool.query('UPDATE usuarios SET debe_cambiar_contrasena = 0 WHERE id = ?', [u.id]);
    const agente = await iniciarSesion({
      tipo_documento: 'CC',
      numero_documento: u.numero_documento,
      contrasena: 'Temporal2026*',
    });

    const res = await agente
      .put('/api/v1/usuarios/me')
      .field('primer_nombre', u.primer_nombre)
      .field('primer_apellido', u.primer_apellido)
      .field('correo', u.correo)
      .field('celular', '3112223344')
      .field('rol_id', '1'); // intento de cambiar el rol: se ignora
    expect(res.status).toBe(200);
    expect(res.body.data.celular).toBe('3112223344');
    expect(res.body.data.rol).toBe('usuario');
    expect(res.body.meta.campos_cambiados).toEqual(['celular']);

    const [[{ admins }]] = await pool.query(
      "SELECT COUNT(*) AS admins FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE r.nombre = 'administrador' AND u.estado = 'activo'"
    );
    const [notificaciones] = await pool.query(
      "SELECT usuario_id, mensaje FROM notificaciones WHERE tipo = 'perfil_actualizado' AND enlace = ?",
      [`/app/usuarios.html?id=${u.id}`]
    );
    expect(notificaciones).toHaveLength(admins);
    expect(notificaciones[0].mensaje).toMatch(/celular/);
  });
});

describe('Vehículos (REQ-CAR-1..3, REQ-USR-6)', () => {
  let vehiculoId;

  test('placa inválida para el tipo → 422', async () => {
    const res = await operador
      .post('/api/v1/vehiculos')
      .send({ placa: 'ABC12D', tipo: 'carro', color: 'Rojo', marca: 'Kia', modelo: 'Rio' });
    expect(res.status).toBe(422);
    expect(res.body.error.detalles[0].campo).toBe('placa');
  });

  test('el operador registra un vehículo sin propietario y la placa se normaliza', async () => {
    const escrita = `${PLACA_CARRO.slice(0, 3).toLowerCase()} - ${PLACA_CARRO.slice(3)}`;
    const res = await operador
      .post('/api/v1/vehiculos')
      .send({ placa: escrita, tipo: 'carro', color: 'Gris', marca: 'Mazda', modelo: '3' });
    expect(res.status).toBe(201);
    expect(res.body.data.placa).toBe(PLACA_CARRO);
    expect(res.body.data.propietario).toBeNull();
    vehiculoId = res.body.data.id;
    creados.vehiculos.push(vehiculoId);
  });

  test('placa duplicada → 409', async () => {
    const res = await admin
      .post('/api/v1/vehiculos')
      .send({ placa: PLACA_CARRO, tipo: 'carro', color: 'Gris', marca: 'Mazda', modelo: '3' });
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('PLACA_DUPLICADA');
  });

  test('el propietario debe ser un cliente activo → 422', async () => {
    const res = await operador
      .patch(`/api/v1/vehiculos/${vehiculoId}/propietario`)
      .send({ usuario_id: 2 });
    expect(res.status).toBe(422);
  });

  test('el operador asigna propietario a un vehículo sin dueño (REQ-USR-6)', async () => {
    const res = await operador
      .patch(`/api/v1/vehiculos/${vehiculoId}/propietario`)
      .send({ usuario_id: 4 });
    expect(res.status).toBe(200);
    expect(res.body.data.propietario.id).toBe(4);
  });

  test('el operador NO puede reasignar un vehículo con propietario → 403', async () => {
    const res = await operador
      .patch(`/api/v1/vehiculos/${vehiculoId}/propietario`)
      .send({ usuario_id: 5 });
    expect(res.status).toBe(403);
  });

  test('el administrador reasigna (REQ-CAR-3) y queda en el historial', async () => {
    const res = await admin
      .patch(`/api/v1/vehiculos/${vehiculoId}/propietario`)
      .send({ usuario_id: 5, motivo: 'Venta del vehículo' });
    expect(res.status).toBe(200);
    expect(res.body.data.propietario.id).toBe(5);

    const historial = await admin.get(`/api/v1/vehiculos/${vehiculoId}/historial`);
    expect(historial.status).toBe(200);
    expect(historial.body.data).toHaveLength(2);
    expect(historial.body.data[0]).toMatchObject({
      motivo: 'Venta del vehículo',
      anterior: { id: 4 },
      nuevo: { id: 5 },
    });
    expect(historial.body.data[1]).toMatchObject({ anterior: null, nuevo: { id: 4 } });
  });

  test('solo el administrador edita vehículos (REQ-CAR-2)', async () => {
    const datos = {
      placa: PLACA_CARRO,
      tipo: 'carro',
      color: 'Negro',
      marca: 'Mazda',
      modelo: 'CX-5',
      activo: true,
    };
    expect((await operador.put(`/api/v1/vehiculos/${vehiculoId}`).send(datos)).status).toBe(403);
    const res = await admin.put(`/api/v1/vehiculos/${vehiculoId}`).send(datos);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ color: 'Negro', modelo: 'CX-5' });
  });

  test('se crea una moto con propietario desde el registro', async () => {
    const res = await admin.post('/api/v1/vehiculos').send({
      placa: PLACA_MOTO,
      tipo: 'moto',
      color: 'Azul',
      marca: 'Yamaha',
      modelo: 'FZ',
      usuario_id: 4,
    });
    expect(res.status).toBe(201);
    creados.vehiculos.push(res.body.data.id);
    const historial = await admin.get(`/api/v1/vehiculos/${res.body.data.id}/historial`);
    expect(historial.body.data).toHaveLength(1);
  });

  test('búsqueda exacta por placa y filtros del listado', async () => {
    const porPlaca = await operador.get('/api/v1/vehiculos/placa/mnp-908');
    expect(porPlaca.status).toBe(200);
    expect(porPlaca.body.data.propietario.numero_documento).toBe('1000000004');

    const sin = await operador.get('/api/v1/vehiculos?propietario=sin');
    expect(sin.body.data.every((v) => v.propietario === null)).toBe(true);
    expect((await operador.get('/api/v1/vehiculos/placa/ZZZ999')).status).toBe(404);
  });

  test('el cliente ve solo sus vehículos y no accede al listado general', async () => {
    expect((await cliente.get('/api/v1/vehiculos')).status).toBe(403);
    const res = await cliente.get('/api/v1/usuarios/me/vehiculos');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((v) => v.propietario.id === 4)).toBe(true);
  });
});
