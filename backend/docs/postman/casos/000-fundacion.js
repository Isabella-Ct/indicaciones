// Carpeta «000 Fundación»: salud y login mínimo (spec 001, research R-05).
module.exports = {
  nombre: '000 Fundación',
  descripcion: 'GET /health y POST /auth/login (login mínimo de la fundación).',
  casos: [
    { nombre: 'GET /health — 200', metodo: 'GET', ruta: '/health', status: 200 },
    {
      nombre: 'GET /ruta-inexistente — 404 JSON',
      metodo: 'GET',
      ruta: '/no-existe',
      status: 404,
      code: 'RUTA_NO_ENCONTRADA',
    },
    {
      nombre: 'POST /auth/login — 200 administrador',
      metodo: 'POST',
      ruta: '/auth/login',
      body: { tipoDocumento: 'CC', numeroDocumento: '1000000001', contrasena: 'Admin2026*' },
      status: 200,
      pruebas: [
        "pm.test('token y permisos', () => { pm.expect(cuerpo.data.token).to.be.a('string'); pm.expect(cuerpo.data.permisos).to.include('roles.ver'); });",
      ],
    },
    {
      nombre: 'POST /auth/login — 401 contraseña errada',
      metodo: 'POST',
      ruta: '/auth/login',
      body: { tipoDocumento: 'CC', numeroDocumento: '1000000001', contrasena: 'incorrecta' },
      status: 401,
      code: 'CREDENCIALES_INVALIDAS',
    },
    {
      nombre: 'POST /auth/login — 401 usuario inactivo',
      metodo: 'POST',
      ruta: '/auth/login',
      body: { tipoDocumento: 'CC', numeroDocumento: '1000000009', contrasena: 'Cliente2026*' },
      status: 401,
      code: 'CREDENCIALES_INVALIDAS',
    },
    {
      nombre: 'POST /auth/login — 422 sin documento',
      metodo: 'POST',
      ruta: '/auth/login',
      body: { tipoDocumento: 'CC', contrasena: 'Admin2026*' },
      status: 422,
      code: 'VALIDACION',
    },
    {
      nombre: 'POST /auth/login — 400 JSON mal formado',
      metodo: 'POST',
      ruta: '/auth/login',
      body: '{"tipoDocumento":',
      status: 400,
      code: 'JSON_INVALIDO',
    },
  ],
};
