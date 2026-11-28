// Carpeta «011 Descuentos» (quickstart.md § Colección Postman, research R-09). Cada ejecución crea sus descuentos
// con nombres aleatorios y vigencia en 2030 (no tocan los cobros de hoy) y los deja inactivos al final, así la
// carpeta se puede correr varias veces seguidas. La aplicación del descuento con un valor bruto (HU-50 E1–E4)
// necesita mover el reloj y se prueba en Jest; aquí se revisa que la liquidación traiga el campo `descuento`.
// Puertas de la semilla: 1 Carrera 43 (mixta), 3 Calle 48 (salida).
const PREPARAR = [
  "const sufijo = Date.now().toString(36);",
  "pm.collectionVariables.set('nombreDescuento', 'Promo Postman ' + sufijo);",
  "pm.collectionVariables.set('nombreDescuentoFijo', 'Fijo Postman ' + sufijo);",
];

// Placa de carro libre de pico y placa hoy (como en la carpeta 009).
const PLACA_LIBRE = [
  "const base = pm.environment.get('baseUrl');",
  "const letra = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));",
  "pm.sendRequest({ url: base + '/restricciones-placa/hoy', header: { Authorization: 'Bearer ' + pm.collectionVariables.get('tokenOperador') } }, (err, res) => {",
  "  const hoy = res.json().data;",
  "  const prohibidos = hoy.tipos.carro ? hoy.tipos.carro.digitos : [];",
  "  const libres = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !prohibidos.includes(d));",
  "  pm.collectionVariables.set('placaDescuento', letra() + letra() + letra() + Math.floor(Math.random() * 10) + Math.floor(Math.random() * 10) + libres[Math.floor(Math.random() * libres.length)]);",
  "});",
];

const DESCUENTO = { nombre: '{{nombreDescuento}}', tipo: 'porcentaje', valor: 20, aplicaTipoVehiculo: 'moto', vigenteDesde: '2030-12-01', vigenteHasta: '2030-12-31' };

module.exports = {
  nombre: '011 Descuentos',
  descripcion: 'SRS B.1 §4.11 — HU-49..HU-51. Ejecutar con la BD sembrada.',
  casos: [
    // ------------------------------------------------------------ configurar (HU-49)
    {
      nombre: 'HU-49 POST /descuentos — 201 porcentaje activo en su periodo',
      metodo: 'POST',
      ruta: '/descuentos',
      token: 'tokenAdmin',
      antes: PREPARAR,
      body: DESCUENTO,
      status: 201,
      pruebas: [
        "pm.test('activo y programado', () => pm.expect(cuerpo.data).to.include({ estado: 'activo', situacion: 'programado', tipo: 'porcentaje', valor: 20, aplicaTipoCliente: 'todos' }));",
        "pm.test('el último día cuenta completo', () => pm.expect(cuerpo.data.vigenteHasta).to.eql('2030-12-31T23:59:59-05:00'));",
      ],
      guardar: { idDescuento: 'cuerpo.data.idDescuento' },
    },
    {
      nombre: 'HU-49 POST /descuentos — 201 valor fijo con minutos mínimos',
      metodo: 'POST',
      ruta: '/descuentos',
      token: 'tokenAdmin',
      body: { nombre: '{{nombreDescuentoFijo}}', tipo: 'valor_fijo', valor: 2000, aplicaTipoCliente: 'registrado', minutosMinimos: 120, vigenteDesde: '2030-12-01', vigenteHasta: '2030-12-31T18:00' },
      status: 201,
      pruebas: ["pm.test('fijo', () => pm.expect(cuerpo.data).to.include({ tipo: 'valor_fijo', valor: 2000, minutosMinimos: 120, vigenteHasta: '2030-12-31T18:00:00-05:00' }));"],
      guardar: { idDescuentoFijo: 'cuerpo.data.idDescuento' },
    },
    {
      nombre: 'HU-49 POST /descuentos — 422 porcentaje de 120',
      metodo: 'POST',
      ruta: '/descuentos',
      token: 'tokenAdmin',
      body: { ...DESCUENTO, nombre: 'Porcentaje inválido', valor: 120 },
      status: 422,
      code: 'VALIDACION',
      pruebas: ["pm.test('entre 1 y 100', () => pm.expect(cuerpo.error.details[0]).to.include({ campo: 'valor', mensaje: 'El porcentaje debe estar entre 1 y 100.' }));"],
    },
    {
      nombre: 'HU-49 POST /descuentos — 422 valor fijo de 0',
      metodo: 'POST',
      ruta: '/descuentos',
      token: 'tokenAdmin',
      body: { ...DESCUENTO, nombre: 'Fijo inválido', tipo: 'valor_fijo', valor: 0 },
      status: 422,
      code: 'VALIDACION',
    },
    {
      nombre: 'HU-49 POST /descuentos — 422 el fin antes del inicio',
      metodo: 'POST',
      ruta: '/descuentos',
      token: 'tokenAdmin',
      body: { ...DESCUENTO, nombre: 'Fechas invertidas', vigenteDesde: '2030-12-31', vigenteHasta: '2030-12-01' },
      status: 422,
      code: 'VALIDACION',
      pruebas: ["pm.test('campo vigenteHasta', () => pm.expect(cuerpo.error.details[0].campo).to.eql('vigenteHasta'));"],
    },
    { nombre: 'HU-49 POST /descuentos — 409 nombre repetido', metodo: 'POST', ruta: '/descuentos', token: 'tokenAdmin', body: DESCUENTO, status: 409, code: 'DESCUENTO_DUPLICADO' },
    { nombre: 'HU-49 POST /descuentos — 403 operador', metodo: 'POST', ruta: '/descuentos', token: 'tokenOperador', body: DESCUENTO, status: 403, code: 'SIN_PERMISO' },
    {
      nombre: 'HU-49 PUT /descuentos/:id — 200 edita el valor y el tipo de cliente',
      metodo: 'PUT',
      ruta: '/descuentos/{{idDescuento}}',
      token: 'tokenAdmin',
      body: { ...DESCUENTO, valor: 25, aplicaTipoCliente: 'ocasional' },
      status: 200,
      pruebas: ["pm.test('editado', () => pm.expect(cuerpo.data).to.include({ valor: 25, aplicaTipoCliente: 'ocasional' }));"],
    },
    { nombre: 'HU-49 PUT /descuentos/999999 — 404', metodo: 'PUT', ruta: '/descuentos/999999', token: 'tokenAdmin', body: DESCUENTO, status: 404, code: 'DESCUENTO_NO_ENCONTRADO' },
    {
      nombre: 'HU-49 GET /descuentos?q — 200 el operador consulta',
      metodo: 'GET',
      ruta: '/descuentos?q={{nombreDescuento}}',
      token: 'tokenOperador',
      status: 200,
      pruebas: ["pm.test('uno por el nombre', () => pm.expect(cuerpo.meta.total).to.eql(1));"],
    },
    { nombre: 'GET /descuentos — 403 cliente', metodo: 'GET', ruta: '/descuentos', token: 'tokenCliente', status: 403, code: 'SIN_PERMISO' },

    // ------------------------------------------------------------ liquidación (HU-50)
    {
      nombre: 'HU-50 POST /movimientos — 201 entrada para liquidar',
      metodo: 'POST',
      ruta: '/movimientos',
      token: 'tokenOperador',
      antes: PLACA_LIBRE,
      body: { placa: '{{placaDescuento}}', tipo: 'carro', idPuerta: 1 },
      status: 201,
      guardar: { idMovDescuento: 'cuerpo.data.idMovimiento' },
    },
    {
      nombre: 'HU-50 POST /movimientos/:id/salida — 200 la liquidación trae el campo descuento',
      metodo: 'POST',
      ruta: '/movimientos/{{idMovDescuento}}/salida',
      token: 'tokenOperador',
      body: { idPuerta: 3 },
      status: 200,
      pruebas: [
        "pm.test('campo descuento', () => pm.expect(cuerpo.data.liquidacion).to.have.property('descuento'));",
        "pm.test('dentro de la gracia: sin descuento', () => pm.expect(cuerpo.data.liquidacion).to.include({ descuento: null, valorDescuento: 0, total: 0 }));",
      ],
    },

    // ------------------------------------------------------------ estado (HU-51)
    {
      nombre: 'HU-51 PATCH /descuentos/:id/estado — 200 inactivo',
      metodo: 'PATCH',
      ruta: '/descuentos/{{idDescuento}}/estado',
      token: 'tokenAdmin',
      body: { estado: 'inactivo' },
      status: 200,
      pruebas: ["pm.test('inactivo', () => pm.expect(cuerpo.data).to.include({ estado: 'inactivo', situacion: 'inactivo' }));"],
    },
    {
      nombre: 'HU-51 PATCH /descuentos/:id/estado — 200 vuelve a activarse (vigencia futura)',
      metodo: 'PATCH',
      ruta: '/descuentos/{{idDescuento}}/estado',
      token: 'tokenAdmin',
      body: { estado: 'activo' },
      status: 200,
      pruebas: ["pm.test('activo', () => pm.expect(cuerpo.data.estado).to.eql('activo'));"],
    },
    {
      nombre: 'HU-51 PATCH /descuentos/:id/estado — 422 activar «Promoción de apertura» (vencida)',
      metodo: 'PATCH',
      ruta: '/descuentos/3/estado',
      token: 'tokenAdmin',
      body: { estado: 'activo' },
      status: 422,
      code: 'VALIDACION',
      pruebas: ["pm.test('pide ampliar la vigencia', () => pm.expect(cuerpo.error.details[0]).to.include({ campo: 'vigenteHasta', mensaje: 'Amplíe la vigencia del descuento antes de activarlo.' }));"],
    },
    { nombre: 'HU-51 PATCH /descuentos/999999/estado — 404', metodo: 'PATCH', ruta: '/descuentos/999999/estado', token: 'tokenAdmin', body: { estado: 'inactivo' }, status: 404, code: 'DESCUENTO_NO_ENCONTRADO' },
    { nombre: 'HU-51 PATCH /descuentos/:id/estado — 403 operador', metodo: 'PATCH', ruta: '/descuentos/{{idDescuento}}/estado', token: 'tokenOperador', body: { estado: 'inactivo' }, status: 403, code: 'SIN_PERMISO' },
    // Limpieza: los descuentos de esta ejecución quedan inactivos.
    { nombre: 'PATCH /descuentos/:id/estado — 200 deja inactivo el porcentaje', metodo: 'PATCH', ruta: '/descuentos/{{idDescuento}}/estado', token: 'tokenAdmin', body: { estado: 'inactivo' }, status: 200 },
    { nombre: 'PATCH /descuentos/:id/estado — 200 deja inactivo el valor fijo', metodo: 'PATCH', ruta: '/descuentos/{{idDescuentoFijo}}/estado', token: 'tokenAdmin', body: { estado: 'inactivo' }, status: 200 },
  ],
};
