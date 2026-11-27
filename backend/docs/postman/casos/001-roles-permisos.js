// Carpeta «001 Roles y permisos» (quickstart.md § Colección Postman). Ids de la semilla:
// roles 1 Administrador, 2 Operador, 3 Cliente, 4 Supervisor de turno (1 usuario activo),
// 5 Auditor (inactivo); permisos 1..63 en el orden del catálogo (roles.ver = 1, roles.editar = 3).
const TODOS_MENOS_ROLES_EDITAR = Array.from({ length: 63 }, (_, i) => i + 1).filter((id) => id !== 3);

module.exports = {
  nombre: '001 Roles y permisos',
  descripcion: 'SRS B.1 §4.1 — HU-01..HU-06. Ejecutar con la BD recién sembrada.',
  casos: [
    // GET /roles
    {
      nombre: 'HU-01 GET /roles — 200 roles base con meta',
      metodo: 'GET',
      ruta: '/roles?page=1&limit=10',
      token: 'tokenAdmin',
      status: 200,
      pruebas: [
        "pm.test('meta de paginación', () => pm.expect(cuerpo.meta).to.include({ page: 1, limit: 10 }));",
        "pm.test('tres roles base', () => pm.expect(cuerpo.data.filter((r) => r.esBase).length).to.eql(3));",
      ],
    },
    {
      nombre: 'HU-03 GET /roles?q=oper — 200 búsqueda',
      metodo: 'GET',
      ruta: '/roles?q=oper',
      token: 'tokenAdmin',
      status: 200,
      pruebas: [
        "pm.test('solo nombres con «oper»', () => cuerpo.data.forEach((r) => pm.expect(r.nombre.toLowerCase()).to.include('oper')));",
      ],
    },
    { nombre: 'GET /roles — 401 sin token', metodo: 'GET', ruta: '/roles', status: 401, code: 'NO_AUTENTICADO' },
    {
      nombre: 'GET /roles — 403 operador',
      metodo: 'GET',
      ruta: '/roles',
      token: 'tokenOperador',
      status: 403,
      code: 'SIN_PERMISO',
    },
    {
      nombre: 'GET /roles?limit=500 — 422',
      metodo: 'GET',
      ruta: '/roles?limit=500',
      token: 'tokenAdmin',
      status: 422,
      code: 'VALIDACION',
    },

    // POST /roles
    {
      nombre: 'HU-02 POST /roles — 201 rol creado',
      metodo: 'POST',
      ruta: '/roles',
      token: 'tokenAdmin',
      body: { nombre: 'Postman {{$timestamp}}', descripcion: 'Rol de la colección de pruebas', permisos: [1, 19] },
      status: 201,
      pruebas: [
        "pm.test('activo y no base', () => pm.expect(cuerpo.data).to.include({ estado: 'activo', esBase: false }));",
      ],
      guardar: { idRol: 'cuerpo.data.idRol', rolNombre: 'cuerpo.data.nombre' },
    },
    {
      nombre: 'HU-02 POST /roles — 409 nombre duplicado',
      metodo: 'POST',
      ruta: '/roles',
      token: 'tokenAdmin',
      body: { nombre: '{{rolNombre}}', permisos: [1] },
      status: 409,
      code: 'ROL_DUPLICADO',
    },
    {
      nombre: 'HU-02 POST /roles — 422 sin permisos',
      metodo: 'POST',
      ruta: '/roles',
      token: 'tokenAdmin',
      body: { nombre: 'Sin permisos', permisos: [] },
      status: 422,
      code: 'VALIDACION',
      pruebas: ["pm.test('campo permisos', () => pm.expect(cuerpo.error.details[0].campo).to.eql('permisos'));"],
    },

    // GET /roles/:id
    {
      nombre: 'HU-03 GET /roles/:id — 200 detalle agrupado',
      metodo: 'GET',
      ruta: '/roles/4',
      token: 'tokenAdmin',
      status: 200,
      pruebas: [
        "pm.test('permisos agrupados y usuarios', () => { pm.expect(cuerpo.data.permisos[0]).to.have.keys('modulo', 'permisos'); pm.expect(cuerpo.data.usuarios).to.be.an('array'); });",
      ],
    },
    {
      nombre: 'HU-03 GET /roles/9999 — 404',
      metodo: 'GET',
      ruta: '/roles/9999',
      token: 'tokenAdmin',
      status: 404,
      code: 'ROL_NO_ENCONTRADO',
    },

    // PUT /roles/:id
    {
      nombre: 'HU-04 PUT /roles/:id — 200 actualizado',
      metodo: 'PUT',
      ruta: '/roles/{{idRol}}',
      token: 'tokenAdmin',
      body: { nombre: '{{rolNombre}}', descripcion: 'Con reportes', permisos: [1, 19, 61] },
      status: 200,
      pruebas: ["pm.test('descripción nueva', () => pm.expect(cuerpo.data.descripcion).to.eql('Con reportes'));"],
    },
    {
      nombre: 'HU-04 PUT /roles/2 — 409 renombrar rol base',
      metodo: 'PUT',
      ruta: '/roles/2',
      token: 'tokenAdmin',
      body: { nombre: 'Operario', permisos: [5] },
      status: 409,
      code: 'ROL_BASE_INMUTABLE',
    },
    {
      nombre: 'HU-04 PUT /roles/1 — 409 Administrador sin roles.editar',
      metodo: 'PUT',
      ruta: '/roles/1',
      token: 'tokenAdmin',
      body: { nombre: 'Administrador', permisos: TODOS_MENOS_ROLES_EDITAR },
      status: 409,
      code: 'PERMISOS_ADMIN_PROTEGIDOS',
    },
    {
      nombre: 'HU-04 PUT /roles/:id — 422 sin permisos',
      metodo: 'PUT',
      ruta: '/roles/{{idRol}}',
      token: 'tokenAdmin',
      body: { nombre: '{{rolNombre}}', permisos: [] },
      status: 422,
      code: 'VALIDACION',
    },

    // PATCH /roles/:id/estado
    {
      nombre: 'HU-05 PATCH /roles/:id/estado — 200 inactivar',
      metodo: 'PATCH',
      ruta: '/roles/{{idRol}}/estado',
      token: 'tokenAdmin',
      body: { estado: 'inactivo' },
      status: 200,
      pruebas: ["pm.test('inactivo', () => pm.expect(cuerpo.data.estado).to.eql('inactivo'));"],
    },
    {
      nombre: 'HU-05 PATCH /roles/:id/estado — 200 activar',
      metodo: 'PATCH',
      ruta: '/roles/{{idRol}}/estado',
      token: 'tokenAdmin',
      body: { estado: 'activo' },
      status: 200,
    },
    {
      nombre: 'HU-05 PATCH /roles/4/estado — 409 con usuarios activos',
      metodo: 'PATCH',
      ruta: '/roles/4/estado',
      token: 'tokenAdmin',
      body: { estado: 'inactivo' },
      status: 409,
      code: 'ROL_CON_USUARIOS_ACTIVOS',
    },
    {
      nombre: 'HU-01 PATCH /roles/3/estado — 409 rol base',
      metodo: 'PATCH',
      ruta: '/roles/3/estado',
      token: 'tokenAdmin',
      body: { estado: 'inactivo' },
      status: 409,
      code: 'ROL_BASE_INMUTABLE',
    },
    {
      nombre: 'HU-05 PATCH /roles/:id/estado — 422 estado inválido',
      metodo: 'PATCH',
      ruta: '/roles/{{idRol}}/estado',
      token: 'tokenAdmin',
      body: { estado: 'borrado' },
      status: 422,
      code: 'VALIDACION',
    },

    // GET /permisos
    {
      nombre: 'HU-06 GET /permisos — 200 catálogo agrupado',
      metodo: 'GET',
      ruta: '/permisos',
      token: 'tokenAdmin',
      status: 200,
      pruebas: ["pm.test('21 módulos', () => pm.expect(cuerpo.data.length).to.eql(21));"],
    },
    {
      nombre: 'HU-06 GET /permisos — 403 cliente',
      metodo: 'GET',
      ruta: '/permisos',
      token: 'tokenCliente',
      status: 403,
      code: 'SIN_PERMISO',
    },
  ],
};
