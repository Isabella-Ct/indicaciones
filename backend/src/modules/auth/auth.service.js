// Reglas de autenticación (research R-04, R-05). Login mínimo de la fundación; la spec 003
// agrega el bloqueo por intentos (RN-07), cambio y recuperación de contraseña y cierre de sesión.
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const repositorio = require('./auth.repository');
const { errores } = require('../../utils/errores');
const { aIsoBogota } = require('../../utils/fechas');

const MENSAJE_GENERICO = 'Documento o contraseña incorrectos.';
// Hash ficticio para comparar cuando el documento no existe (mismo tiempo de respuesta).
const HASH_FICTICIO = bcrypt.hashSync(crypto.randomUUID(), env.BCRYPT_COSTO);

/**
 * RF-ACC-01/05: documento + contraseña → token JWT con rol y permisos (fijos en la sesión, RF-ROL-10).
 * RF-ACC-02 / RN-06: mismo mensaje si el documento no existe, la contraseña falla o el usuario está inactivo.
 */
async function iniciarSesion({ tipoDocumento, numeroDocumento, contrasena }, { ip } = {}) {
  const usuario = await repositorio.buscarPorDocumento(tipoDocumento, numeroDocumento);
  const coincide = await bcrypt.compare(contrasena, usuario?.contrasena_hash ?? HASH_FICTICIO);
  if (!usuario || !coincide || usuario.estado !== 'activo') {
    throw errores.noAutenticado(MENSAJE_GENERICO, 'CREDENCIALES_INVALIDAS');
  }

  const permisos = await repositorio.codigosPermisoDeRol(usuario.id_rol);
  const jti = crypto.randomUUID();
  const token = jwt.sign({ rol: usuario.rol, permisos }, env.JWT_SECRET, {
    subject: String(usuario.id_usuario),
    jwtid: jti,
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
  const { exp } = jwt.decode(token);
  await repositorio.crearSesion({ jti, idUsuario: usuario.id_usuario, expiraEn: exp, ip });

  return {
    token,
    expiraEn: aIsoBogota(new Date(exp * 1000)),
    usuario: {
      idUsuario: usuario.id_usuario,
      nombreCompleto: usuario.nombre_completo,
      rol: usuario.rol,
      debeCambiarContrasena: Boolean(usuario.debe_cambiar_contrasena),
    },
    permisos,
  };
}

/** Verifica firma, sesión vigente y usuario activo (RNF-SEG-03, RF-USR-13). */
async function verificarToken(token) {
  let carga;
  try {
    carga = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw errores.noAutenticado();
  }
  const sesion = carga.jti ? await repositorio.buscarSesionVigente(carga.jti) : null;
  if (!sesion || String(sesion.id_usuario) !== carga.sub) throw errores.noAutenticado();
  return {
    idUsuario: sesion.id_usuario,
    rol: carga.rol,
    permisos: Array.isArray(carga.permisos) ? carga.permisos : [],
    jti: carga.jti,
  };
}

module.exports = { iniciarSesion, verificarToken };
