// Acceso a datos de autenticación: usuario por documento, permisos del rol, sesiones (jti),
// intentos de acceso (RN-07) y tokens de recuperación (RN-08). Único lugar con SQL del módulo.
const { pool } = require('../../config/db');
const { LOGIN_VENTANA_MIN, TOKEN_RECUPERACION_MIN } = require('../../config/constantes');

/** Único lugar donde se lee contrasena_hash junto con el documento (login y recuperación). */
async function buscarPorDocumento(tipoDocumento, numeroDocumento) {
  const [filas] = await pool.query(
    `SELECT u.id_usuario, u.nombre_completo, u.correo, u.contrasena_hash, u.estado, u.debe_cambiar_contrasena,
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
    `SELECT p.codigo FROM rol_permiso rp JOIN permiso p ON p.id_permiso = rp.id_permiso
      WHERE rp.id_rol = ? ORDER BY p.codigo`,
    [idRol]
  );
  return filas.map((f) => f.codigo);
}

// ---------------------------------------------------------------- sesiones
async function crearSesion({ jti, idUsuario, expiraEn, ip }) {
  await pool.query(
    `INSERT INTO sesion (jti, id_usuario, emitida_en, expira_en, ip)
     VALUES (?, ?, NOW(), FROM_UNIXTIME(?), ?)`,
    [jti, idUsuario, expiraEn, ip ?? null]
  );
}

/** Sesión vigente (no revocada ni vencida) de un usuario activo, o null. Incluye el cambio pendiente. */
async function buscarSesionVigente(jti) {
  const [filas] = await pool.query(
    `SELECT s.id_sesion, s.id_usuario, u.debe_cambiar_contrasena
       FROM sesion s
       JOIN usuario u ON u.id_usuario = s.id_usuario
      WHERE s.jti = ? AND s.revocada_en IS NULL AND s.expira_en > NOW() AND u.estado = 'activo'`,
    [jti]
  );
  return filas[0] ?? null;
}

/** RF-ACC-13: revoca la sesión del token. Devuelve cuántas filas cambió. */
async function revocarSesion(jti) {
  const [r] = await pool.query('UPDATE sesion SET revocada_en = NOW() WHERE jti = ? AND revocada_en IS NULL', [jti]);
  return r.affectedRows;
}

/** Revoca todas las sesiones abiertas del usuario (restablecimiento). */
async function revocarSesionesDe(idUsuario, { conexion }) {
  const [r] = await conexion.query(
    'UPDATE sesion SET revocada_en = NOW() WHERE id_usuario = ? AND revocada_en IS NULL',
    [idUsuario]
  );
  return r.affectedRows;
}

// ---------------------------------------------------------------- intentos (RN-07)
async function registrarIntento({ numeroDocumento, exitoso, ip }) {
  await pool.query(
    'INSERT INTO intento_acceso (numero_documento, exitoso, ip, fecha) VALUES (?, ?, ?, NOW())',
    [numeroDocumento, exitoso, ip ?? null]
  );
}

/** Fallos del documento en la ventana, posteriores a su último ingreso exitoso (data-model.md). */
async function fallosRecientes(numeroDocumento) {
  const [[{ fallos }]] = await pool.query(
    `SELECT COUNT(*) AS fallos FROM intento_acceso
      WHERE numero_documento = ? AND exitoso = FALSE
        AND fecha > NOW() - INTERVAL ? MINUTE
        AND fecha > COALESCE(
          (SELECT MAX(fecha) FROM intento_acceso WHERE numero_documento = ? AND exitoso = TRUE),
          '1000-01-01')`,
    [numeroDocumento, LOGIN_VENTANA_MIN, numeroDocumento]
  );
  return Number(fallos);
}

// ---------------------------------------------------------------- contraseña
async function hashDeUsuario(idUsuario) {
  const [[fila]] = await pool.query('SELECT contrasena_hash FROM usuario WHERE id_usuario = ?', [idUsuario]);
  return fila?.contrasena_hash ?? null;
}

/** Guarda el nuevo hash y deja de exigir el cambio (RF-ACC-04, RF-ACC-12). */
async function guardarContrasena(idUsuario, contrasenaHash, { conexion }) {
  await conexion.query(
    'UPDATE usuario SET contrasena_hash = ?, debe_cambiar_contrasena = FALSE WHERE id_usuario = ?',
    [contrasenaHash, idUsuario]
  );
}

// ---------------------------------------------------------------- recuperación (RN-08)
/** Solo vale el último enlace: invalida los anteriores sin usar. */
async function invalidarTokens(idUsuario, { conexion }) {
  await conexion.query('UPDATE token_recuperacion SET usado = TRUE WHERE id_usuario = ? AND usado = FALSE', [idUsuario]);
}

async function crearToken(idUsuario, tokenHash, { conexion }) {
  await conexion.query(
    `INSERT INTO token_recuperacion (id_usuario, token_hash, expira_en, usado)
     VALUES (?, ?, NOW() + INTERVAL ? MINUTE, FALSE)`,
    [idUsuario, tokenHash, TOKEN_RECUPERACION_MIN]
  );
}

/** Token vigente (no usado ni vencido) de un usuario activo, bloqueado para la transacción. */
async function tokenVigente(tokenHash, { conexion }) {
  const [filas] = await conexion.query(
    `SELECT t.id_token, t.id_usuario
       FROM token_recuperacion t
       JOIN usuario u ON u.id_usuario = t.id_usuario
      WHERE t.token_hash = ? AND t.usado = FALSE AND t.expira_en > NOW() AND u.estado = 'activo'
      FOR UPDATE`,
    [tokenHash]
  );
  return filas[0] ?? null;
}

async function marcarTokenUsado(idToken, { conexion }) {
  await conexion.query('UPDATE token_recuperacion SET usado = TRUE WHERE id_token = ?', [idToken]);
}

module.exports = {
  buscarPorDocumento,
  codigosPermisoDeRol,
  crearSesion,
  buscarSesionVigente,
  revocarSesion,
  revocarSesionesDe,
  registrarIntento,
  fallosRecientes,
  hashDeUsuario,
  guardarContrasena,
  invalidarTokens,
  crearToken,
  tokenVigente,
  marcarTokenUsado,
};
