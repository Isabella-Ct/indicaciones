// Carpeta «003 Gestión de acceso» (quickstart.md § Colección Postman). Los casos de error del login usan
// documentos aleatorios para no bloquear cuentas reales (RN-07). El restablecimiento exitoso solo se prueba
// en Jest: el token llega por correo y la API guarda únicamente su hash.
const registro = {
  tipoDocumento: 'CC',
  numeroDocumento: '5{{$timestamp}}',
  nombreCompleto: 'Cliente Autorregistro',
  correo: 'autorregistro{{$timestamp}}@correo.co',
  celular: '3157654321',
  contrasena: 'Clave2026',
  confirmacion: 'Clave2026',
  aceptaTratamientoDatos: true,
};

module.exports = {
  nombre: '003 Gestión de acceso',
  descripcion: 'SRS B.1 §4.3 — HU-12..HU-16. Ejecutar con la BD recién sembrada.',
  casos: [
    // POST /auth/login
    {
      nombre: 'HU-12 POST /auth/login — 200 operador',
      metodo: 'POST',
      ruta: '/auth/login',
      body: { tipoDocumento: 'CC', numeroDocumento: '1000000002', contrasena: 'Operador2026*' },
      status: 200,
      pruebas: ["pm.test('rol Operador', () => pm.expect(cuerpo.data.usuario.rol).to.eql('Operador'));"],
    },
    {
      nombre: 'HU-12 POST /auth/login — 200 con contraseña temporal pendiente',
      metodo: 'POST',
      ruta: '/auth/login',
      body: { tipoDocumento: 'CC', numeroDocumento: '1000000006', contrasena: 'Cliente2026*' },
      status: 200,
      pruebas: ["pm.test('debe cambiarla', () => pm.expect(cuerpo.data.usuario.debeCambiarContrasena).to.eql(true));"],
      guardar: { tokenTemporal: 'cuerpo.data.token' },
    },
    {
      nombre: 'HU-12 GET /usuarios/me — 403 contraseña temporal pendiente',
      metodo: 'GET',
      ruta: '/usuarios/me',
      token: 'tokenTemporal',
      status: 403,
      code: 'CAMBIO_CONTRASENA_REQUERIDO',
    },
    {
      nombre: 'HU-13 POST /auth/login — 401 documento no registrado',
      metodo: 'POST',
      ruta: '/auth/login',
      body: { tipoDocumento: 'CC', numeroDocumento: '7{{$timestamp}}', contrasena: 'Cliente2026*' },
      status: 401,
      code: 'CREDENCIALES_INVALIDAS',
    },
    {
      nombre: 'HU-13 GET /usuarios — 403 cliente en ruta de administración',
      metodo: 'GET',
      ruta: '/usuarios',
      token: 'tokenCliente',
      status: 403,
      code: 'SIN_PERMISO',
    },

    // POST /auth/registro
    {
      nombre: 'HU-14 POST /auth/registro — 201 cliente',
      metodo: 'POST',
      ruta: '/auth/registro',
      body: registro,
      status: 201,
      pruebas: [
        "pm.test('rol Cliente sin cambio obligatorio', () => { pm.expect(cuerpo.data.rol.nombre).to.eql('Cliente'); pm.expect(cuerpo.data.debeCambiarContrasena).to.eql(false); });",
      ],
      guardar: { docRegistrado: 'cuerpo.data.numeroDocumento' },
    },
    {
      nombre: 'HU-14 POST /auth/registro — 409 documento existente',
      metodo: 'POST',
      ruta: '/auth/registro',
      body: { ...registro, numeroDocumento: '1000000004', correo: 'otro{{$timestamp}}@correo.co' },
      status: 409,
      code: 'CUENTA_EXISTENTE',
    },
    {
      nombre: 'HU-14 POST /auth/registro — 422 sin autorización de datos',
      metodo: 'POST',
      ruta: '/auth/registro',
      body: { ...registro, numeroDocumento: '4{{$timestamp}}', aceptaTratamientoDatos: false },
      status: 422,
      code: 'VALIDACION',
    },
    {
      nombre: 'HU-14 POST /auth/login — 200 la cuenta nueva puede entrar',
      metodo: 'POST',
      ruta: '/auth/login',
      body: { tipoDocumento: 'CC', numeroDocumento: '{{docRegistrado}}', contrasena: 'Clave2026' },
      status: 200,
      guardar: { tokenRegistrado: 'cuerpo.data.token' },
    },

    // PUT /auth/contrasena
    {
      nombre: 'HU-12 PUT /auth/contrasena — 401 contraseña actual incorrecta',
      metodo: 'PUT',
      ruta: '/auth/contrasena',
      token: 'tokenRegistrado',
      body: { contrasenaActual: 'equivocada1', contrasenaNueva: 'NuevaClave1', confirmacion: 'NuevaClave1' },
      status: 401,
      code: 'CONTRASENA_ACTUAL_INCORRECTA',
    },
    {
      nombre: 'HU-12 PUT /auth/contrasena — 422 confirmación distinta',
      metodo: 'PUT',
      ruta: '/auth/contrasena',
      token: 'tokenRegistrado',
      body: { contrasenaActual: 'Clave2026', contrasenaNueva: 'NuevaClave1', confirmacion: 'NuevaClave2' },
      status: 422,
      code: 'VALIDACION',
    },
    {
      nombre: 'HU-12 PUT /auth/contrasena — 200 actualizada',
      metodo: 'PUT',
      ruta: '/auth/contrasena',
      token: 'tokenRegistrado',
      body: { contrasenaActual: 'Clave2026', contrasenaNueva: 'NuevaClave1', confirmacion: 'NuevaClave1' },
      status: 200,
    },

    // POST /auth/recuperar
    {
      nombre: 'HU-15 POST /auth/recuperar — 200 documento registrado',
      metodo: 'POST',
      ruta: '/auth/recuperar',
      body: { tipoDocumento: 'CC', numeroDocumento: '1000000004' },
      status: 200,
      pruebas: ["pm.test('mensaje genérico', () => pm.expect(cuerpo.data.mensaje).to.eql('Si el documento está registrado, recibirá un correo.'));"],
    },
    {
      nombre: 'HU-15 POST /auth/recuperar — 200 documento inexistente (mismo cuerpo)',
      metodo: 'POST',
      ruta: '/auth/recuperar',
      body: { tipoDocumento: 'CC', numeroDocumento: '8{{$timestamp}}' },
      status: 200,
      pruebas: ["pm.test('mensaje genérico', () => pm.expect(cuerpo.data.mensaje).to.eql('Si el documento está registrado, recibirá un correo.'));"],
    },
    {
      nombre: 'HU-15 POST /auth/recuperar — 422 sin documento',
      metodo: 'POST',
      ruta: '/auth/recuperar',
      body: { tipoDocumento: 'CC' },
      status: 422,
      code: 'VALIDACION',
    },

    // POST /auth/restablecer
    {
      nombre: 'HU-15 POST /auth/restablecer — 409 enlace inválido',
      metodo: 'POST',
      ruta: '/auth/restablecer',
      body: { token: 'a'.repeat(64), contrasenaNueva: 'Clave9999', confirmacion: 'Clave9999' },
      status: 409,
      code: 'ENLACE_INVALIDO',
    },
    {
      nombre: 'HU-15 POST /auth/restablecer — 422 contraseña débil',
      metodo: 'POST',
      ruta: '/auth/restablecer',
      body: { token: 'b'.repeat(64), contrasenaNueva: 'abc', confirmacion: 'abc' },
      status: 422,
      code: 'VALIDACION',
    },

    // POST /auth/logout
    { nombre: 'HU-16 POST /auth/logout — 204', metodo: 'POST', ruta: '/auth/logout', token: 'tokenRegistrado', status: 204 },
    {
      nombre: 'HU-16 POST /auth/logout — 401 token ya cerrado',
      metodo: 'POST',
      ruta: '/auth/logout',
      token: 'tokenRegistrado',
      status: 401,
      code: 'NO_AUTENTICADO',
    },
    {
      nombre: 'HU-16 POST /auth/logout — 204 con contraseña temporal pendiente',
      metodo: 'POST',
      ruta: '/auth/logout',
      token: 'tokenTemporal',
      status: 204,
    },
  ],
};
