// Reglas de acceso (spec 001 R-04/R-05 y spec 003): inicio de sesión con bloqueo por intentos (RN-07),
// cambio obligatorio de la contraseña temporal (RF-ACC-04), autorregistro de clientes (RF-ACC-07..09),
// recuperación con enlace de un solo uso (RN-08) y cierre de sesión (RF-ACC-13).
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { withTransaction } = require('../../config/db');
const { LOGIN_MAX_FALLIDOS, LOGIN_VENTANA_MIN, TOKEN_RECUPERACION_MIN } = require('../../config/constantes');
const repositorio = require('./auth.repository');
const usuariosRepositorio = require('../usuarios/usuarios.repository');
const { generarTokenRecuperacion, hashToken } = require('./auth.reglas');
const { errores, AppError } = require('../../utils/errores');
const { registrarBitacora } = require('../../utils/bitacora');
const { aIsoBogota } = require('../../utils/fechas');
const { enviarCorreo } = require('../../integrations/correo');

const MENSAJE_GENERICO = 'Documento o contraseña incorrectos.';
const MENSAJE_RECUPERAR = 'Si el documento está registrado, recibirá un correo.';
// Hash ficticio para comparar cuando el documento no existe (mismo tiempo de respuesta).
const HASH_FICTICIO = bcrypt.hashSync(crypto.randomUUID(), env.BCRYPT_COSTO);

// ---------------------------------------------------------------- HU-12, HU-13 · iniciar sesión
/**
 * RF-ACC-01/05: documento + contraseña → token JWT con rol y permisos (fijos en la sesión, RF-ROL-10).
 * RF-ACC-02: mensaje genérico si el documento no existe o la contraseña falla.
 * RF-ACC-03 / RN-07: 5 fallos en 15 min → 429 durante 15 min (spec 003 research R-01).
 * HU-10 E2 / RN-06: con la contraseña correcta, un usuario inactivo recibe el motivo (spec 002 R-05).
 */
async function iniciarSesion({ tipoDocumento, numeroDocumento, contrasena }, { ip } = {}) {
  if ((await repositorio.fallosRecientes(numeroDocumento)) >= LOGIN_MAX_FALLIDOS) {
    throw new AppError(429, 'CUENTA_BLOQUEADA', `Demasiados intentos. Intente en ${LOGIN_VENTANA_MIN} minutos.`);
  }
  const usuario = await repositorio.buscarPorDocumento(tipoDocumento, numeroDocumento);
  const coincide = await bcrypt.compare(contrasena, usuario?.contrasena_hash ?? HASH_FICTICIO);
  if (!usuario || !coincide) {
    await repositorio.registrarIntento({ numeroDocumento, exitoso: false, ip });
    throw errores.noAutenticado(MENSAJE_GENERICO, 'CREDENCIALES_INVALIDAS');
  }
  if (usuario.estado !== 'activo') {
    throw errores.noAutenticado('Usuario inactivo. Comuníquese con el administrador.', 'USUARIO_INACTIVO');
  }
  await repositorio.registrarIntento({ numeroDocumento, exitoso: true, ip });

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

/** Verifica firma, sesión vigente y usuario activo (RNF-SEG-03, RF-USR-13, RF-ACC-13). */
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
    debeCambiarContrasena: Boolean(sesion.debe_cambiar_contrasena),
  };
}

// ---------------------------------------------------------------- HU-12 · cambiar contraseña
/** RF-ACC-04: con la actual correcta y una nueva distinta; deja de exigir el cambio. */
async function cambiarContrasena({ contrasenaActual, contrasenaNueva }, actor) {
  const hashActual = await repositorio.hashDeUsuario(actor.idUsuario);
  if (!hashActual || !(await bcrypt.compare(contrasenaActual, hashActual))) {
    throw errores.noAutenticado('La contraseña actual no es correcta.', 'CONTRASENA_ACTUAL_INCORRECTA');
  }
  if (await bcrypt.compare(contrasenaNueva, hashActual)) {
    throw errores.validacion([{ campo: 'contrasenaNueva', mensaje: 'La nueva contraseña debe ser distinta de la actual.' }]);
  }
  const hashNuevo = await bcrypt.hash(contrasenaNueva, env.BCRYPT_COSTO);
  await withTransaction(async (conexion) => {
    await repositorio.guardarContrasena(actor.idUsuario, hashNuevo, { conexion });
    await registrarBitacora(conexion, {
      idUsuario: actor.idUsuario,
      accion: 'cambiar_contrasena',
      entidad: 'usuario',
      idRegistro: actor.idUsuario,
      nuevo: { debeCambiarContrasena: false },
      ip: actor.ip,
    });
  });
  return { mensaje: 'Contraseña actualizada.' };
}

// ---------------------------------------------------------------- HU-14 · autorregistro
/** RF-ACC-07..09: siempre rol Cliente, contraseña elegida por el titular (sin cambio obligatorio). */
async function registrarme({ contrasena, confirmacion: _c, aceptaTratamientoDatos: _a, ...datos }, { ip } = {}) {
  const contrasenaHash = await bcrypt.hash(contrasena, env.BCRYPT_COSTO);
  const idRol = await usuariosRepositorio.idRolCliente();
  let id;
  try {
    id = await withTransaction(async (conexion) => {
      const idUsuario = await usuariosRepositorio.insertar(
        { ...datos, idRol, contrasenaHash, debeCambiarContrasena: false },
        { conexion }
      );
      await registrarBitacora(conexion, {
        idUsuario,
        accion: 'autorregistro',
        entidad: 'usuario',
        idRegistro: idUsuario,
        nuevo: { ...datos, idRol, estado: 'activo' },
        ip,
      });
      return idUsuario;
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' && String(error.message).includes('uq_usuario_documento')) {
      throw errores.conflicto('Ya existe una cuenta con este documento. Use Recuperar contraseña.', 'CUENTA_EXISTENTE');
    }
    if (error.code === 'ER_DUP_ENTRY' && String(error.message).includes('uq_usuario_correo')) {
      throw errores.conflicto('El correo ya está registrado.', 'CORREO_DUPLICADO');
    }
    throw error;
  }
  const { claveFoto: _f, rolEsBase: _b, ...usuario } = await usuariosRepositorio.obtenerPorId(id);
  return usuario;
}

// ---------------------------------------------------------------- HU-15 · recuperar y restablecer
/**
 * RF-ACC-10/11, RN-08: siempre la misma respuesta. Si el usuario existe y está activo, se guarda el hash
 * de un token nuevo (los anteriores quedan inválidos) y se envía el enlace sin esperar al correo.
 */
async function recuperar({ tipoDocumento, numeroDocumento }) {
  const usuario = await repositorio.buscarPorDocumento(tipoDocumento, numeroDocumento);
  if (usuario && usuario.estado === 'activo') {
    const token = generarTokenRecuperacion();
    await withTransaction(async (conexion) => {
      await repositorio.invalidarTokens(usuario.id_usuario, { conexion });
      await repositorio.crearToken(usuario.id_usuario, hashToken(token), { conexion });
    });
    const enlace = `${env.URL_PUBLICA}/restablecer.html?token=${token}`;
    setImmediate(() =>
      enviarCorreo({
        para: usuario.correo,
        asunto: 'Recuperación de contraseña — Parking Lot ABC',
        texto: [
          `Hola, ${usuario.nombre_completo}.`,
          '',
          'Recibimos una solicitud para restablecer su contraseña. Use este enlace:',
          enlace,
          '',
          `El enlace sirve una sola vez y vence en ${TOKEN_RECUPERACION_MIN} minutos.`,
          'Si usted no lo pidió, ignore este correo: su contraseña actual sigue funcionando.',
        ].join('\n'),
      })
    );
  }
  return { mensaje: MENSAJE_RECUPERAR };
}

/** RF-ACC-12, RN-08: enlace vigente → contraseña nueva, enlace usado y sesiones cerradas. */
async function restablecer({ token, contrasenaNueva }, { ip } = {}) {
  const contrasenaHash = await bcrypt.hash(contrasenaNueva, env.BCRYPT_COSTO);
  await withTransaction(async (conexion) => {
    const vigente = await repositorio.tokenVigente(hashToken(token), { conexion });
    if (!vigente) throw errores.conflicto('El enlace no es válido o expiró.', 'ENLACE_INVALIDO');
    await repositorio.guardarContrasena(vigente.id_usuario, contrasenaHash, { conexion });
    await repositorio.marcarTokenUsado(vigente.id_token, { conexion });
    const sesionesRevocadas = await repositorio.revocarSesionesDe(vigente.id_usuario, { conexion });
    await registrarBitacora(conexion, {
      idUsuario: vigente.id_usuario,
      accion: 'restablecer_contrasena',
      entidad: 'usuario',
      idRegistro: vigente.id_usuario,
      nuevo: { sesionesRevocadas },
      ip,
    });
  });
  return { mensaje: 'Contraseña actualizada. Inicie sesión con su nueva contraseña.' };
}

// ---------------------------------------------------------------- HU-16 · cerrar sesión
/** RF-ACC-13: el token deja de servir de inmediato. */
async function cerrarSesion(actor) {
  await repositorio.revocarSesion(actor.jti);
}

module.exports = {
  iniciarSesion,
  verificarToken,
  cambiarContrasena,
  registrarme,
  recuperar,
  restablecer,
  cerrarSesion,
};
