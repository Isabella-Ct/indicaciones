// Acceso a datos de usuarios. Nunca selecciona contrasena_hash salvo donde se indica.
const { pool } = require('../../config/db');
const { escaparLike } = require('../../utils/sql');

const COLUMNAS = `
  u.id, u.tipo_documento, u.numero_documento, u.primer_nombre, u.segundo_nombre,
  u.primer_apellido, u.segundo_apellido, u.correo, u.celular, u.foto_url,
  u.debe_cambiar_contrasena, u.estado, u.rol_id, r.nombre AS rol, u.creado_por,
  u.ultimo_acceso, u.created_at, u.updated_at`;

const ORDEN = {
  id: 'u.id',
  nombre: 'u.primer_apellido {dir}, u.primer_nombre',
  documento: 'u.numero_documento',
  rol: 'r.nombre',
  estado: 'u.estado',
};

function filtros({ q, rol, estado }) {
  const condiciones = [];
  const valores = [];
  if (rol) {
    condiciones.push('r.nombre = ?');
    valores.push(rol);
  }
  if (estado) {
    condiciones.push('u.estado = ?');
    valores.push(estado);
  }
  if (q) {
    const texto = escaparLike(q);
    condiciones.push(`(u.numero_documento LIKE ?
      OR CONCAT_WS(' ', u.primer_nombre, u.segundo_nombre, u.primer_apellido, u.segundo_apellido) LIKE ?
      OR u.correo LIKE ?)`);
    valores.push(`${texto}%`, `%${texto}%`, `%${texto}%`);
  }
  return { where: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '', valores };
}

async function listar({ q, rol, estado, orden, dir, limit, offset }) {
  const { where, valores } = filtros({ q, rol, estado });
  const direccion = dir === 'desc' ? 'DESC' : 'ASC';
  const ordenSql = `${ORDEN[orden].replace('{dir}', direccion)} ${direccion}, u.id ASC`;
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS}
       FROM usuarios u JOIN roles r ON r.id = u.rol_id
       ${where}
      ORDER BY ${ordenSql}
      LIMIT ? OFFSET ?`,
    [...valores, limit, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM usuarios u JOIN roles r ON r.id = u.rol_id ${where}`,
    valores
  );
  return { filas, total };
}

async function buscarPorId(id, conexion = pool) {
  const [filas] = await conexion.query(
    `SELECT ${COLUMNAS} FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = ?`,
    [id]
  );
  return filas[0] ?? null;
}

/** Clientes activos cuyo documento empieza por `documento` (user-picker). */
async function buscarClientesActivosPorDocumento(documento, limite = 10) {
  const [filas] = await pool.query(
    `SELECT u.id, u.tipo_documento, u.numero_documento, u.primer_nombre, u.segundo_nombre,
            u.primer_apellido, u.segundo_apellido
       FROM usuarios u JOIN roles r ON r.id = u.rol_id
      WHERE r.nombre = 'usuario' AND u.estado = 'activo' AND u.numero_documento LIKE ?
      ORDER BY u.numero_documento
      LIMIT ?`,
    [`${escaparLike(documento)}%`, limite]
  );
  return filas;
}

async function existeDocumento(tipo, numero, excluirId = 0) {
  const [filas] = await pool.query(
    'SELECT 1 FROM usuarios WHERE tipo_documento = ? AND numero_documento = ? AND id <> ? LIMIT 1',
    [tipo, numero, excluirId]
  );
  return filas.length > 0;
}

async function existeCorreo(correo, excluirId = 0) {
  const [filas] = await pool.query('SELECT 1 FROM usuarios WHERE correo = ? AND id <> ? LIMIT 1', [
    correo,
    excluirId,
  ]);
  return filas.length > 0;
}

async function obtenerRol(id) {
  const [filas] = await pool.query('SELECT id, nombre FROM roles WHERE id = ?', [id]);
  return filas[0] ?? null;
}

async function insertar(datos) {
  const [resultado] = await pool.query(
    `INSERT INTO usuarios
       (tipo_documento, numero_documento, primer_nombre, segundo_nombre, primer_apellido,
        segundo_apellido, correo, celular, foto_url, contrasena_hash, debe_cambiar_contrasena,
        estado, rol_id, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'activo', ?, ?)`,
    [
      datos.tipo_documento,
      datos.numero_documento,
      datos.primer_nombre,
      datos.segundo_nombre ?? null,
      datos.primer_apellido,
      datos.segundo_apellido ?? null,
      datos.correo,
      datos.celular,
      datos.foto_url ?? null,
      datos.contrasena_hash,
      datos.rol_id,
      datos.creado_por,
    ]
  );
  return resultado.insertId;
}

const COLUMNAS_EDITABLES = [
  'tipo_documento',
  'numero_documento',
  'primer_nombre',
  'segundo_nombre',
  'primer_apellido',
  'segundo_apellido',
  'correo',
  'celular',
  'foto_url',
  'rol_id',
];

/** Actualiza solo las columnas permitidas presentes en `campos`. */
async function actualizar(id, campos, conexion = pool) {
  const columnas = COLUMNAS_EDITABLES.filter((c) => c in campos);
  if (columnas.length === 0) return;
  await conexion.query(
    `UPDATE usuarios SET ${columnas.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...columnas.map((c) => campos[c] ?? null), id]
  );
}

async function actualizarEstado(id, estado) {
  await pool.query('UPDATE usuarios SET estado = ? WHERE id = ?', [estado, id]);
}

/** Contraseña temporal: obliga a cambiarla en el próximo inicio de sesión. */
async function restablecerContrasena(id, hash, conexion = pool) {
  await conexion.query(
    'UPDATE usuarios SET contrasena_hash = ?, debe_cambiar_contrasena = 1 WHERE id = ?',
    [hash, id]
  );
}

module.exports = {
  restablecerContrasena,
  listar,
  buscarPorId,
  buscarClientesActivosPorDocumento,
  existeDocumento,
  existeCorreo,
  obtenerRol,
  insertar,
  actualizar,
  actualizarEstado,
};
