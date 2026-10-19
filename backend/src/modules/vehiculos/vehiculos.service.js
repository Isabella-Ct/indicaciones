// Reglas de negocio de vehículos — REQ-CAR-1..3, REQ-USR-6.
const { enTransaccion } = require('../../config/db');
const { AppError, errores } = require('../../utils/errores');
const { aLimites, meta } = require('../../utils/paginacion');
const { normalizarPlaca } = require('../../utils/placas');
const usuariosService = require('../usuarios/usuarios.service');
const repo = require('./vehiculos.repository');

function aPublico(v) {
  return {
    id: v.id,
    placa: v.placa,
    tipo: v.tipo,
    color: v.color,
    marca: v.marca,
    modelo: v.modelo,
    activo: Boolean(v.activo),
    propietario: v.usuario_id
      ? {
          id: v.usuario_id,
          nombre_completo: v.prop_nombre,
          tipo_documento: v.prop_tipo_documento,
          numero_documento: v.prop_numero_documento,
        }
      : null,
    created_at: v.created_at,
  };
}

const persona = (id, nombre, tipo, numero) =>
  id ? { id, nombre_completo: nombre, tipo_documento: tipo, numero_documento: numero } : null;

async function obtenerExistente(id) {
  const vehiculo = await repo.buscarPorId(id);
  if (!vehiculo) throw errores.noEncontrado('El vehículo no existe.');
  return vehiculo;
}

async function validarPlacaUnica(placa, excluirId) {
  if (await repo.existePlaca(placa, excluirId)) {
    throw new AppError(409, 'PLACA_DUPLICADA', `Ya existe un vehículo con la placa ${placa}.`, [
      { campo: 'placa', mensaje: 'Esta placa ya está registrada.' },
    ]);
  }
}

/** Solo clientes activos pueden ser propietarios (decisión Fase 1). */
async function validarPropietario(usuarioId) {
  const cliente = await usuariosService.obtenerClienteActivo(usuarioId);
  if (!cliente) {
    throw errores.validacion(
      [{ campo: 'usuario_id', mensaje: 'El propietario debe ser un cliente activo.' }],
      'El propietario debe ser un cliente activo.'
    );
  }
  return cliente;
}

async function listar(filtros) {
  const { filas, total } = await repo.listar({ ...filtros, ...aLimites(filtros) });
  return { data: filas.map(aPublico), meta: meta(filtros, total) };
}

async function obtener(id) {
  return aPublico(await obtenerExistente(id));
}

/** Búsqueda exacta por placa (se usará en entradas y salidas). */
async function obtenerPorPlaca(placa) {
  const vehiculo = await repo.buscarPorPlaca(normalizarPlaca(placa));
  if (!vehiculo) throw errores.noEncontrado(`No hay un vehículo registrado con la placa ${placa}.`);
  return aPublico(vehiculo);
}

/** REQ-CAR-1 (+ REQ-USR-6 si llega usuario_id). */
async function crear(datos, solicitante) {
  await validarPlacaUnica(datos.placa);
  if (datos.usuario_id) await validarPropietario(datos.usuario_id);

  const id = await enTransaccion(async (conexion) => {
    const nuevoId = await repo.insertar({ ...datos, creado_por: solicitante.id }, conexion);
    if (datos.usuario_id) {
      await repo.insertarHistorial(
        {
          vehiculo_id: nuevoId,
          usuario_anterior_id: null,
          usuario_nuevo_id: datos.usuario_id,
          cambiado_por: solicitante.id,
          motivo: 'Registro del vehículo',
        },
        conexion
      );
    }
    return nuevoId;
  });
  return aPublico(await repo.buscarPorId(id));
}

/** REQ-CAR-2: solo el administrador actualiza los datos (el propietario va aparte). */
async function actualizar(id, datos) {
  const actual = await obtenerExistente(id);
  await validarPlacaUnica(datos.placa, id);
  const enCurso = await repo.tieneEstadiaAbierta(id);
  if (enCurso && (!datos.activo || datos.tipo !== actual.tipo || datos.placa !== actual.placa)) {
    throw new AppError(
      409,
      'VEHICULO_DENTRO',
      'El vehículo está dentro del parqueadero: registra su salida antes de cambiar la placa, el tipo o inactivarlo.'
    );
  }
  await repo.actualizar(id, datos);
  return aPublico(await repo.buscarPorId(id));
}

/**
 * Asigna o cambia el propietario.
 * - Sin propietario → cualquiera con vehiculos.crear (admin/operador; REQ-USR-6).
 * - Con propietario → solo con vehiculos.reasignar (admin; REQ-CAR-3), también para quitarlo.
 * Cada cambio queda en vehiculos_historial_propietario.
 */
async function cambiarPropietario(id, { usuario_id, motivo }, solicitante) {
  const actual = await obtenerExistente(id);
  const anterior = actual.usuario_id ?? null;
  const nuevo = usuario_id ?? null;

  if (anterior !== null && !solicitante.permisos.includes('vehiculos.reasignar')) {
    throw errores.prohibido(
      'Solo el administrador puede cambiar el propietario de un vehículo que ya tiene dueño.'
    );
  }
  if (anterior === nuevo) {
    throw new AppError(
      409,
      'MISMO_PROPIETARIO',
      nuevo ? 'El vehículo ya pertenece a ese cliente.' : 'El vehículo ya está sin propietario.'
    );
  }
  if (nuevo !== null) await validarPropietario(nuevo);

  await enTransaccion(async (conexion) => {
    await repo.actualizarPropietario(id, nuevo, conexion);
    await repo.insertarHistorial(
      {
        vehiculo_id: id,
        usuario_anterior_id: anterior,
        usuario_nuevo_id: nuevo,
        cambiado_por: solicitante.id,
        motivo,
      },
      conexion
    );
  });
  return aPublico(await repo.buscarPorId(id));
}

async function historial(id) {
  await obtenerExistente(id);
  return (await repo.listarHistorial(id)).map((h) => ({
    id: h.id,
    fecha: h.fecha,
    motivo: h.motivo,
    anterior: persona(
      h.usuario_anterior_id,
      h.anterior_nombre,
      h.anterior_tipo_documento,
      h.anterior_numero_documento
    ),
    nuevo: persona(
      h.usuario_nuevo_id,
      h.nuevo_nombre,
      h.nuevo_tipo_documento,
      h.nuevo_numero_documento
    ),
    cambiado_por: h.cambiado_por_nombre,
  }));
}

async function listarDeUsuario(usuarioId) {
  return (await repo.listarPorUsuario(usuarioId)).map(aPublico);
}

module.exports = {
  listar,
  obtener,
  obtenerPorPlaca,
  crear,
  actualizar,
  cambiarPropietario,
  historial,
  listarDeUsuario,
};
