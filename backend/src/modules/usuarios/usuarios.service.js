// Reglas de negocio de usuarios — REQ-USR-2..6.
const bcrypt = require('bcrypt');
const { enTransaccion } = require('../../config/db');
const { ROLES } = require('../../config/constantes');
const { AppError, errores } = require('../../utils/errores');
const { aLimites, meta } = require('../../utils/paginacion');
const { guardarImagen, eliminarArchivo } = require('../../utils/archivos');
const notificaciones = require('../notificaciones/notificaciones.service');
const repo = require('./usuarios.repository');

const COSTO_BCRYPT = 10;
const CARPETA_FOTOS = 'usuarios';

const ETIQUETAS_CAMPO = {
  primer_nombre: 'primer nombre',
  segundo_nombre: 'segundo nombre',
  primer_apellido: 'primer apellido',
  segundo_apellido: 'segundo apellido',
  correo: 'correo',
  celular: 'celular',
  foto_url: 'foto',
};

function nombreCompleto(u) {
  return [u.primer_nombre, u.segundo_nombre, u.primer_apellido, u.segundo_apellido]
    .filter(Boolean)
    .join(' ');
}

/** Forma pública del usuario (sin contrasena_hash). */
function aPublico(u) {
  return {
    id: u.id,
    tipo_documento: u.tipo_documento,
    numero_documento: u.numero_documento,
    primer_nombre: u.primer_nombre,
    segundo_nombre: u.segundo_nombre,
    primer_apellido: u.primer_apellido,
    segundo_apellido: u.segundo_apellido,
    nombre_completo: nombreCompleto(u),
    correo: u.correo,
    celular: u.celular,
    foto_url: u.foto_url,
    rol_id: u.rol_id,
    rol: u.rol,
    estado: u.estado,
    debe_cambiar_contrasena: Boolean(u.debe_cambiar_contrasena),
    ultimo_acceso: u.ultimo_acceso,
    created_at: u.created_at,
  };
}

/** Forma reducida para el user-picker (operador): sin correo, celular ni rol. */
function aResumen(u) {
  return {
    id: u.id,
    tipo_documento: u.tipo_documento,
    numero_documento: u.numero_documento,
    nombre_completo: nombreCompleto(u),
  };
}

async function validarUnicos({ tipo_documento, numero_documento, correo }, excluirId) {
  if (await repo.existeDocumento(tipo_documento, numero_documento, excluirId)) {
    throw new AppError(
      409,
      'DOCUMENTO_DUPLICADO',
      `Ya existe un usuario con el documento ${tipo_documento} ${numero_documento}.`,
      [{ campo: 'numero_documento', mensaje: 'Este documento ya está registrado.' }]
    );
  }
  if (await repo.existeCorreo(correo, excluirId)) {
    throw new AppError(409, 'CORREO_DUPLICADO', `El correo ${correo} ya está registrado.`, [
      { campo: 'correo', mensaje: 'Este correo ya está registrado.' },
    ]);
  }
}

async function obtenerExistente(id) {
  const usuario = await repo.buscarPorId(id);
  if (!usuario) throw errores.noEncontrado('El usuario no existe.');
  return usuario;
}

async function listar(filtros) {
  const { filas, total } = await repo.listar({ ...filtros, ...aLimites(filtros) });
  return { data: filas.map(aPublico), meta: meta(filtros, total) };
}

/** Admin ve cualquiera; los demás solo a sí mismos. */
async function obtener(id, solicitante) {
  if (id !== solicitante.id && !solicitante.permisos.includes('usuarios.ver')) {
    throw errores.prohibido('Solo puedes consultar tus propios datos.');
  }
  return aPublico(await obtenerExistente(id));
}

async function buscarClientes(documento) {
  return (await repo.buscarClientesActivosPorDocumento(documento)).map(aResumen);
}

/** Cliente activo apto para ser propietario de un vehículo (lo usa el módulo vehiculos). */
async function obtenerClienteActivo(id) {
  const usuario = await repo.buscarPorId(id);
  if (!usuario || usuario.rol !== ROLES.USUARIO || usuario.estado !== 'activo') return null;
  return aResumen(usuario);
}

/** REQ-USR-2: admin y operador crean usuarios; el operador no crea administradores. */
async function crear(datos, imagen, solicitante) {
  const rol = await repo.obtenerRol(datos.rol_id);
  if (!rol) {
    throw errores.validacion([{ campo: 'rol_id', mensaje: 'El rol seleccionado no existe.' }]);
  }
  if (
    rol.nombre === ROLES.ADMINISTRADOR &&
    !solicitante.permisos.includes('usuarios.crear_administrador')
  ) {
    throw errores.prohibido('Los operadores no pueden crear usuarios administradores.');
  }
  await validarUnicos(datos);

  const foto_url = imagen ? await guardarImagen(imagen, CARPETA_FOTOS) : null;
  try {
    const id = await repo.insertar({
      ...datos,
      foto_url,
      contrasena_hash: await bcrypt.hash(datos.contrasena_temporal, COSTO_BCRYPT),
      creado_por: solicitante.id,
    });
    return aPublico(await repo.buscarPorId(id));
  } catch (err) {
    await eliminarArchivo(foto_url);
    throw err;
  }
}

/** Resuelve la foto nueva / quitada. Devuelve { foto_url?, anterior } */
async function resolverFoto(actual, imagen, quitar) {
  if (imagen)
    return { foto_url: await guardarImagen(imagen, CARPETA_FOTOS), anterior: actual.foto_url };
  if (quitar && actual.foto_url) return { foto_url: null, anterior: actual.foto_url };
  return { anterior: null };
}

/** REQ-USR-5: el administrador edita los datos de cualquier usuario. */
async function actualizar(id, datos, imagen, solicitante) {
  const actual = await obtenerExistente(id);
  const rol = await repo.obtenerRol(datos.rol_id);
  if (!rol) {
    throw errores.validacion([{ campo: 'rol_id', mensaje: 'El rol seleccionado no existe.' }]);
  }
  if (id === solicitante.id && rol.nombre !== ROLES.ADMINISTRADOR) {
    throw new AppError(409, 'ACCION_SOBRE_SI_MISMO', 'No puedes quitarte el rol de administrador.');
  }
  await validarUnicos(datos, id);

  const { quitar_foto, ...campos } = datos;
  const foto = await resolverFoto(actual, imagen, quitar_foto);
  if ('foto_url' in foto) campos.foto_url = foto.foto_url;
  try {
    await repo.actualizar(id, campos);
  } catch (err) {
    if (imagen) await eliminarArchivo(foto.foto_url);
    throw err;
  }
  await eliminarArchivo(foto.anterior);
  return aPublico(await repo.buscarPorId(id));
}

/** REQ-USR-3: solo el administrador activa/inactiva; nunca a sí mismo. */
async function cambiarEstado(id, estado, solicitante) {
  if (id === solicitante.id) {
    throw new AppError(
      409,
      'ACCION_SOBRE_SI_MISMO',
      'No puedes cambiar el estado de tu propio usuario.'
    );
  }
  await obtenerExistente(id);
  await repo.actualizarEstado(id, estado);
  return aPublico(await repo.buscarPorId(id));
}

async function obtenerMiPerfil(id) {
  return aPublico(await obtenerExistente(id));
}

/**
 * REQ-USR-4: cada usuario edita sus nombres, correo, celular y foto.
 * Si algo cambió, notifica a todos los administradores con los campos cambiados.
 */
async function actualizarMiPerfil(usuarioId, datos, imagen) {
  const actual = await obtenerExistente(usuarioId);
  if (await repo.existeCorreo(datos.correo, usuarioId)) {
    throw new AppError(409, 'CORREO_DUPLICADO', `El correo ${datos.correo} ya está registrado.`, [
      { campo: 'correo', mensaje: 'Este correo ya está registrado.' },
    ]);
  }

  const { quitar_foto, ...campos } = datos;
  const cambiados = Object.keys(campos).filter((c) => (campos[c] ?? null) !== (actual[c] ?? null));
  const foto = await resolverFoto(actual, imagen, quitar_foto);
  if ('foto_url' in foto) {
    campos.foto_url = foto.foto_url;
    cambiados.push('foto_url');
  }
  if (cambiados.length === 0) return { usuario: aPublico(actual), cambiados: [] };

  try {
    await enTransaccion(async (conexion) => {
      await repo.actualizar(usuarioId, campos, conexion);
      await notificaciones.notificar(
        {
          rol: 'administrador',
          titulo: 'Un usuario actualizó sus datos',
          mensaje: `${nombreCompleto(actual)} (${actual.tipo_documento} ${actual.numero_documento}) cambió: ${cambiados
            .map((c) => ETIQUETAS_CAMPO[c])
            .join(', ')}.`,
          tipo: 'perfil_actualizado',
          enlace: `/app/usuarios.html?id=${usuarioId}`,
          excluirUsuarioId: usuarioId,
        },
        conexion
      );
    });
  } catch (err) {
    if (imagen) await eliminarArchivo(foto.foto_url);
    throw err;
  }
  await eliminarArchivo(foto.anterior);
  return { usuario: aPublico(await repo.buscarPorId(usuarioId)), cambiados };
}

module.exports = {
  listar,
  obtener,
  buscarClientes,
  obtenerClienteActivo,
  crear,
  actualizar,
  cambiarEstado,
  obtenerMiPerfil,
  actualizarMiPerfil,
};
