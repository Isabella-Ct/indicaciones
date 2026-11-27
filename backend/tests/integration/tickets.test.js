// Pruebas de integración del ticket de ingreso (spec 007: HU-32). El correo usa el transporte en memoria.
const { app, request, tokenDe, auth } = require('../setup/helpers');
const { placaAleatoria } = require('../setup/infraestructura');
const { crearSede, fijarReloj, DOMINGO_10AM } = require('../setup/sede');
const { bandejaMemoria, vaciarBandeja } = require('../../src/integrations/correo');

let admin;
let operador;
let cliente;
let sede;
beforeAll(async () => {
  [admin, operador, cliente] = await Promise.all([tokenDe('admin'), tokenDe('operador'), tokenDe('cliente')]);
  sede = await crearSede(admin, { carros: 8 });
});
afterEach(() => jest.restoreAllMocks());

const api = (metodo, ruta, token = operador) => request(app)[metodo](`/api/v1${ruta}`).set(auth(token));

describe('HU-32 Generar el ticket de ingreso', () => {
  test('HU-32 E1 cada entrada genera un ticket consecutivo con los datos del movimiento y el parqueadero', async () => {
    fijarReloj(DOMINGO_10AM);
    const primera = (await api('post', '/movimientos').send({ placa: placaAleatoria(), tipo: 'carro', idPuerta: sede.puertas.mixta })).body.data;
    const segunda = (await api('post', '/movimientos').send({ placa: placaAleatoria(), tipo: 'carro', idPuerta: sede.puertas.mixta })).body.data;
    const numero = (t) => Number(t.ticket.codigo.slice(2));
    expect(numero(segunda)).toBe(numero(primera) + 1);
    const res = await api('get', `/tickets/${primera.ticket.codigo.toLowerCase()}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      codigo: primera.ticket.codigo,
      fechaEmision: '2026-11-29T10:00:00-05:00',
      valido: true,
      extraviado: false,
      tieneCorreo: false,
      parqueadero: { nombre: expect.stringMatching(/^Prueba /), direccion: 'Calle 10 # 20-30' },
      movimiento: {
        idMovimiento: primera.idMovimiento,
        vehiculo: { placa: primera.vehiculo.placa, tipo: 'carro' },
        celda: { codigo: primera.celda.codigo },
        puertaEntrada: { nombre: 'Principal' },
        fechaHoraEntrada: '2026-11-29T10:00:00-05:00',
      },
    });
  });

  test('HU-32 E2 se envía al correo del propietario (enmascarado en la respuesta); ocasional → 409 SIN_CORREO', async () => {
    fijarReloj(DOMINGO_10AM);
    vaciarBandeja();
    const placa = placaAleatoria();
    await api('post', '/vehiculos').send({ placa, tipo: 'carro', color: 'Azul', marca: 'Mazda', modelo: 2021, idPropietario: 4 });
    const m = (await api('post', '/movimientos').send({ placa, idPuerta: sede.puertas.mixta })).body.data;
    const ticket = await api('get', `/tickets/${m.ticket.codigo}`);
    expect(ticket.body.data.tieneCorreo).toBe(true);
    expect(JSON.stringify(ticket.body)).not.toContain('@');
    const res = await api('post', `/tickets/${m.ticket.codigo}/envio`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ codigo: m.ticket.codigo, enviadoA: 'a***@correo.co' });
    const [correo] = bandejaMemoria();
    expect(correo.para).toBe('andrea.salcedo@correo.co');
    expect(correo.asunto).toContain(m.ticket.codigo);
    expect(correo.texto).toContain(placa);
    const ocasional = (await api('post', '/movimientos').send({ placa: placaAleatoria(), tipo: 'carro', idPuerta: sede.puertas.mixta })).body.data;
    const sinCorreo = await api('post', `/tickets/${ocasional.ticket.codigo}/envio`);
    expect(sinCorreo.status).toBe(409);
    expect(sinCorreo.body.error.code).toBe('SIN_CORREO');
  });

  test('HU-32 E3 código inexistente → 404; mal formado → 422; Cliente → 403; el ticket anulado se muestra inválido', async () => {
    fijarReloj(DOMINGO_10AM);
    expect((await api('get', '/tickets/T-999999')).status).toBe(404);
    expect((await api('get', '/tickets/999999')).status).toBe(422);
    expect((await api('get', '/tickets/T-000001', cliente)).status).toBe(403);
    const m = (await api('post', '/movimientos').send({ placa: placaAleatoria(), tipo: 'carro', idPuerta: sede.puertas.mixta })).body.data;
    await api('patch', `/movimientos/${m.idMovimiento}/anulacion`).send({ motivo: 'Ticket emitido por error' });
    const res = await api('get', `/tickets/${m.ticket.codigo}`);
    expect(res.body.data).toMatchObject({ valido: false, movimiento: { estado: 'anulado' } });
    expect((await api('post', '/tickets/T-999999/envio')).status).toBe(404);
  });
});
