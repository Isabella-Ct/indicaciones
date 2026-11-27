// Reglas de parqueaderos y puertas (spec 004): RF-CLD-01..08, RN-10. Escrituras en transacción con bitácora.
const { withTransaction } = require('../../config/db');
const repositorio = require('./parqueaderos.repository');
const { errores } = require('../../utils/errores');
const { registrarBitacora } = require('../../utils/bitacora');
const { aLimites, meta } = require('../../utils/paginacion');

const NO_ENCONTRADO = () => errores.noEncontrado('Parqueadero no encontrado.', 'PARQUEADERO_NO_ENCONTRADO');
const PUERTA_NO_ENCONTRADA = () => errores.noEncontrado('Puerta no encontrada.', 'PUERTA_NO_ENCONTRADA');

function traducirDuplicado(error) {
  if (error.code === 'ER_DUP_ENTRY') {
    if (String(error.message).includes('uq_parqueadero_nombre')) {
      throw errores.conflicto('Ya existe un parqueadero con ese nombre.', 'PARQUEADERO_DUPLICADO');
    }
    if (String(error.message).includes('uq_puerta_nombre')) {
      throw errores.conflicto('Ya existe una puerta con ese nombre en este parqueadero.', 'PUERTA_DUPLICADA');
    }
  }
  throw error;
}

const bitacora = (conexion, actor, accion, entidad, idRegistro, anterior, nuevo) =>
  registrarBitacora(conexion, { idUsuario: actor.idUsuario, accion, entidad, idRegistro, anterior, nuevo, ip: actor.ip });

const datosEditables = (p) => ({ nombre: p.nombre, direccion: p.direccion, pisos: p.pisos, horario: p.horario });

// ---------------------------------------------------------------- HU-17
/** RF-CLD-01. */
async function crear(datos, actor) {
  try {
    const id = await withTransaction(async (conexion) => {
      const idParqueadero = await repositorio.insertar(datos, { conexion });
      await bitacora(conexion, actor, 'crear', 'parqueadero', idParqueadero, null, { ...datos, estado: 'activo' });
      return idParqueadero;
    });
    return repositorio.obtenerPorId(id);
  } catch (error) {
    return traducirDuplicado(error);
  }
}

/** RF-CLD-02. */
async function listar({ page, limit, q, estado }) {
  const { parqueaderos, total } = await repositorio.listar({ q, estado, ...aLimites({ page, limit }) });
  return { data: parqueaderos, meta: meta({ page, limit }, total) };
}

/** RF-CLD-03: detalle con puertas y resumen de celdas. */
async function obtener(id) {
  const parqueadero = await repositorio.obtenerPorId(id);
  if (!parqueadero) throw NO_ENCONTRADO();
  const [puertas, resumen] = await Promise.all([
    repositorio.listarPuertas(id, {}),
    repositorio.resumenCeldas(id),
  ]);
  return { ...parqueadero, puertas, resumen };
}

// ---------------------------------------------------------------- HU-18
/** RN-10 / RF-CLD-05 (research R-03): solo sin vehículos dentro. */
async function aplicarEstado(parqueadero, estado, actor, conexion) {
  if (parqueadero.estado === estado) return;
  if (estado === 'inactivo') {
    const dentro = await repositorio.contarOcupadas(parqueadero.idParqueadero, { conexion });
    if (dentro > 0) {
      throw errores.conflicto(`Hay ${dentro} vehículos dentro del parqueadero.`, 'PARQUEADERO_CON_VEHICULOS');
    }
  }
  await repositorio.cambiarEstado(parqueadero.idParqueadero, estado, { conexion });
  await bitacora(conexion, actor, 'cambiar_estado', 'parqueadero', parqueadero.idParqueadero, { estado: parqueadero.estado }, { estado });
}

/** RF-CLD-04..06. Cambiar el estado exige además parqueaderos.cambiar_estado. */
async function actualizar(id, { estado, ...datos }, actor) {
  if (estado !== undefined && !actor.permisos.includes('parqueaderos.cambiar_estado')) throw errores.sinPermiso();
  try {
    await withTransaction(async (conexion) => {
      const parqueadero = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
      if (!parqueadero) throw NO_ENCONTRADO();
      const pisoMaximo = await repositorio.pisoMaximoConCeldas(id, { conexion });
      if (datos.pisos < pisoMaximo) {
        throw errores.conflicto(`Hay celdas registradas en el piso ${pisoMaximo}.`, 'PISOS_CON_CELDAS');
      }
      const anterior = datosEditables(parqueadero);
      const cambiados = Object.keys(datos).filter((k) => datos[k] !== anterior[k]);
      if (cambiados.length) {
        await repositorio.actualizar(id, datos, { conexion });
        await bitacora(
          conexion,
          actor,
          'editar',
          'parqueadero',
          id,
          Object.fromEntries(cambiados.map((k) => [k, anterior[k]])),
          Object.fromEntries(cambiados.map((k) => [k, datos[k]]))
        );
      }
      if (estado !== undefined) await aplicarEstado(parqueadero, estado, actor, conexion);
    });
  } catch (error) {
    return traducirDuplicado(error);
  }
  return repositorio.obtenerPorId(id);
}

/** DELETE /parqueaderos/:id: inactivación lógica. */
async function inactivar(id, actor) {
  await withTransaction(async (conexion) => {
    const parqueadero = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!parqueadero) throw NO_ENCONTRADO();
    await aplicarEstado(parqueadero, 'inactivo', actor, conexion);
  });
  return repositorio.obtenerPorId(id);
}

// ---------------------------------------------------------------- HU-19 · puertas
async function listarPuertas(idParqueadero, filtros) {
  if (!(await repositorio.obtenerPorId(idParqueadero))) throw NO_ENCONTRADO();
  return repositorio.listarPuertas(idParqueadero, filtros);
}

async function crearPuerta(idParqueadero, datos, actor) {
  try {
    const id = await withTransaction(async (conexion) => {
      const parqueadero = await repositorio.obtenerPorId(idParqueadero, { conexion, bloquear: true });
      if (!parqueadero) throw NO_ENCONTRADO();
      if (parqueadero.estado !== 'activo') {
        throw errores.conflicto('El parqueadero está inactivo.', 'PARQUEADERO_INACTIVO');
      }
      const idPuerta = await repositorio.insertarPuerta(idParqueadero, datos, { conexion });
      await bitacora(conexion, actor, 'crear', 'puerta', idPuerta, null, { idParqueadero, ...datos, estado: 'activo' });
      return idPuerta;
    });
    return repositorio.obtenerPuerta(id);
  } catch (error) {
    return traducirDuplicado(error);
  }
}

async function actualizarPuerta(id, { estado, ...datos }, actor) {
  try {
    await withTransaction(async (conexion) => {
      const puerta = await repositorio.obtenerPuerta(id, { conexion, bloquear: true });
      if (!puerta) throw PUERTA_NO_ENCONTRADA();
      const nuevo = { ...datos, estado: estado ?? puerta.estado };
      await repositorio.actualizarPuerta(id, nuevo, { conexion });
      await bitacora(
        conexion,
        actor,
        'editar',
        'puerta',
        id,
        { nombre: puerta.nombre, tipo: puerta.tipo, estado: puerta.estado },
        nuevo
      );
    });
  } catch (error) {
    return traducirDuplicado(error);
  }
  return repositorio.obtenerPuerta(id);
}

module.exports = { crear, listar, obtener, actualizar, inactivar, listarPuertas, crearPuerta, actualizarPuerta };
