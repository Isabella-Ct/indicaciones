// Carpeta «002 Gestión de usuarios» (quickstart.md § Colección Postman). Usuarios semilla:
// 1 Administrador, 2 Operador, 4 Andrea Salcedo (Cliente). Documentos y correos nuevos usan
// {{$timestamp}} y se guardan desde la respuesta, así la colección se puede repetir.
const nuevo = (prefijo) => ({
  tipoDocumento: 'CC',
  numeroDocumento: `${prefijo}{{$timestamp}}`,
  nombreCompleto: 'Cliente Postman',
  correo: `postman${prefijo}{{$timestamp}}@correo.co`,
  celular: '3001112233',
  idRol: 3,
  aceptaTratamientoDatos: true,
});

const edicion = (cambios = {}) => ({
  tipoDocumento: 'CC',
  numeroDocumento: '{{docNuevo}}',
  nombreCompleto: 'Cliente Postman Editado',
  correo: '{{correoNuevo}}',
  celular: '3209998877',
  idRol: 3,
  ...cambios,
});

const andrea = { nombreCompleto: 'Andrea Salcedo Ríos', correo: 'andrea.salcedo@correo.co', celular: '3101000004' };

module.exports = {
  nombre: '002 Gestión de usuarios',
  descripcion: 'SRS B.1 §4.2 — HU-07..HU-11, más GET /usuarios/:id/foto [Propuesta].',
  casos: [
    // POST /usuarios
    {
      nombre: 'HU-07 POST /usuarios — 201 JSON',
      metodo: 'POST',
      ruta: '/usuarios',
      token: 'tokenAdmin',
      body: nuevo('9'),
      status: 201,
      pruebas: [
        "pm.test('activo y con cambio de contraseña', () => pm.expect(cuerpo.data).to.include({ estado: 'activo', debeCambiarContrasena: true }));",
        "pm.test('sin contraseña en la respuesta', () => pm.expect(JSON.stringify(cuerpo)).to.not.match(/contrasena_?hash|\\$2b\\$/i));",
      ],
      guardar: {
        idUsuarioNuevo: 'cuerpo.data.idUsuario',
        docNuevo: 'cuerpo.data.numeroDocumento',
        correoNuevo: 'cuerpo.data.correo',
      },
    },
    {
      nombre: 'HU-07 POST /usuarios — 201 multipart con foto',
      metodo: 'POST',
      ruta: '/usuarios',
      token: 'tokenAdmin',
      formdata: [
        ...Object.entries(nuevo('8')).map(([key, value]) => ({ key, value })),
        { key: 'foto', src: 'docs/postman/archivos/foto.png' },
      ],
      status: 201,
      pruebas: ["pm.test('fotoUrl', () => pm.expect(cuerpo.data.fotoUrl).to.match(/\\/foto$/));"],
      guardar: { idUsuarioFoto: 'cuerpo.data.idUsuario' },
    },
    {
      nombre: 'HU-07 POST /usuarios — 409 documento duplicado',
      metodo: 'POST',
      ruta: '/usuarios',
      token: 'tokenAdmin',
      body: { ...nuevo('7'), numeroDocumento: '1000000004' },
      status: 409,
      code: 'DOCUMENTO_DUPLICADO',
    },
    {
      nombre: 'HU-07 POST /usuarios — 422 campos inválidos',
      metodo: 'POST',
      ruta: '/usuarios',
      token: 'tokenAdmin',
      body: { tipoDocumento: 'CC', numeroDocumento: '12', nombreCompleto: 'X', correo: 'malo', celular: '1', idRol: 3, aceptaTratamientoDatos: false },
      status: 422,
      code: 'VALIDACION',
    },
    {
      nombre: 'HU-07 POST /usuarios — 403 operador con rol Administrador',
      metodo: 'POST',
      ruta: '/usuarios',
      token: 'tokenOperador',
      body: { ...nuevo('6'), idRol: 1 },
      status: 403,
      code: 'SIN_PERMISO',
    },

    // GET /usuarios
    {
      nombre: 'HU-08 GET /usuarios?q=salcedo — 200',
      metodo: 'GET',
      ruta: '/usuarios?q=salcedo',
      token: 'tokenAdmin',
      status: 200,
      pruebas: ["pm.test('encuentra a Andrea', () => pm.expect(cuerpo.data.map((u) => u.idUsuario)).to.include(4));"],
    },
    { nombre: 'HU-08 GET /usuarios — 403 cliente', metodo: 'GET', ruta: '/usuarios', token: 'tokenCliente', status: 403, code: 'SIN_PERMISO' },
    { nombre: 'HU-08 GET /usuarios?limit=500 — 422', metodo: 'GET', ruta: '/usuarios?limit=500', token: 'tokenAdmin', status: 422, code: 'VALIDACION' },

    // GET /usuarios/:id
    {
      nombre: 'HU-08 GET /usuarios/4 — 200 detalle',
      metodo: 'GET',
      ruta: '/usuarios/4',
      token: 'tokenOperador',
      status: 200,
      pruebas: [
        "pm.test('vehículos y membresía', () => { pm.expect(cuerpo.data.vehiculos).to.be.an('array'); pm.expect(cuerpo.data).to.have.property('membresiaVigente'); });",
      ],
    },
    { nombre: 'HU-08 GET /usuarios/99999 — 404', metodo: 'GET', ruta: '/usuarios/99999', token: 'tokenAdmin', status: 404, code: 'USUARIO_NO_ENCONTRADO' },
    { nombre: 'HU-08 GET /usuarios/1 — 403 operador con un Administrador', metodo: 'GET', ruta: '/usuarios/1', token: 'tokenOperador', status: 403, code: 'SIN_PERMISO' },

    // PUT /usuarios/:id
    {
      nombre: 'HU-09 PUT /usuarios/:id — 200 actualizado',
      metodo: 'PUT',
      ruta: '/usuarios/{{idUsuarioNuevo}}',
      token: 'tokenAdmin',
      body: edicion(),
      status: 200,
      pruebas: ["pm.test('celular nuevo', () => pm.expect(cuerpo.data.celular).to.eql('3209998877'));"],
    },
    {
      nombre: 'HU-09 PUT /usuarios/:id — 409 correo duplicado',
      metodo: 'PUT',
      ruta: '/usuarios/{{idUsuarioNuevo}}',
      token: 'tokenAdmin',
      body: edicion({ correo: 'andrea.salcedo@correo.co' }),
      status: 409,
      code: 'CORREO_DUPLICADO',
    },
    {
      nombre: 'HU-09 PUT /usuarios/:id — 403 operador',
      metodo: 'PUT',
      ruta: '/usuarios/{{idUsuarioNuevo}}',
      token: 'tokenOperador',
      body: edicion(),
      status: 403,
      code: 'SIN_PERMISO',
    },

    // PATCH /usuarios/:id/estado
    {
      nombre: 'HU-10 PATCH /usuarios/:id/estado — 200 inactivar',
      metodo: 'PATCH',
      ruta: '/usuarios/{{idUsuarioNuevo}}/estado',
      token: 'tokenAdmin',
      body: { estado: 'inactivo' },
      status: 200,
      pruebas: ["pm.test('inactivo', () => pm.expect(cuerpo.data.estado).to.eql('inactivo'));"],
    },
    {
      nombre: 'HU-10 PATCH /usuarios/:id/estado — 200 activar',
      metodo: 'PATCH',
      ruta: '/usuarios/{{idUsuarioNuevo}}/estado',
      token: 'tokenAdmin',
      body: { estado: 'activo' },
      status: 200,
    },
    {
      nombre: 'HU-10 PATCH /usuarios/1/estado — 409 propia cuenta',
      metodo: 'PATCH',
      ruta: '/usuarios/1/estado',
      token: 'tokenAdmin',
      body: { estado: 'inactivo' },
      status: 409,
      code: 'AUTOINACTIVACION',
    },
    {
      nombre: 'HU-10 PATCH /usuarios/:id/estado — 422 estado inválido',
      metodo: 'PATCH',
      ruta: '/usuarios/{{idUsuarioNuevo}}/estado',
      token: 'tokenAdmin',
      body: { estado: 'borrado' },
      status: 422,
      code: 'VALIDACION',
    },

    // /usuarios/me
    {
      nombre: 'HU-11 GET /usuarios/me — 200',
      metodo: 'GET',
      ruta: '/usuarios/me',
      token: 'tokenCliente',
      status: 200,
      pruebas: ["pm.test('mis datos', () => pm.expect(cuerpo.data.idUsuario).to.eql(4));"],
    },
    { nombre: 'HU-11 GET /usuarios/me — 401 sin token', metodo: 'GET', ruta: '/usuarios/me', status: 401, code: 'NO_AUTENTICADO' },
    {
      nombre: 'HU-11 PUT /usuarios/me — 200',
      metodo: 'PUT',
      ruta: '/usuarios/me',
      token: 'tokenCliente',
      body: andrea,
      status: 200,
    },
    {
      nombre: 'HU-11 PUT /usuarios/me — 422 enviar el documento',
      metodo: 'PUT',
      ruta: '/usuarios/me',
      token: 'tokenCliente',
      body: { ...andrea, numeroDocumento: '1' },
      status: 422,
      code: 'VALIDACION',
    },

    // GET /usuarios/:id/foto [Propuesta]
    {
      nombre: 'GET /usuarios/:id/foto — 200 imagen',
      metodo: 'GET',
      ruta: '/usuarios/{{idUsuarioFoto}}/foto',
      token: 'tokenAdmin',
      status: 200,
      binario: true,
      pruebas: ["pm.test('image/png', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('image/png'));"],
    },
    {
      nombre: 'GET /usuarios/:id/foto — 404 sin foto',
      metodo: 'GET',
      ruta: '/usuarios/2/foto',
      token: 'tokenAdmin',
      status: 404,
      code: 'FOTO_NO_ENCONTRADA',
    },
  ],
};
