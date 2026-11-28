// Pruebas de integración de descuentos (spec 011: HU-49, HU-50, HU-51). El reloj del servidor queda fijo en
// domingos y sábados de noviembre de 2026 (sin pico y placa y con las tarifas de la semilla). Cada prueba crea sus
// descuentos con nombre único y vigencia de un solo día, y los inactiva al terminar (research R-09), para no
// cambiar las liquidaciones de otras suites.
const PDFDocument = require('pdfkit');
const { pool } = require('../../src/config/db');
const { app, request, tokenDe, auth, unico } = require('../setup/helpers');
const { placaAleatoria } = require('../setup/infraestructura');
const { crearSede, fijarReloj, DOMINGO_10AM } = require('../setup/sede');
const { estadia, crearMembresia } = require('../setup/cobro');

let admin;
let operador;
let cliente;
let sede;
const creados = [];
beforeAll(async () => {
  [admin, operador, cliente] = await Promise.all([tokenDe('admin'), tokenDe('operador'), tokenDe('cliente')]);
  sede = await crearSede(admin, { carros: 6, motos: 4 });
});
beforeEach(() => fijarReloj(DOMINGO_10AM));
afterEach(async () => {
  jest.restoreAllMocks();
  if (creados.length) await pool.query("UPDATE descuento SET estado = 'inactivo' WHERE id_descuento IN (?)", [creados.splice(0)]);
});

const api = (metodo, ruta, token = admin) => request(app)[metodo](`/api/v1${ruta}`).set(auth(token));
const datos = (cambios = {}) => ({
  nombre: unico('Motos fin de semana'),
  tipo: 'porcentaje',
  valor: 20,
  aplicaTipoVehiculo: 'moto',
  vigenteDesde: '2026-12-01',
  vigenteHasta: '2026-12-31',
  ...cambios,
});

/** Crea un descuento (201) y lo anota para inactivarlo al final de la prueba. */
async function crear(cambios = {}) {
  const res = await api('post', '/descuentos').send(datos(cambios));
  if (res.status !== 201) throw new Error(`Descuento: ${res.status} ${JSON.stringify(res.body)}`);
  creados.push(res.body.data.idDescuento);
  return res.body.data;
}

/** Moto ocasional de la semilla: 270 min → $ 2.000 + 14 fracciones × $ 500 = $ 9.000. */
const motoDe270 = (dia) => estadia(sede, operador, { minutos: 270, tipo: 'moto', placa: placaAleatoria('moto'), inicio: `${dia}T08:00:00-05:00` });
/** Carro ocasional de la semilla: 135 min → $ 9.000. */
const carroDe135 = (dia) => estadia(sede, operador, { minutos: 135, inicio: `${dia}T08:00:00-05:00` });

// ====================================================================== HU-49
describe('HU-49 Configurar un descuento o promoción', () => {
  test('HU-49 E1 «Motos fin de semana» 20 % del 1 al 31 de diciembre queda activo en ese periodo', async () => {
    const d = await crear();
    expect(d).toMatchObject({
      tipo: 'porcentaje',
      valor: 20,
      aplicaTipoCliente: 'todos',
      aplicaTipoVehiculo: 'moto',
      minutosMinimos: null,
      vigenteDesde: '2026-12-01T00:00:00-05:00',
      vigenteHasta: '2026-12-31T23:59:59-05:00',
      estado: 'activo',
      situacion: 'programado',
      usado: false,
    });
    const lista = await api('get', `/descuentos?q=${encodeURIComponent(d.nombre)}`, operador);
    expect(lista.status).toBe(200);
    expect(lista.body.data.map((x) => x.idDescuento)).toEqual([d.idDescuento]);
    const [[b]] = await pool.query("SELECT accion FROM bitacora WHERE entidad = 'descuento' AND id_registro = ? ORDER BY id_bitacora DESC LIMIT 1", [d.idDescuento]);
    expect(b.accion).toBe('crear');
  });

  test('HU-49 E2 porcentaje de 120 → 422 «debe estar entre 1 y 100»', async () => {
    const res = await api('post', '/descuentos').send(datos({ valor: 120 }));
    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([{ campo: 'valor', mensaje: 'El porcentaje debe estar entre 1 y 100.' }]);
  });

  test('HU-49 E3 el Operador → 403; el Cliente no consulta', async () => {
    expect((await api('post', '/descuentos', operador).send(datos())).status).toBe(403);
    expect((await api('get', '/descuentos', cliente)).status).toBe(403);
  });

  test('HU-49 E4 nombre repetido → 409; fijo 0 o fin antes del inicio → 422; se edita', async () => {
    const d = await crear();
    const repetido = await api('post', '/descuentos').send(datos({ nombre: d.nombre }));
    expect(repetido.status).toBe(409);
    expect(repetido.body.error.code).toBe('DESCUENTO_DUPLICADO');
    const fijo = await api('post', '/descuentos').send(datos({ tipo: 'valor_fijo', valor: 0 }));
    expect(fijo.body.error.details).toEqual([{ campo: 'valor', mensaje: 'El valor fijo debe ser mayor que 0.' }]);
    const fechas = await api('post', '/descuentos').send(datos({ vigenteDesde: '2026-12-31', vigenteHasta: '2026-12-01' }));
    expect(fechas.body.error.details.map((x) => x.campo)).toEqual(['vigenteHasta']);
    expect((await api('post', '/descuentos').send(datos({ vigenteDesde: '2026-02-30' }))).status).toBe(422);

    const editado = await api('put', `/descuentos/${d.idDescuento}`).send(
      datos({ nombre: d.nombre, tipo: 'valor_fijo', valor: 1500, aplicaTipoCliente: 'registrado', minutosMinimos: 120, vigenteHasta: '2026-12-24T18:00' })
    );
    expect(editado.status).toBe(200);
    expect(editado.body.data).toMatchObject({ tipo: 'valor_fijo', valor: 1500, aplicaTipoCliente: 'registrado', minutosMinimos: 120, vigenteHasta: '2026-12-24T18:00:00-05:00' });
    const [[b]] = await pool.query("SELECT valor_anterior FROM bitacora WHERE entidad = 'descuento' AND accion = 'editar' AND id_registro = ?", [d.idDescuento]);
    expect(b.valor_anterior).toMatchObject({ tipo: 'porcentaje', valor: 20, aplicaTipoCliente: 'todos', minutosMinimos: null });
    expect((await api('put', '/descuentos/999999').send(datos())).status).toBe(404);
    expect((await api('put', `/descuentos/${d.idDescuento}`, operador).send(datos())).status).toBe(403);
  });
});

// ====================================================================== HU-50
describe('HU-50 Aplicar el descuento en la liquidación', () => {
  test('HU-50 E1 moto con bruto de $ 9.000 y el 20 % vigente → $ 7.200 con el detalle; la factura y el PDF lo muestran', async () => {
    // Domingo 8/11/2026: ninguna otra suite factura ese día (la de facturas suma el total del 22/11).
    const d = await crear({ vigenteDesde: '2026-11-08', vigenteHasta: '2026-11-08' });
    const salida = await motoDe270('2026-11-08');
    expect(salida.liquidacion).toMatchObject({
      valorBruto: 9000,
      valorDescuento: 1800,
      total: 7200,
      descuento: { idDescuento: d.idDescuento, nombre: d.nombre, tipo: 'porcentaje', valor: 20 },
      explicacion: `$ 2.000 + 14 fracciones × $ 500 = $ 9.000 − «${d.nombre}» 20 % ($ 1.800) = $ 7.200`,
    });
    const [[l]] = await pool.query('SELECT id_descuento, valor_descuento, valor_total FROM liquidacion WHERE id_movimiento = ?', [salida.idMovimiento]);
    expect(l).toMatchObject({ id_descuento: d.idDescuento, valor_descuento: 1800, valor_total: 7200 });

    const pago = await api('post', '/pagos', operador).send({ idMovimiento: salida.idMovimiento, metodo: 'efectivo', valorRecibido: 10000 });
    expect(pago.status).toBe(201);
    expect(pago.body.data.pago.cambio).toBe(2800);
    const factura = await api('get', `/facturas/${pago.body.data.factura.idFactura}`, operador);
    expect(factura.body.data.liquidacion.descuento.nombre).toBe(d.nombre);

    const textos = [];
    const original = PDFDocument.prototype.text;
    jest.spyOn(PDFDocument.prototype, 'text').mockImplementation(function (texto, ...resto) {
      textos.push(String(texto));
      return original.call(this, texto, ...resto);
    });
    const pdf = await api('get', `/facturas/${pago.body.data.factura.idFactura}/pdf`, operador);
    expect(pdf.status).toBe(200);
    expect(textos).toEqual(expect.arrayContaining([`Descuento: ${d.nombre}`, '− $ 1.800']));
  });

  test('HU-50 E2 con 10 % y $ 2.000 aplicables sobre $ 9.000 se aplica solo el de $ 2.000', async () => {
    await crear({ nombre: unico('Diez por ciento'), valor: 10, aplicaTipoVehiculo: 'carro', vigenteDesde: '2026-11-28', vigenteHasta: '2026-11-28' });
    const fijo = await crear({ nombre: unico('Dos mil pesos'), tipo: 'valor_fijo', valor: 2000, aplicaTipoVehiculo: 'todos', vigenteDesde: '2026-11-28', vigenteHasta: '2026-11-28' });
    const salida = await carroDe135('2026-11-28');
    expect(salida.liquidacion).toMatchObject({ valorBruto: 9000, valorDescuento: 2000, total: 7000, descuento: { idDescuento: fijo.idDescuento } });
  });

  test('HU-50 E3 con membresía vigente no se aplica descuento (el total ya es $ 0)', async () => {
    await crear({ aplicaTipoVehiculo: 'todos', vigenteDesde: '2026-11-29', vigenteHasta: '2026-11-29' });
    const placa = placaAleatoria();
    await api('post', '/vehiculos', operador).send({ placa, tipo: 'carro', color: 'Azul', marca: 'Kia', modelo: 2021, idPropietario: 5 });
    const [[v]] = await pool.query('SELECT id_vehiculo FROM vehiculo WHERE placa = ?', [placa]);
    await crearMembresia({ idVehiculo: v.id_vehiculo, idCliente: 5 });
    jest.restoreAllMocks();
    const salida = await estadia(sede, operador, { minutos: 300, placa, inicio: '2026-11-29T08:00:00-05:00' });
    expect(salida.liquidacion).toMatchObject({ cubiertoPorMembresia: true, valorDescuento: 0, total: 0, descuento: null });
  });

  test('HU-50 E4 otro tipo de vehículo o de cliente, o menos minutos que los mínimos → sin descuento', async () => {
    const dia = { vigenteDesde: '2026-11-22', vigenteHasta: '2026-11-22' };
    await crear({ nombre: unico('Solo motos'), aplicaTipoVehiculo: 'moto', ...dia });
    await crear({ nombre: unico('Solo registrados'), aplicaTipoVehiculo: 'todos', aplicaTipoCliente: 'registrado', ...dia });
    await crear({ nombre: unico('Estadía larga'), aplicaTipoVehiculo: 'todos', minutosMinimos: 600, ...dia });
    const salida = await carroDe135('2026-11-22');
    expect(salida.liquidacion).toMatchObject({ valorBruto: 9000, valorDescuento: 0, total: 9000, descuento: null, explicacion: '$ 4.000 + 5 fracciones × $ 1.000 = $ 9.000' });
    // Un vehículo dentro: la vista previa usa el descuento vigente ahora.
    fijarReloj('2026-11-22T08:00:00-05:00');
    const entrada = await api('post', '/movimientos', operador).send({ placa: placaAleatoria('moto'), tipo: 'moto', idPuerta: sede.puertas.mixta });
    fijarReloj('2026-11-22T12:30:00-05:00');
    const previa = await api('get', `/movimientos/${entrada.body.data.idMovimiento}/liquidacion`, operador);
    expect(previa.body.data).toMatchObject({ persistida: false, valorBruto: 9000, total: 7200 });
    expect(previa.body.data.descuento.nombre).toMatch(/^Solo motos/);
    await api('post', `/movimientos/${entrada.body.data.idMovimiento}/salida`, operador).send({ idPuerta: sede.puertas.mixta }).expect(200);
  });
});

// ====================================================================== HU-51
describe('HU-51 Activar o inactivar un descuento', () => {
  test('HU-51 E1 inactivado deja de aplicarse a las siguientes; la ya liquidada conserva su descuento', async () => {
    const d = await crear({ vigenteDesde: '2026-11-29', vigenteHasta: '2026-11-29' });
    const antes = await motoDe270('2026-11-29');
    expect(antes.liquidacion.total).toBe(7200);

    const res = await api('patch', `/descuentos/${d.idDescuento}/estado`).send({ estado: 'inactivo' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ estado: 'inactivo', situacion: 'inactivo', usado: true });
    const despues = await motoDe270('2026-11-29');
    expect(despues.liquidacion).toMatchObject({ total: 9000, descuento: null });

    // Editar el descuento tampoco cambia la liquidación guardada.
    await api('put', `/descuentos/${d.idDescuento}`).send(datos({ nombre: d.nombre, valor: 50, vigenteDesde: '2026-11-29', vigenteHasta: '2026-11-29' })).expect(200);
    const guardada = await api('get', `/movimientos/${antes.idMovimiento}/liquidacion`, operador);
    expect(guardada.body.data).toMatchObject({ persistida: true, valorDescuento: 1800, total: 7200, descuento: { idDescuento: d.idDescuento } });
    const [[b]] = await pool.query("SELECT valor_nuevo FROM bitacora WHERE entidad = 'descuento' AND accion = 'cambiar_estado' AND id_registro = ?", [d.idDescuento]);
    expect(b.valor_nuevo).toEqual({ estado: 'inactivo' });
  });

  test('HU-51 E2 activar uno vencido pide ampliar la vigencia (422); vigente → se activa', async () => {
    const vencido = await crear({ vigenteDesde: '2026-11-01', vigenteHasta: '2026-11-15' });
    expect(vencido.situacion).toBe('vencido');
    await api('patch', `/descuentos/${vencido.idDescuento}/estado`).send({ estado: 'inactivo' }).expect(200);
    const res = await api('patch', `/descuentos/${vencido.idDescuento}/estado`).send({ estado: 'activo' });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([{ campo: 'vigenteHasta', mensaje: 'Amplíe la vigencia del descuento antes de activarlo.' }]);

    await api('put', `/descuentos/${vencido.idDescuento}`).send(datos({ nombre: vencido.nombre, vigenteDesde: '2026-12-01', vigenteHasta: '2026-12-31' })).expect(200);
    const activado = await api('patch', `/descuentos/${vencido.idDescuento}/estado`).send({ estado: 'activo' });
    expect(activado.body.data).toMatchObject({ estado: 'activo', situacion: 'programado' });
    expect((await api('patch', `/descuentos/${vencido.idDescuento}/estado`, operador).send({ estado: 'inactivo' })).status).toBe(403);
    expect((await api('patch', '/descuentos/999999/estado').send({ estado: 'inactivo' })).status).toBe(404);
  });
});
