// Reglas de negocio de roles y permisos (spec 001): RN-01, RN-03, RN-04, RF-ROL-03/05/10/11/13.
// No conoce req/res. Las escrituras van en transacción con la bitácora (RNF-SEG-07, research R-10).
const { withTransaction } = require('../../config/db');
const repositorio = require('./roles.repository');
const { esRenombre, faltanProtegidos, agruparPorModulo } = require('./roles.reglas');
const { errores } = require('../../utils/errores');
const { registrarBitacora } = require('../../utils/bitacora');
const { aLimites, meta } = require('../../utils/paginacion');
const { ROL_ADMINISTRADOR } = require('../../config/constantes');

const ROL_NO_ENCONTRADO = () => errores.noEncontrado('Rol no encontrado.', 'ROL_NO_ENCONTRADO');
const ROL_BASE_INMUTABLE = () =>
  errores.conflicto('Los roles base no se pueden modificar.', 'ROL_BASE_INMUTABLE');
const ROL_DUPLICADO = () => errores.conflicto('Ya existe un rol con ese nombre.', 'ROL_DUPLICADO');

const esAdministrador = (rol) => rol.esBase && rol.nombre === ROL_ADMINISTRADOR;

/** RF-ROL-05: la unicidad la garantiza uq_rol_nombre; aquí se traduce a 409. */
function traducirDuplicado(error) {
  if (error.code === 'ER_DUP_ENTRY' && String(error.message).includes('uq_rol_nombre')) {
    throw ROL_DUPLICADO();
  }
  throw error;
}

/** Valida que todos los ids existan en el catálogo; devuelve los permisos encontrados. */
async function permisosValidos(ids, conexion) {
  const encontrados = await repositorio.buscarPermisos(ids, { conexion });
  if (encontrados.length !== ids.length) {
    const existentes = new Set(encontrados.map((p) => p.idPermiso));
    const faltantes = ids.filter((id) => !existentes.has(id));
    throw errores.validacion([
      { campo: 'permisos', mensaje: `Hay permisos que no existen en el catálogo: ${faltantes.join(', ')}.` },
    ]);
  }
  return encontrados;
}

/** RF-ROL-03 / RN-01: los roles base no se inactivan ni se renombran. */
function asegurarNoBase(rol) {
  if (rol.esBase) throw ROL_BASE_INMUTABLE();
}

async function detalle(rol, { conexion } = {}) {
  const [permisos, usuarios] = await Promise.all([
    repositorio.permisosDeRol(rol.idRol, { conexion }),
    repositorio.usuariosDeRol(rol.idRol),
  ]);
  return { ...rol, permisos: agruparPorModulo(permisos), usuarios };
}

/** HU-01, HU-03 · RF-ROL-07: listado paginado con búsqueda y filtro por estado. */
async function listar({ page, limit, q, estado }) {
  const { roles, total } = await repositorio.listar({ q, estado, ...aLimites({ page, limit }) });
  return { data: roles, meta: meta({ page, limit }, total) };
}

/** HU-03 · RF-ROL-08: detalle con permisos agrupados y usuarios asignados. */
async function obtener(id) {
  const rol = await repositorio.obtenerPorId(id);
  if (!rol) throw ROL_NO_ENCONTRADO();
  return detalle(rol);
}

/** HU-02 · RF-ROL-04/05/06, RN-03. */
async function crear({ nombre, descripcion, permisos }, actor) {
  try {
    const id = await withTransaction(async (conexion) => {
      const catalogo = await permisosValidos(permisos, conexion);
      const idRol = await repositorio.insertar({ nombre, descripcion }, { conexion });
      await repositorio.reemplazarPermisos(idRol, permisos, { conexion });
      await registrarBitacora(conexion, {
        idUsuario: actor.idUsuario,
        accion: 'crear',
        entidad: 'rol',
        idRegistro: idRol,
        nuevo: { nombre, descripcion, estado: 'activo', permisos: catalogo.map((p) => p.codigo) },
        ip: actor.ip,
      });
      return idRol;
    });
    return obtener(id);
  } catch (error) {
    return traducirDuplicado(error);
  }
}

/** HU-04 · RF-ROL-09/10/11, RN-03. Los permisos nuevos aplican en el siguiente inicio de sesión. */
async function actualizar(id, { nombre, descripcion, permisos }, actor) {
  try {
    await withTransaction(async (conexion) => {
      const rol = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
      if (!rol) throw ROL_NO_ENCONTRADO();
      if (rol.esBase && esRenombre(rol.nombre, nombre)) throw ROL_BASE_INMUTABLE();

      const catalogo = await permisosValidos(permisos, conexion);
      const codigosNuevos = catalogo.map((p) => p.codigo);
      if (esAdministrador(rol)) {
        const faltan = faltanProtegidos(codigosNuevos);
        if (faltan.length) {
          throw errores.conflicto(
            `El rol Administrador no puede perder los permisos de gestión de roles y usuarios (${faltan.join(', ')}).`,
            'PERMISOS_ADMIN_PROTEGIDOS'
          );
        }
      }

      const anteriores = await repositorio.permisosDeRol(id, { conexion });
      // A un rol base se le conserva el nombre guardado (solo cambian descripción y permisos).
      const nombreFinal = rol.esBase ? rol.nombre : nombre;
      await repositorio.actualizar(id, { nombre: nombreFinal, descripcion }, { conexion });
      await repositorio.reemplazarPermisos(id, permisos, { conexion });
      await registrarBitacora(conexion, {
        idUsuario: actor.idUsuario,
        accion: 'editar',
        entidad: 'rol',
        idRegistro: id,
        anterior: { nombre: rol.nombre, descripcion: rol.descripcion, permisos: anteriores.map((p) => p.codigo) },
        nuevo: { nombre: nombreFinal, descripcion, permisos: codigosNuevos },
        ip: actor.ip,
      });
    });
    return obtener(id);
  } catch (error) {
    return traducirDuplicado(error);
  }
}

/** HU-05 · RF-ROL-12/13/14, RN-04. */
async function cambiarEstado(id, estado, actor) {
  return withTransaction(async (conexion) => {
    const rol = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!rol) throw ROL_NO_ENCONTRADO();
    if (rol.estado === estado) return rol;
    if (estado === 'inactivo') {
      asegurarNoBase(rol);
      if (rol.usuariosActivos > 0) {
        throw errores.conflicto(
          `El rol tiene ${rol.usuariosActivos} usuarios activos.`,
          'ROL_CON_USUARIOS_ACTIVOS'
        );
      }
    }
    await repositorio.cambiarEstado(id, estado, { conexion });
    await registrarBitacora(conexion, {
      idUsuario: actor.idUsuario,
      accion: 'cambiar_estado',
      entidad: 'rol',
      idRegistro: id,
      anterior: { estado: rol.estado },
      nuevo: { estado },
      ip: actor.ip,
    });
    return repositorio.obtenerPorId(id, { conexion });
  });
}

/** HU-06 · RF-ROL-15. */
async function catalogo() {
  return agruparPorModulo(await repositorio.catalogo());
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, catalogo, asegurarNoBase };
