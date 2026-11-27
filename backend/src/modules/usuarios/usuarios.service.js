// Reglas de negocio de usuarios (spec 002): RN-02, RN-05, RN-06, RF-USR-01..17.
// No conoce req/res. Escrituras en transacción con bitácora; correos y borrado de archivos
// viejos solo después del commit (research R-01, R-03).
const bcrypt = require('bcrypt');
const env = require('../../config/env');
const { withTransaction } = require('../../config/db');
const repositorio = require('./usuarios.repository');
const { generarContrasenaTemporal, diferencias, mensajeCambioDatos } = require('./usuarios.reglas');
const { errores } = require('../../utils/errores');
const { registrarBitacora } = require('../../utils/bitacora');
const { aLimites, meta } = require('../../utils/paginacion');
const { guardarFoto, borrarFoto, rutaFoto, tipoDeClave } = require('../../utils/archivos');
const { enviarCorreo } = require('../../integrations/correo');

const NO_ENCONTRADO = () => errores.noEncontrado('Usuario no encontrado.', 'USUARIO_NO_ENCONTRADO');
const ROL_NO_ASIGNABLE = () =>
  errores.validacion([{ campo: 'idRol', mensaje: 'Seleccione un rol activo.' }]);

/** research R-08: sin `usuarios.editar` el alcance se limita a usuarios con rol Cliente. */
const alcanceTotal = (actor) => actor.permisos.includes('usuarios.editar');

/** Representación pública: sin la clave interna de la foto ni datos de autenticación. */
function publico(usuario) {
  if (!usuario) return usuario;
  const { claveFoto: _clave, rolEsBase: _base, ...resto } = usuario;
  return resto;
}

/** Datos comparables para la bitácora (RF-USR-11). */
const plano = (u) => ({
  tipoDocumento: u.tipoDocumento,
  numeroDocumento: u.numeroDocumento,
  nombreCompleto: u.nombreCompleto,
  correo: u.correo,
  celular: u.celular,
  idRol: u.rol.idRol,
});

/** RF-USR-03 / RF-USR-10: duplicados del UNIQUE de la BD → 409 con el campo afectado. */
function traducirDuplicado(error) {
  if (error.code === 'ER_DUP_ENTRY') {
    const mensaje = String(error.message);
    if (mensaje.includes('uq_usuario_documento')) {
      throw errores.conflicto('El documento ya está registrado.', 'DOCUMENTO_DUPLICADO');
    }
    if (mensaje.includes('uq_usuario_correo')) {
      throw errores.conflicto('El correo ya está registrado.', 'CORREO_DUPLICADO');
    }
  }
  throw error;
}

async function asegurarRolActivo(idRol, conexion) {
  const rol = await repositorio.rolAsignable(idRol, { conexion });
  if (!rol || rol.estado !== 'activo') throw ROL_NO_ASIGNABLE();
  return rol;
}

/** RF-USR-08: el Operador solo puede ver o tocar usuarios con rol Cliente. */
async function asegurarAlcance(usuario, actor) {
  if (alcanceTotal(actor)) return;
  if (usuario.rol.idRol !== (await repositorio.idRolCliente())) throw errores.sinPermiso();
}

// ---------------------------------------------------------------- HU-07 · registrar
/** RF-USR-01..05, RF-ROL-14, RN-05. Devuelve el usuario y si salió el correo. */
async function crear(datos, foto, actor) {
  if (!alcanceTotal(actor) && datos.idRol !== (await repositorio.idRolCliente())) {
    throw errores.sinPermiso(); // RF-USR-04
  }
  const contrasena = generarContrasenaTemporal();
  const contrasenaHash = await bcrypt.hash(contrasena, env.BCRYPT_COSTO);
  const claveFoto = foto ? await guardarFoto(foto.buffer, foto.ext) : null;

  let id;
  try {
    id = await withTransaction(async (conexion) => {
      await asegurarRolActivo(datos.idRol, conexion);
      const { aceptaTratamientoDatos: _a, ...campos } = datos;
      const idUsuario = await repositorio.insertar({ ...campos, claveFoto, contrasenaHash }, { conexion });
      await registrarBitacora(conexion, {
        idUsuario: actor.idUsuario,
        accion: 'crear',
        entidad: 'usuario',
        idRegistro: idUsuario,
        nuevo: { ...campos, estado: 'activo', foto: Boolean(claveFoto) },
        ip: actor.ip,
      });
      return idUsuario;
    });
  } catch (error) {
    if (claveFoto) await borrarFoto(claveFoto);
    return traducirDuplicado(error);
  }

  const correoEnviado = await enviarCorreo({
    para: datos.correo,
    asunto: 'Su cuenta en Parking Lot ABC',
    texto: [
      `Hola, ${datos.nombreCompleto}.`,
      '',
      'Se creó su cuenta en el Sistema de Gestión de Parqueadero de Parking Lot ABC.',
      `Usuario: ${datos.tipoDocumento} ${datos.numeroDocumento}`,
      `Contraseña temporal: ${contrasena}`,
      '',
      'Por seguridad, el sistema le pedirá cambiarla en su primer inicio de sesión.',
    ].join('\n'),
  });
  return { ...publico(await repositorio.obtenerPorId(id)), correoEnviado };
}

// ---------------------------------------------------------------- HU-08 · consultar
/** RF-USR-06, RF-USR-08: el Operador siempre ve solo Clientes. */
async function listar({ page, limit, q, rol, estado }, actor) {
  const idRol = alcanceTotal(actor) ? rol : await repositorio.idRolCliente();
  const { usuarios, total } = await repositorio.listar({ q, idRol, estado, ...aLimites({ page, limit }) });
  return { data: usuarios, meta: meta({ page, limit }, total) };
}

/** RF-USR-07: detalle con vehículos y membresía vigente, sin datos de autenticación. */
async function obtener(id, actor) {
  const usuario = await repositorio.obtenerPorId(id);
  if (!usuario) throw NO_ENCONTRADO();
  await asegurarAlcance(usuario, actor);
  const [vehiculos, membresiaVigente] = await Promise.all([
    repositorio.vehiculosDe(id),
    repositorio.membresiaVigente(id),
  ]);
  return { ...publico(usuario), vehiculos, membresiaVigente };
}

/** [Propuesta] foto privada: la propia (perfil.ver) o dentro del alcance (usuarios.ver). */
async function foto(id, actor) {
  const usuario = await repositorio.obtenerPorId(id);
  const propia = actor.idUsuario === id && actor.permisos.includes('perfil.ver');
  if (!propia) {
    if (!actor.permisos.includes('usuarios.ver')) throw errores.sinPermiso();
    if (!usuario) throw NO_ENCONTRADO();
    await asegurarAlcance(usuario, actor);
  }
  const ruta = usuario?.claveFoto ? rutaFoto(usuario.claveFoto) : null;
  if (!ruta) throw errores.noEncontrado('El usuario no tiene foto.', 'FOTO_NO_ENCONTRADA');
  return { ruta, tipo: tipoDeClave(usuario.claveFoto) };
}

// ---------------------------------------------------------------- HU-09 / HU-11 · actualizar
/**
 * Aplica cambios de datos y foto en una transacción con bitácora. `campos` son los datos nuevos
 * ya validados; `accion` es 'editar' (administrador) o 'editar_perfil' (el propio usuario).
 * `antesDeGuardar(usuario, conexion)` permite validar o bloquear dentro de la transacción y
 * `despuesDeDiferencias(dif, usuario, conexion)` escribir notificaciones en la misma transacción.
 */
async function aplicarCambios(id, campos, { foto: archivo, quitarFoto }, actor, opciones) {
  const claveNueva = archivo ? await guardarFoto(archivo.buffer, archivo.ext) : null;
  let claveVieja = null;
  let resultado;
  try {
    resultado = await withTransaction(async (conexion) => {
      const usuario = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
      if (!usuario) throw NO_ENCONTRADO();
      await opciones.antesDeGuardar?.(usuario, conexion);

      const dif = diferencias(plano(usuario), campos);
      const cambiaFoto = Boolean(claveNueva) || (quitarFoto === true && Boolean(usuario.claveFoto));
      if (cambiaFoto) {
        dif.anterior.foto = Boolean(usuario.claveFoto);
        dif.nuevo.foto = Boolean(claveNueva);
        dif.campos.push('foto');
      }
      if (dif.campos.length === 0) return { usuario, dif };

      const cambios = Object.fromEntries(dif.campos.filter((c) => c !== 'foto').map((c) => [c, campos[c]]));
      if (cambiaFoto) {
        cambios.claveFoto = claveNueva;
        claveVieja = usuario.claveFoto;
      }
      await repositorio.actualizar(id, cambios, { conexion });
      await registrarBitacora(conexion, {
        idUsuario: actor.idUsuario,
        accion: opciones.accion,
        entidad: 'usuario',
        idRegistro: id,
        anterior: dif.anterior,
        nuevo: dif.nuevo,
        ip: actor.ip,
      });
      const extra = await opciones.despuesDeDiferencias?.(dif, usuario, conexion);
      return { usuario, dif, extra };
    });
  } catch (error) {
    if (claveNueva) await borrarFoto(claveNueva);
    return traducirDuplicado(error);
  }
  if (claveVieja) await borrarFoto(claveVieja);
  return resultado;
}

/** HU-09 · RF-USR-09..11 (solo Administrador, por la ruta). */
async function actualizar(id, { quitarFoto, ...datos }, archivo, actor) {
  await aplicarCambios(id, datos, { foto: archivo, quitarFoto }, actor, {
    accion: 'editar',
    antesDeGuardar: async (usuario, conexion) => {
      if (datos.idRol !== usuario.rol.idRol) await asegurarRolActivo(datos.idRol, conexion);
    },
  });
  return obtener(id, actor);
}

// ---------------------------------------------------------------- HU-10 · estado
/** RF-USR-12..14, RN-06: inactivar revoca las sesiones abiertas. */
async function cambiarEstado(id, estado, actor) {
  return withTransaction(async (conexion) => {
    const usuario = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!usuario) throw NO_ENCONTRADO();
    if (estado === 'inactivo' && id === actor.idUsuario) {
      throw errores.conflicto('No puede inactivar su propia cuenta.', 'AUTOINACTIVACION');
    }
    if (usuario.estado === estado) return publico(usuario);
    await repositorio.cambiarEstado(id, estado, { conexion });
    if (estado === 'inactivo') await repositorio.revocarSesiones(id, { conexion });
    await registrarBitacora(conexion, {
      idUsuario: actor.idUsuario,
      accion: 'cambiar_estado',
      entidad: 'usuario',
      idRegistro: id,
      anterior: { estado: usuario.estado },
      nuevo: { estado },
      ip: actor.ip,
    });
    return publico(await repositorio.obtenerPorId(id, { conexion }));
  });
}

// ---------------------------------------------------------------- HU-11 · mis datos
/** RF-USR-15: mis datos. */
async function misDatos(actor) {
  const usuario = await repositorio.obtenerPorId(actor.idUsuario);
  if (!usuario) throw NO_ENCONTRADO();
  return publico(usuario);
}

/** RF-USR-15..17: solo nombre, correo, celular y foto; avisa a los Administradores (RF-USR-16). */
async function actualizarMisDatos({ quitarFoto, ...datos }, archivo, actor) {
  const resultado = await aplicarCambios(actor.idUsuario, datos, { foto: archivo, quitarFoto }, actor, {
    accion: 'editar_perfil',
    despuesDeDiferencias: async (dif, usuario, conexion) => {
      const admins = await repositorio.administradoresActivos(actor.idUsuario, { conexion });
      const aviso = {
        titulo: 'Actualización de datos personales',
        mensaje: mensajeCambioDatos({ nombreCompleto: usuario.nombreCompleto, idUsuario: usuario.idUsuario }, dif),
      };
      const ids = await repositorio.insertarNotificaciones(admins, aviso, { conexion });
      return { aviso, destinatarios: admins.map((a, i) => ({ ...a, idNotificacion: ids[i] })) };
    },
  });

  // Correos después del commit; si uno falla, la notificación interna queda igual (spec 014 reintenta).
  for (const destino of resultado.extra?.destinatarios ?? []) {
    const enviado = await enviarCorreo({
      para: destino.correo,
      asunto: resultado.extra.aviso.titulo,
      texto: resultado.extra.aviso.mensaje,
    });
    if (enviado) await repositorio.marcarNotificacionEnviada(destino.idNotificacion);
  }
  return misDatos(actor);
}

module.exports = { crear, listar, obtener, foto, actualizar, cambiarEstado, misDatos, actualizarMisDatos };
