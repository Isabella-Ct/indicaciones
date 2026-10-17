// Constantes técnicas del sistema. Las reglas de negocio configurables viven
// en la BD (tablas tarifas / configuracion), nunca aquí.
const ROLES = Object.freeze({
  ADMINISTRADOR: 'administrador',
  OPERADOR: 'operador',
  USUARIO: 'usuario',
});

const TIPOS_DOCUMENTO = Object.freeze(['CC', 'CE', 'TI', 'PAS', 'NIT']);

const COOKIE_SESION = 'parko_sesion';

// Rate limit del login (CLAUDE.md §7): 5 intentos fallidos / 15 min por IP + documento.
const LOGIN_MAX_INTENTOS = 5;
const LOGIN_VENTANA_MS = 15 * 60 * 1000;

// Desfase fijo de Colombia (America/Bogota no usa horario de verano).
const ZONA_HORARIA_MYSQL = '-05:00';

module.exports = {
  ROLES,
  TIPOS_DOCUMENTO,
  COOKIE_SESION,
  LOGIN_MAX_INTENTOS,
  LOGIN_VENTANA_MS,
  ZONA_HORARIA_MYSQL,
};
