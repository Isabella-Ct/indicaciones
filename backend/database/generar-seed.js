/**
 * Genera backend/database/seed.sql (datos iniciales y de prueba).
 *
 *   npm run db:seed:generar
 *
 * - Calcula los hashes bcrypt de las contraseñas de prueba (ver README).
 * - Las fechas se escriben relativas a CURDATE()/NOW() para que el historial
 *   siempre corresponda a "los últimos 60 días", sin importar cuándo se cargue.
 * - El historial se genera con un pseudoaleatorio con semilla fija. Usa el día de la
 *   semana real (fines de semana más tranquilos, pico y placa de lunes a viernes) y la
 *   hora actual (estadías de hoy ya terminadas): por eso `npm run db:reset` vuelve a
 *   generar este archivo antes de cargarlo.
 */
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcrypt');
const { calcularCobro } = require('../src/modules/tarifas/tarifas.calculo');
const {
  digitoDeRestriccion,
  describirRegla,
} = require('../src/modules/pico-placa/pico-placa.evaluador');
const { enBogota } = require('../src/utils/fechas');

const SALIDA = path.join(__dirname, 'seed.sql');
const COSTO_BCRYPT = 10;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function crearAleatorio(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const azar = crearAleatorio(2026);
const entero = (min, max) => min + Math.floor(azar() * (max - min + 1));
const elegir = (lista) => lista[Math.floor(azar() * lista.length)];

/** Expresión SQL cruda (no se escapa). */
const sql = (texto) => ({ sql: texto });

function valor(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'object' && 'sql' in v) return v.sql;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

function insertar(tabla, filas) {
  if (filas.length === 0) return '';
  const columnas = Object.keys(filas[0]);
  const valores = filas
    .map((f) => `  (${columnas.map((c) => valor(f[c])).join(', ')})`)
    .join(',\n');
  return `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES\n${valores};\n`;
}

const pad = (n, largo = 2) => String(n).padStart(largo, '0');
const hhmm = (minutos) => `${pad(Math.floor(minutos / 60))}:${pad(minutos % 60)}:00`;
/** Fecha-hora relativa: `dias` atrás de hoy, a los `minutos` del día. */
const fechaHora = (dias, minutos) =>
  sql(`TIMESTAMP(CURDATE() - INTERVAL ${dias} DAY, '${hhmm(minutos)}')`);
const haceMinutos = (min) => sql(`NOW() - INTERVAL ${min} MINUTE`);
/** Minutos absolutos desde hoy a las 00:00 (negativos = días anteriores). */
const fechaAbs = (t) => sql(`TIMESTAMP(CURDATE()) + INTERVAL ${t} MINUTE`);
const DIAS_HISTORIAL = 60;

// ---------------------------------------------------------------------------
// Roles y permisos (CLAUDE.md §6)
// ---------------------------------------------------------------------------
const ROLES = [
  { id: 1, nombre: 'administrador', descripcion: 'Acceso total a la operación y configuración' },
  {
    id: 2,
    nombre: 'operador',
    descripcion: 'Operación diaria: entradas, salidas, cobros y celdas',
  },
  { id: 3, nombre: 'usuario', descripcion: 'Cliente: consulta sus vehículos, facturas y reservas' },
];

// [codigo, modulo, descripcion, roles que lo tienen]
const PERMISOS = [
  ['usuarios.ver', 'usuarios', 'Consultar el listado completo de usuarios', 'A'],
  ['usuarios.crear', 'usuarios', 'Crear usuarios (REQ-USR-2)', 'AO'],
  ['usuarios.crear_administrador', 'usuarios', 'Crear usuarios con rol administrador', 'A'],
  ['usuarios.editar', 'usuarios', 'Editar cualquier usuario (REQ-USR-5)', 'A'],
  ['usuarios.cambiar_estado', 'usuarios', 'Activar o inactivar usuarios (REQ-USR-3)', 'A'],
  ['perfil.editar', 'usuarios', 'Editar mis datos personales (REQ-USR-4)', 'AOU'],
  ['vehiculos.ver', 'vehiculos', 'Consultar vehículos', 'AO'],
  [
    'vehiculos.crear',
    'vehiculos',
    'Crear vehículo y asignarlo a un usuario (REQ-CAR-1, REQ-USR-6)',
    'AO',
  ],
  ['vehiculos.editar', 'vehiculos', 'Editar vehículos (REQ-CAR-2)', 'A'],
  ['vehiculos.reasignar', 'vehiculos', 'Reasignar vehículo a otro usuario (REQ-CAR-3)', 'A'],
  ['pico_placa.ver', 'pico_placa', 'Consultar reglas de pico y placa', 'AO'],
  ['pico_placa.gestionar', 'pico_placa', 'Configurar pico y placa (REQ-CAR-4)', 'AO'],
  ['movimientos.ver', 'movimientos', 'Consultar entradas y salidas', 'AO'],
  ['movimientos.registrar', 'movimientos', 'Registrar entrada y salida (REQ-INEX-1/2)', 'AO'],
  ['facturas.ver', 'facturas', 'Consultar facturas', 'AO'],
  ['facturas.cobrar', 'facturas', 'Registrar pagos (REQ-FAC-1)', 'AO'],
  ['celdas.ver', 'celdas', 'Ver el mapa de celdas (REQ-CLD-01/02)', 'AOU'],
  ['celdas.cambiar_estado', 'celdas', 'Cambiar el estado de una celda (REQ-CLD-03)', 'AO'],
  ['celdas.gestionar', 'celdas', 'Crear, editar e inactivar celdas', 'A'],
  ['incidencias.ver', 'incidencias', 'Consultar incidencias', 'AO'],
  ['incidencias.registrar', 'incidencias', 'Registrar incidencias (REQ-INCD-1)', 'AO'],
  ['tarifas.ver', 'tarifas', 'Consultar tarifas', 'AO'],
  ['tarifas.gestionar', 'tarifas', 'Configurar tarifas (REQ-TAR-1)', 'A'],
  ['descuentos.ver', 'descuentos', 'Consultar descuentos', 'AO'],
  ['descuentos.gestionar', 'descuentos', 'Gestionar descuentos (REQ-DES-1)', 'A'],
  ['membresias.ver', 'membresias', 'Consultar membresías', 'AO'],
  ['membresias.gestionar', 'membresias', 'Gestionar membresías (REQ-MEM-1)', 'A'],
  ['reservas.ver', 'reservas', 'Consultar todas las reservas', 'AO'],
  ['reservas.crear', 'reservas', 'Reservar una celda (REQ-RES-1)', 'AOU'],
  ['reservas.gestionar', 'reservas', 'Gestionar reservas de cualquier cliente', 'A'],
  ['reportes.ver', 'reportes', 'Ver reportes (REQ-REP-*)', 'A'],
  ['notificaciones.enviar', 'notificaciones', 'Enviar mensajes manuales (REQ-NOT-1)', 'A'],
  ['configuracion.gestionar', 'configuracion', 'Editar parámetros del sistema', 'A'],
  ['portal.ver', 'portal', 'Mis vehículos, mis facturas y mis reservas', 'U'],
  // Fase 1: el operador busca clientes (user-picker) sin ver el listado completo
  ['usuarios.buscar', 'usuarios', 'Buscar clientes por documento (asignar vehículos)', 'AO'],
  // Fase 2: CRUD de puertas
  ['puertas.gestionar', 'puertas', 'Crear, editar y desactivar puertas de acceso', 'A'],
  // Fase 5: CRUD de tipos de incidencia
  [
    'incidencias.gestionar_tipos',
    'incidencias',
    'Crear, editar y desactivar tipos de incidencia',
    'A',
  ],
];
const LETRA_ROL = { A: 1, O: 2, U: 3 };

// ---------------------------------------------------------------------------
// Usuarios de prueba (documentados en README.md)
// ---------------------------------------------------------------------------
const CONTRASENAS = { 1: 'Admin2026*', 2: 'Operador2026*', 3: 'Cliente2026*' };

const USUARIOS = [
  // id, rol, tipo, documento, nombres, apellidos, correo, celular, estado, debeCambiar
  [
    1,
    1,
    'CC',
    '1000000001',
    ['Laura', 'Marcela'],
    ['Gómez', 'Ríos'],
    'laura.gomez@parko.test',
    '3001000001',
    'activo',
    0,
  ],
  [
    2,
    2,
    'CC',
    '1000000002',
    ['Juan', null],
    ['Pérez', 'Arango'],
    'juan.perez@parko.test',
    '3001000002',
    'activo',
    0,
  ],
  [
    3,
    2,
    'CC',
    '1000000003',
    ['Sebastián', null],
    ['Duque', 'Mejía'],
    'sebastian.duque@parko.test',
    '3001000003',
    'activo',
    0,
  ],
  [
    4,
    3,
    'CC',
    '1000000004',
    ['Andrea', null],
    ['Salcedo', 'Vélez'],
    'andrea.salcedo@correo.test',
    '3101000004',
    'activo',
    0,
  ],
  [
    5,
    3,
    'CC',
    '1000000005',
    ['Paula', 'Andrea'],
    ['Giraldo', null],
    'paula.giraldo@correo.test',
    '3101000005',
    'activo',
    0,
  ],
  [
    6,
    3,
    'CC',
    '1000000006',
    ['Hernán', null],
    ['Quintero', 'Zapata'],
    'hernan.quintero@correo.test',
    '3101000006',
    'activo',
    0,
  ],
  [
    7,
    3,
    'CE',
    '1000000007',
    ['Lucía', null],
    ['Ortega', null],
    'lucia.ortega@correo.test',
    '3101000007',
    'activo',
    0,
  ],
  [
    8,
    3,
    'CC',
    '1000000008',
    ['Camilo', 'José'],
    ['Restrepo', 'Ochoa'],
    'camilo.restrepo@correo.test',
    '3101000008',
    'activo',
    1,
  ],
  [
    9,
    3,
    'CC',
    '1000000009',
    ['Felipe', null],
    ['Mora', 'Cano'],
    'felipe.mora@correo.test',
    '3101000009',
    'inactivo',
    0,
  ],
];

// ---------------------------------------------------------------------------
// Sede, pisos, puertas y celdas (misma distribución de la maqueta PARKO)
// ---------------------------------------------------------------------------
const PISOS = [
  {
    id: 1,
    parqueadero_id: 1,
    nombre: 'Sótano 1',
    orden: 1,
    texto_carril: 'ENTRADA → | → CIRCULACIÓN → | → RAMPA S2',
  },
  {
    id: 2,
    parqueadero_id: 1,
    nombre: 'Sótano 2',
    orden: 2,
    texto_carril: '← RAMPA S1 | ← CIRCULACIÓN ← | SALIDA ←',
  },
];

function filaDeCeldas(area, cantidad, piso, fila, tipo) {
  return Array.from({ length: cantidad }, (_, i) => ({
    codigo: `${area}-${pad(i + 1)}`,
    area,
    piso_id: piso,
    fila_mapa: fila,
    posicion: i + 1,
    tipo,
  }));
}
const CELDAS = [
  ...filaDeCeldas('A', 12, 1, 'superior', 'carro'),
  ...filaDeCeldas('B', 12, 1, 'inferior', 'carro'),
  ...filaDeCeldas('C', 8, 2, 'superior', 'carro'),
  ...filaDeCeldas('M', 12, 2, 'inferior', 'moto'),
].map((c, i) => ({
  id: i + 1,
  parqueadero_id: 1,
  ...c,
  es_accesible: c.codigo === 'A-01' || c.codigo === 'B-01' ? 1 : 0,
  estado: 'disponible',
  vehiculo_actual_id: null,
  nota: null,
}));
const celda = (codigo) => CELDAS.find((c) => c.codigo === codigo);

// ---------------------------------------------------------------------------
// Vehículos: 10 con propietario + 2 de visitantes (sin propietario)
// ---------------------------------------------------------------------------
const VEHICULOS = [
  [1, 'MNP908', 'carro', 'Gris', 'Mazda', 'CX-30', 4],
  [2, 'XKP45F', 'moto', 'Azul', 'Yamaha', 'NMAX', 4],
  [3, 'CVB275', 'carro', 'Rojo', 'Honda', 'HR-V', 5],
  [4, 'GMR58K', 'moto', 'Rojo', 'Honda', 'XRE 300', 5],
  [5, 'QWE731', 'carro', 'Negro', 'Toyota', 'Corolla', 6],
  [6, 'BQS19E', 'moto', 'Negro', 'AKT', 'NKD 125', 6],
  [7, 'BNM350', 'carro', 'Blanco', 'Hyundai', 'Tucson', 7],
  [8, 'RTV82G', 'moto', 'Rojo', 'Honda', 'CB 190', 7],
  [9, 'HJK740', 'carro', 'Gris', 'Kia', 'Sportage', 8],
  [10, 'OPQ119', 'carro', 'Rojo', 'Mazda', '2', 8],
  [11, 'JKL482', 'carro', 'Rojo', 'Chevrolet', 'Spark', null],
  [12, 'FJS27D', 'moto', 'Blanco', 'TVS', 'Apache', null],
].map(([id, placa, tipo, color, marca, modelo, usuario]) => ({
  id,
  placa,
  tipo,
  color,
  marca,
  modelo,
  usuario_id: usuario,
}));

// Visitantes generados (sin propietario) para que los reportes tengan volumen.
// Se evitan los prefijos que usan las pruebas (ABC, KLM, PRB, ZZZ…).
const MODELOS = {
  carro: [
    ['Chevrolet', 'Onix'],
    ['Renault', 'Logan'],
    ['Mazda', '3'],
    ['Kia', 'Picanto'],
    ['Toyota', 'Fortuner'],
    ['Nissan', 'Versa'],
    ['Renault', 'Duster'],
    ['Suzuki', 'Swift'],
    ['Volkswagen', 'Gol'],
    ['Ford', 'Escape'],
    ['Hyundai', 'Accent'],
    ['Kia', 'Rio'],
  ],
  moto: [
    ['Yamaha', 'FZ 2.0'],
    ['Bajaj', 'Pulsar NS 200'],
    ['AKT', 'NKD 125'],
    ['Honda', 'CB 125F'],
    ['Suzuki', 'Gixxer'],
    ['TVS', 'Raider'],
    ['Bajaj', 'Boxer CT'],
  ],
};
const COLORES = ['Blanco', 'Gris', 'Negro', 'Rojo', 'Azul', 'Plata', 'Verde'];
const VISITANTES = { carro: 80, moto: 30 };
{
  const azarPlacas = crearAleatorio(77);
  const letra = () => 'BCDFGHJLMNPRSTVWXY'[Math.floor(azarPlacas() * 18)];
  const digito = () => String(Math.floor(azarPlacas() * 10));
  const usadas = new Set(VEHICULOS.map((v) => v.placa));
  for (const tipo of ['carro', 'moto']) {
    for (let i = 0; i < VISITANTES[tipo]; i++) {
      let placa;
      do {
        const letras = letra() + letra() + letra();
        placa =
          tipo === 'carro'
            ? letras + digito() + digito() + digito()
            : letras + digito() + digito() + letra();
      } while (usadas.has(placa));
      usadas.add(placa);
      const [marca, modelo] = MODELOS[tipo][Math.floor(azarPlacas() * MODELOS[tipo].length)];
      VEHICULOS.push({
        id: VEHICULOS.length + 1,
        placa,
        tipo,
        color: COLORES[Math.floor(azarPlacas() * COLORES.length)],
        marca,
        modelo,
        usuario_id: null,
      });
    }
  }
}
const vehiculo = (placa) => VEHICULOS.find((v) => v.placa === placa);

// ---------------------------------------------------------------------------
// Tarifas, configuración, descuentos, tipos de incidencia, pico y placa
// ---------------------------------------------------------------------------
const TARIFAS = {
  carro: {
    id: 1,
    valor_fraccion: 120,
    minutos_fraccion: 1,
    minutos_gracia: 0,
    valor_dia_maximo: 28000,
  },
  moto: {
    id: 2,
    valor_fraccion: 60,
    minutos_fraccion: 1,
    minutos_gracia: 0,
    valor_dia_maximo: 12000,
  },
};

const CONFIGURACION = [
  [
    'reserva_minutos_expiracion',
    '30',
    'entero',
    'Minutos que dura una reserva si el vehículo no llega',
  ],
  [
    'membresia_dias_aviso_vencimiento',
    '3',
    'entero',
    'Días antes del vencimiento para notificar al cliente',
  ],
  ['membresia_valor_mensual_carro', '180000', 'decimal', 'Valor de la mensualidad de carro (COP)'],
  ['membresia_valor_anual_carro', '1900000', 'decimal', 'Valor de la anualidad de carro (COP)'],
  ['membresia_valor_mensual_moto', '70000', 'decimal', 'Valor de la mensualidad de moto (COP)'],
  ['membresia_valor_anual_moto', '750000', 'decimal', 'Valor de la anualidad de moto (COP)'],
  [
    'facturacion_redondeo',
    '100',
    'entero',
    'Múltiplo al que se redondea el total con descuento (COP)',
  ],
  [
    'ticket_mensaje_pie',
    'Conserve este ticket. Sin él, la salida requiere validar la placa.',
    'texto',
    'Texto al pie del ticket de ingreso',
  ],
];
const VALOR_MENSUAL_CARRO = 180000;

const DESCUENTOS = [
  [1, 'Cliente frecuente', 'Clientes con más de 10 visitas en el mes', 10],
  [2, 'Convenio comercio vecino', 'Compras en locales aliados de la Carrera 43', 20],
  [3, 'Adulto mayor', 'Conductores mayores de 62 años', 15],
];

const TIPOS_INCIDENCIA = [
  [1, 'Rayón', 'Rayones en la pintura o los vidrios'],
  [2, 'Choque', 'Colisión entre vehículos dentro del parqueadero'],
  [3, 'Atropellamiento', 'Un vehículo golpea a una persona'],
  [4, 'Golpe contra muro', 'Un vehículo golpea un muro, columna o estructura'],
];

// Semilla de ejemplo (el admin la edita): lunes a viernes, 05:00–20:00.
const DIGITOS_POR_DIA = { 1: [1, 7], 2: [0, 3], 3: [4, 6], 4: [5, 9], 5: [2, 8] };
const PICO_PLACA = [];
for (const tipo of ['carro', 'moto']) {
  for (const [dia, digitos] of Object.entries(DIGITOS_POR_DIA)) {
    for (const digito of digitos) {
      PICO_PLACA.push({
        id: PICO_PLACA.length + 1,
        tipo_vehiculo: tipo,
        dia_semana: Number(dia),
        digito,
        hora_inicio: '05:00:00',
        hora_fin: '20:00:00',
        activa: 1,
        creado_por: 1,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Membresías (2 con celda fija, como A-04 y B-09 en la maqueta, + 1 sin celda)
// inicio/fin: desplazamiento en días respecto a hoy.
// ---------------------------------------------------------------------------
const MEMBRESIAS = [
  {
    id: 1,
    usuario_id: 4,
    placa: 'MNP908',
    celda: 'A-04',
    inicio: sql('CURDATE() - INTERVAL 20 DAY'),
    fin: sql('CURDATE() - INTERVAL 20 DAY + INTERVAL 1 MONTH'),
    diaInicio: 20,
  },
  // Vence en 2 días: sirve para probar el aviso de vencimiento (Fase 5).
  {
    id: 2,
    usuario_id: 5,
    placa: 'CVB275',
    celda: 'B-09',
    inicio: sql('CURDATE() + INTERVAL 2 DAY - INTERVAL 1 MONTH'),
    fin: sql('CURDATE() + INTERVAL 2 DAY'),
    diaInicio: 28,
  },
  {
    id: 3,
    usuario_id: 6,
    placa: 'QWE731',
    celda: null,
    inicio: sql('CURDATE() - INTERVAL 15 DAY'),
    fin: sql('CURDATE() - INTERVAL 15 DAY + INTERVAL 1 MONTH'),
    diaInicio: 15,
  },
];
const membresiaDe = (vehiculoId, diasAtras) =>
  MEMBRESIAS.find((m) => vehiculo(m.placa).id === vehiculoId && diasAtras <= m.diaInicio) || null;

// ---------------------------------------------------------------------------
// Estadías en curso (para que el mapa no arranque vacío)
// ---------------------------------------------------------------------------
const EN_CURSO = [
  {
    celda: 'A-03',
    placa: 'JKL482',
    minutos: 157,
    obs: 'Rayón leve en el bómper trasero',
    llaves: 0,
  },
  { celda: 'A-05', placa: 'QWE731', minutos: 230, obs: null, llaves: 0 },
  { celda: 'A-10', placa: 'BNM350', minutos: 95, obs: null, llaves: 1 },
  { celda: 'B-05', placa: 'HJK740', minutos: 300, obs: 'Deja portátil en el baúl', llaves: 0 },
  { celda: 'C-03', placa: 'OPQ119', minutos: 48, obs: null, llaves: 0 },
  { celda: 'M-01', placa: 'XKP45F', minutos: 180, obs: null, llaves: 0 },
  { celda: 'M-12', placa: 'FJS27D', minutos: 22, obs: 'Casco con el vigilante', llaves: 0 },
];

// ---------------------------------------------------------------------------
// Cálculo de cobro (misma regla de CLAUDE.md §7; el servicio real es de la Fase 4)
// ---------------------------------------------------------------------------
// El cobro usa calcularCobro de src/modules/tarifas (el mismo del servidor).

// ---------------------------------------------------------------------------
// Historial: 60 días de estadías finalizadas (más las de hoy que ya salieron)
// - Entre semana ~60 estadías/día, sábado ~45, domingo ~25 (después de pico y placa y cupo).
// - "Pendulares" (vehículos de quien trabaja cerca) entran 6:30–9:00 y salen 8–10.5 h después.
// - El resto llega en picos: 7–9 h, 11–14 h y 17–19 h (más algo repartido en el día).
// - Respeta pico y placa (L–V 05:00–20:00); parte de los rechazados queda en accesos_denegados.
// - La celda sugerida es casi siempre la primera libre (como el sistema): hay celdas más usadas.
// Tiempos en minutos absolutos desde hoy 00:00 (t < 0 = días anteriores).
// ---------------------------------------------------------------------------
const PENDULARES = new Set(
  [
    'MNP908',
    'CVB275',
    'QWE731',
    'BNM350',
    'HJK740',
    'OPQ119',
    'XKP45F',
    'GMR58K',
    'BQS19E',
    ...VEHICULOS.filter((v) => v.usuario_id === null && v.id > 12)
      .filter((_, i) => i % 6 === 0)
      .map((v) => v.placa),
  ].map((p) => vehiculo(p).id)
);
const BASE_POR_DIA = { 1: 80, 2: 82, 3: 82, 4: 85, 5: 90, 6: 55, 7: 32 };
const PROB_PENDULAR = { 1: 0.8, 2: 0.8, 3: 0.8, 4: 0.8, 5: 0.75, 6: 0.25, 7: 0.05 };

/** Llegada y duración (minutos) de una visita no pendular según la franja. */
function visitaAleatoria() {
  const r = azar();
  if (r < 0.32) return [entero(7 * 60, 9 * 60), entero(60, 300)];
  if (r < 0.57) return [entero(11 * 60, 14 * 60), entero(30, 180)];
  if (r < 0.87) return [entero(17 * 60, 19 * 60 + 30), entero(90, 330)];
  return [entero(6 * 60, 22 * 60), entero(20, 240)];
}

const reglaQueRestringe = (v, dow, minuto) => {
  const digito = digitoDeRestriccion(v.placa, v.tipo);
  return (
    PICO_PLACA.find(
      (r) =>
        r.activa &&
        r.tipo_vehiculo === v.tipo &&
        r.dia_semana === dow &&
        r.digito === digito &&
        minuto >= 5 * 60 &&
        minuto < 20 * 60
    ) ?? null
  );
};

function generarHistorial({ hoyDow, ahoraMin }) {
  const celdasFijas = new Map(
    MEMBRESIAS.filter((m) => m.celda).map((m) => [celda(m.celda).id, vehiculo(m.placa).id])
  );
  const ordenCelda = (c) => [c.piso_id, c.area, c.fila_mapa === 'superior' ? 0 : 1, c.posicion];
  const celdasOrdenadas = [...CELDAS].sort((a, b) => {
    const x = ordenCelda(a);
    const y = ordenCelda(b);
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
    return 0;
  });
  // Intervalos ocupados por vehículo y por celda (incluye las estadías en curso).
  const porVehiculo = new Map();
  const porCelda = new Map();
  const agregar = (mapa, id, intervalo) => mapa.set(id, [...(mapa.get(id) || []), intervalo]);
  const libre = (mapa, id, [a, b]) => !(mapa.get(id) || []).some(([i, f]) => a < f && b > i);
  for (const e of EN_CURSO) {
    const desde = ahoraMin - e.minutos;
    agregar(porVehiculo, vehiculo(e.placa).id, [desde - 30, Infinity]);
    agregar(porCelda, celda(e.celda).id, [desde - 5, Infinity]);
  }

  const pesos = VEHICULOS.map((v, i) => ({
    v,
    peso: v.usuario_id ? 1.2 : 1 / Math.pow(1 + ((i * 37) % 110), 0.75),
  }));
  const pesoTotal = pesos.reduce((s, p) => s + p.peso, 0);
  const vehiculoAlAzar = () => {
    let r = azar() * pesoTotal;
    for (const p of pesos) if ((r -= p.peso) <= 0) return p.v;
    return pesos[pesos.length - 1].v;
  };

  const historial = [];
  const denegados = [];
  for (let dias = DIAS_HISTORIAL; dias >= 0; dias--) {
    const dow = ((((hoyDow - 1 - dias) % 7) + 7) % 7) + 1;
    const candidatos = [];
    for (const id of PENDULARES) {
      if (azar() < PROB_PENDULAR[dow])
        candidatos.push({
          v: VEHICULOS[id - 1],
          entrada: entero(390, 540),
          duracion: entero(480, 630),
        });
    }
    const total = Math.round(BASE_POR_DIA[dow] * (0.85 + azar() * 0.3));
    while (candidatos.length < total) {
      const v = vehiculoAlAzar();
      if (PENDULARES.has(v.id) && dow <= 5) continue;
      const [entrada, duracion] = visitaAleatoria();
      candidatos.push({ v, entrada, duracion });
    }
    candidatos.sort((a, b) => a.entrada - b.entrada);

    for (const { v, entrada, duracion } of candidatos) {
      const t0 = -dias * 1440 + entrada;
      const t1 = t0 + duracion;
      if (dias === 0 && t1 > ahoraMin - 10) continue; // hoy: solo las que ya salieron
      if (!libre(porVehiculo, v.id, [t0 - 30, t1 + 30])) continue;
      const regla = dow <= 5 ? reglaQueRestringe(v, dow, entrada) : null;
      if (regla) {
        if (azar() < 0.12) denegados.push({ t: t0, v, regla, puerta: entero(1, 2) });
        continue;
      }
      const membresia = membresiaDe(v.id, dias);
      const fija = membresia && membresia.celda ? celda(membresia.celda) : null;
      const libres = celdasOrdenadas.filter(
        (c) =>
          c.tipo === v.tipo &&
          c.codigo !== 'A-09' &&
          (!celdasFijas.has(c.id) || celdasFijas.get(c.id) === v.id) &&
          libre(porCelda, c.id, [t0, t1])
      );
      const comunes = libres.filter((c) => !c.es_accesible && !celdasFijas.has(c.id));
      const opciones = comunes.length ? comunes : libres.filter((c) => !celdasFijas.has(c.id));
      const asignada =
        fija && libres.includes(fija)
          ? fija
          : azar() < 0.6
            ? opciones[0]
            : elegir(opciones.slice(0, Math.max(1, Math.ceil(opciones.length / 2))));
      if (!asignada) continue; // lleno
      agregar(porCelda, asignada.id, [t0, t1]);
      agregar(porVehiculo, v.id, [t0, t1]);
      historial.push({ dias, t0, t1, duracion, vehiculo: v, celda: asignada, membresia });
    }
  }
  historial.sort((a, b) => a.t0 - b.t0);
  denegados.sort((a, b) => a.t - b.t);
  return { historial, denegados };
}

// ---------------------------------------------------------------------------
// Construcción del archivo
// ---------------------------------------------------------------------------
async function main() {
  const hashes = {};
  for (const [rol, clave] of Object.entries(CONTRASENAS)) {
    hashes[rol] = await bcrypt.hash(clave, COSTO_BCRYPT);
  }

  const partes = [];
  partes.push(`-- =====================================================================
-- PARKO · Datos iniciales y de prueba
-- GENERADO por backend/database/generar-seed.js — no editar a mano.
-- Contraseñas de prueba: ver README.md. Fechas relativas a CURDATE()/NOW().
-- =====================================================================
SET NAMES utf8mb4;
SET time_zone = '-05:00';
USE parking_lot_abc;
`);

  // Roles y permisos
  partes.push('-- Roles y permisos (CLAUDE.md §6)');
  partes.push(insertar('roles', ROLES));
  partes.push(
    insertar(
      'permisos',
      PERMISOS.map(([codigo, modulo, descripcion], i) => ({
        id: i + 1,
        codigo,
        modulo,
        descripcion,
      }))
    )
  );
  const rp = [];
  PERMISOS.forEach(([, , , roles], i) => {
    for (const letra of roles) rp.push({ rol_id: LETRA_ROL[letra], permiso_id: i + 1 });
  });
  rp.sort((a, b) => a.rol_id - b.rol_id || a.permiso_id - b.permiso_id);
  partes.push(insertar('roles_permisos', rp));

  // Usuarios
  partes.push(
    '-- Usuarios de prueba (1 administrador, 2 operadores, 5 clientes activos + 1 inactivo)'
  );
  partes.push(
    insertar(
      'usuarios',
      USUARIOS.map(([id, rol, tipo, doc, [n1, n2], [a1, a2], correo, celular, estado, debe]) => ({
        id,
        tipo_documento: tipo,
        numero_documento: doc,
        primer_nombre: n1,
        segundo_nombre: n2,
        primer_apellido: a1,
        segundo_apellido: a2,
        correo,
        celular,
        contrasena_hash: hashes[rol],
        debe_cambiar_contrasena: debe,
        estado,
        rol_id: rol,
        creado_por: id === 1 ? null : 1,
      }))
    )
  );

  // Sede
  partes.push('-- Sede, pisos y puertas');
  partes.push(
    insertar('parqueaderos', [
      {
        id: 1,
        nombre: 'Parqueadero ABC',
        direccion: 'Carrera 43 # 47-53',
        ciudad: 'Medellín',
        telefono: '6045550143',
        horario: 'Abierto 24 horas',
      },
    ])
  );
  partes.push(insertar('pisos', PISOS));
  partes.push(
    insertar('puertas', [
      { id: 1, parqueadero_id: 1, nombre: 'Norte', tipo: 'mixta', activa: 1 },
      { id: 2, parqueadero_id: 1, nombre: 'Sur', tipo: 'mixta', activa: 1 },
    ])
  );

  // Vehículos (antes que celdas por vehiculo_actual_id)
  partes.push(`-- Vehículos: 10 con propietario y ${VEHICULOS.length - 10} de visitantes`);
  partes.push(
    insertar(
      'vehiculos',
      VEHICULOS.map((v) => ({ ...v, creado_por: 2 }))
    )
  );

  // Estado actual de celdas
  celda('A-09').estado = 'fuera_servicio';
  celda('A-09').nota = 'Filtración en el techo';
  for (const m of MEMBRESIAS) if (m.celda) celda(m.celda).estado = 'reservada';
  for (const e of EN_CURSO) {
    celda(e.celda).estado = 'ocupada';
    celda(e.celda).vehiculo_actual_id = vehiculo(e.placa).id;
  }
  partes.push('-- 44 celdas: Sótano 1 (A, B) y Sótano 2 (C carros, M motos)');
  partes.push(insertar('celdas', CELDAS));

  // Reglas y parámetros
  partes.push('-- Pico y placa de ejemplo (carros: último dígito; motos: primer dígito)');
  partes.push(insertar('pico_placa', PICO_PLACA));
  partes.push('-- Tarifas (carro $120/min tope $28.000; moto $60/min tope $12.000)');
  partes.push(
    insertar(
      'tarifas',
      Object.entries(TARIFAS).map(([tipo, t]) => ({
        id: t.id,
        tipo_vehiculo: tipo,
        valor_fraccion: t.valor_fraccion,
        minutos_fraccion: t.minutos_fraccion,
        minutos_gracia: t.minutos_gracia,
        valor_dia_maximo: t.valor_dia_maximo,
        vigente_desde: sql('CURDATE() - INTERVAL 60 DAY'),
        activa: 1,
        creado_por: 1,
      }))
    )
  );
  partes.push(
    insertar(
      'descuentos',
      DESCUENTOS.map(([id, nombre, descripcion, porcentaje]) => ({
        id,
        nombre,
        descripcion,
        porcentaje,
      }))
    )
  );
  partes.push(
    insertar(
      'tipos_incidencia',
      TIPOS_INCIDENCIA.map(([id, nombre, descripcion]) => ({ id, nombre, descripcion }))
    )
  );
  partes.push(
    insertar(
      'configuracion',
      CONFIGURACION.map(([clave, v, tipo, descripcion]) => ({ clave, valor: v, tipo, descripcion }))
    )
  );

  // Membresías
  partes.push('-- Mensualidades (A-04 y B-09 con celda fija)');
  partes.push(
    insertar(
      'membresias',
      MEMBRESIAS.map((m) => ({
        id: m.id,
        usuario_id: m.usuario_id,
        vehiculo_id: vehiculo(m.placa).id,
        celda_asignada_id: m.celda ? celda(m.celda).id : null,
        tipo: 'mensual',
        valor: VALOR_MENSUAL_CARRO,
        fecha_inicio: m.inicio,
        fecha_fin: m.fin,
        estado: 'activa',
        creado_por: 1,
      }))
    )
  );

  // Estadías y facturas
  const ahora = enBogota();
  const [h, m] = ahora.hora.split(':').map(Number);
  const { historial, denegados } = generarHistorial({
    hoyDow: ahora.diaSemana,
    ahoraMin: h * 60 + m,
  });
  const estadias = [];
  const eventosFactura = []; // { orden, fila }
  const operadores = [2, 3, 2, 3, 1];

  historial.forEach((h, i) => {
    const id = i + 1;
    const tarifa = TARIFAS[h.vehiculo.tipo];
    const entradaPor = elegir(operadores);
    estadias.push({
      id,
      codigo_ticket: `T-${pad(id, 6)}`,
      vehiculo_id: h.vehiculo.id,
      celda_id: h.celda.id,
      tipo_cliente: h.membresia ? 'mensualidad' : 'visitante',
      membresia_id: h.membresia ? h.membresia.id : null,
      puerta_entrada_id: entero(1, 2),
      puerta_salida_id: entero(1, 2),
      fecha_hora_entrada: fechaAbs(h.t0),
      fecha_hora_salida: fechaAbs(h.t1),
      minutos_estadia: h.duracion,
      requiere_accesible: h.celda.es_accesible && azar() < 0.5 ? 1 : 0,
      observaciones_entrada: azar() < 0.12 ? 'Sin novedades visibles' : null,
      deja_llaves: azar() < 0.1 ? 1 : 0,
      estado: 'finalizada',
      registrada_entrada_por: entradaPor,
      registrada_salida_por: elegir(operadores),
    });

    let descuento = null;
    if (!h.membresia && azar() < 0.15) descuento = elegir(DESCUENTOS);
    const cobro = calcularCobro({
      minutos: h.duracion,
      tarifa,
      membresiaActiva: h.membresia ? { titular: null } : null,
      descuento: descuento
        ? { id: descuento[0], nombre: descuento[1], porcentaje: descuento[3] }
        : null,
    });
    if (cobro.subtotal === 0) descuento = null;
    const { subtotal, total } = cobro;
    const porcentaje = descuento ? descuento[3] : 0;
    eventosFactura.push({
      orden: h.t1,
      fila: {
        concepto: 'estadia',
        estadia_id: id,
        membresia_id: null,
        cliente_id: h.vehiculo.usuario_id,
        subtotal,
        descuento_id: descuento ? descuento[0] : null,
        porcentaje_descuento: porcentaje,
        valor_descuento: subtotal - total,
        total,
        metodo_pago: h.membresia
          ? 'efectivo'
          : elegir(['efectivo', 'efectivo', 'tarjeta', 'transferencia']),
        observacion: h.membresia ? 'membresía' : null,
        tarifa_id: tarifa.id,
        detalle_calculo: JSON.stringify(cobro),
        fecha_pago: fechaAbs(h.t1),
        registrada_por: entradaPor,
      },
    });
  });

  // Pago de las mensualidades (factura propia)
  for (const m of MEMBRESIAS) {
    eventosFactura.push({
      orden: -m.diaInicio * 1440 + 9 * 60,
      fila: {
        concepto: 'membresia',
        estadia_id: null,
        membresia_id: m.id,
        cliente_id: m.usuario_id,
        subtotal: VALOR_MENSUAL_CARRO,
        descuento_id: null,
        porcentaje_descuento: 0,
        valor_descuento: 0,
        total: VALOR_MENSUAL_CARRO,
        metodo_pago: 'transferencia',
        observacion: 'Mensualidad carro',
        tarifa_id: null,
        detalle_calculo: null,
        fecha_pago: sql(`TIMESTAMP(${m.inicio.sql}, '09:00:00')`),
        registrada_por: 1,
      },
    });
  }
  eventosFactura.sort((a, b) => a.orden - b.orden);
  const facturas = eventosFactura.map((e, i) => ({
    id: i + 1,
    numero: `FAC-${pad(i + 1, 6)}`,
    ...e.fila,
  }));

  // Estadías en curso (después del historial: tickets más altos)
  const base = estadias.length;
  const lecturas = [];
  EN_CURSO.forEach((e, i) => {
    const id = base + i + 1;
    const v = vehiculo(e.placa);
    const membresia = membresiaDe(v.id, 0);
    estadias.push({
      id,
      codigo_ticket: `T-${pad(id, 6)}`,
      vehiculo_id: v.id,
      celda_id: celda(e.celda).id,
      tipo_cliente: membresia ? 'mensualidad' : 'visitante',
      membresia_id: membresia ? membresia.id : null,
      puerta_entrada_id: (i % 2) + 1,
      puerta_salida_id: null,
      fecha_hora_entrada: haceMinutos(e.minutos),
      fecha_hora_salida: null,
      minutos_estadia: null,
      requiere_accesible: 0,
      observaciones_entrada: e.obs,
      deja_llaves: e.llaves,
      estado: 'en_curso',
      registrada_entrada_por: (i % 2) + 2,
      registrada_salida_por: null,
    });
    lecturas.push({
      placa_leida: v.placa,
      imagen_url: null,
      fecha_hora: haceMinutos(e.minutos),
      puerta_id: (i % 2) + 1,
      estadia_id: id,
      registrada_por: (i % 2) + 2,
    });
  });

  partes.push(
    `-- Estadías: ${historial.length} históricas (${DIAS_HISTORIAL} días y hoy) + ${EN_CURSO.length} en curso`
  );
  partes.push(insertar('estadias', estadias));
  partes.push(insertar('lecturas_placa', lecturas));
  partes.push(`-- Facturas: ${facturas.length} (estadías + mensualidades)`);
  partes.push(insertar('facturas', facturas));
  partes.push(insertar('consecutivos', [{ nombre: 'factura', ultimo: facturas.length }]));

  // Accesos denegados: vehículos registrados que intentaron entrar con pico y placa.
  partes.push(`-- Entradas rechazadas por pico y placa: ${denegados.length}`);
  partes.push(
    insertar(
      'accesos_denegados',
      denegados.map((d) => ({
        placa: d.v.placa,
        tipo_vehiculo: d.v.tipo,
        puerta_id: d.puerta,
        fecha_hora: fechaAbs(d.t),
        motivo: `Pico y placa: ${describirRegla(d.regla)}`,
        regla_pico_placa_id: d.regla.id,
        registrado_por: d.puerta + 1,
      }))
    )
  );

  // Incidencias históricas
  partes.push('-- Incidencias');
  // Cada incidencia cae dentro de una estadía real de ese día (vehículo, celda y hora).
  const estadiaDelDia = (dias, placa) => {
    const i = historial.findIndex(
      (h) =>
        h.dias === dias &&
        (placa ? h.vehiculo.placa === placa : h.vehiculo.tipo === 'carro' && h.duracion >= 60)
    );
    return i < 0 ? null : { id: i + 1, ...historial[i] };
  };
  const incidencias = [
    {
      dias: 3,
      minuto: 10 * 60 + 20,
      tipo: 1,
      placa: 'BNM350',
      descripcion: 'Rayón en la puerta del conductor al abrir la puerta del vehículo vecino.',
    },
    {
      dias: 9,
      minuto: 15 * 60 + 5,
      tipo: 4,
      placa: 'OPQ119',
      descripcion: 'Golpe del bómper trasero contra la columna C-04 al maniobrar.',
    },
    ...[
      [16, 8 * 60 + 40, 2, 'Choque leve entre dos vehículos en la rampa hacia el Sótano 2.'],
      [21, 18 * 60 + 5, 1, 'Rayón en el guardabarros delantero al parquear en reversa.'],
      [27, 12 * 60 + 30, 4, 'Retrovisor golpeado contra la columna de la celda B-06.'],
      [33, 7 * 60 + 55, 3, 'Peatón golpeado levemente en el carril de circulación; sin lesiones.'],
      [38, 17 * 60 + 20, 1, 'Rayón en la puerta trasera; el conductor lo reporta al salir.'],
      [44, 9 * 60 + 15, 2, 'Choque por alcance en la fila de entrada a la puerta Norte.'],
      [51, 19 * 60 + 10, 4, 'Golpe del bómper delantero contra el muro del Sótano 1.'],
      [57, 13 * 60 + 45, 1, 'Rayón en el capó por objeto caído de una moto vecina.'],
    ].map(([dias, minuto, tipo, descripcion]) => ({
      dias,
      minuto,
      tipo,
      placa: null,
      descripcion,
    })),
  ]
    .map((inc) => ({ ...inc, e: estadiaDelDia(inc.dias, inc.placa) ?? estadiaDelDia(inc.dias) }))
    .filter((inc) => inc.e)
    .map((inc, i) => {
      const { e } = inc;
      const t = Math.min(Math.max(-inc.dias * 1440 + inc.minuto, e.t0 + 5), e.t1 - 5);
      return {
        id: i + 1,
        codigo: sql(
          `CONCAT('INC-', DATE_FORMAT(CURDATE() - INTERVAL ${inc.dias} DAY, '%Y%m%d'), '-0001')`
        ),
        tipo_incidencia_id: inc.tipo,
        vehiculo_id: e.vehiculo.id,
        celda_id: e.celda.id,
        estadia_id: e.id,
        descripcion: inc.descripcion,
        fecha_hora: fechaAbs(t),
        registrada_por: 2,
      };
    });
  partes.push(insertar('incidencias', incidencias));

  // Notificaciones de ejemplo
  partes.push('-- Notificaciones de ejemplo');
  partes.push(
    insertar('notificaciones', [
      {
        usuario_id: 1,
        titulo: 'Nueva incidencia',
        mensaje: 'Rayón registrado al vehículo BNM350.',
        tipo: 'incidencia',
        enlace: '/app/incidencias.html?id=1',
        leida: 1,
        enviada_por: null,
        created_at: fechaHora(3, 10 * 60 + 21),
      },
      {
        usuario_id: 7,
        titulo: 'Incidencia con tu vehículo',
        mensaje:
          'Se registró un rayón a tu vehículo BNM350. Acércate a la caseta para más información.',
        tipo: 'incidencia',
        enlace: '/app/mi-cuenta.html#mis-incidencias',
        leida: 0,
        enviada_por: null,
        created_at: fechaHora(3, 10 * 60 + 21),
      },
      {
        usuario_id: 1,
        titulo: 'Nueva incidencia',
        mensaje: 'Golpe contra muro registrado al vehículo OPQ119.',
        tipo: 'incidencia',
        enlace: '/app/incidencias.html?id=2',
        leida: 0,
        enviada_por: null,
        created_at: fechaHora(9, 15 * 60 + 6),
      },
      {
        usuario_id: 5,
        titulo: 'Tu mensualidad está por vencer',
        mensaje: 'La mensualidad del vehículo CVB275 vence en 2 días.',
        tipo: 'membresia_por_vencer',
        enlace: '/app/mi-cuenta.html?membresia=2', // misma llave que usa el job: no se duplica
        leida: 0,
        enviada_por: null,
        created_at: haceMinutos(60),
      },
      {
        usuario_id: 4,
        titulo: 'Bienvenida',
        mensaje: 'Ya puedes consultar tus vehículos y facturas desde PARKO.',
        tipo: 'manual',
        enlace: null,
        leida: 0,
        enviada_por: 1,
        created_at: fechaHora(10, 9 * 60),
      },
    ])
  );

  fs.writeFileSync(SALIDA, partes.join('\n'), 'utf8');
  console.log(
    `seed.sql generado: ${estadias.length} estadías, ${facturas.length} facturas → ${SALIDA}`
  );
}

module.exports = { generarSeed: main };

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
