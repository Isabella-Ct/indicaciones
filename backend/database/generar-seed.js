/**
 * npm run db:seed:generar — genera database/seed.sql (spec 001, data-model.md § Datos semilla).
 * Las contraseñas de prueba se hashean con bcrypt (costo 10). El archivo resultante se versiona
 * para que `npm run db:reset` cargue siempre los mismos datos.
 */
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcrypt');

const DESTINO = path.join(__dirname, 'seed.sql');

// Catálogo de permisos (data-model.md § Catálogo de permisos). O = Operador, C = Cliente.
const CATALOGO = [
  ['roles', 'Roles y permisos', { ver: '', crear: '', editar: '', cambiar_estado: '' }],
  ['usuarios', 'Usuarios', { ver: 'O', crear: 'O', editar: '', cambiar_estado: '' }],
  ['perfil', 'Mi perfil y mis datos', { ver: 'OC', editar: 'OC' }],
  ['parqueaderos', 'Parqueaderos y puertas', { ver: 'O', crear: '', editar: '', cambiar_estado: '' }],
  ['celdas', 'Celdas', { ver: 'OC', crear: '', editar: '', cambiar_estado: '' }],
  ['vehiculos', 'Vehículos', { ver: 'O', crear: 'O', editar: '' }],
  ['restricciones', 'Pico y placa', { ver: 'OC', crear: '', editar: '', cambiar_estado: '' }],
  ['movimientos', 'Entradas, salidas y tickets', { ver: 'O', crear: 'O', anular: 'O' }],
  ['tarifas', 'Tarifas', { ver: 'OC', crear: '', editar: '', cambiar_estado: '' }],
  ['facturas', 'Liquidaciones, pagos y facturas', { ver: 'O', crear: 'O', anular: '', exportar: '' }],
  ['caja', 'Cuadre y cierre de caja', { ver: 'O', crear: 'O' }],
  ['planes', 'Planes de membresía', { ver: 'OC', crear: '', editar: '', cambiar_estado: '' }],
  ['membresias', 'Membresías', { ver: 'O', crear: 'OC', editar: 'O' }],
  ['descuentos', 'Descuentos y promociones', { ver: 'O', crear: '', editar: '', cambiar_estado: '' }],
  ['reservas', 'Reservas', { ver: 'O', crear: 'OC', editar: 'OC' }],
  ['incidencias', 'Incidencias', { ver: 'O', crear: 'O', editar: '' }],
  ['lecturas', 'Lecturas de placa', { ver: 'O' }],
  ['alertas', 'Alertas de operación', { ver: '', editar: '' }],
  ['notificaciones', 'Notificaciones', { ver: 'OC', editar: 'OC' }],
  ['reportes', 'Reportes', { ver: '', exportar: '' }],
  ['indicadores', 'Tablero de indicadores', { ver: '' }],
];

const VERBOS = {
  ver: 'Consultar',
  crear: 'Registrar',
  editar: 'Actualizar',
  cambiar_estado: 'Activar o inactivar',
  anular: 'Anular',
  exportar: 'Exportar',
};

const ROLES = [
  [1, 'Administrador', 'Acceso total: configuración, anulaciones y reportes', true, 'activo'],
  [2, 'Operador', 'Operación diaria de la caseta de acceso', true, 'activo'],
  [3, 'Cliente', 'Consultas propias, reservas y actualización de datos', true, 'activo'],
  [4, 'Supervisor de turno', 'Operación diaria con consulta de reportes', false, 'activo'],
  [5, 'Auditor', 'Consulta de reportes e indicadores', false, 'inactivo'],
];

// [id, tipo doc, documento, nombre, correo, celular, rol, contraseña, estado, debe cambiar]
const USUARIOS = [
  [1, 'CC', '1000000001', 'Laura Gómez Restrepo', 'admin@parqueaderoabc.co', '3001000001', 1, 'Admin2026*', 'activo', false],
  [2, 'CC', '1000000002', 'Juan Pérez Álvarez', 'operador@parqueaderoabc.co', '3001000002', 2, 'Operador2026*', 'activo', false],
  [3, 'CC', '1000000003', 'Sebastián Duque Mejía', 'supervisor@parqueaderoabc.co', '3001000003', 4, 'Operador2026*', 'activo', false],
  [4, 'CC', '1000000004', 'Andrea Salcedo Ríos', 'andrea.salcedo@correo.co', '3101000004', 3, 'Cliente2026*', 'activo', false],
  [5, 'CE', '1000000005', 'Carlos Medina Toro', 'carlos.medina@correo.co', '3101000005', 3, 'Cliente2026*', 'activo', false],
  [6, 'CC', '1000000006', 'Valentina Ospina Gil', 'valentina.ospina@correo.co', '3101000006', 3, 'Cliente2026*', 'activo', true],
  [7, 'CC', '1000000009', 'Mateo Cardona Ruiz', 'mateo.cardona@correo.co', '3101000009', 3, 'Cliente2026*', 'inactivo', false],
];

// Supervisor de turno: lo del Operador + reportes.ver (HU-04 E1 usa este rol).
const EXTRA_SUPERVISOR = ['reportes.ver'];
const AUDITOR = ['reportes.ver', 'reportes.exportar', 'indicadores.ver'];

const CONSECUTIVOS = [
  ['ticket', 'T-'],
  ['factura', 'FV-'],
  ['incidencia', 'INC-'],
  ['reserva', 'R-'],
];

const q = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
};

function construirPermisos() {
  const permisos = [];
  for (const [modulo, nombre, acciones] of CATALOGO) {
    for (const [accion, roles] of Object.entries(acciones)) {
      permisos.push({
        id: permisos.length + 1,
        modulo,
        accion,
        codigo: `${modulo}.${accion}`,
        descripcion: `${VERBOS[accion]} · ${nombre}`,
        operador: roles.includes('O'),
        cliente: roles.includes('C'),
      });
    }
  }
  return permisos;
}

async function generarSeed() {
  const permisos = construirPermisos();
  const lineas = [
    '-- =====================================================================',
    '-- Datos semilla v2.0.0 · GENERADO por database/generar-seed.js (no editar a mano)',
    '-- Spec 001-roles-permisos · data-model.md § Datos semilla',
    '-- =====================================================================',
    'USE parqueaderodb;',
    "SET time_zone = '-05:00';",
    '',
    '-- Roles (RF-ROL-01: tres roles base; dos de ejemplo para HU-03/HU-05)',
    'INSERT INTO rol (id_rol, nombre, descripcion, es_base, estado) VALUES',
    ROLES.map((r) => `  (${r.map(q).join(', ')})`).join(',\n') + ';',
    '',
    `-- Catálogo de permisos (RF-ROL-15): ${permisos.length} permisos`,
    'INSERT INTO permiso (id_permiso, modulo, accion, codigo, descripcion) VALUES',
    permisos
      .map((p) => `  (${[p.id, p.modulo, p.accion, p.codigo, p.descripcion].map(q).join(', ')})`)
      .join(',\n') + ';',
    '',
  ];

  const asignar = (idRol, ids) =>
    ids.length
      ? `INSERT INTO rol_permiso (id_rol, id_permiso) VALUES\n${ids.map((id) => `  (${idRol}, ${id})`).join(',\n')};`
      : '';
  const idsDe = (filtro) => permisos.filter(filtro).map((p) => p.id);
  const operador = idsDe((p) => p.operador);

  lineas.push('-- RF-ROL-02: Administrador = todos; Operador = operación diaria; Cliente = consultas propias');
  lineas.push(asignar(1, idsDe(() => true)));
  lineas.push(asignar(2, operador));
  lineas.push(asignar(3, idsDe((p) => p.cliente)));
  lineas.push(asignar(4, [...operador, ...idsDe((p) => EXTRA_SUPERVISOR.includes(p.codigo))]));
  lineas.push(asignar(5, idsDe((p) => AUDITOR.includes(p.codigo))));
  lineas.push('');

  lineas.push('-- Usuarios de prueba (contraseñas en README; bcrypt costo 10)');
  lineas.push(
    'INSERT INTO usuario (id_usuario, tipo_documento, numero_documento, nombre_completo, correo, celular, id_rol, contrasena_hash, debe_cambiar_contrasena, estado, acepta_tratamiento_datos, fecha_autorizacion) VALUES'
  );
  const filas = [];
  for (const u of USUARIOS) {
    const [id, td, doc, nombre, correo, cel, rol, clave, estado, cambiar] = u;
    const hash = await bcrypt.hash(clave, 10);
    filas.push(
      `  (${[id, td, doc, nombre, correo, cel, rol, hash, cambiar, estado, true].map(q).join(', ')}, NOW())`
    );
  }
  lineas.push(filas.join(',\n') + ';');
  lineas.push('');

  lineas.push('-- Consecutivos sin huecos (RN-22)');
  lineas.push('INSERT INTO consecutivo (clave, prefijo, siguiente, longitud) VALUES');
  lineas.push(CONSECUTIVOS.map(([c, p]) => `  (${q(c)}, ${q(p)}, 1, 6)`).join(',\n') + ';');
  lineas.push('');

  fs.writeFileSync(DESTINO, lineas.filter((l) => l !== null).join('\n'));
  return { permisos: permisos.length, usuarios: USUARIOS.length, roles: ROLES.length };
}

if (require.main === module) {
  generarSeed()
    .then((r) => console.log('seed.sql generado:', r))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { generarSeed, construirPermisos, CATALOGO };
