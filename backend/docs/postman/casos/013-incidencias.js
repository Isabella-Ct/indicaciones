// Carpeta «013 Incidencias» (quickstart.md § Colección Postman, research R-06). Usa la hora real: el evento es de
// hace una hora. Cada ejecución usa una placa ocasional aleatoria y cierra la incidencia que abre, así la carpeta se
// puede correr varias veces seguidas. La evidencia es docs/postman/archivos/evidencia.png.
const PREPARAR = [
  "const letra = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));",
  "pm.collectionVariables.set('placaInc', letra() + letra() + letra() + String(Math.floor(Math.random() * 900) + 100));",
  // Hora de Bogotá (UTC−5): hace una hora y dentro de una hora.
  "const bogota = (horas) => new Date(Date.now() - 5 * 3600000 + horas * 3600000).toISOString().slice(0, 16);",
  "pm.collectionVariables.set('eventoInc', bogota(-1));",
  "pm.collectionVariables.set('eventoFuturo', bogota(1));",
];

const BASE = { tipo: 'rayon', placa: '{{placaInc}}', fechaHoraEvento: '{{eventoInc}}', descripcion: 'Rayón en la puerta del conductor al maniobrar' };

module.exports = {
  nombre: '013 Incidencias',
  descripcion: 'SRS B.1 §4.13 — HU-56..HU-58. Ejecutar con la BD sembrada; usa la hora real del servidor.',
  casos: [
    // ------------------------------------------------------------ registrar (HU-56)
    {
      nombre: 'HU-56 POST /incidencias — 422 placa no registrada sin tipo de vehículo',
      metodo: 'POST',
      ruta: '/incidencias',
      token: 'tokenOperador',
      antes: PREPARAR,
      body: BASE,
      status: 422,
      code: 'VALIDACION',
      pruebas: ["pm.test('campo tipoVehiculo', () => pm.expect(cuerpo.error.details[0].campo).to.eql('tipoVehiculo'));"],
    },
    {
      nombre: 'HU-56 POST /incidencias — 201 abierta con código INC- (placa ocasional)',
      metodo: 'POST',
      ruta: '/incidencias',
      token: 'tokenOperador',
      body: { ...BASE, tipoVehiculo: 'carro' },
      status: 201,
      pruebas: [
        "pm.test('abierta INC-', () => { pm.expect(cuerpo.data.estado).to.eql('abierta'); pm.expect(cuerpo.data.codigo).to.match(/^INC-\\d{6}$/); });",
        "pm.test('tipo Rayón', () => pm.expect(cuerpo.data.tipoNombre).to.eql('Rayón'));",
      ],
      guardar: { idIncidencia: 'cuerpo.data.idIncidencia', codigoIncidencia: 'cuerpo.data.codigo' },
    },
    {
      nombre: 'HU-56 POST /incidencias — 201 con evidencia (multipart)',
      metodo: 'POST',
      ruta: '/incidencias',
      token: 'tokenOperador',
      formdata: [
        { key: 'tipo', value: 'choque' },
        { key: 'placa', value: '{{placaInc}}' },
        { key: 'fechaHoraEvento', value: '{{eventoInc}}' },
        { key: 'descripcion', value: 'Choque contra la columna al parquear' },
        { key: 'evidencia', src: 'docs/postman/archivos/evidencia.png' },
      ],
      status: 201,
      pruebas: ["pm.test('con evidencia', () => pm.expect(cuerpo.data.tieneEvidencia).to.eql(true));"],
      guardar: { idIncidenciaFoto: 'cuerpo.data.idIncidencia' },
    },
    {
      nombre: 'HU-56 POST /incidencias — 422 sin tipo ni placa',
      metodo: 'POST',
      ruta: '/incidencias',
      token: 'tokenOperador',
      body: { fechaHoraEvento: '{{eventoInc}}', descripcion: 'Golpe en el parachoques trasero' },
      status: 422,
      code: 'VALIDACION',
      pruebas: ["pm.test('tipo y placa', () => pm.expect(cuerpo.error.details.map((d) => d.campo)).to.include.members(['tipo', 'placa']));"],
    },
    {
      nombre: 'HU-56 POST /incidencias — 422 fecha y hora futura',
      metodo: 'POST',
      ruta: '/incidencias',
      token: 'tokenOperador',
      body: { ...BASE, fechaHoraEvento: '{{eventoFuturo}}' },
      status: 422,
      code: 'VALIDACION',
      pruebas: ["pm.test('no futura', () => pm.expect(cuerpo.error.details[0].mensaje).to.eql('La fecha y hora del evento no puede ser futura.'));"],
    },
    { nombre: 'HU-56 POST /incidencias — 403 cliente', metodo: 'POST', ruta: '/incidencias', token: 'tokenCliente', body: BASE, status: 403, code: 'SIN_PERMISO' },

    // ------------------------------------------------------------ consultar (HU-57)
    {
      nombre: 'HU-57 GET /incidencias?q=placa — 200 con código, tipo, fecha, estado y operador',
      metodo: 'GET',
      ruta: '/incidencias?q={{placaInc}}',
      token: 'tokenOperador',
      status: 200,
      pruebas: [
        "pm.test('las dos de la placa', () => pm.expect(cuerpo.meta.total).to.eql(2));",
        "pm.test('campos', () => pm.expect(cuerpo.data[0]).to.include.keys('codigo', 'tipo', 'fechaHoraEvento', 'estado', 'operador'));",
      ],
    },
    { nombre: 'GET /incidencias — 403 cliente', metodo: 'GET', ruta: '/incidencias', token: 'tokenCliente', status: 403, code: 'SIN_PERMISO' },
    {
      nombre: 'HU-57 GET /incidencias/:id — 200 detalle con seguimiento',
      metodo: 'GET',
      ruta: '/incidencias/{{idIncidencia}}',
      token: 'tokenOperador',
      status: 200,
      pruebas: ["pm.test('seguimiento vacío', () => pm.expect(cuerpo.data.seguimientos).to.eql([]));"],
    },
    { nombre: 'HU-57 GET /incidencias/999999 — 404', metodo: 'GET', ruta: '/incidencias/999999', token: 'tokenOperador', status: 404, code: 'INCIDENCIA_NO_ENCONTRADA' },
    {
      nombre: 'HU-57 GET /incidencias/:id/evidencia — 200 imagen',
      metodo: 'GET',
      ruta: '/incidencias/{{idIncidenciaFoto}}/evidencia',
      token: 'tokenOperador',
      status: 200,
      binario: true,
      pruebas: ["pm.test('image/png', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('image/png'));"],
    },
    { nombre: 'HU-57 GET /incidencias/:id/evidencia — 404 sin evidencia', metodo: 'GET', ruta: '/incidencias/{{idIncidencia}}/evidencia', token: 'tokenOperador', status: 404, code: 'SIN_EVIDENCIA' },

    // ------------------------------------------------------------ seguimiento y cierre (HU-58)
    { nombre: 'HU-58 POST /incidencias/:id/seguimientos — 403 operador', metodo: 'POST', ruta: '/incidencias/{{idIncidencia}}/seguimientos', token: 'tokenOperador', body: { nota: 'Se llamó al cliente' }, status: 403, code: 'SIN_PERMISO' },
    {
      nombre: 'HU-58 POST /incidencias/:id/seguimientos — 201 en seguimiento',
      metodo: 'POST',
      ruta: '/incidencias/{{idIncidencia}}/seguimientos',
      token: 'tokenAdmin',
      body: { nota: 'Se llamó al cliente y se revisaron las cámaras' },
      status: 201,
      pruebas: [
        "pm.test('en seguimiento', () => pm.expect(cuerpo.data.estado).to.eql('en_seguimiento'));",
        "pm.test('nota con usuario', () => pm.expect(cuerpo.data.seguimientos[0].usuario.idUsuario).to.eql(1));",
      ],
    },
    {
      nombre: 'HU-58 PATCH /incidencias/:id/cierre — 422 sin solución',
      metodo: 'PATCH',
      ruta: '/incidencias/{{idIncidencia}}/cierre',
      token: 'tokenAdmin',
      body: {},
      status: 422,
      code: 'VALIDACION',
      pruebas: ["pm.test('campo solucion', () => pm.expect(cuerpo.error.details[0].campo).to.eql('solucion'));"],
    },
    {
      nombre: 'HU-58 PATCH /incidencias/:id/cierre — 200 cerrada',
      metodo: 'PATCH',
      ruta: '/incidencias/{{idIncidencia}}/cierre',
      token: 'tokenAdmin',
      body: { solucion: 'El parqueadero pagó la reparación de la puerta' },
      status: 200,
      pruebas: ["pm.test('cerrada', () => pm.expect(cuerpo.data.estado).to.eql('cerrada'));"],
    },
    { nombre: 'HU-58 POST /incidencias/:id/seguimientos — 409 cerrada', metodo: 'POST', ruta: '/incidencias/{{idIncidencia}}/seguimientos', token: 'tokenAdmin', body: { nota: 'Nota después del cierre' }, status: 409, code: 'INCIDENCIA_CERRADA' },
    { nombre: 'HU-58 PATCH /incidencias/:id/cierre — 409 ya cerrada', metodo: 'PATCH', ruta: '/incidencias/{{idIncidencia}}/cierre', token: 'tokenAdmin', body: { solucion: 'Cerrar otra vez la incidencia' }, status: 409, code: 'INCIDENCIA_CERRADA' },
    // Limpieza: la incidencia con evidencia también queda cerrada.
    { nombre: 'PATCH /incidencias/:id/cierre — 200 cierra la de la evidencia', metodo: 'PATCH', ruta: '/incidencias/{{idIncidenciaFoto}}/cierre', token: 'tokenAdmin', body: { solucion: 'Prueba de la colección cerrada' }, status: 200 },
  ],
};
