// Fase 2 — celdas, puertas, disponibilidad pública y SSE.
// Requiere la BD cargada con `npm run db:reset`. Restaura lo que cambia al final.
const http = require('node:http');
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
const CLIENTE = {
  tipo_documento: 'CC',
  numero_documento: '1000000004',
  contrasena: 'Cliente2026*',
};

let admin;
let operador;
let cliente;
let servidor;
let base;
const celdas = {};
const vehiculos = {};
const creadas = { celdas: [], puertas: [] };

async function iniciarSesion(credenciales) {
  const agente = request.agent(app);
  const res = await agente.post('/api/v1/auth/login').send(credenciales);
  expect(res.status).toBe(200);
  const cookie = res.headers['set-cookie'][0].split(';')[0];
  return Object.assign(agente, { cookie });
}

const estado = (agente, codigo, cuerpo) =>
  agente.patch(`/api/v1/celdas/${celdas[codigo]}/estado`).send(cuerpo);

/** Abre un stream SSE y devuelve { eventos, esperar(nombre, filtro), cerrar }. */
function abrirSse(ruta, cookie) {
  const eventos = [];
  const esperas = [];
  const req = http.get(`${base}${ruta}`, { headers: cookie ? { Cookie: cookie } : {} });
  const listo = new Promise((resolver, rechazar) => {
    req.on('error', rechazar);
    req.on('response', (res) => {
      res.setEncoding('utf8');
      let buffer = '';
      res.on('data', (trozo) => {
        buffer += trozo;
        let corte;
        while ((corte = buffer.indexOf('\n\n')) >= 0) {
          const bloque = buffer.slice(0, corte);
          buffer = buffer.slice(corte + 2);
          const nombre = bloque.match(/^event: (.+)$/m)?.[1];
          const datos = bloque.match(/^data: (.+)$/m)?.[1];
          if (!nombre || !datos) continue;
          const evento = { nombre, datos: JSON.parse(datos), en: Date.now() };
          eventos.push(evento);
          esperas.filter((e) => e.coincide(evento)).forEach((e) => e.resolver(evento));
        }
      });
      resolver(res);
    });
  });
  return {
    listo,
    eventos,
    esperar(nombre, filtro = () => true, ms = 2000) {
      const coincide = (e) => e.nombre === nombre && filtro(e.datos);
      const ya = eventos.find(coincide);
      if (ya) return Promise.resolve(ya);
      return new Promise((resolver, rechazar) => {
        const t = setTimeout(() => rechazar(new Error(`No llegó "${nombre}" en ${ms} ms`)), ms);
        esperas.push({ coincide, resolver: (e) => (clearTimeout(t), resolver(e)) });
      });
    },
    cerrar: () => req.destroy(),
  };
}

beforeAll(async () => {
  const [filas] = await pool.query('SELECT id, codigo FROM celdas');
  filas.forEach((f) => (celdas[f.codigo] = f.id));
  const [vs] = await pool.query('SELECT id, placa FROM vehiculos');
  vs.forEach((v) => (vehiculos[v.placa] = v.id));
  admin = await iniciarSesion(ADMIN);
  operador = await iniciarSesion(OPERADOR);
  cliente = await iniciarSesion(CLIENTE);
  servidor = app.listen(0);
  base = `http://127.0.0.1:${servidor.address().port}`;
});

afterAll(async () => {
  await pool.query(
    "UPDATE celdas SET estado = 'disponible', vehiculo_actual_id = NULL, nota = NULL WHERE codigo IN ('A-06', 'A-12', 'M-03')"
  );
  await pool.query("UPDATE celdas SET estado = 'reservada', nota = NULL WHERE codigo = 'B-09'");
  if (creadas.celdas.length)
    await pool.query('DELETE FROM celdas WHERE id IN (?)', [creadas.celdas]);
  if (creadas.puertas.length)
    await pool.query('DELETE FROM puertas WHERE id IN (?)', [creadas.puertas]);
  await new Promise((r) => servidor.close(r));
  await pool.end();
});

describe('Consulta de celdas (REQ-CLD-01, REQ-CLD-02)', () => {
  test('pisos con los tramos del carril', async () => {
    const res = await cliente.get('/api/v1/pisos');
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({
      nombre: 'Sótano 1',
      carril: ['ENTRADA →', '→ CIRCULACIÓN →', '→ RAMPA S2'],
      total_celdas: 24,
    });
  });

  test('el personal ve placas; el cliente NO recibe placas ni titulares', async () => {
    const delOperador = await operador.get('/api/v1/celdas');
    expect(delOperador.status).toBe(200);
    expect(delOperador.body.data).toHaveLength(44);
    const a03 = delOperador.body.data.find((c) => c.codigo === 'A-03');
    expect(a03.ocupante.placa).toBe('JKL482');
    expect(a03.estadia.codigo_ticket).toMatch(/^T-\d{6}$/);

    const delCliente = await cliente.get('/api/v1/celdas');
    expect(delCliente.status).toBe(200);
    expect(delCliente.body.data).toHaveLength(44);
    const texto = JSON.stringify(delCliente.body);
    expect(texto).not.toMatch(/JKL482|MNP908|placa|ocupante|titular|codigo_ticket/);
    expect(delCliente.body.data.find((c) => c.codigo === 'A-03').estado).toBe('ocupada');
  });

  test('filtros y orden por piso, fila y posición', async () => {
    const res = await operador.get('/api/v1/celdas?tipo=moto&estado=disponible');
    expect(res.body.data.every((c) => c.tipo === 'moto' && c.estado === 'disponible')).toBe(true);
    const s1 = await operador.get(`/api/v1/celdas?piso_id=1`);
    expect(s1.body.data.map((c) => c.codigo).slice(0, 3)).toEqual(['A-01', 'A-02', 'A-03']);
    expect(s1.body.data[12].codigo).toBe('B-01');
    const accesibles = await operador.get('/api/v1/celdas?accesible=1');
    expect(accesibles.body.data.map((c) => c.codigo)).toEqual(['A-01', 'B-01']);
  });

  test('resumen por estado, tipo y piso', async () => {
    const res = await cliente.get('/api/v1/celdas/resumen');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      total: 44,
      habilitadas: 43,
      por_estado: { ocupada: 7, reservada: 2, fuera_servicio: 1, disponible: 34 },
    });
    expect(res.body.data.por_piso).toHaveLength(2);
    expect(res.body.data.por_tipo.moto.total).toBe(12);
  });
});

describe('Cambio de estado (REQ-CLD-03)', () => {
  test('el cliente no puede cambiar estados → 403', async () => {
    expect((await estado(cliente, 'A-06', { estado: 'fuera_servicio', nota: 'x' })).status).toBe(
      403
    );
  });

  test('ocupar con un vehículo de otro tipo → 422', async () => {
    const res = await estado(operador, 'A-06', {
      estado: 'ocupada',
      vehiculo_id: vehiculos.RTV82G,
    });
    expect(res.status).toBe(422);
    expect(res.body.error.codigo).toBe('TIPO_INCOMPATIBLE');
  });

  test('un vehículo no puede ocupar dos celdas → 409', async () => {
    const res = await estado(operador, 'A-06', {
      estado: 'ocupada',
      vehiculo_id: vehiculos.JKL482,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('VEHICULO_YA_UBICADO');
  });

  test('ocupar exige vehículo y fuera de servicio exige nota → 422', async () => {
    const sinVehiculo = await estado(operador, 'A-06', { estado: 'ocupada' });
    expect(sinVehiculo.status).toBe(422);
    expect(sinVehiculo.body.error.detalles[0].campo).toBe('vehiculo_id');
    const sinNota = await estado(operador, 'A-06', { estado: 'fuera_servicio' });
    expect(sinNota.status).toBe(422);
    expect(sinNota.body.error.detalles[0].campo).toBe('nota');
    expect((await estado(operador, 'A-06', { estado: 'reservada' })).status).toBe(422);
  });

  test('ocupar y liberar manualmente una celda', async () => {
    const ocupar = await estado(operador, 'M-03', {
      estado: 'ocupada',
      vehiculo_id: vehiculos.RTV82G,
    });
    expect(ocupar.status).toBe(200);
    expect(ocupar.body.data).toMatchObject({ estado: 'ocupada', ocupante: { placa: 'RTV82G' } });
    const liberar = await estado(operador, 'M-03', { estado: 'disponible' });
    expect(liberar.status).toBe(200);
    expect(liberar.body.data.estado).toBe('disponible');
    expect(liberar.body.data.ocupante).toBeNull();
  });

  test('no se libera una celda con estadía en curso → 409', async () => {
    const res = await estado(operador, 'A-03', { estado: 'disponible' });
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('ESTADIA_EN_CURSO');
    expect(res.body.error.mensaje).toMatch(/registra su salida/);
  });

  test('la celda fija de una mensualidad vuelve a "reservada" al habilitarla', async () => {
    const fuera = await estado(admin, 'B-09', {
      estado: 'fuera_servicio',
      nota: 'Pintura del piso',
    });
    expect(fuera.status).toBe(200);
    expect(fuera.body.data.nota).toBe('Pintura del piso');
    const habilitar = await estado(admin, 'B-09', { estado: 'disponible' });
    expect(habilitar.status).toBe(200);
    expect(habilitar.body.meta.estado_final).toBe('reservada');
    expect(habilitar.body.data.reserva_origen).toBe('mensualidad');
  });
});

describe('Gestión de celdas y puertas (admin)', () => {
  test('crear, validar duplicados, editar y desactivar una celda', async () => {
    const nueva = {
      codigo: 'c-09',
      piso_id: 2,
      area: 'c',
      tipo: 'carro',
      es_accesible: false,
      fila_mapa: 'superior',
      posicion: 9,
    };
    expect((await operador.post('/api/v1/celdas').send(nueva)).status).toBe(403);

    const res = await admin.post('/api/v1/celdas').send(nueva);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ codigo: 'C-09', area: 'C', estado: 'disponible' });
    creadas.celdas.push(res.body.data.id);

    const duplicada = await admin.post('/api/v1/celdas').send({ ...nueva, posicion: 10 });
    expect(duplicada.status).toBe(409);
    expect(duplicada.body.error.codigo).toBe('CODIGO_DUPLICADO');
    const posicion = await admin
      .post('/api/v1/celdas')
      .send({ ...nueva, codigo: 'C-10', posicion: 1 });
    expect(posicion.status).toBe(409);
    expect(posicion.body.error.codigo).toBe('POSICION_OCUPADA');

    const editada = await admin
      .put(`/api/v1/celdas/${res.body.data.id}`)
      .send({ ...nueva, es_accesible: true });
    expect(editada.status).toBe(200);
    expect(editada.body.data.es_accesible).toBe(true);

    const baja = await admin
      .patch(`/api/v1/celdas/${res.body.data.id}/activa`)
      .send({ activa: false });
    expect(baja.status).toBe(200);
    expect(baja.body.data.activa).toBe(false);
    const lista = await operador.get('/api/v1/celdas');
    expect(lista.body.data.find((c) => c.codigo === 'C-09')).toBeUndefined();
  });

  test('no se desactiva una celda ocupada → 409', async () => {
    const res = await admin
      .patch(`/api/v1/celdas/${celdas['A-03']}/activa`)
      .send({ activa: false });
    expect(res.status).toBe(409);
  });

  test('CRUD de puertas solo para el administrador', async () => {
    expect(
      (await operador.post('/api/v1/puertas').send({ nombre: 'Oriente', tipo: 'entrada' })).status
    ).toBe(403);
    const res = await admin.post('/api/v1/puertas').send({ nombre: 'Oriente', tipo: 'entrada' });
    expect(res.status).toBe(201);
    creadas.puertas.push(res.body.data.id);
    expect(
      (await admin.post('/api/v1/puertas').send({ nombre: 'Norte', tipo: 'mixta' })).status
    ).toBe(409);
    const baja = await admin
      .patch(`/api/v1/puertas/${res.body.data.id}/activa`)
      .send({ activa: false });
    expect(baja.body.data.activa).toBe(false);
    const activas = await operador.get('/api/v1/puertas');
    expect(activas.body.data.map((p) => p.nombre)).toEqual(['Norte', 'Sur']);
  });
});

describe('Disponibilidad pública (sin login)', () => {
  test('solo totales por tipo, sin celdas ni datos personales', async () => {
    const res = await request(app).get('/api/v1/publico/disponibilidad');
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data).sort()).toEqual(['actualizado_en', 'carro', 'moto']);
    expect(Object.keys(res.body.data.carro).sort()).toEqual(['disponibles', 'habilitadas']);
    expect(JSON.stringify(res.body)).not.toMatch(/placa|codigo|A-0|nombre/);
  });

  test('el stream de celdas exige sesión → 401', async () => {
    expect((await request(app).get('/api/v1/celdas/stream')).status).toBe(401);
  });
});

describe('Tiempo real (SSE)', () => {
  test('un cambio llega a los streams en menos de 2 s, filtrado según el rol', async () => {
    const sseOperador = abrirSse('/api/v1/celdas/stream', operador.cookie);
    const sseCliente = abrirSse('/api/v1/celdas/stream', cliente.cookie);
    const ssePublico = abrirSse('/api/v1/publico/disponibilidad/stream');
    try {
      await Promise.all([sseOperador.listo, sseCliente.listo, ssePublico.listo]);
      await sseOperador.esperar('resumen-actualizado'); // evento inicial
      await ssePublico.esperar('disponibilidad');

      const inicio = Date.now();
      const res = await estado(operador, 'A-12', {
        estado: 'ocupada',
        vehiculo_id: vehiculos.CVB275,
      });
      expect(res.status).toBe(200);

      const delOperador = await sseOperador.esperar(
        'celda-actualizada',
        (c) => c.codigo === 'A-12'
      );
      expect(delOperador.en - inicio).toBeLessThan(2000);
      expect(delOperador.datos.ocupante.placa).toBe('CVB275');

      const delCliente = await sseCliente.esperar('celda-actualizada', (c) => c.codigo === 'A-12');
      expect(delCliente.datos.estado).toBe('ocupada');
      expect(JSON.stringify(delCliente.datos)).not.toMatch(/CVB275|ocupante/);

      const resumen = await sseOperador.esperar(
        'resumen-actualizado',
        (r) => r.por_estado.ocupada === 8
      );
      expect(resumen.datos.por_estado.ocupada).toBe(8);
      const publico = await ssePublico.esperar('disponibilidad', (d) => d.carro.disponibles === 23);
      expect(JSON.stringify(publico.datos)).not.toMatch(/A-12|CVB275/);
    } finally {
      [sseOperador, sseCliente, ssePublico].forEach((s) => s.cerrar());
    }
  });
});
