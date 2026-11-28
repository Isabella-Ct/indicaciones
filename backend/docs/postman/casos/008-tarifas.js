// Carpeta «008 Tarifas» (quickstart.md § Colección Postman). Las 4 tarifas de la semilla no tienen fin, así que
// la tarifa nueva de moto ocasional empieza un día después de la más reciente de esa combinación (se calcula
// antes de la petición), y la carpeta se puede correr varias veces seguidas. Ids de la semilla: 1 carro
// ocasional, 2 carro registrado, 3 moto ocasional, 4 moto registrado, 5 carro ocasional 2025 (inactiva).
const SIGUIENTE_INICIO = [
  "const base = pm.environment.get('baseUrl');",
  "pm.sendRequest({ url: base + '/tarifas?tipoVehiculo=moto&tipoCliente=ocasional&estado=activo&limit=100', header: { Authorization: 'Bearer ' + pm.collectionVariables.get('tokenAdmin') } }, (err, res) => {",
  "  const inicios = res.json().data.map((t) => t.vigenteDesde.slice(0, 10)).sort();",
  "  const hoy = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);",
  "  const base = inicios.length && inicios[inicios.length - 1] > hoy ? inicios[inicios.length - 1] : hoy;",
  "  const [a, m, d] = base.split('-').map(Number);",
  "  pm.collectionVariables.set('tarifaDesde', new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10));",
  "});",
];

const moto = (cambios = {}) => ({
  nombre: 'Moto ocasional (Postman)',
  tipoVehiculo: 'moto',
  tipoCliente: 'ocasional',
  valorPrimeraHora: 2500,
  minutosFraccion: 15,
  valorFraccion: 600,
  topeDiario: 13000,
  minutosGracia: 10,
  vigenteDesde: '{{tarifaDesde}}',
  ...cambios,
});

module.exports = {
  nombre: '008 Tarifas',
  descripcion: 'SRS B.1 §4.8 — HU-36..HU-38. Ejecutar con la BD sembrada.',
  casos: [
    // ------------------------------------------------------------ consulta (HU-38)
    {
      nombre: 'HU-38 GET /tarifas?vigentes=true — 200 público, sin datos internos',
      metodo: 'GET',
      ruta: '/tarifas?vigentes=true',
      status: 200,
      pruebas: [
        "pm.test('las 4 combinaciones vigentes', () => pm.expect(new Set(cuerpo.data.filter((t) => t.situacion === 'vigente').map((t) => t.tipoVehiculo + ' ' + t.tipoCliente)).size).to.eql(4));",
        "pm.test('sin estado ni usada', () => cuerpo.data.forEach((t) => { pm.expect(t).to.not.have.property('estado'); pm.expect(t).to.not.have.property('usada'); }));",
        "pm.test('no-store', () => pm.expect(pm.response.headers.get('Cache-Control')).to.eql('no-store'));",
      ],
    },
    { nombre: 'GET /tarifas?vigentes=true&tipoVehiculo=bus — 422', metodo: 'GET', ruta: '/tarifas?vigentes=true&tipoVehiculo=bus', status: 422, code: 'VALIDACION' },
    {
      nombre: 'HU-37 GET /tarifas — 200 listado administrativo con usada y situación',
      metodo: 'GET',
      ruta: '/tarifas?limit=100',
      token: 'tokenAdmin',
      status: 200,
      pruebas: ["pm.test('usada y situación', () => cuerpo.data.forEach((t) => pm.expect(t).to.include.keys('usada', 'situacion')));"],
    },
    { nombre: 'GET /tarifas — 401 sin token', metodo: 'GET', ruta: '/tarifas', status: 401, code: 'NO_AUTENTICADO' },

    // ------------------------------------------------------------ crear (HU-36)
    {
      nombre: 'HU-36 POST /tarifas — 409 superpuesta con la tarifa abierta',
      metodo: 'POST',
      ruta: '/tarifas',
      token: 'tokenAdmin',
      antes: SIGUIENTE_INICIO,
      body: moto(),
      status: 409,
      code: 'TARIFA_SUPERPUESTA',
      pruebas: ["pm.test('indica la existente', () => pm.expect(cuerpo.error.details[0].campo).to.eql('idTarifa'));"],
    },
    {
      nombre: 'HU-36 POST /tarifas — 201 programada cerrando la anterior',
      metodo: 'POST',
      ruta: '/tarifas',
      token: 'tokenAdmin',
      body: moto({ cerrarAnterior: true }),
      status: 201,
      pruebas: ["pm.test('programada', () => pm.expect(cuerpo.data).to.include({ situacion: 'programada', estado: 'activo', valorPrimeraHora: 2500 }));"],
      guardar: { idTarifa: 'cuerpo.data.idTarifa' },
    },
    {
      nombre: 'HU-36 POST /tarifas — 422 primera hora 0',
      metodo: 'POST',
      ruta: '/tarifas',
      token: 'tokenAdmin',
      body: moto({ valorPrimeraHora: 0, vigenteDesde: '2030-06-01' }),
      status: 422,
      code: 'VALIDACION',
    },
    {
      nombre: 'HU-36 POST /tarifas — 403 operador',
      metodo: 'POST',
      ruta: '/tarifas',
      token: 'tokenOperador',
      body: moto({ vigenteDesde: '2030-06-01' }),
      status: 403,
      code: 'SIN_PERMISO',
    },

    // ------------------------------------------------------------ editar y estado (HU-37)
    {
      nombre: 'HU-37 PUT /tarifas/:id — 200 cambia la fracción',
      metodo: 'PUT',
      ruta: '/tarifas/{{idTarifa}}',
      token: 'tokenAdmin',
      body: moto({ valorFraccion: 700 }),
      status: 200,
      pruebas: ["pm.test('fracción 700', () => pm.expect(cuerpo.data.valorFraccion).to.eql(700));"],
    },
    {
      nombre: 'HU-37 PUT /tarifas/:id — 422 tope menor que la primera hora',
      metodo: 'PUT',
      ruta: '/tarifas/{{idTarifa}}',
      token: 'tokenAdmin',
      body: moto({ topeDiario: 100 }),
      status: 422,
      code: 'VALIDACION',
    },
    { nombre: 'PUT /tarifas/999999 — 404', metodo: 'PUT', ruta: '/tarifas/999999', token: 'tokenAdmin', body: moto(), status: 404, code: 'TARIFA_NO_ENCONTRADA' },
    { nombre: 'PUT /tarifas/:id — 403 operador', metodo: 'PUT', ruta: '/tarifas/{{idTarifa}}', token: 'tokenOperador', body: moto(), status: 403, code: 'SIN_PERMISO' },
    {
      nombre: 'HU-37 PATCH /tarifas/2/estado — 409 única vigente (carro registrado)',
      metodo: 'PATCH',
      ruta: '/tarifas/2/estado',
      token: 'tokenAdmin',
      body: { estado: 'inactivo' },
      status: 409,
      code: 'UNICA_TARIFA_VIGENTE',
    },
    {
      nombre: 'HU-37 PATCH /tarifas/2/estado — 200 inactiva con confirmación',
      metodo: 'PATCH',
      ruta: '/tarifas/2/estado',
      token: 'tokenAdmin',
      body: { estado: 'inactivo', confirmar: true },
      status: 200,
      pruebas: ["pm.test('inactiva', () => pm.expect(cuerpo.data.situacion).to.eql('inactiva'));"],
    },
    {
      nombre: 'HU-37 PATCH /tarifas/2/estado — 200 se reactiva',
      metodo: 'PATCH',
      ruta: '/tarifas/2/estado',
      token: 'tokenAdmin',
      body: { estado: 'activo' },
      status: 200,
      pruebas: ["pm.test('vigente otra vez', () => pm.expect(cuerpo.data.situacion).to.eql('vigente'));"],
    },
    { nombre: 'PATCH /tarifas/999999/estado — 404', metodo: 'PATCH', ruta: '/tarifas/999999/estado', token: 'tokenAdmin', body: { estado: 'activo' }, status: 404, code: 'TARIFA_NO_ENCONTRADA' },
    {
      nombre: 'HU-38 GET /tarifas?vigentes=true&tipoVehiculo=moto — 200 incluye la programada',
      metodo: 'GET',
      ruta: '/tarifas?vigentes=true&tipoVehiculo=moto&tipoCliente=ocasional',
      status: 200,
      pruebas: ["pm.test('programada con su fecha', () => pm.expect(cuerpo.data.find((t) => t.idTarifa === pm.collectionVariables.get('idTarifa')).situacion).to.eql('programada'));"],
    },
  ],
};
