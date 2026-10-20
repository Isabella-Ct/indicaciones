// Incidencias — REQ-INCD-1: código único autogenerado, vehículo afectado, fecha y hora del
// servidor y tipo. Notifica a los administradores y al propietario del vehículo.
const { enTransaccion } = require('../../config/db');
const { AppError, errores } = require('../../utils/errores');
const { aLimites, meta } = require('../../utils/paginacion');
const notificaciones = require('../notificaciones/notificaciones.service');
const repo = require('./incidencias.repository');

const aPublicoTipo = (t) => ({
  id: t.id,
  nombre: t.nombre,
  descripcion: t.descripcion,
  activo: Boolean(t.activo),
  usos: Number(t.usos ?? 0),
});

function aPublico(i, { verRegistrador = true } = {}) {
  return {
    id: i.id,
    codigo: i.codigo,
    fecha_hora: i.fecha_hora,
    descripcion: i.descripcion,
    tipo: { id: i.tipo_id, nombre: i.tipo_nombre },
    vehiculo: {
      id: i.vehiculo_id,
      placa: i.placa,
      tipo: i.tipo_vehiculo,
      marca: i.marca,
      modelo: i.modelo,
      color: i.color,
      propietario: i.propietario_id
        ? { id: i.propietario_id, nombre_completo: i.propietario_nombre }
        : null,
    },
    celda: i.celda_id ? { id: i.celda_id, codigo: i.celda_codigo, piso: i.piso_nombre } : null,
    estadia_id: i.estadia_id,
    registrada_por: verRegistrador
      ? { id: i.registrada_por_id, nombre_completo: i.registrada_por_nombre }
      : undefined,
  };
}

// ---------------------------------------------------------------- tipos
async function listarTipos({ soloActivos }) {
  return (await repo.listarTipos({ soloActivos })).map(aPublicoTipo);
}

async function validarNombreTipo(nombre, excluirId) {
  if (await repo.existeNombreTipo(nombre, excluirId)) {
    throw new AppError(409, 'NOMBRE_DUPLICADO', `Ya existe el tipo "${nombre}".`, [
      { campo: 'nombre', mensaje: 'Este nombre ya existe.' },
    ]);
  }
}

async function crearTipo(datos) {
  await validarNombreTipo(datos.nombre);
  return aPublicoTipo(await repo.buscarTipo(await repo.insertarTipo(datos)));
}

async function actualizarTipo(id, datos) {
  if (!(await repo.buscarTipo(id))) throw errores.noEncontrado('El tipo de incidencia no existe.');
  await validarNombreTipo(datos.nombre, id);
  await repo.actualizarTipo(id, datos);
  return aPublicoTipo(await repo.buscarTipo(id));
}

/** Borrado lógico: un tipo con historial nunca se elimina. */
async function cambiarActivoTipo(id, activo) {
  if (!(await repo.buscarTipo(id))) throw errores.noEncontrado('El tipo de incidencia no existe.');
  await repo.actualizarActivoTipo(id, activo);
  return aPublicoTipo(await repo.buscarTipo(id));
}

// ---------------------------------------------------------------- incidencias
async function crear({ tipo_incidencia_id, placa, celda_id, descripcion }, solicitante) {
  const id = await enTransaccion(async (conexion) => {
    const tipo = await repo.buscarTipo(tipo_incidencia_id, conexion);
    if (!tipo || !tipo.activo) {
      throw errores.validacion([
        { campo: 'tipo_incidencia_id', mensaje: 'El tipo no existe o está inactivo.' },
      ]);
    }
    const vehiculo = await repo.vehiculoPorPlaca(placa, conexion);
    if (!vehiculo) {
      throw new AppError(404, 'VEHICULO_NO_REGISTRADO', `La placa ${placa} no está registrada.`, [
        { campo: 'placa', mensaje: 'Esta placa no está registrada.' },
      ]);
    }
    if (celda_id) {
      const c = await repo.celda(celda_id, conexion);
      if (!c || !c.activa)
        throw errores.validacion([{ campo: 'celda_id', mensaje: 'La celda no existe.' }]);
    }
    // Si el vehículo está dentro, la incidencia queda ligada a su estadía (y a su celda
    // cuando no se indicó otra).
    const estadia = await repo.estadiaAbierta(vehiculo.id, conexion);
    const { codigo, ahora } = await repo.siguienteCodigo(conexion);
    const nuevaId = await repo.insertar(
      {
        codigo,
        tipo_incidencia_id,
        vehiculo_id: vehiculo.id,
        celda_id: celda_id ?? estadia?.celda_id ?? null,
        estadia_id: estadia?.id ?? null,
        descripcion,
        fecha_hora: ahora,
        registrada_por: solicitante.id,
      },
      conexion
    );

    const lugar = celda_id || estadia ? ' en el parqueadero' : '';
    await notificaciones.notificar(
      {
        rol: 'administrador',
        titulo: `Nueva incidencia: ${tipo.nombre}`,
        mensaje: `${codigo} · ${tipo.nombre} con el vehículo ${vehiculo.placa}${lugar}. Registró: ${solicitante.nombre_completo}.`,
        tipo: 'incidencia',
        enlace: `/app/incidencias.html?id=${nuevaId}`,
        excluirUsuarioId: solicitante.id,
      },
      conexion
    );
    if (vehiculo.usuario_id) {
      await notificaciones.notificar(
        {
          usuarios: [vehiculo.usuario_id],
          titulo: 'Incidencia con tu vehículo',
          mensaje: `Se registró una incidencia (${tipo.nombre}) con tu vehículo ${vehiculo.placa}. Código ${codigo}. Acércate a la caseta si necesitas más información.`,
          tipo: 'incidencia',
          enlace: '/app/mi-cuenta.html#mis-incidencias',
        },
        conexion
      );
    }
    return nuevaId;
  });
  return aPublico(await repo.buscarDetalle(id));
}

async function listar(consulta) {
  const { filas, total } = await repo.listar(consulta, aLimites(consulta));
  return { data: filas.map((i) => aPublico(i)), meta: meta(consulta, total) };
}

async function obtener(id) {
  const i = await repo.buscarDetalle(id);
  if (!i) throw errores.noEncontrado('La incidencia no existe.');
  return aPublico(i);
}

/** Cliente: incidencias de sus vehículos (sin el nombre del empleado que registró). */
async function deCliente(usuarioId, consulta) {
  const { filas, total } = await repo.listar(
    { ...consulta, propietario_id: usuarioId },
    aLimites(consulta)
  );
  return {
    data: filas.map((i) => aPublico(i, { verRegistrador: false })),
    meta: meta(consulta, total),
  };
}

module.exports = {
  listarTipos,
  crearTipo,
  actualizarTipo,
  cambiarActivoTipo,
  crear,
  listar,
  obtener,
  deCliente,
};
