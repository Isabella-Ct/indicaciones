// Reservas — REQ-RES-1. El cliente reserva una celda libre del tipo de su vehículo; la
// celda queda "reservada" hasta que llega (la entrada la marca "cumplida"), la cancela o
// vence (job cada minuto: "expirada", celda liberada y aviso al cliente).
const { enTransaccion } = require('../../config/db');
const { AppError, errores } = require('../../utils/errores');
const { aLimites, meta } = require('../../utils/paginacion');
const { publicarCambioCelda } = require('../../realtime/celdas-tiempo-real');
const repo = require('./reservas.repository');
const picoPlacaService = require('../pico-placa/pico-placa.service');
const membresiasService = require('../membresias/membresias.service');
const notificaciones = require('../notificaciones/notificaciones.service');

const conflicto = (codigo, mensaje, campo) =>
  new AppError(409, codigo, mensaje, campo ? [{ campo, mensaje }] : undefined);
/** Personal (admin/operador): reserva para cualquier vehículo y cancela cualquier reserva. */
const esPersonal = (u) => u.permisos.includes('reservas.ver');

function aPublico(r, { verTitular = true } = {}) {
  return {
    id: r.id,
    estado: r.estado,
    activa: Boolean(r.activa),
    fecha_hora_reserva: r.fecha_hora_reserva,
    fecha_hora_expiracion: r.fecha_hora_expiracion,
    segundos_restantes: r.activa ? Number(r.segundos_restantes) : 0,
    vehiculo: {
      id: r.vehiculo_id,
      placa: r.placa,
      tipo: r.tipo_vehiculo,
      marca: r.marca,
      modelo: r.modelo,
      color: r.color,
    },
    celda: {
      id: r.celda_id,
      codigo: r.celda_codigo,
      piso: r.piso_nombre,
      es_accesible: Boolean(r.es_accesible),
    },
    titular: verTitular
      ? {
          id: r.usuario_id,
          nombre_completo: r.titular,
          tipo_documento: r.tipo_documento,
          numero_documento: r.numero_documento,
        }
      : undefined,
    estadia: r.estadia_id ? { id: r.estadia_id, codigo_ticket: r.codigo_ticket } : null,
  };
}

async function crear({ vehiculo_id, celda_id, requiere_accesible }, solicitante) {
  const vehiculo = await repo.vehiculo(vehiculo_id);
  if (!vehiculo || !vehiculo.activo) throw errores.noEncontrado('El vehículo no existe.');
  if (!esPersonal(solicitante) && vehiculo.usuario_id !== solicitante.id) {
    throw errores.prohibido('Solo puedes reservar para tus propios vehículos.');
  }
  if (!vehiculo.usuario_id) {
    throw errores.validacion(
      [{ campo: 'vehiculo_id', mensaje: 'Solo se reserva para vehículos con propietario.' }],
      'Los vehículos de visitantes no pueden reservar.'
    );
  }
  if (await repo.tieneEstadiaAbierta(vehiculo.id)) {
    throw conflicto(
      'VEHICULO_DENTRO',
      `${vehiculo.placa} ya está dentro del parqueadero.`,
      'vehiculo_id'
    );
  }
  if (await repo.reservaActivaDe(vehiculo.id)) {
    throw conflicto(
      'RESERVA_ACTIVA',
      `${vehiculo.placa} ya tiene una reserva activa.`,
      'vehiculo_id'
    );
  }
  const fija = await repo.membresiaConCeldaFija(vehiculo.id);
  if (fija) {
    throw conflicto(
      'TIENE_CELDA_FIJA',
      `${vehiculo.placa} tiene mensualidad con la celda fija ${fija.codigo}: no necesita reservar.`,
      'vehiculo_id'
    );
  }
  // Pico y placa en este momento (hora del servidor): no tendría cómo llegar.
  const restriccion = await picoPlacaService.evaluar(vehiculo.placa, vehiculo.tipo);
  if (restriccion.restringido) {
    throw new AppError(
      403,
      'PICO_Y_PLACA',
      `${vehiculo.placa} tiene pico y placa ahora: ${restriccion.regla.descripcion}.`,
      [{ campo: 'vehiculo_id', mensaje: restriccion.regla.descripcion, regla: restriccion.regla }]
    );
  }

  const minutos = await repo.minutosExpiracion();
  const id = await enTransaccion(async (conexion) => {
    const celda = await repo.celdaBloqueada(celda_id, conexion);
    if (!celda || !celda.activa) throw errores.noEncontrado('La celda no existe.');
    if (celda.tipo !== vehiculo.tipo) {
      throw errores.validacion(
        [{ campo: 'celda_id', mensaje: `La celda ${celda.codigo} es de ${celda.tipo}.` }],
        `La celda ${celda.codigo} es para ${celda.tipo}s y el vehículo es ${vehiculo.tipo}.`
      );
    }
    if (celda.estado !== 'disponible') {
      throw conflicto(
        'CELDA_NO_DISPONIBLE',
        `La celda ${celda.codigo} ya no está libre.`,
        'celda_id'
      );
    }
    if (celda.es_accesible && !requiere_accesible) {
      throw conflicto(
        'CELDA_ACCESIBLE',
        `La celda ${celda.codigo} es accesible: solo se reserva si la necesitas.`,
        'celda_id'
      );
    }
    let nueva;
    try {
      nueva = await repo.insertar(
        { usuario_id: vehiculo.usuario_id, vehiculo_id: vehiculo.id, celda_id: celda.id, minutos },
        conexion
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw conflicto(
          'RESERVA_ACTIVA',
          `${vehiculo.placa} ya tiene una reserva activa.`,
          'vehiculo_id'
        );
      }
      throw err;
    }
    await repo.reservarCelda(celda.id, conexion);
    return nueva;
  });
  await publicarCambioCelda(celda_id);
  return aPublico(await repo.buscar(id));
}

async function cancelar(id, solicitante) {
  const actual = await repo.buscar(id);
  if (!actual) throw errores.noEncontrado('La reserva no existe.');
  if (!esPersonal(solicitante) && actual.usuario_id !== solicitante.id) {
    throw errores.prohibido('Solo puedes cancelar tus propias reservas.');
  }
  await enTransaccion(async (conexion) => {
    const r = await repo.buscar(id, conexion, true);
    if (!['pendiente', 'confirmada'].includes(r.estado)) {
      throw conflicto('RESERVA_NO_ACTIVA', `La reserva ya está ${r.estado}.`);
    }
    await repo.cambiarEstado(id, 'cancelada', conexion);
    await membresiasService.liberarCeldaSiCorresponde(r.celda_id, conexion);
  });
  await publicarCambioCelda(actual.celda_id);
  return aPublico(await repo.buscar(id));
}

/** Job: vence las reservas cuyo plazo pasó, libera sus celdas y avisa al cliente. */
async function expirarVencidas() {
  const vencidas = await enTransaccion(async (conexion) => {
    const filas = await repo.vencidas(conexion);
    for (const r of filas) {
      await repo.cambiarEstado(r.id, 'expirada', conexion);
      await membresiasService.liberarCeldaSiCorresponde(r.celda_id, conexion);
      await notificaciones.notificar(
        {
          usuarios: [r.usuario_id],
          titulo: 'Tu reserva expiró',
          mensaje: `La reserva de la celda ${r.celda_codigo} para ${r.placa} venció porque el vehículo no llegó a tiempo. La celda quedó libre.`,
          tipo: 'reserva_expirada',
          enlace: '/app/disponibilidad.html',
        },
        conexion
      );
    }
    return filas;
  });
  if (vencidas.length) await publicarCambioCelda(...new Set(vencidas.map((r) => r.celda_id)));
  return { expiradas: vencidas.length };
}

async function listar(filtros) {
  const { filas, total } = await repo.listar(filtros, aLimites(filtros));
  return { data: filas.map((r) => aPublico(r)), meta: meta(filtros, total) };
}

async function deUsuario(usuarioId, filtros) {
  const { filas, total } = await repo.listar(
    { ...filtros, usuario_id: usuarioId },
    aLimites(filtros)
  );
  return { data: filas.map((r) => aPublico(r, { verTitular: false })), meta: meta(filtros, total) };
}

async function obtener(id, solicitante) {
  const r = await repo.buscar(id);
  if (!r || (!esPersonal(solicitante) && r.usuario_id !== solicitante.id)) {
    throw errores.noEncontrado('La reserva no existe.');
  }
  return aPublico(r);
}

module.exports = { crear, cancelar, expirarVencidas, listar, deUsuario, obtener };
