// Acceso a datos de autenticación: usuario por documento, permisos del rol y sesiones (jti).
const { pool } = require('../../config/db');

/** Único lugar donde se lee contrasena_hash (login). */
async function buscarPorDocumento(tipoDocumento, numeroDocumento) {
  const [filas] = await pool.query(
    `SELECT u.id_usuario, u.nombre_completo, u.contrasena_hash, u.estado, u.debe_cambiar_contrasena,
            r.id_rol, r.nombre AS rol
       FROM usuario u
       JOIN rol r ON r.id_rol = u.id_rol
      WHERE u.tipo_documento = ? AND u.numero_documento = ?`,
    [tipoDocumento, numeroDocumento]
  );
  return filas[0] ?? null;
}

async function codigosPermisoDeRol(idRol) {
  const [filas] = await pool.query(
    `SELECT p.codigo
       FROM rol_permiso rp
       JOIN permiso p ON p.id_permiso = rp.id_permiso
      WHERE rp.id_rol = ?
      ORDER BY p.codigo`,
    [idRol]
  );
  return filas.map((f) => f.codigo);
}

async function crearSesion({ jti, idUsuario, expiraEn, ip }) {
  await pool.query(
    `INSERT INTO sesion (jti, id_usuario, emitida_en, expira_en, ip)
     VALUES (?, ?, NOW(), FROM_UNIXTIME(?), ?)`,
    [jti, idUsuario, expiraEn, ip ?? null]
  );
}

/** Sesión vigente (no revocada ni vencida) de un usuario activo, o null. */
async function buscarSesionVigente(jti) {
  const [filas] = await pool.query(
    `SELECT s.id_sesion, s.id_usuario
       FROM sesion s
       JOIN usuario u ON u.id_usuario = s.id_usuario
      WHERE s.jti = ?
        AND s.revocada_en IS NULL
        AND s.expira_en > NOW()
        AND u.estado = 'activo'`,
    [jti]
  );
  return filas[0] ?? null;
}

module.exports = { buscarPorDocumento, codigosPermisoDeRol, crearSesion, buscarSesionVigente };
