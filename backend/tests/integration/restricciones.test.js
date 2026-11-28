// Pruebas de integración de pico y placa (spec 006: HU-29, HU-30). La semilla trae lunes a viernes para
// carros y motos; aquí cada prueba usa el sábado o el domingo con su propia vigencia futura (research R-08).
const { pool } = require('../../src/config/db');
const restricciones = require('../../src/modules/restricciones/restricciones.service');
const { app, request, tokenDe, auth } = require('../setup/helpers');

let admin;
let operador;
let cliente;
beforeAll(async () => {
  [admin, operador, cliente] = await Promise.all([tokenDe('admin'), tokenDe('operador'), tokenDe('cliente')]);
});

const api = (metodo, ruta, token = admin) => request(app)[metodo](`/api/v1${ruta}`).set(auth(token));

let anio = 2100 + Math.floor(Math.random() * 500);
/** Vigencia de un año propio para que las pruebas no se crucen entre sí. */
const vigencia = () => {
  anio += 1;
  return { vigenteDesde: `${anio}-01-01`, vigenteHasta: `${anio}-12-31` };
};
const datos = (cambios = {}) => ({
  diaSemana: 6,
  tipoVehiculo: 'carro',
  digitos: [6, 9],
  horaInicio: '05:00',
  horaFin: '20:00',
  ...vigencia(),
  ...cambios,
});
const crear = async (cambios) => (await api('post', '/restricciones-placa').send(datos(cambios))).body.data;

// Lunes 30 de noviembre de 2026 a las 07:30 en Bogotá (12:30 UTC).
const LUNES_0730 = new Date('2026-11-30T12:30:00Z');

// ====================================================================== HU-29
describe('HU-29 Configurar la restricción de pico y placa', () => {
  test('HU-29 E1 crea la restricción activa y aparece en la tabla semanal', async () => {
    const res = await api('post', '/restricciones-placa').send(datos({ digitos: [9, 6] }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      diaSemana: 6,
      nombreDia: 'sábado',
      tipoVehiculo: 'carro',
      digitos: [6, 9],
      posicionDigito: 'ultimo',
      horaInicio: '05:00',
      horaFin: '20:00',
      estado: 'activo',
    });
    const tabla = await api('get', '/restricciones-placa?dia=6&tipo=carro&limit=100', operador);
    expect(tabla.status).toBe(200);
    expect(tabla.body.data.map((r) => r.idRestriccion)).toContain(res.body.data.idRestriccion);
    const semana = await api('get', '/restricciones-placa?estado=activo&limit=100');
    expect(semana.body.data.filter((r) => r.vigenteDesde === '2026-01-01')).toHaveLength(10);
    // La moto toma por defecto el primer dígito; sin vigencia, desde hoy.
    const moto = await api('post', '/restricciones-placa').send({ diaSemana: 7, tipoVehiculo: 'moto', digitos: [1], horaInicio: '06:00', horaFin: '07:00', vigenteDesde: `${anio + 1000}-01-01` });
    expect(moto.body.data.posicionDigito).toBe('primero');
  });

  test('HU-29 E2 otra activa para el mismo día y tipo con vigencia cruzada → 409 con el id de la existente', async () => {
    const existente = await crear();
    const res = await api('post', '/restricciones-placa').send(datos({
      digitos: [1],
      horaInicio: '06:00',
      horaFin: '08:00',
      vigenteDesde: existente.vigenteDesde,
      vigenteHasta: null,
    }));
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'RESTRICCION_SUPERPUESTA', message: 'Ya existe una restricción para ese día y tipo.' });
    expect(res.body.error.details).toEqual([{ campo: 'idRestriccion', mensaje: String(existente.idRestriccion) }]);
    // El lunes de la semilla también choca con una vigencia indefinida.
    const lunes = await api('post', '/restricciones-placa').send(datos({ diaSemana: 1, vigenteDesde: '2027-01-01', vigenteHasta: null }));
    expect(lunes.status).toBe(409);
    // Otro tipo el mismo día, o una vigencia que no se cruza, sí se permiten.
    expect((await api('post', '/restricciones-placa').send(datos({ tipoVehiculo: 'moto', vigenteDesde: existente.vigenteDesde, vigenteHasta: existente.vigenteHasta }))).status).toBe(201);
  });

  test('HU-29 E3 dígito 12, repetidos, más de 5, hora fin anterior o vigencia invertida → 422 en el campo', async () => {
    const casos = [
      [{ digitos: [12] }, 'digitos'],
      [{ digitos: [6, 6] }, 'digitos'],
      [{ digitos: [] }, 'digitos'],
      [{ digitos: [0, 1, 2, 3, 4, 5] }, 'digitos'],
      [{ horaFin: '04:00' }, 'horaFin'],
      [{ horaInicio: '25:00' }, 'horaInicio'],
      [{ diaSemana: 8 }, 'diaSemana'],
      [{ vigenteDesde: '2027-02-01', vigenteHasta: '2027-01-01' }, 'vigenteHasta'],
      [{ vigenteDesde: '2027-02-30' }, 'vigenteDesde'],
    ];
    for (const [cambios, campo] of casos) {
      const res = await api('post', '/restricciones-placa').send(datos(cambios));
      expect(res.status).toBe(422);
      // Un dígito fuera de rango llega como «digitos.0»: el frontend usa la raíz del campo.
      expect(res.body.error.details.map((d) => d.campo.split('.')[0])).toContain(campo);
    }
  });

  test('HU-29 E4 editar y eliminar quedan en la bitácora; reactivar revisa la superposición', async () => {
    const r = await crear();
    const editada = await api('put', `/restricciones-placa/${r.idRestriccion}`).send(datos({ digitos: [1, 2], vigenteDesde: r.vigenteDesde, vigenteHasta: r.vigenteHasta }));
    expect(editada.status).toBe(200);
    expect(editada.body.data.digitos).toEqual([1, 2]);
    const [[b]] = await pool.query(
      "SELECT valor_anterior, valor_nuevo FROM bitacora WHERE entidad = 'restriccion_placa' AND accion = 'editar' AND id_registro = ?",
      [r.idRestriccion]
    );
    expect(b).toEqual({ valor_anterior: { digitos: [6, 9] }, valor_nuevo: { digitos: [1, 2] } });

    const eliminada = await api('delete', `/restricciones-placa/${r.idRestriccion}`);
    expect(eliminada.status).toBe(200);
    expect(eliminada.body.data.estado).toBe('inactivo');
    const [[i]] = await pool.query("SELECT COUNT(*) AS n FROM bitacora WHERE entidad = 'restriccion_placa' AND accion = 'inactivar' AND id_registro = ?", [r.idRestriccion]);
    expect(i.n).toBe(1);

    // Con la primera inactiva se puede crear otra en la misma vigencia; reactivar la primera choca.
    const otra = await api('post', '/restricciones-placa').send(datos({ vigenteDesde: r.vigenteDesde, vigenteHasta: r.vigenteHasta }));
    expect(otra.status).toBe(201);
    const reactivar = await api('put', `/restricciones-placa/${r.idRestriccion}`).send(datos({ vigenteDesde: r.vigenteDesde, vigenteHasta: r.vigenteHasta, estado: 'activo' }));
    expect(reactivar.status).toBe(409);
    expect((await api('put', '/restricciones-placa/999999').send(datos())).status).toBe(404);
    expect((await api('delete', '/restricciones-placa/999999')).status).toBe(404);
  });

  test('HU-29 E5 el Operador no crea, edita ni elimina (403); el Cliente consulta', async () => {
    const r = await crear();
    expect((await api('post', '/restricciones-placa', operador).send(datos())).status).toBe(403);
    expect((await api('put', `/restricciones-placa/${r.idRestriccion}`, operador).send(datos())).status).toBe(403);
    expect((await api('delete', `/restricciones-placa/${r.idRestriccion}`, operador)).status).toBe(403);
    expect((await api('get', '/restricciones-placa', cliente)).status).toBe(200);
    expect((await request(app).get('/api/v1/restricciones-placa')).status).toBe(401);
    expect((await api('get', '/restricciones-placa?dia=9')).status).toBe(422);
  });
});

// ====================================================================== HU-30
describe('HU-30 Consultar la restricción vigente', () => {
  test('HU-30 E1 un lunes muestra los dígitos por tipo y la franja; la API responde al Operador y al Cliente', async () => {
    const lunes = await restricciones.hoy(LUNES_0730);
    expect(lunes).toMatchObject({ fecha: '2026-11-30', diaSemana: 1, nombreDia: 'lunes', mensaje: null });
    expect(lunes.tipos.carro).toMatchObject({ digitos: [6, 9], posicionDigito: 'ultimo', horaInicio: '05:00', horaFin: '20:00' });
    expect(lunes.tipos.moto).toMatchObject({ digitos: [6, 9], posicionDigito: 'primero' });
    for (const token of [operador, cliente]) {
      const res = await api('get', '/restricciones-placa/hoy', token);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(expect.objectContaining({ fecha: expect.any(String), tipos: expect.any(Object) }));
    }
  });

  test('HU-30 E2 un domingo sin restricción → «Sin restricción hoy»', async () => {
    const domingo = await restricciones.hoy(new Date('2026-11-29T15:00:00Z'));
    expect(domingo).toMatchObject({ diaSemana: 7, tipos: { carro: null, moto: null }, mensaje: 'Sin restricción hoy' });
  });

  test('HU-30 E3 evaluar: ABC126 el lunes 07:30 está restringido; a las 20:00 o el martes, no', async () => {
    const restringida = await restricciones.evaluar({ placa: 'ABC126', tipo: 'carro', fechaHora: LUNES_0730 });
    expect(restringida).toMatchObject({
      restringido: true,
      motivo: 'Pico y placa: carros con placa terminada en 6 o 9, lunes de 05:00 a 20:00.',
    });
    expect((await restricciones.evaluar({ placa: 'ABC126', tipo: 'carro', fechaHora: new Date('2026-12-01T01:00:00Z') })).restringido).toBe(false);
    expect((await restricciones.evaluar({ placa: 'ABC126', tipo: 'carro', fechaHora: new Date('2026-12-01T12:30:00Z') })).restringido).toBe(false);
    expect((await restricciones.evaluar({ placa: 'ABC125', tipo: 'carro', fechaHora: LUNES_0730 })).restringido).toBe(false);
    // Moto por el primer dígito: QWE61A el lunes sí, QWE16A no.
    expect((await restricciones.evaluar({ placa: 'QWE61A', tipo: 'moto', fechaHora: LUNES_0730 })).restringido).toBe(true);
    expect((await restricciones.evaluar({ placa: 'QWE16A', tipo: 'moto', fechaHora: LUNES_0730 })).restringido).toBe(false);
  });
});
