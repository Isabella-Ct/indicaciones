// Constantes técnicas. Las reglas de negocio configurables (tarifas, restricciones, planes…)
// viven en la base de datos, nunca aquí.

// Desfase fijo de Colombia (America/Bogota no tiene horario de verano).
const ZONA_HORARIA_MYSQL = '-05:00';

const TIPOS_DOCUMENTO = Object.freeze(['CC', 'CE', 'TI', 'PAS', 'NIT']);

// Nombre del rol base que conserva siempre la administración (RF-ROL-11).
const ROL_ADMINISTRADOR = 'Administrador';

// Permisos que el rol Administrador nunca puede perder (RF-ROL-11, spec 001 Clarifications).
const PERMISOS_PROTEGIDOS_ADMIN = Object.freeze([
  'roles.ver',
  'roles.crear',
  'roles.editar',
  'roles.cambiar_estado',
  'usuarios.ver',
  'usuarios.crear',
  'usuarios.editar',
  'usuarios.cambiar_estado',
]);

// Ventana del límite de peticiones de login por IP (constitución §III).
const LOGIN_VENTANA_MS = 15 * 60 * 1000;

// Bloqueo por intentos fallidos (RN-07, RNF-SEG-05) y vigencia del enlace de recuperación (RN-08).
const LOGIN_MAX_FALLIDOS = 5;
const LOGIN_VENTANA_MIN = 15;
const TOKEN_RECUPERACION_MIN = 30;

// Paginación (constitución §II).
const LIMITE_POR_DEFECTO = 10;
const LIMITE_MAXIMO = 100;

module.exports = {
  ZONA_HORARIA_MYSQL,
  TIPOS_DOCUMENTO,
  ROL_ADMINISTRADOR,
  PERMISOS_PROTEGIDOS_ADMIN,
  LOGIN_VENTANA_MS,
  LOGIN_MAX_FALLIDOS,
  LOGIN_VENTANA_MIN,
  TOKEN_RECUPERACION_MIN,
  LIMITE_POR_DEFECTO,
  LIMITE_MAXIMO,
};
