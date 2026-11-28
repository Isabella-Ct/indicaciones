// Carpeta «012 Reservas» (quickstart.md § Colección Postman, research R-09). Usa la hora real: cada ejecución
// registra un carro nuevo de Andrea (cliente semilla, usuario 4), lo reserva para mañana a las 08:00 en el
// parqueadero principal y cancela todo al final, así la carpeta se puede correr varias veces seguidas. Cumplir y
// vencer (HU-55), que necesitan mover el reloj, se prueban en Jest.
const PREPARAR = [
  "const letra = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));",
  "pm.collectionVariables.set('placaRes', letra() + letra() + letra() + String(Math.floor(Math.random() * 900) + 100));",
  "pm.collectionVariables.set('placaRes2', letra() + letra() + letra() + String(Math.floor(Math.random() * 900) + 100));",
  // Fechas en hora de Bogotá (UTC−5): mañana a las 08:00, ayer y dentro de 8 días.
  "const bogota = (dias) => new Date(Date.now() - 5 * 3600000 + dias * 86400000).toISOString().slice(0, 10);",
  "pm.collectionVariables.set('inicioRes', bogota(1) + 'T08:00');",
  "pm.collectionVariables.set('inicioRes15', bogota(1) + 'T08:15');",
  "pm.collectionVariables.set('inicioPasado', bogota(-1) + 'T08:00');",
  "pm.collectionVariables.set('inicioLejano', bogota(8) + 'T08:00');",
  "pm.collectionVariables.set('diaRes', bogota(1));",
];

const vehiculo = (placa) => ({ placa, tipo: 'carro', color: 'Blanco', marca: 'Renault', modelo: 2023, idPropietario: 4 });

module.exports = {
  nombre: '012 Reservas',
  descripcion: 'SRS B.1 §4.12 — HU-52..HU-55. Ejecutar con la BD sembrada; usa la hora real del servidor.',
  casos: [
    // ------------------------------------------------------------ preparación
    {
      nombre: 'HU-52 POST /vehiculos — 201 carro de Andrea para reservar',
      metodo: 'POST',
      ruta: '/vehiculos',
      token: 'tokenOperador',
      antes: PREPARAR,
      body: vehiculo('{{placaRes}}'),
      status: 201,
      guardar: { idVehRes: 'cuerpo.data.idVehiculo' },
    },
    {
      nombre: 'HU-52 POST /vehiculos — 201 segundo carro de Andrea',
      metodo: 'POST',
      ruta: '/vehiculos',
      token: 'tokenOperador',
      body: vehiculo('{{placaRes2}}'),
      status: 201,
      guardar: { idVehRes2: 'cuerpo.data.idVehiculo' },
    },

    // ------------------------------------------------------------ reservar (HU-52)
    {
      nombre: 'HU-52 GET /celdas/disponibles — 200 libres en la franja',
      metodo: 'GET',
      ruta: '/celdas/disponibles?fecha={{inicioRes}}&tipo=carro',
      token: 'tokenCliente',
      status: 200,
      pruebas: ["pm.test('hay celdas libres', () => pm.expect(cuerpo.data.length).to.be.above(0));"],
      guardar: { idCeldaRes: 'cuerpo.data[0].idCelda' },
    },
    { nombre: 'HU-52 GET /celdas/disponibles — 422 sin tipo', metodo: 'GET', ruta: '/celdas/disponibles?fecha={{inicioRes}}', token: 'tokenCliente', status: 422, code: 'VALIDACION' },
    {
      nombre: 'HU-52 POST /reservas — 201 confirmada con código',
      metodo: 'POST',
      ruta: '/reservas',
      token: 'tokenCliente',
      body: { idVehiculo: '{{idVehRes}}', fechaHoraInicio: '{{inicioRes}}', idCelda: '{{idCeldaRes}}' },
      status: 201,
      pruebas: [
        "pm.test('confirmada R-', () => { pm.expect(cuerpo.data.estado).to.eql('confirmada'); pm.expect(cuerpo.data.codigo).to.match(/^R-\\d{6}$/); });",
        "pm.test('espera de 30 minutos', () => pm.expect(cuerpo.data.minutosEspera).to.eql(30));",
      ],
      guardar: { idReserva: 'cuerpo.data.idReserva', codigoReserva: 'cuerpo.data.codigo' },
    },
    {
      nombre: 'HU-52 POST /reservas — 409 la celda no está disponible en ese horario (con sugerida)',
      metodo: 'POST',
      ruta: '/reservas',
      token: 'tokenCliente',
      body: { idVehiculo: '{{idVehRes2}}', fechaHoraInicio: '{{inicioRes15}}', idCelda: '{{idCeldaRes}}' },
      status: 409,
      code: 'CELDA_NO_DISPONIBLE',
      pruebas: [
        "pm.test('mensaje', () => pm.expect(cuerpo.error.message).to.eql('La celda no está disponible en ese horario'));",
        "pm.test('sugerida', () => pm.expect(cuerpo.error.details[0]).to.have.property('sugerida'));",
      ],
    },
    {
      nombre: 'HU-52 POST /reservas — 409 el vehículo ya tiene una reserva en ese horario',
      metodo: 'POST',
      ruta: '/reservas',
      token: 'tokenCliente',
      body: { idVehiculo: '{{idVehRes}}', fechaHoraInicio: '{{inicioRes15}}' },
      status: 409,
      code: 'RESERVA_VEHICULO_CRUZADA',
    },
    {
      nombre: 'HU-52 POST /reservas — 201 sin celda elegida: el sistema asigna una libre',
      metodo: 'POST',
      ruta: '/reservas',
      token: 'tokenCliente',
      body: { idVehiculo: '{{idVehRes2}}', fechaHoraInicio: '{{inicioRes15}}' },
      status: 201,
      pruebas: ["pm.test('otra celda', () => pm.expect(cuerpo.data.celda.idCelda).to.not.eql(Number(pm.collectionVariables.get('idCeldaRes'))));"],
      guardar: { idReserva2: 'cuerpo.data.idReserva' },
    },
    {
      nombre: 'HU-52 POST /reservas — 422 fecha pasada',
      metodo: 'POST',
      ruta: '/reservas',
      token: 'tokenCliente',
      body: { idVehiculo: '{{idVehRes}}', fechaHoraInicio: '{{inicioPasado}}' },
      status: 422,
      code: 'VALIDACION',
      pruebas: ["pm.test('futura', () => pm.expect(cuerpo.error.details[0].mensaje).to.eql('La hora de inicio debe ser futura.'));"],
    },
    {
      nombre: 'HU-52 POST /reservas — 422 a más de 7 días',
      metodo: 'POST',
      ruta: '/reservas',
      token: 'tokenCliente',
      body: { idVehiculo: '{{idVehRes}}', fechaHoraInicio: '{{inicioLejano}}' },
      status: 422,
      code: 'VALIDACION',
      pruebas: ["pm.test('7 días', () => pm.expect(cuerpo.error.details[0].mensaje).to.eql('La reserva debe ser para los próximos 7 días.'));"],
    },
    {
      nombre: 'HU-52 POST /reservas — 403 el cliente con un vehículo ajeno (FGH678, de Carlos)',
      metodo: 'POST',
      ruta: '/reservas',
      token: 'tokenCliente',
      body: { idVehiculo: 3, fechaHoraInicio: '{{inicioRes}}' },
      status: 403,
      code: 'SIN_PERMISO',
    },

    // ------------------------------------------------------------ consultas (HU-53, HU-54)
    {
      nombre: 'HU-53 GET /usuarios/me/reservas — 200 las del cliente',
      metodo: 'GET',
      ruta: '/usuarios/me/reservas?estado=confirmada&limit=100',
      token: 'tokenCliente',
      status: 200,
      pruebas: ["pm.test('incluye la reserva', () => pm.expect(cuerpo.data.map((r) => r.codigo)).to.include(pm.collectionVariables.get('codigoReserva')));"],
    },
    { nombre: 'GET /usuarios/me/reservas — 401 sin sesión', metodo: 'GET', ruta: '/usuarios/me/reservas', status: 401 },
    {
      nombre: 'HU-54 GET /reservas?fecha&estado — 200 las de mañana ordenadas por hora',
      metodo: 'GET',
      ruta: '/reservas?fecha={{diaRes}}&estado=confirmada&limit=100',
      token: 'tokenOperador',
      status: 200,
      pruebas: [
        "const horas = cuerpo.data.map((r) => r.fechaHoraInicio);",
        "pm.test('ordenadas por hora', () => pm.expect(horas).to.eql([...horas].sort()));",
        "pm.test('solo confirmadas', () => pm.expect(cuerpo.data.every((r) => r.estado === 'confirmada')).to.eql(true));",
      ],
    },
    { nombre: 'GET /reservas — 403 cliente', metodo: 'GET', ruta: '/reservas', token: 'tokenCliente', status: 403, code: 'SIN_PERMISO' },

    // ------------------------------------------------------------ cancelar (HU-53)
    {
      nombre: 'HU-53 POST /reservas — 201 el operador reserva para FGH678 (de Carlos)',
      metodo: 'POST',
      ruta: '/reservas',
      token: 'tokenOperador',
      body: { idVehiculo: 3, fechaHoraInicio: '{{inicioLejano7}}' },
      antes: ["pm.collectionVariables.set('inicioLejano7', new Date(Date.now() - 5 * 3600000 + 6 * 86400000).toISOString().slice(0, 10) + 'T' + String(10 + Math.floor(Math.random() * 10)) + ':' + String(Math.floor(Math.random() * 6)) + '0');"],
      status: 201,
      pruebas: ["pm.test('el cliente es el propietario', () => pm.expect(cuerpo.data.cliente.idUsuario).to.eql(5));"],
      guardar: { idReservaCarlos: 'cuerpo.data.idReserva' },
    },
    { nombre: 'HU-53 PATCH /reservas/:id/cancelacion — 403 la reserva de otro cliente', metodo: 'PATCH', ruta: '/reservas/{{idReservaCarlos}}/cancelacion', token: 'tokenCliente', status: 403, code: 'SIN_PERMISO' },
    { nombre: 'HU-53 PATCH /reservas/:id/cancelacion — 200 el operador la cancela', metodo: 'PATCH', ruta: '/reservas/{{idReservaCarlos}}/cancelacion', token: 'tokenOperador', status: 200 },
    {
      nombre: 'HU-53 PATCH /reservas/:id/cancelacion — 200 cancelada',
      metodo: 'PATCH',
      ruta: '/reservas/{{idReserva}}/cancelacion',
      token: 'tokenCliente',
      status: 200,
      pruebas: ["pm.test('cancelada', () => pm.expect(cuerpo.data.estado).to.eql('cancelada'));"],
    },
    { nombre: 'HU-53 PATCH /reservas/:id/cancelacion — 409 ya cancelada', metodo: 'PATCH', ruta: '/reservas/{{idReserva}}/cancelacion', token: 'tokenCliente', status: 409, code: 'RESERVA_NO_CANCELABLE' },
    { nombre: 'HU-53 PATCH /reservas/999999/cancelacion — 404', metodo: 'PATCH', ruta: '/reservas/999999/cancelacion', token: 'tokenOperador', status: 404, code: 'RESERVA_NO_ENCONTRADA' },
    {
      nombre: 'HU-53 PATCH /reservas/:id/cancelacion — 200 el operador cancela la segunda',
      metodo: 'PATCH',
      ruta: '/reservas/{{idReserva2}}/cancelacion',
      token: 'tokenOperador',
      status: 200,
    },
  ],
};
