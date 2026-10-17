// Acceso a datos de autenticación. Sin lógica de negocio.
const { pool } = require('../../config/db');

const COLUMNAS_USUARIO = `
  u.id, u.tipo_documento, u.numero_documento, u.primer_nombre, u.segundo_nombre,
  u.primer_apellido, u.segundo_apellido, u.correo, u.celular, u.foto_url,
  u.debe_cambiar_contrasena, u.estado, u.ultimo_acceso, r.nombre AS rol`;

/** Incluye contrasena_hash: solo para verificar credenciales, nunca se devuelve. */
async function buscarPorDocumentoConHash(tipoDocumento, numeroDocumento) {
  const [filas] = await pool.execute(
    `SELECT ${COLUMNAS_USUARIO}, u.contrasena_hash
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
      WHERE u.tipo_documento = ? AND u.numero_documento = ?`,
    [tipoDocumento, numeroDocumento]
  );
  return filas[0] ?? null;
}

async function buscarPorId(id) {
  const [filas] = await pool.execute(
    `SELECT ${COLUMNAS_USUARIO}
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
      WHERE u.id = ?`,
    [id]
  );
  return filas[0] ?? null;
}

async function obtenerHash(id) {
  const [filas] = await pool.execute('SELECT contrasena_hash FROM usuarios WHERE id = ?', [id]);
  return filas[0]?.contrasena_hash ?? null;
}

async function listarPermisos(usuarioId) {
  const [filas] = await pool.execute(
    `SELECT p.codigo
       FROM usuarios u
       JOIN roles_permisos rp ON rp.rol_id = u.rol_id
       JOIN permisos p ON p.id = rp.permiso_id
      WHERE u.id = ?
      ORDER BY p.codigo`,
    [usuarioId]
  );
  return filas.map((f) => f.codigo);
}

async function registrarAcceso(id) {
  await pool.execute('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [id]);
}

async function actualizarContrasena(id, hash) {
  await pool.execute(
    'UPDATE usuarios SET contrasena_hash = ?, debe_cambiar_contrasena = 0 WHERE id = ?',
    [hash, id]
  );
}

module.exports = {
  buscarPorDocumentoConHash,
  buscarPorId,
  obtenerHash,
  listarPermisos,
  registrarAcceso,
  actualizarContrasena,
};
