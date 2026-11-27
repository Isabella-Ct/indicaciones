// Reglas de vehículos (spec 005): RF-VEH-01..12, RN-02, RN-11, RN-12. Escrituras en transacción con
// bloqueo del vehículo, historial de propietarios y bitácora.
const { withTransaction } = require('../../config/db');
const repositorio = require('./vehiculos.repository');
const { AppError, errores } = require('../../utils/errores');
const { registrarBitacora } = require('../../utils/bitacora');
const { aLimites, meta } = require('../../utils/paginacion');

const NO_ENCONTRADO = () => errores.noEncontrado('Registre primero el vehículo.', 'VEHICULO_NO_ENCONTRADO');
const SOLO_ADMIN = () => new AppError(403, 'SOLO_ADMIN_REASIGNA', 'Solo el Administrador puede reasignar el vehículo.');
const CAMPOS = ['placa', 'tipo', 'color', 'marca', 'modelo'];

function traducirDuplicado(error) {
  if (error.code === 'ER_DUP_ENTRY' && String(error.message).includes('uq_vehiculo_placa')) {
    throw errores.conflicto('La placa ya está registrada.', 'PLACA_DUPLICADA');
  }
  throw error;
}

const bitacora = (conexion, actor, accion, idRegistro, anterior, nuevo) =>
  registrarBitacora(conexion, { idUsuario: actor.idUsuario, accion, entidad: 'vehiculo', idRegistro, anterior, nuevo, ip: actor.ip });

/** Usuario existente (404) y activo (409) para recibir un vehículo (RF-VEH-05, RN-12). */
async function usuarioActivo(identificacion, conexion) {
  const usuario = await repositorio.buscarUsuario(identificacion, { conexion });
  if (!usuario) throw errores.noEncontrado('El usuario no está registrado.', 'USUARIO_NO_ENCONTRADO');
  if (usuario.estado !== 'activo') throw errores.conflicto('El usuario está inactivo.', 'USUARIO_INACTIVO');
  return usuario;
}

/**
 * Cambia el propietario dentro de la transacción (data-model.md § Transiciones, research R-06):
 * sin propietario → asociar; con otro (o quitarlo) → exige vehiculos.editar.
 * @returns {Promise<boolean>} true si hubo cambio
 */
async function aplicarPropietario(conexion, vehiculo, identificacion, actor) {
  const quitar = identificacion.idUsuario === null;
  const nuevo = quitar ? null : await usuarioActivo(identificacion, conexion);
  const actual = vehiculo.propietario?.idUsuario ?? null;
  const destino = nuevo?.idUsuario ?? null;
  if (actual === destino) return false;
  if (actual !== null && !actor.permisos.includes('vehiculos.editar')) throw SOLO_ADMIN();
  await repositorio.cambiarPropietario(vehiculo.idVehiculo, destino, actor.idUsuario, { conexion });
  await bitacora(conexion, actor, 'asignar_propietario', vehiculo.idVehiculo, { idPropietario: actual }, { idPropietario: destino });
  return true;
}

// ---------------------------------------------------------------- HU-25
/** RF-VEH-01..03: registra el vehículo (y su propietario, si viene). */
async function crear({ idPropietario, ...datos }, actor) {
  try {
    const id = await withTransaction(async (conexion) => {
      const idVehiculo = await repositorio.insertar(datos, { conexion });
      await bitacora(conexion, actor, 'crear', idVehiculo, null, datos);
      if (idPropietario) {
        const vehiculo = await repositorio.obtenerPorId(idVehiculo, { conexion });
        await aplicarPropietario(conexion, vehiculo, { idUsuario: idPropietario }, actor);
      }
      return idVehiculo;
    });
    return repositorio.obtenerPorId(id);
  } catch (error) {
    return traducirDuplicado(error);
  }
}

// ---------------------------------------------------------------- HU-26
/** RF-VEH-04..06, RF-VEH-08. */
async function asignarPropietario(id, identificacion, actor) {
  await withTransaction(async (conexion) => {
    const vehiculo = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!vehiculo) throw NO_ENCONTRADO();
    await aplicarPropietario(conexion, vehiculo, identificacion, actor);
  });
  return repositorio.obtenerPorId(id);
}

// ---------------------------------------------------------------- HU-27
/** RF-VEH-07..09: actualiza los datos (solo las diferencias en la bitácora) y, si viene, el propietario. */
async function actualizar(id, { idPropietario, ...datos }, actor) {
  try {
    await withTransaction(async (conexion) => {
      const vehiculo = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
      if (!vehiculo) throw NO_ENCONTRADO();
      const anterior = {};
      const nuevo = {};
      for (const campo of CAMPOS) {
        if (vehiculo[campo] !== datos[campo]) {
          anterior[campo] = vehiculo[campo];
          nuevo[campo] = datos[campo];
        }
      }
      // R-07: con el vehículo dentro, la placa y el tipo no cambian (celda y ticket dependen de ellos).
      if (vehiculo.dentro && ('placa' in nuevo || 'tipo' in nuevo)) {
        throw errores.conflicto('El vehículo está dentro del parqueadero.', 'VEHICULO_DENTRO');
      }
      if (Object.keys(nuevo).length) {
        await repositorio.actualizar(id, datos, { conexion });
        await bitacora(conexion, actor, 'editar', id, anterior, nuevo);
      }
      if (idPropietario !== undefined) await aplicarPropietario(conexion, vehiculo, { idUsuario: idPropietario }, actor);
    });
    return repositorio.obtenerPorId(id);
  } catch (error) {
    return traducirDuplicado(error);
  }
}

// ---------------------------------------------------------------- HU-28
/** RF-VEH-10. */
async function listar(filtros) {
  const { filas, total } = await repositorio.listar({ ...filtros, ...aLimites(filtros) });
  return { data: filas, meta: meta(filtros, total) };
}

/** RF-VEH-11: detalle con historial de propietarios y últimos 10 movimientos. */
async function obtener(id) {
  const vehiculo = await repositorio.obtenerPorId(id);
  if (!vehiculo) throw errores.noEncontrado('Vehículo no encontrado.', 'VEHICULO_NO_ENCONTRADO');
  const [historialPropietarios, ultimosMovimientos] = await Promise.all([
    repositorio.historial(id),
    repositorio.ultimosMovimientos(id),
  ]);
  return { ...vehiculo, historialPropietarios, ultimosMovimientos };
}

/** RF-VEH-12: solo los vehículos de la sesión. */
async function misVehiculos(actor) {
  const { filas } = await repositorio.listar({ idPropietarioSesion: actor.idUsuario, limit: 100, offset: 0 });
  return filas;
}

module.exports = { crear, asignarPropietario, actualizar, listar, obtener, misVehiculos };
