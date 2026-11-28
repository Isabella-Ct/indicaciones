// Carpeta «006 Pico y placa» (quickstart.md § Colección Postman). La semilla trae lunes a viernes; aquí se
// trabaja con el sábado y una vigencia de un año aleatorio futuro, así la carpeta se puede correr varias
// veces seguidas sin superponerse con la ejecución anterior.
const VIGENCIA = [
  'const anio = 2200 + Math.floor(Math.random() * 7000);',
  "pm.collectionVariables.set('pypDesde', anio + '-01-01');",
  "pm.collectionVariables.set('pypHasta', anio + '-12-31');",
];
const base = (cambios = {}) => ({
  diaSemana: 6,
  tipoVehiculo: 'carro',
  digitos: [6, 9],
  horaInicio: '05:00',
  horaFin: '20:00',
  vigenteDesde: '{{pypDesde}}',
  vigenteHasta: '{{pypHasta}}',
  ...cambios,
});

module.exports = {
  nombre: '006 Pico y placa',
  descripcion: 'SRS B.1 §4.6 — HU-29 y HU-30. Ejecutar con la BD sembrada.',
  casos: [
    // ------------------------------------------------------------ tabla semanal (HU-29)
    {
      nombre: 'HU-29 GET /restricciones-placa — 200 tabla semanal de la semilla',
      metodo: 'GET',
      ruta: '/restricciones-placa?estado=activo&limit=100',
      token: 'tokenOperador',
      status: 200,
      pruebas: [
        "pm.test('lunes a viernes para carros y motos', () => pm.expect(cuerpo.data.filter((r) => r.vigenteDesde === '2026-01-01').length).to.eql(10));",
        "pm.test('dígitos como lista', () => pm.expect(cuerpo.data[0].digitos).to.be.an('array'));",
      ],
    },
    { nombre: 'GET /restricciones-placa — 401 sin token', metodo: 'GET', ruta: '/restricciones-placa', status: 401, code: 'NO_AUTENTICADO' },
    { nombre: 'GET /restricciones-placa?dia=9 — 422', metodo: 'GET', ruta: '/restricciones-placa?dia=9', token: 'tokenAdmin', status: 422, code: 'VALIDACION' },
    {
      nombre: 'HU-29 POST /restricciones-placa — 201 sábado, carros 6 y 9',
      metodo: 'POST',
      ruta: '/restricciones-placa',
      token: 'tokenAdmin',
      antes: VIGENCIA,
      body: base({ digitos: [9, 6] }),
      status: 201,
      pruebas: [
        "pm.test('activa con los dígitos ordenados', () => pm.expect(cuerpo.data).to.deep.include({ estado: 'activo', digitos: [6, 9], posicionDigito: 'ultimo', nombreDia: 'sábado' }));",
      ],
      guardar: { idRestriccion: 'cuerpo.data.idRestriccion' },
    },
    {
      nombre: 'HU-29 POST /restricciones-placa — 409 superpuesta con la anterior',
      metodo: 'POST',
      ruta: '/restricciones-placa',
      token: 'tokenAdmin',
      body: base({ digitos: [1], horaInicio: '06:00', horaFin: '07:00' }),
      status: 409,
      code: 'RESTRICCION_SUPERPUESTA',
      pruebas: ["pm.test('indica la existente', () => pm.expect(cuerpo.error.details[0].mensaje).to.eql(String(pm.collectionVariables.get('idRestriccion'))));"],
    },
    {
      nombre: 'HU-29 POST /restricciones-placa — 422 dígito 12',
      metodo: 'POST',
      ruta: '/restricciones-placa',
      token: 'tokenAdmin',
      body: base({ diaSemana: 7, digitos: [12] }),
      status: 422,
      code: 'VALIDACION',
    },
    {
      nombre: 'HU-29 POST /restricciones-placa — 422 hora fin anterior',
      metodo: 'POST',
      ruta: '/restricciones-placa',
      token: 'tokenAdmin',
      body: base({ diaSemana: 7, horaFin: '04:00' }),
      status: 422,
      code: 'VALIDACION',
      pruebas: ["pm.test('campo horaFin', () => pm.expect(cuerpo.error.details.map((d) => d.campo)).to.include('horaFin'));"],
    },
    {
      nombre: 'HU-29 POST /restricciones-placa — 403 operador',
      metodo: 'POST',
      ruta: '/restricciones-placa',
      token: 'tokenOperador',
      body: base({ diaSemana: 7 }),
      status: 403,
      code: 'SIN_PERMISO',
    },

    // ------------------------------------------------------------ hoy (HU-30)
    {
      nombre: 'HU-30 GET /restricciones-placa/hoy — 200 operador',
      metodo: 'GET',
      ruta: '/restricciones-placa/hoy',
      token: 'tokenOperador',
      status: 200,
      pruebas: [
        "pm.test('fecha, día y tipos', () => pm.expect(cuerpo.data).to.include.keys('fecha', 'diaSemana', 'nombreDia', 'tipos', 'mensaje'));",
        "pm.test('de lunes a viernes hay restricción; fin de semana, «Sin restricción hoy»', () => { if (cuerpo.data.diaSemana <= 5) pm.expect(cuerpo.data.tipos.carro.digitos.length).to.be.above(0); else pm.expect(cuerpo.data.mensaje).to.eql('Sin restricción hoy'); });",
      ],
    },
    { nombre: 'HU-30 GET /restricciones-placa/hoy — 200 cliente', metodo: 'GET', ruta: '/restricciones-placa/hoy', token: 'tokenCliente', status: 200 },
    { nombre: 'GET /restricciones-placa/hoy — 401 sin token', metodo: 'GET', ruta: '/restricciones-placa/hoy', status: 401, code: 'NO_AUTENTICADO' },

    // ------------------------------------------------------------ editar y eliminar (HU-29 E4, E5)
    {
      nombre: 'HU-29 PUT /restricciones-placa/:id — 200 cambia los dígitos',
      metodo: 'PUT',
      ruta: '/restricciones-placa/{{idRestriccion}}',
      token: 'tokenAdmin',
      body: base({ digitos: [1, 2] }),
      status: 200,
      pruebas: ["pm.test('dígitos 1 y 2', () => pm.expect(cuerpo.data.digitos).to.eql([1, 2]));"],
    },
    {
      nombre: 'HU-29 PUT /restricciones-placa/:id — 422 vigencia invertida',
      metodo: 'PUT',
      ruta: '/restricciones-placa/{{idRestriccion}}',
      token: 'tokenAdmin',
      body: base({ vigenteDesde: '{{pypHasta}}', vigenteHasta: '{{pypDesde}}' }),
      status: 422,
      code: 'VALIDACION',
    },
    {
      nombre: 'HU-29 PUT /restricciones-placa/:id — 403 operador',
      metodo: 'PUT',
      ruta: '/restricciones-placa/{{idRestriccion}}',
      token: 'tokenOperador',
      body: base(),
      status: 403,
      code: 'SIN_PERMISO',
    },
    {
      nombre: 'PUT /restricciones-placa/999999 — 404',
      metodo: 'PUT',
      ruta: '/restricciones-placa/999999',
      token: 'tokenAdmin',
      body: base(),
      status: 404,
      code: 'RESTRICCION_NO_ENCONTRADA',
    },
    {
      nombre: 'HU-29 DELETE /restricciones-placa/:id — 403 operador',
      metodo: 'DELETE',
      ruta: '/restricciones-placa/{{idRestriccion}}',
      token: 'tokenOperador',
      status: 403,
      code: 'SIN_PERMISO',
    },
    {
      nombre: 'HU-29 DELETE /restricciones-placa/:id — 200 eliminación lógica',
      metodo: 'DELETE',
      ruta: '/restricciones-placa/{{idRestriccion}}',
      token: 'tokenAdmin',
      status: 200,
      pruebas: ["pm.test('inactiva', () => pm.expect(cuerpo.data.estado).to.eql('inactivo'));"],
    },
    { nombre: 'DELETE /restricciones-placa/999999 — 404', metodo: 'DELETE', ruta: '/restricciones-placa/999999', token: 'tokenAdmin', status: 404, code: 'RESTRICCION_NO_ENCONTRADA' },
  ],
};
