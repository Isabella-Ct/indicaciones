// Pruebas de integración de facturas (spec 009: HU-41, HU-42, HU-43). El correo usa el transporte en memoria.
const { app, request, tokenDe, auth } = require('../setup/helpers');
const { crearSede, fijarReloj } = require('../setup/sede');
const { estadia } = require('../setup/cobro');
const { bandejaMemoria, vaciarBandeja } = require('../../src/integrations/correo');

let admin;
let operador;
let cliente;
let sede;
beforeAll(async () => {
  [admin, operador, cliente] = await Promise.all([tokenDe('admin'), tokenDe('operador'), tokenDe('cliente')]);
  sede = await crearSede(admin, { carros: 10 });
});
afterEach(() => jest.restoreAllMocks());

const api = (metodo, ruta, token = operador) => request(app)[metodo](`/api/v1${ruta}`).set(auth(token));

/** Estadía + pago en efectivo; devuelve la factura. */
async function cobrar({ minutos = 135, idPropietario, inicio, metodo = 'efectivo', referencia } = {}) {
  const salida = await estadia(sede, operador, { minutos, idPropietario, inicio });
  fijarReloj(salida.fechaHoraSalida);
  const cuerpo = metodo === 'efectivo' ? { metodo, valorRecibido: salida.liquidacion.total } : { metodo, referencia };
  const res = await api('post', '/pagos').send({ idMovimiento: salida.idMovimiento, ...cuerpo });
  if (res.status !== 201) throw new Error(JSON.stringify(res.body));
  jest.restoreAllMocks();
  return res.body.data.factura;
}

// ====================================================================== HU-41
describe('HU-41 Emitir el comprobante o factura', () => {
  test('HU-41 E1 la factura tiene número, parqueadero, placa, entrada, salida, tiempo, tarifa, total y método', async () => {
    const f = await cobrar();
    const res = await api('get', `/facturas/${f.idFactura}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      numero: f.numero,
      estado: 'emitida',
      total: 9000,
      cliente: null,
      tercero: null,
      parqueadero: { direccion: 'Calle 10 # 20-30' },
      movimiento: { tipoVehiculo: 'carro', entrada: '2026-11-29T08:10:00-05:00', salida: '2026-11-29T10:25:00-05:00', minutos: 135 },
      pago: { metodo: 'efectivo', valor: 9000 },
      liquidacion: { tarifa: { nombre: 'Carro ocasional' }, valorDescuento: 0, explicacion: '$ 4.000 + 5 fracciones × $ 1.000 = $ 9.000' },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/_correo|@correo/);
  });

  test('HU-41 E2 con correo del cliente se envía el PDF; el PDF se descarga en 80 mm', async () => {
    vaciarBandeja();
    const f = await cobrar({ idPropietario: 4 });
    const res = await api('post', '/facturas').send({ idFactura: f.idFactura });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ enviadaA: 'a***@correo.co', enviada: true, cliente: { idUsuario: 4 } });
    const [correo] = bandejaMemoria();
    expect(correo.para).toBe('andrea.salcedo@correo.co');
    expect(correo.adjuntos).toEqual([expect.objectContaining({ nombre: `factura-${f.numero}.pdf`, tipo: 'application/pdf' })]);
    const pdf = await api('get', `/facturas/${f.idFactura}/pdf`).buffer(true).parse((r, cb) => {
      const partes = [];
      r.on('data', (p) => partes.push(p));
      r.on('end', () => cb(null, Buffer.concat(partes)));
    });
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(pdf.body.subarray(0, 4).toString()).toBe('%PDF');
    // Sin correo (vehículo ocasional): se emite, pero no se envía.
    const ocasional = await cobrar({ minutos: 70 });
    expect((await api('post', '/facturas').send({ idFactura: ocasional.idFactura })).body.data.enviadaA).toBeNull();
  });

  test('HU-41 E3 a nombre de un tercero (NIT y razón social), solo antes del envío', async () => {
    const f = await cobrar({ minutos: 90 });
    const res = await api('post', '/facturas').send({ idFactura: f.idFactura, tercero: { documento: '900123456-7', nombre: 'Logística Andina S.A.S.' } });
    expect(res.status).toBe(200);
    expect(res.body.data.tercero).toEqual({ documento: '900123456-7', nombre: 'Logística Andina S.A.S.' });
    expect((await api('post', '/facturas').send({ idFactura: f.idFactura, tercero: { documento: '1', nombre: 'X' } })).status).toBe(422);
    // Una vez enviada al cliente, el titular no cambia.
    const enviada = await cobrar({ idPropietario: 4, minutos: 80 });
    await api('post', '/facturas').send({ idFactura: enviada.idFactura });
    const tarde = await api('post', '/facturas').send({ idFactura: enviada.idFactura, tercero: { documento: '900123456-7', nombre: 'Otra Empresa S.A.S.' } });
    expect(tarde.status).toBe(409);
    expect(tarde.body.error.code).toBe('FACTURA_YA_ENVIADA');
  });

  test('HU-41 E4 sin proveedor electrónico: comprobante interno pendiente de envío; inexistente → 404', async () => {
    const f = await cobrar({ minutos: 100 });
    expect(f.electronica).toEqual({ estado: 'pendiente', cufe: null });
    expect((await api('post', '/facturas').send({ idFactura: 999999 })).status).toBe(404);
    expect((await api('get', '/facturas/999999')).status).toBe(404);
  });
});

// ====================================================================== HU-42
describe('HU-42 Anular una factura', () => {
  test('HU-42 E1–E3 el Administrador anula con motivo; otra vez → 409; el Operador → 403', async () => {
    const f = await cobrar({ minutos: 120 });
    expect((await api('patch', `/facturas/${f.idFactura}/anulacion`).send({ motivo: 'Cobro duplicado en caja' })).status).toBe(403);
    expect((await api('patch', `/facturas/${f.idFactura}/anulacion`, admin).send({ motivo: 'Corto' })).status).toBe(422);
    fijarReloj('2026-11-29T12:00:00-05:00');
    const res = await api('patch', `/facturas/${f.idFactura}/anulacion`, admin).send({ motivo: 'Cobro duplicado' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ estado: 'anulada', anulacion: { motivo: 'Cobro duplicado', usuario: 'Laura Gómez Restrepo', fecha: '2026-11-29T12:00:00-05:00' } });
    const otra = await api('patch', `/facturas/${f.idFactura}/anulacion`, admin).send({ motivo: 'Cobro duplicado' });
    expect(otra.status).toBe(409);
    expect(otra.body.error.code).toBe('FACTURA_ANULADA');
    expect((await api('post', '/facturas').send({ idFactura: f.idFactura })).body.error.code).toBe('FACTURA_ANULADA');
  });
});

// ====================================================================== HU-43
describe('HU-43 Consultar facturas', () => {
  test('HU-43 E1 filtro por fechas y método con el total filtrado (sin las anuladas)', async () => {
    const dia = '2026-11-22'; // domingo: sin pico y placa
    const a = await cobrar({ minutos: 135, inicio: `${dia}T08:00:00-05:00` });
    const b = await cobrar({ minutos: 61, inicio: `${dia}T09:00:00-05:00` });
    const c = await cobrar({ minutos: 90, inicio: `${dia}T11:00:00-05:00`, metodo: 'tarjeta', referencia: 'AUT-1234' });
    await api('patch', `/facturas/${b.idFactura}/anulacion`, admin).send({ motivo: 'Prueba de anulación' });
    const res = await api('get', `/facturas?desde=${dia}&hasta=${dia}&metodo=efectivo&limit=100`, admin);
    expect(res.status).toBe(200);
    const numeros = res.body.data.map((f) => f.numero);
    expect(numeros).toEqual(expect.arrayContaining([a.numero, b.numero]));
    expect(numeros).not.toContain(c.numero);
    expect(res.body.meta.sumaTotal).toBe(9000);
    expect(res.body.data.find((f) => f.numero === b.numero).estado).toBe('anulada');
    const porPlaca = await api('get', `/facturas?q=${a.movimiento.placa}`, admin);
    expect(porPlaca.body.data.map((f) => f.numero)).toEqual([a.numero]);
    expect((await api('get', '/facturas?desde=2026-11-20&hasta=2026-11-01')).status).toBe(422);
  });

  test('HU-43 E2 y E3 el Cliente solo ve y descarga las suyas; la de otro → 403', async () => {
    const mia = await cobrar({ idPropietario: 4, minutos: 75 });
    const ajena = await cobrar({ idPropietario: 5, minutos: 75 });
    const res = await api('get', '/usuarios/me/facturas?limit=100', cliente);
    expect(res.status).toBe(200);
    expect(res.body.data.every((f) => f.cliente.idUsuario === 4)).toBe(true);
    expect(res.body.data.map((f) => f.numero)).toContain(mia.numero);
    expect((await api('get', `/facturas/${mia.idFactura}/pdf`, cliente)).status).toBe(200);
    const otra = await api('get', `/facturas/${ajena.idFactura}/pdf`, cliente);
    expect(otra.status).toBe(403);
    expect((await api('get', '/facturas', cliente)).status).toBe(403);
    expect((await request(app).get('/api/v1/usuarios/me/facturas')).status).toBe(401);
  });
});
