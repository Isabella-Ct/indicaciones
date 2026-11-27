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


// Infraestructura (spec 004, research R-11): una sede activa y una zona anexa inactiva.
const PARQUEADEROS = [
  [1, 'Parqueadero ABC', 'Carrera 43 # 47-53, Medellín', 2, '24 horas', 'activo'],
  [2, 'Parqueadero ABC · Zona anexa', 'Carrera 43 # 47-61, Medellín', 1, '6:00 a. m. – 10:00 p. m.', 'inactivo'],
];
// Vehículos (spec 005, research R-11): [id, placa, tipo, color, marca, modelo, id_propietario]
const VEHICULOS = [
  [1, 'ABC123', 'carro', 'Rojo', 'Chevrolet', 2018, 4],
  [2, 'QWE45A', 'moto', 'Negro', 'Yamaha', 2021, 4],
  [3, 'FGH678', 'carro', 'Blanco', 'Renault', 2020, 5],
  [4, 'JKL482', 'carro', 'Gris', 'Mazda', 2022, 6],
  [5, 'MNP908', 'carro', 'Azul', 'Kia', 2019, null],
  [6, 'RTY12', 'moto', 'Rojo', 'Honda', 2017, 7],
];
const INICIO_SEMILLA = '2026-01-15 08:00:00';

// Pico y placa de ejemplo de Medellín (spec 006, research R-08; TBD-03): lunes a viernes 05:00–20:00,
// carros por el último dígito y motos por el primero. [dia_semana, digitos]
const PICO_PLACA = [
  [1, '6,9'],
  [2, '5,7'],
  [3, '1,8'],
  [4, '0,2'],
  [5, '3,4'],
];

// Tarifas (spec 008, research R-08): [nombre, tipo_vehiculo, tipo_cliente, primera hora, minutos fracción,
// valor fracción, tope diario, gracia, vigente desde, vigente hasta, estado]
const TARIFAS = [
  ['Carro ocasional', 'carro', 'ocasional', 4000, 15, 1000, 30000, 10, '2026-01-01 00:00:00', null, 'activo'],
  ['Carro registrado', 'carro', 'registrado', 3500, 15, 900, 27000, 10, '2026-01-01 00:00:00', null, 'activo'],
  ['Moto ocasional', 'moto', 'ocasional', 2000, 15, 500, 12000, 10, '2026-01-01 00:00:00', null, 'activo'],
  ['Moto registrado', 'moto', 'registrado', 1800, 15, 450, 10000, 10, '2026-01-01 00:00:00', null, 'activo'],
  ['Carro ocasional 2025', 'carro', 'ocasional', 3500, 15, 900, 26000, 10, '2025-01-01 00:00:00', '2026-01-01 00:00:00', 'inactivo'],
];

// [id_parqueadero, nombre, tipo, estado]
const PUERTAS = [
  [1, 'Carrera 43', 'mixta', 'activo'],
  [1, 'Calle 47', 'entrada', 'activo'],
  [1, 'Calle 48', 'salida', 'activo'],
  [2, 'Portón anexo', 'mixta', 'activo'],
];

function construirCeldas() {
  const celdas = [];
  const agregar = (idParqueadero, prefijo, cantidad, tipo, piso, area, estado = 'disponible', motivo = null) => {
    for (let n = 1; n <= cantidad; n++) {
      celdas.push([idParqueadero, `${prefijo}${String(n).padStart(2, '0')}`, tipo, piso, area, estado, motivo]);
    }
  };
  agregar(1, 'A-', 11, 'carro', 1, 'A');
  celdas.push([1, 'A-12', 'carro', 1, 'A', 'inhabilitada', 'Mantenimiento de la demarcación']);
  agregar(1, 'M-', 12, 'moto', 1, 'M');
  agregar(1, 'B-', 12, 'carro', 2, 'B');
  agregar(2, 'Z-', 4, 'carro', 1, 'Z', 'inhabilitada', 'Parqueadero inactivo');
  return celdas;
}

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

  const celdas = construirCeldas();
  lineas.push('-- Parqueaderos, puertas y celdas (spec 004, RF-CLD-01, RF-CLD-07, RF-CLD-09)');
  lineas.push('INSERT INTO parqueadero (id_parqueadero, nombre, direccion, pisos, horario, estado) VALUES');
  const valores = (filas) => filas.map((f) => `  (${f.map(q).join(', ')})`).join(',\n') + ';';
  lineas.push(valores(PARQUEADEROS));
  lineas.push('INSERT INTO puerta_acceso (id_parqueadero, nombre, tipo, estado) VALUES');
  lineas.push(valores(PUERTAS));
  lineas.push('INSERT INTO celda (id_parqueadero, codigo, tipo_vehiculo, piso, area, estado, motivo_inhabilitacion) VALUES');
  lineas.push(valores(celdas));
  lineas.push('');

  lineas.push('-- Vehículos y su periodo de propiedad abierto (spec 005, RF-VEH-01, RF-VEH-04, RF-VEH-08)');
  lineas.push('INSERT INTO vehiculo (id_vehiculo, placa, tipo, color, marca, modelo, id_propietario) VALUES');
  lineas.push(valores(VEHICULOS));
  lineas.push('INSERT INTO historial_propietario (id_vehiculo, id_usuario, fecha_desde) VALUES');
  lineas.push(valores(VEHICULOS.filter((v) => v[6] !== null).map((v) => [v[0], v[6], INICIO_SEMILLA])));
  lineas.push('');

  lineas.push('-- Pico y placa (spec 006, RF-PYP-01; calendario de ejemplo, TBD-03)');
  lineas.push('INSERT INTO restriccion_placa (dia_semana, tipo_vehiculo, digitos, posicion_digito, hora_inicio, hora_fin, vigente_desde) VALUES');
  lineas.push(
    valores(
      PICO_PLACA.flatMap(([dia, digitos]) => [
        [dia, 'carro', digitos, 'ultimo', '05:00:00', '20:00:00', '2026-01-01'],
        [dia, 'moto', digitos, 'primero', '05:00:00', '20:00:00', '2026-01-01'],
      ])
    )
  );
  lineas.push('');

  lineas.push('-- Tarifas (spec 008, RF-TAR-01): las 4 combinaciones vigentes y una inactiva de historial');
  lineas.push(
    'INSERT INTO tarifa (nombre, tipo_vehiculo, tipo_cliente, valor_primera_hora, minutos_fraccion, valor_fraccion, tope_diario, minutos_gracia, vigente_desde, vigente_hasta, estado) VALUES'
  );
  lineas.push(valores(TARIFAS));
  lineas.push('');

  lineas.push('-- Consecutivos sin huecos (RN-22)');
  lineas.push('INSERT INTO consecutivo (clave, prefijo, siguiente, longitud) VALUES');
  lineas.push(CONSECUTIVOS.map(([c, p]) => `  (${q(c)}, ${q(p)}, 1, 6)`).join(',\n') + ';');
  lineas.push('');

  fs.writeFileSync(DESTINO, lineas.filter((l) => l !== null).join('\n'));
  return { permisos: permisos.length, usuarios: USUARIOS.length, roles: ROLES.length, parqueaderos: PARQUEADEROS.length, puertas: PUERTAS.length, celdas: construirCeldas().length, vehiculos: VEHICULOS.length, restricciones: PICO_PLACA.length * 2, tarifas: TARIFAS.length };
}

if (require.main === module) {
  generarSeed()
    .then((r) => console.log('seed.sql generado:', r))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { generarSeed, construirPermisos, CATALOGO, VEHICULOS };
