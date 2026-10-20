// Fase 5 — incidencias y notificaciones. Requiere `npm run db:reset`. Al final restaura todo.
const http = require('node:http');
const request = require('supertest');
const { crearApp } = require('../src/app');
const { pool, enTransaccion } = require('../src/config/db');
const { suscribir } = require('../src/realtime/emisor');
const notificaciones = require('../src/modules/notificaciones/notificaciones.service');

const app = crearApp();

const ADMIN = { tipo_documento: 'CC', numero_documento: '1000000001', contrasena: 'Admin2026*' };
const OPERADOR = {
  tipo_documento: 'CC',
  numero_documento: '1000000002',
  contrasena: 'Operador2026*',
};
const ANDREA = { tipo_documento: 'CC', numero_documento: '1000000004', contrasena: 'Cliente2026*' };
const PAULA = { tipo_documento: 'CC', numero_documento: '1000000005', contrasena: 'Cliente2026*' };
const ID = { admin: 1, operador: 2, andrea: 4, paula: 5, inactivo: 9 };

let admin;
let operador;
let andrea;
let paula;
const antes = {};

async function iniciarSesion(credenciales) {
  const agente = request.agent(app);
  expect((await agente.post('/api/v1/auth/login').send(credenciales)).status).toBe(200);
  return agente;
}
const maxId = async (tabla) =>
  (await pool.query(`SELECT COALESCE(MAX(id), 0) AS m FROM ${tabla}`))[0][0].m;
const nuevasDe = async (usuarioId) =>
  (
    await pool.query('SELECT * FROM notificaciones WHERE id > ? AND usuario_id = ? ORDER BY id', [
      antes.notificaciones,
      usuarioId,
    ])
  )[0];

beforeAll(async () => {
  admin = await iniciarSesion(ADMIN);
  operador = await iniciarSesion(OPERADOR);
  andrea = await iniciarSesion(ANDREA);
  paula = await iniciarSesion(PAULA);
  for (const t of ['notificaciones', 'incidencias', 'tipos_incidencia']) antes[t] = await maxId(t);
  [antes.consecutivos] = await pool.query(
    "SELECT nombre FROM consecutivos WHERE nombre LIKE 'incidencia-%'"
  );
  [antes.leidas] = await pool.query('SELECT id FROM notificaciones WHERE leida = 1');
});

afterAll(async () => {
  await pool.query('DELETE FROM notificaciones WHERE id > ?', [antes.notificaciones]);
  await pool.query('DELETE FROM incidencias WHERE id > ?', [antes.incidencias]);
  await pool.query('DELETE FROM tipos_incidencia WHERE id > ?', [antes.tipos_incidencia]);
  await pool.query('UPDATE tipos_incidencia SET activo = 1');
  const previas = antes.consecutivos.map((c) => c.nombre);
  await pool.query(
    `DELETE FROM consecutivos WHERE nombre LIKE 'incidencia-%' ${previas.length ? 'AND nombre NOT IN (?)' : ''}`,
    previas.length ? [previas] : []
  );
  await pool.query('UPDATE notificaciones SET leida = 0, leida_at = NULL');
  if (antes.leidas.length)
    await pool.query('UPDATE notificaciones SET leida = 1 WHERE id IN (?)', [
      antes.leidas.map((n) => n.id),
    ]);
  await pool.end();
});

// ---------------------------------------------------------------------------
describe('Incidencias (REQ-INCD-1)', () => {
  let creada;

  test('el operador registra: código INC-AAAAMMDD-NNNN, fecha del servidor, notifica a admins y propietario', async () => {
    const r = await operador.post('/api/v1/incidencias').send({
      tipo_incidencia_id: 1,
      placa: 'mnp-908',
      descripcion: 'Rayón en la puerta trasera derecha al salir de la celda.',
      fecha_hora: '2001-01-01 00:00:00', // se ignora: la pone el servidor
      codigo: 'INC-FALSO',
    });
    expect(r.status).toBe(201);
    creada = r.body.data;
    expect(creada.codigo).toMatch(/^INC-\d{8}-\d{4}$/);
    expect(creada.vehiculo.placa).toBe('MNP908');
    expect(creada.tipo.nombre).toBe('Rayón');
    expect(Math.abs(new Date(creada.fecha_hora) - Date.now())).toBeLessThan(5 * 60 * 1000);
    const [[{ dia }]] = await pool.query("SELECT DATE_FORMAT(NOW(), '%Y%m%d') AS dia");
    expect(creada.codigo.slice(4, 12)).toBe(dia);

    const aAdmin = await nuevasDe(ID.admin);
    expect(aAdmin).toHaveLength(1);
    expect(aAdmin[0]).toMatchObject({
      tipo: 'incidencia',
      enlace: `/app/incidencias.html?id=${creada.id}`,
    });
    expect(aAdmin[0].mensaje).toContain(creada.codigo);
    const aDueno = await nuevasDe(ID.andrea);
    expect(aDueno).toHaveLength(1);
    expect(aDueno[0].mensaje).toContain('MNP908');
    expect(await nuevasDe(ID.operador)).toHaveLength(0); // quien registra no es admin
  });

  test('códigos únicos y consecutivos, también con registros simultáneos', async () => {
    const respuestas = await Promise.all(
      [1, 2, 3].map(() =>
        operador.post('/api/v1/incidencias').send({
          tipo_incidencia_id: 4,
          placa: 'JKL482', // visitante: sin propietario
          descripcion: 'Golpe contra la columna al maniobrar en la rampa.',
        })
      )
    );
    respuestas.forEach((r) => expect(r.status).toBe(201));
    const codigos = [creada.codigo, ...respuestas.map((r) => r.body.data.codigo)];
    expect(new Set(codigos).size).toBe(4);
    const numeros = codigos.map((c) => Number(c.slice(-4))).sort((a, b) => a - b);
    expect(numeros[3] - numeros[0]).toBe(3);
  });

  test('validación: placa inexistente 404, tipo inválido 422, descripción corta 422', async () => {
    const base = { tipo_incidencia_id: 1, placa: 'ZZZ999', descripcion: 'Descripción suficiente.' };
    expect((await operador.post('/api/v1/incidencias').send(base)).body.error.codigo).toBe(
      'VEHICULO_NO_REGISTRADO'
    );
    expect(
      (
        await operador
          .post('/api/v1/incidencias')
          .send({ ...base, placa: 'MNP908', tipo_incidencia_id: 999 })
      ).status
    ).toBe(422);
    expect(
      (
        await operador
          .post('/api/v1/incidencias')
          .send({ ...base, placa: 'MNP908', descripcion: 'corta' })
      ).status
    ).toBe(422);
  });

  test('listado con filtros y detalle; el cliente no puede registrar ni listar (403)', async () => {
    const r = await admin.get('/api/v1/incidencias?placa=MNP&tipo_id=1');
    expect(r.status).toBe(200);
    expect(r.body.data.every((i) => i.vehiculo.placa === 'MNP908' && i.tipo.id === 1)).toBe(true);
    expect(r.body.data[0].id).toBe(creada.id);
    expect((await operador.get(`/api/v1/incidencias/${creada.id}`)).body.data.codigo).toBe(
      creada.codigo
    );
    expect((await andrea.get('/api/v1/incidencias')).status).toBe(403);
    expect(
      (
        await andrea
          .post('/api/v1/incidencias')
          .send({ tipo_incidencia_id: 1, placa: 'MNP908', descripcion: 'x'.repeat(20) })
      ).status
    ).toBe(403);
  });

  test('el cliente ve solo las incidencias de sus vehículos, sin quién registró', async () => {
    const r = await andrea.get('/api/v1/usuarios/me/incidencias');
    expect(r.status).toBe(200);
    expect(r.body.data.some((i) => i.id === creada.id)).toBe(true);
    expect(r.body.data.every((i) => ['MNP908', 'XKP45F'].includes(i.vehiculo.placa))).toBe(true);
    expect(r.body.data[0].registrada_por).toBeUndefined();
    const dePaula = await paula.get('/api/v1/usuarios/me/incidencias');
    expect(dePaula.body.data.some((i) => i.id === creada.id)).toBe(false);
  });

  test('tipos: el admin crea, edita y desactiva; el operador solo ve activos', async () => {
    const r = await admin.post('/api/v1/tipos-incidencia').send({ nombre: 'Vidrio roto' });
    expect(r.status).toBe(201);
    const id = r.body.data.id;
    expect(
      (await admin.post('/api/v1/tipos-incidencia').send({ nombre: 'Vidrio roto' })).status
    ).toBe(409);
    expect(
      (await operador.post('/api/v1/tipos-incidencia').send({ nombre: 'Otro tipo' })).status
    ).toBe(403);
    expect(
      (
        await admin
          .put(`/api/v1/tipos-incidencia/${id}`)
          .send({ nombre: 'Vidrio quebrado', descripcion: 'Ventanas' })
      ).body.data.nombre
    ).toBe('Vidrio quebrado');
    await admin.patch(`/api/v1/tipos-incidencia/${id}/activo`).send({ activo: false });
    const delOperador = (await operador.get('/api/v1/tipos-incidencia')).body.data;
    expect(delOperador.some((t) => t.id === id)).toBe(false);
    expect((await admin.get('/api/v1/tipos-incidencia')).body.data.some((t) => t.id === id)).toBe(
      true
    );
    const inactivo = await operador
      .post('/api/v1/incidencias')
      .send({ tipo_incidencia_id: id, placa: 'MNP908', descripcion: 'Vidrio trasero quebrado.' });
    expect(inactivo.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
describe('Notificaciones (REQ-NOT-1)', () => {
  test('bandeja propia: conteo, filtro no leídas, marcar una y todas como leídas', async () => {
    const conteo = (await andrea.get('/api/v1/notificaciones/mias/conteo')).body.data.no_leidas;
    expect(conteo).toBeGreaterThan(0);
    const noLeidas = await andrea.get('/api/v1/notificaciones/mias?leida=0');
    expect(noLeidas.body.data.every((n) => n.leida === false)).toBe(true);
    expect(noLeidas.body.meta.no_leidas).toBe(conteo);

    const una = noLeidas.body.data[0];
    const r = await andrea.patch(`/api/v1/notificaciones/${una.id}/leida`);
    expect(r.status).toBe(200);
    expect(r.body.data.leida).toBe(true);
    expect((await andrea.get('/api/v1/notificaciones/mias/conteo')).body.data.no_leidas).toBe(
      conteo - 1
    );
    await andrea.patch('/api/v1/notificaciones/mias/leer-todas');
    expect((await andrea.get('/api/v1/notificaciones/mias/conteo')).body.data.no_leidas).toBe(0);
  });

  test('no se puede marcar como leída una notificación ajena (404) ni se modifica', async () => {
    const [[ajena]] = await pool.query(
      'SELECT id FROM notificaciones WHERE usuario_id = ? AND leida = 0 LIMIT 1',
      [ID.admin]
    );
    const r = await andrea.patch(`/api/v1/notificaciones/${ajena.id}/leida`);
    expect(r.status).toBe(404);
    const [[despues]] = await pool.query('SELECT leida FROM notificaciones WHERE id = ?', [
      ajena.id,
    ]);
    expect(despues.leida).toBe(0);
    const bandeja = await andrea.get('/api/v1/notificaciones/mias?limite=100');
    expect(bandeja.body.data.some((n) => n.id === ajena.id)).toBe(false);
  });

  test('envío por rol llega a todos los usuarios activos de ese rol (no a inactivos)', async () => {
    const r = await admin.post('/api/v1/notificaciones').send({
      destino: 'rol',
      rol: 'usuario',
      titulo: 'Mantenimiento',
      mensaje: 'El sábado se pinta el Sótano 2.',
    });
    expect(r.status).toBe(201);
    const [clientes] = await pool.query(
      "SELECT u.id FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE r.nombre = 'usuario' AND u.estado = 'activo'"
    );
    expect(r.body.data.enviadas).toBe(clientes.length);
    const [recibidas] = await pool.query(
      "SELECT usuario_id, enviada_por, tipo FROM notificaciones WHERE id > ? AND titulo = 'Mantenimiento'",
      [antes.notificaciones]
    );
    expect(recibidas.map((n) => n.usuario_id).sort()).toEqual(clientes.map((c) => c.id).sort());
    expect(recibidas.some((n) => n.usuario_id === ID.inactivo)).toBe(false);
    expect(recibidas.every((n) => n.enviada_por === ID.admin && n.tipo === 'manual')).toBe(true);
  });

  test('envío a un usuario y a todos; validación; el operador no puede enviar (403)', async () => {
    const uno = await admin.post('/api/v1/notificaciones').send({
      destino: 'usuario',
      usuario_id: ID.paula,
      titulo: 'Hola Paula',
      mensaje: 'Tu celda fija es B-09.',
    });
    expect(uno.body.data.enviadas).toBe(1);
    const bandeja = (await paula.get('/api/v1/notificaciones/mias')).body.data;
    expect(bandeja[0]).toMatchObject({ titulo: 'Hola Paula', tipo: 'manual' });
    expect(bandeja[0].enviada_por.id).toBe(ID.admin);

    const [[{ activos }]] = await pool.query(
      "SELECT COUNT(*) AS activos FROM usuarios WHERE estado = 'activo'"
    );
    const todos = await admin
      .post('/api/v1/notificaciones')
      .send({ destino: 'todos', titulo: 'Aviso general', mensaje: 'Horario normal en festivo.' });
    expect(todos.body.data.enviadas).toBe(activos);

    expect(
      (
        await admin
          .post('/api/v1/notificaciones')
          .send({ destino: 'usuario', titulo: 'Sin usuario', mensaje: 'Falta id.' })
      ).status
    ).toBe(422);
    expect(
      (
        await admin.post('/api/v1/notificaciones').send({
          destino: 'usuario',
          usuario_id: ID.inactivo,
          titulo: 'Inactivo',
          mensaje: 'No llega.',
        })
      ).status
    ).toBe(422);
    expect(
      (
        await operador
          .post('/api/v1/notificaciones')
          .send({ destino: 'todos', titulo: 'No', mensaje: 'Sin permiso.' })
      ).status
    ).toBe(403);
  });

  test('REQ-USR-4: editar mis datos notifica a los admins por el servicio unificado', async () => {
    const [[yo]] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [ID.paula]);
    const editar = (celular) =>
      paula
        .put('/api/v1/usuarios/me')
        .field('primer_nombre', yo.primer_nombre)
        .field('primer_apellido', yo.primer_apellido)
        .field('correo', yo.correo)
        .field('celular', celular);
    const r = await editar('3109998877');
    expect(r.status).toBe(200);
    const [n] = await pool.query(
      "SELECT * FROM notificaciones WHERE id > ? AND tipo = 'perfil_actualizado'",
      [antes.notificaciones]
    );
    expect(n.map((x) => x.usuario_id)).toEqual([ID.admin]);
    await editar(yo.celular);
  });

  test('el aviso en tiempo real sale solo después del commit (nunca tras un rollback)', async () => {
    const recibidos = [];
    const cancelar = suscribir(notificaciones.EVENTO, (d) => recibidos.push(d));
    await expect(
      enTransaccion(async (conexion) => {
        await notificaciones.notificar(
          { usuarios: [ID.andrea], titulo: 'Rollback', mensaje: 'No debe salir.', tipo: 'manual' },
          conexion
        );
        expect(recibidos).toHaveLength(0); // aún dentro de la transacción
        throw new Error('falla');
      })
    ).rejects.toThrow('falla');
    expect(recibidos).toHaveLength(0);
    await enTransaccion((conexion) =>
      notificaciones.notificar(
        { usuarios: [ID.andrea], titulo: 'Commit', mensaje: 'Sí sale.', tipo: 'manual' },
        conexion
      )
    );
    cancelar();
    expect(recibidos).toEqual([{ usuarios: [ID.andrea], titulo: 'Commit' }]);
    const [[{ n }]] = await pool.query(
      "SELECT COUNT(*) AS n FROM notificaciones WHERE id > ? AND titulo = 'Rollback'",
      [antes.notificaciones]
    );
    expect(n).toBe(0);
  });

  test('SSE /notificaciones/stream: conteo inicial y aviso solo al destinatario', async () => {
    const servidor = app.listen(0);
    const puerto = servidor.address().port;
    const cookie = async (cred) => {
      const r = await request(app).post('/api/v1/auth/login').send(cred);
      return r.headers['set-cookie'][0].split(';')[0];
    };
    const abrir = (galleta) =>
      new Promise((resolve) => {
        const eventos = [];
        const req = http.get(
          { port: puerto, path: '/api/v1/notificaciones/stream', headers: { Cookie: galleta } },
          (res) => {
            res.setEncoding('utf8');
            res.on('data', (trozo) => {
              for (const bloque of trozo.split('\n\n')) {
                const ev = bloque.match(/^event: (.+)$/m);
                const datos = bloque.match(/^data: (.+)$/m);
                if (ev && datos) eventos.push({ evento: ev[1], datos: JSON.parse(datos[1]) });
              }
            });
            resolve({ eventos, cerrar: () => req.destroy() });
          }
        );
      });
    const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

    const deAndrea = await abrir(await cookie(ANDREA));
    const dePaula = await abrir(await cookie(PAULA));
    await esperar(300);
    expect(deAndrea.eventos[0].evento).toBe('conteo');
    expect(typeof deAndrea.eventos[0].datos.no_leidas).toBe('number');

    await admin.post('/api/v1/notificaciones').send({
      destino: 'usuario',
      usuario_id: ID.andrea,
      titulo: 'Solo Andrea',
      mensaje: 'Prueba SSE.',
    });
    await esperar(300);
    expect(
      deAndrea.eventos.some((e) => e.evento === 'notificacion' && e.datos.titulo === 'Solo Andrea')
    ).toBe(true);
    expect(dePaula.eventos.some((e) => e.evento === 'notificacion')).toBe(false);

    deAndrea.cerrar();
    dePaula.cerrar();
    await new Promise((r) => servidor.close(r));
  });
});
