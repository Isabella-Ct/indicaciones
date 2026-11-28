// Funciones puras del módulo de roles (sin BD), probadas en tests/unit/roles.reglas.test.js.
const { PERMISOS_PROTEGIDOS_ADMIN } = require('../../config/constantes');

/** RF-ROL-05: el nombre se compara sin mayúsculas ni espacios extremos. */
const normalizarNombre = (nombre) => String(nombre ?? '').trim().toLowerCase();

/** RF-ROL-03: ¿el nombre nuevo cambia el nombre actual? */
const esRenombre = (actual, nuevo) => normalizarNombre(actual) !== normalizarNombre(nuevo);

/** RF-ROL-11: permisos protegidos del Administrador que faltan en `codigos`. */
const faltanProtegidos = (codigos) => {
  const conjunto = new Set(codigos);
  return PERMISOS_PROTEGIDOS_ADMIN.filter((c) => !conjunto.has(c));
};

/**
 * RF-ROL-08 / RF-ROL-15: agrupa permisos por módulo, conservando el orden de llegada.
 * @param {Array<{ idPermiso: number, modulo: string, codigo: string, accion: string, descripcion: string }>} permisos
 */
function agruparPorModulo(permisos) {
  const grupos = new Map();
  for (const { modulo, idPermiso, codigo, accion, descripcion } of permisos) {
    if (!grupos.has(modulo)) grupos.set(modulo, { modulo, permisos: [] });
    grupos.get(modulo).permisos.push({ idPermiso, codigo, accion, descripcion });
  }
  return [...grupos.values()];
}

module.exports = { normalizarNombre, esRenombre, faltanProtegidos, agruparPorModulo };
