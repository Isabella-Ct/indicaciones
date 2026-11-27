// Único lugar con SQL de roles y permisos. Acepta una conexión opcional para participar en la
// transacción del servicio. Mapea snake_case (BD) ↔ camelCase (API). Sin SELECT *.
const { pool } = require('../../config/db');
const { escapeLike } = require('../../utils/sql');
const { aIsoBogota } = require('../../utils/fechas');

const COLUMNAS_ROL = `r.id_rol, r.nombre, r.descripcion, r.es_base, r.estado, r.created_at, r.updated_at,
  COUNT(u.id_usuario) AS usuarios_asignados,
  COALESCE(SUM(u.estado = 'activo'), 0) AS usuarios_activos`;

function aRol(fila) {
  return {
    idRol: fila.id_rol,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    esBase: Boolean(fila.es_base),
    estado: fila.estado,
    usuariosAsignados: Number(fila.usuarios_asignados ?? 0),
    usuariosActivos: Number(fila.usuarios_activos ?? 0),
    createdAt: aIsoBogota(fila.created_at),
    updatedAt: aIsoBogota(fila.updated_at),
  };
}

const aPermiso = (f) => ({
  idPermiso: f.id_permiso,
  modulo: f.modulo,
  accion: f.accion,
  codigo: f.codigo,
  descripcion: f.descripcion,
});

function filtros({ q, estado }) {
  const condiciones = [];
  const valores = [];
  if (q) {
    condiciones.push('r.nombre LIKE ?');
    valores.push(`%${escapeLike(q)}%`);
  }
  if (estado) {
    condiciones.push('r.estado = ?');
    valores.push(estado);
  }
  return { donde: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '', valores };
}

/** RF-ROL-07: página de roles con conteo de usuarios en una sola consulta (sin N+1). */
async function listar({ q, estado, limit, offset }) {
  const { donde, valores } = filtros({ q, estado });
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS_ROL}
       FROM rol r
       LEFT JOIN usuario u ON u.id_rol = r.id_rol
       ${donde}
      GROUP BY r.id_rol
      ORDER BY r.es_base DESC, r.nombre
      LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM rol r ${donde}`, valores);
  return { roles: filas.map(aRol), total: Number(total) };
}

/** Rol con conteo de usuarios. `bloquear` usa SELECT … FOR UPDATE sobre la fila del rol. */
async function obtenerPorId(id, { conexion = pool, bloquear = false } = {}) {
  if (bloquear) await conexion.query('SELECT id_rol FROM rol WHERE id_rol = ? FOR UPDATE', [id]);
  const [filas] = await conexion.query(
    `SELECT ${COLUMNAS_ROL}
       FROM rol r
       LEFT JOIN usuario u ON u.id_rol = r.id_rol
      WHERE r.id_rol = ?
      GROUP BY r.id_rol`,
    [id]
  );
  return filas[0] ? aRol(filas[0]) : null;
}

async function permisosDeRol(id, { conexion = pool } = {}) {
  const [filas] = await conexion.query(
    `SELECT p.id_permiso, p.modulo, p.accion, p.codigo, p.descripcion
       FROM rol_permiso rp
       JOIN permiso p ON p.id_permiso = rp.id_permiso
      WHERE rp.id_rol = ?
      ORDER BY p.id_permiso`,
    [id]
  );
  return filas.map(aPermiso);
}

/** FR-019: solo datos mínimos de los usuarios del rol. */
async function usuariosDeRol(id) {
  const [filas] = await pool.query(
    `SELECT id_usuario, nombre_completo, estado
       FROM usuario
      WHERE id_rol = ?
      ORDER BY nombre_completo`,
    [id]
  );
  return filas.map((f) => ({ idUsuario: f.id_usuario, nombreCompleto: f.nombre_completo, estado: f.estado }));
}

/** Permisos del catálogo cuyos ids existen (para validar la entrada). */
async function buscarPermisos(ids, { conexion = pool } = {}) {
  if (ids.length === 0) return [];
  const [filas] = await conexion.query(
    `SELECT id_permiso, modulo, accion, codigo, descripcion
       FROM permiso
      WHERE id_permiso IN (?)
      ORDER BY id_permiso`,
    [ids]
  );
  return filas.map(aPermiso);
}

async function insertar({ nombre, descripcion }, { conexion }) {
  const [resultado] = await conexion.query(
    "INSERT INTO rol (nombre, descripcion, es_base, estado) VALUES (?, ?, FALSE, 'activo')",
    [nombre, descripcion]
  );
  return resultado.insertId;
}

async function actualizar(id, { nombre, descripcion }, { conexion }) {
  await conexion.query('UPDATE rol SET nombre = ?, descripcion = ? WHERE id_rol = ?', [
    nombre,
    descripcion,
    id,
  ]);
}

/** Reemplaza el conjunto de permisos (tabla intermedia: borrado físico permitido, constitución §II). */
async function reemplazarPermisos(id, idsPermisos, { conexion }) {
  await conexion.query('DELETE FROM rol_permiso WHERE id_rol = ?', [id]);
  await conexion.query('INSERT INTO rol_permiso (id_rol, id_permiso) VALUES ?', [
    idsPermisos.map((idPermiso) => [id, idPermiso]),
  ]);
}

async function cambiarEstado(id, estado, { conexion }) {
  await conexion.query('UPDATE rol SET estado = ? WHERE id_rol = ?', [estado, id]);
}

/** RF-ROL-15: catálogo completo en el orden de la semilla. */
async function catalogo() {
  const [filas] = await pool.query(
    'SELECT id_permiso, modulo, accion, codigo, descripcion FROM permiso ORDER BY id_permiso'
  );
  return filas.map(aPermiso);
}

module.exports = {
  listar,
  obtenerPorId,
  permisosDeRol,
  usuariosDeRol,
  buscarPermisos,
  insertar,
  actualizar,
  reemplazarPermisos,
  cambiarEstado,
  catalogo,
};
