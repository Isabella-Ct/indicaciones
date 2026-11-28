// Reglas de pico y placa (spec 006): RF-PYP-01..05, RN-13, RN-14. Escrituras en transacción con
// bloqueo de las restricciones del día y tipo, y bitácora. `evaluar` lo usa la entrada (spec 007).
const { withTransaction } = require('../../config/db');
const repositorio = require('./restricciones.repository');
const { errores } = require('../../utils/errores');
const { registrarBitacora } = require('../../utils/bitacora');
const { aLimites, meta } = require('../../utils/paginacion');
const { enBogota, nombreDia } = require('../../utils/fechas');
const { vigenciasSeCruzan, vigenteEn, restringe, motivo } = require('./restricciones.reglas');

const NO_ENCONTRADA = () => errores.noEncontrado('Restricción no encontrada.', 'RESTRICCION_NO_ENCONTRADA');
const CAMPOS = ['diaSemana', 'tipoVehiculo', 'digitos', 'posicionDigito', 'horaInicio', 'horaFin', 'vigenteDesde', 'vigenteHasta', 'estado'];

const bitacora = (conexion, actor, accion, idRegistro, anterior, nuevo) =>
  registrarBitacora(conexion, { idUsuario: actor.idUsuario, accion, entidad: 'restriccion_placa', idRegistro, anterior, nuevo, ip: actor.ip });

/** RN-14 (R-04): con las filas del día y tipo bloqueadas, rechaza otra activa con vigencia cruzada. */
async function verificarSuperposicion(conexion, datos, idPropia = null) {
  if (datos.estado === 'inactivo') return;
  const activas = await repositorio.activasDelDia(datos.diaSemana, datos.tipoVehiculo, { conexion, bloquear: true });
  const choque = activas.find((r) => r.idRestriccion !== idPropia && vigenciasSeCruzan(r, datos));
  if (choque) {
    const error = errores.conflicto('Ya existe una restricción para ese día y tipo.', 'RESTRICCION_SUPERPUESTA');
    error.details = [{ campo: 'idRestriccion', mensaje: String(choque.idRestriccion) }];
    throw error;
  }
}

// ---------------------------------------------------------------- HU-29
/** RF-PYP-01. */
async function listar(filtros) {
  const { filas, total } = await repositorio.listar({ ...filtros, ...aLimites(filtros) });
  return { data: filas, meta: meta(filtros, total) };
}

/** RF-PYP-01..03. */
async function crear(datos, actor) {
  const completa = { ...datos, vigenteDesde: datos.vigenteDesde ?? enBogota().fecha, vigenteHasta: datos.vigenteHasta ?? null, estado: 'activo' };
  if (completa.vigenteHasta && completa.vigenteHasta < completa.vigenteDesde) {
    throw errores.validacion([{ campo: 'vigenteHasta', mensaje: 'La vigencia debe terminar en la fecha de inicio o después.' }]);
  }
  const id = await withTransaction(async (conexion) => {
    await verificarSuperposicion(conexion, completa);
    const idRestriccion = await repositorio.insertar(completa, { conexion });
    await bitacora(conexion, actor, 'crear', idRestriccion, null, completa);
    return idRestriccion;
  });
  return repositorio.obtenerPorId(id);
}

/** RF-PYP-04: actualiza en su lugar (solo las diferencias en la bitácora); el estado exige cambiar_estado. */
async function actualizar(id, datos, actor) {
  await withTransaction(async (conexion) => {
    const actual = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!actual) throw NO_ENCONTRADA();
    const nueva = {
      ...datos,
      vigenteDesde: datos.vigenteDesde ?? actual.vigenteDesde,
      vigenteHasta: datos.vigenteHasta === undefined ? actual.vigenteHasta : datos.vigenteHasta,
      estado: datos.estado ?? actual.estado,
    };
    if (nueva.estado !== actual.estado && !actor.permisos.includes('restricciones.cambiar_estado')) throw errores.sinPermiso();
    if (nueva.vigenteHasta && nueva.vigenteHasta < nueva.vigenteDesde) {
      throw errores.validacion([{ campo: 'vigenteHasta', mensaje: 'La vigencia debe terminar en la fecha de inicio o después.' }]);
    }
    const anterior = {};
    const cambios = {};
    for (const campo of CAMPOS) {
      if (JSON.stringify(actual[campo]) !== JSON.stringify(nueva[campo])) {
        anterior[campo] = actual[campo];
        cambios[campo] = nueva[campo];
      }
    }
    if (!Object.keys(cambios).length) return;
    await verificarSuperposicion(conexion, nueva, id);
    await repositorio.actualizar(id, nueva, { conexion });
    await bitacora(conexion, actor, 'editar', id, anterior, cambios);
  });
  return repositorio.obtenerPorId(id);
}

/** RF-PYP-04: eliminación lógica (estado inactivo). */
async function eliminar(id, actor) {
  await withTransaction(async (conexion) => {
    const actual = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!actual) throw NO_ENCONTRADA();
    if (actual.estado === 'inactivo') return;
    await repositorio.actualizar(id, { ...actual, estado: 'inactivo' }, { conexion });
    await bitacora(conexion, actor, 'inactivar', id, { estado: 'activo' }, { estado: 'inactivo' });
  });
  return repositorio.obtenerPorId(id);
}

// ---------------------------------------------------------------- HU-30
/** RF-PYP-05 (R-06): restricción vigente hoy por tipo, o «Sin restricción hoy». */
async function hoy(ahora = new Date()) {
  const { fecha, diaSemana } = enBogota(ahora);
  const delDia = (await repositorio.activasDeDia(diaSemana)).filter((r) => vigenteEn(r, fecha));
  const tipos = {
    carro: delDia.find((r) => r.tipoVehiculo === 'carro') ?? null,
    moto: delDia.find((r) => r.tipoVehiculo === 'moto') ?? null,
  };
  return { fecha, diaSemana, nombreDia: nombreDia(diaSemana), tipos, mensaje: tipos.carro || tipos.moto ? null : 'Sin restricción hoy' };
}

/**
 * RN-13 (R-05): ¿la placa está restringida en esa fecha y hora (Bogotá)? Lo llama la entrada (spec 007)
 * dentro de su transacción. Devuelve { restringido, motivo, restriccion }.
 */
async function evaluar({ placa, tipo, fechaHora = new Date() }, { conexion } = {}) {
  const momento = { placa, ...enBogota(fechaHora) };
  const candidatas = await repositorio.activasDeDia(momento.diaSemana, { conexion });
  const restriccion = candidatas.find((r) => r.tipoVehiculo === tipo && restringe(r, momento)) ?? null;
  return { restringido: Boolean(restriccion), motivo: restriccion ? motivo(restriccion) : null, restriccion };
}

module.exports = { listar, crear, actualizar, eliminar, hoy, evaluar };
