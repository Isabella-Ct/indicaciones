// Reglas de autenticación: credenciales, estado del usuario, JWT y cambio de contraseña.
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { AppError, errores } = require('../../utils/errores');
const repo = require('./auth.repository');

const COSTO_BCRYPT = 10;
// Hash de relleno: si el documento no existe se compara igual, para no revelar
// por el tiempo de respuesta qué documentos están registrados.
const HASH_RELLENO = bcrypt.hashSync('parko-relleno-no-valido', COSTO_BCRYPT);

/** Forma pública del usuario en sesión (sin contrasena_hash). */
function aSesion(usuario, permisos) {
  const nombres = [usuario.primer_nombre, usuario.segundo_nombre].filter(Boolean).join(' ');
  const apellidos = [usuario.primer_apellido, usuario.segundo_apellido].filter(Boolean).join(' ');
  return {
    id: usuario.id,
    tipo_documento: usuario.tipo_documento,
    numero_documento: usuario.numero_documento,
    nombres,
    apellidos,
    nombre_completo: `${nombres} ${apellidos}`,
    correo: usuario.correo,
    celular: usuario.celular,
    foto_url: usuario.foto_url,
    rol: usuario.rol,
    estado: usuario.estado,
    debe_cambiar_contrasena: Boolean(usuario.debe_cambiar_contrasena),
    ultimo_acceso: usuario.ultimo_acceso,
    permisos,
  };
}

async function obtenerSesion(id) {
  const usuario = await repo.buscarPorId(id);
  if (!usuario) return null;
  return aSesion(usuario, await repo.listarPermisos(id));
}

/** REQ-USR-7, REQ-USR-8 [AJUSTADO]: documento + contraseña para todos los roles. */
async function login({ tipo_documento, numero_documento, contrasena }) {
  const usuario = await repo.buscarPorDocumentoConHash(tipo_documento, numero_documento);
  const coincide = await bcrypt.compare(contrasena, usuario?.contrasena_hash ?? HASH_RELLENO);
  if (!usuario || !coincide) {
    throw new AppError(401, 'CREDENCIALES_INVALIDAS', 'Documento o contraseña incorrectos.');
  }
  // Se informa solo después de validar la contraseña, para no revelar el estado a terceros.
  if (usuario.estado !== 'activo') {
    throw new AppError(
      403,
      'USUARIO_INACTIVO',
      'Tu usuario está inactivo. Comunícate con el administrador del parqueadero.'
    );
  }

  await repo.registrarAcceso(usuario.id);
  const token = jwt.sign({ sub: String(usuario.id), rol: usuario.rol }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
  const { exp } = jwt.decode(token);
  const sesion = await obtenerSesion(usuario.id);
  return { token, expiraEn: new Date(exp * 1000), usuario: sesion };
}

async function cambiarContrasena(usuarioId, { contrasena_actual, contrasena_nueva }) {
  const hashActual = await repo.obtenerHash(usuarioId);
  if (!hashActual) throw errores.noAutenticado();
  if (!(await bcrypt.compare(contrasena_actual, hashActual))) {
    throw errores.validacion(
      [{ campo: 'contrasena_actual', mensaje: 'La contraseña actual no es correcta.' }],
      'La contraseña actual no es correcta.'
    );
  }
  if (await bcrypt.compare(contrasena_nueva, hashActual)) {
    throw errores.validacion(
      [
        {
          campo: 'contrasena_nueva',
          mensaje: 'La nueva contraseña debe ser distinta de la actual.',
        },
      ],
      'La nueva contraseña debe ser distinta de la actual.'
    );
  }
  await repo.actualizarContrasena(usuarioId, await bcrypt.hash(contrasena_nueva, COSTO_BCRYPT));
  return obtenerSesion(usuarioId);
}

module.exports = { login, obtenerSesion, cambiarContrasena };
