// Planes de membresía (spec 010): RF-MEM-01, RF-MEM-02. Un plan inactivo conserva sus membresías vigentes,
// pero no admite suscripciones ni renovaciones nuevas (lo revisa membresias.service).
const { withTransaction } = require('../../config/db');
const repositorio = require('./planes.repository');
const { errores } = require('../../utils/errores');
const { registrarBitacora } = require('../../utils/bitacora');
const { aLimites, meta } = require('../../utils/paginacion');

const NO_ENCONTRADO = () => errores.noEncontrado('Plan no encontrado.', 'PLAN_NO_ENCONTRADO');
const CAMPOS = ['nombre', 'tipoVehiculo', 'valorMensual', 'diasVigencia', 'beneficios'];

const bitacora = (conexion, actor, accion, idRegistro, anterior, nuevo) =>
  registrarBitacora(conexion, { idUsuario: actor.idUsuario, accion, entidad: 'plan_membresia', idRegistro, anterior, nuevo, ip: actor.ip });

/** RF-MEM-01: nombre único (índice uq_plan_nombre) → 409. */
function traducirDuplicado(error) {
  if (error.code === 'ER_DUP_ENTRY' && String(error.message).includes('uq_plan_nombre')) {
    throw errores.conflicto('Ya existe un plan con ese nombre.', 'PLAN_DUPLICADO');
  }
  throw error;
}

async function listar(filtros) {
  const { filas, total } = await repositorio.listar({ ...filtros, ...aLimites(filtros) });
  return { data: filas, meta: meta(filtros, total) };
}

/** HU-45 E1: crea el plan activo. */
async function crear(datos, actor) {
  let id;
  try {
    id = await withTransaction(async (conexion) => {
      const idPlan = await repositorio.insertar(datos, { conexion });
      await bitacora(conexion, actor, 'crear', idPlan, null, datos);
      return idPlan;
    });
  } catch (error) {
    traducirDuplicado(error);
  }
  return repositorio.obtenerPorId(id);
}

/** HU-45 E4: edita nombre, valor, días y beneficios; las membresías ya pagadas no cambian. */
async function actualizar(id, datos, actor) {
  try {
    await withTransaction(async (conexion) => {
      const actual = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
      if (!actual) throw NO_ENCONTRADO();
      const anterior = {};
      const cambios = {};
      for (const campo of CAMPOS) {
        if (actual[campo] !== datos[campo]) {
          anterior[campo] = actual[campo];
          cambios[campo] = datos[campo];
        }
      }
      if (!Object.keys(cambios).length) return;
      // Un plan con membresías activas no cambia de tipo de vehículo (RN-23).
      if (cambios.tipoVehiculo && actual.membresiasActivas > 0) {
        throw errores.conflicto('El plan tiene membresías activas: no se puede cambiar el tipo de vehículo.', 'PLAN_EN_USO');
      }
      await repositorio.actualizar(id, datos, { conexion });
      await bitacora(conexion, actor, 'editar', id, anterior, cambios);
    });
  } catch (error) {
    traducirDuplicado(error);
  }
  return repositorio.obtenerPorId(id);
}

/** HU-45 E3 (RF-MEM-02): inactivar no toca las membresías vigentes. */
async function cambiarEstado(id, { estado }, actor) {
  await withTransaction(async (conexion) => {
    const actual = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!actual) throw NO_ENCONTRADO();
    if (actual.estado === estado) return;
    await repositorio.cambiarEstado(id, estado, { conexion });
    await bitacora(conexion, actor, 'cambiar_estado', id, { estado: actual.estado }, { estado });
  });
  return repositorio.obtenerPorId(id);
}

module.exports = { listar, crear, actualizar, cambiarEstado };
