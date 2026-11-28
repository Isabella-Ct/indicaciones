// Reservas (spec 012): RF-RES-01..09, RN-26, RN-27. La reserva se crea con la celda y el vehículo bloqueados para
// que no haya franjas cruzadas (research R-03); la entrada del vehículo en su franja la cumple (R-08) y el control
// de cada minuto marca la celda como reservada desde el inicio, la reasigna si está ocupada y vence las no
// usadas (R-07). Los avisos al cliente van como notificación interna y por correo (después del commit).
const { withTransaction } = require('../../config/db');
const env = require('../../config/env');
const repositorio = require('./reservas.repository');
const vehiculosRepositorio = require('../vehiculos/vehiculos.repository');
const celdasRepositorio = require('../celdas/celdas.repository');
const { enviarCorreo } = require('../../integrations/correo');
const reloj = require('../../utils/reloj');
const { errores } = require('../../utils/errores');
const { registrarBitacora } = require('../../utils/bitacora');
const { siguienteConsecutivo } = require('../../utils/consecutivos');
const { aLimites, meta } = require('../../utils/paginacion');
const { aIsoBogota, enBogota, sumarDias, formatearFechaHora } = require('../../utils/fechas');
const { franja, validarInicio } = require('./reservas.reglas');

const NO_ENCONTRADA = () => errores.noEncontrado('Reserva no encontrada.', 'RESERVA_NO_ENCONTRADA');
const campo = (nombre, mensaje) => errores.validacion([{ campo: nombre, mensaje }]);
const PLURAL = { carro: 'carros', moto: 'motos' };

const bitacora = (conexion, actor, accion, idRegistro, nuevo, anterior = null) =>
  registrarBitacora(conexion, { idUsuario: actor?.idUsuario ?? null, accion, entidad: 'reserva', idRegistro, anterior, nuevo, ip: actor?.ip });

/** Reserva para la API: fechas en ISO de Bogotá y sin datos internos. */
function publica(r) {
  if (!r) return r;
  const { _correo: _c, _estadoCelda: _e, _tipoCelda: _t, ...resto } = r;
  return { ...resto, fechaHoraInicio: aIsoBogota(r.fechaHoraInicio), finEspera: aIsoBogota(r.finEspera) };
}

const hora = (fecha) => formatearFechaHora(fecha).slice(11);

/** Deja la notificación en la transacción y devuelve lo necesario para el correo posterior. */
async function avisar(conexion, reserva, { titulo, mensaje }) {
  const idNotificacion = await repositorio.insertarNotificacion({ idUsuario: reserva.cliente.idUsuario, titulo, mensaje, fecha: reloj.ahora() }, { conexion });
  return { idNotificacion, para: reserva._correo, nombre: reserva.cliente.nombre, titulo, mensaje };
}

/** Correos después del commit; si uno falla, la notificación interna queda sin enviar (la spec 014 reintenta). */
async function enviarAvisos(avisos) {
  for (const a of avisos) {
    if (!a.para) continue;
    const enviado = await enviarCorreo({
      para: a.para,
      asunto: `PARKO · ${a.titulo}`,
      texto: [`Hola, ${a.nombre}.`, '', a.mensaje, '', 'PARKO · Sistema de Gestión de Parqueadero'].join('\n'),
    });
    if (enviado) await repositorio.marcarNotificacionEnviada(a.idNotificacion);
  }
}

/** Celda sugerida para el error de cruce (la primera libre del mismo parqueadero y tipo). */
async function sugerida(conexion, { idParqueadero, tipo, f }) {
  const [primera] = await repositorio.celdasLibres({ idParqueadero, tipo, desde: f.desde, hasta: f.hasta, limit: 1 }, { conexion });
  return primera ?? null;
}

/** Elige y bloquea la celda: la indicada (validada) o la primera libre en la franja. */
async function celdaPara(conexion, { idCelda, idParqueadero, tipo, f }) {
  if (idCelda) {
    const celda = await celdasRepositorio.obtenerPorId(idCelda, { conexion, bloquear: true });
    if (!celda) throw campo('idCelda', 'La celda no existe.');
    if (celda.tipoVehiculo !== tipo) throw campo('idCelda', `La celda ${celda.codigo} es para ${PLURAL[celda.tipoVehiculo]}.`);
    const libre =
      celda.estado !== 'inhabilitada' && celda._parqueaderoEstado === 'activo' && !(await repositorio.celdaCruzada(celda.idCelda, f, { conexion }));
    if (!libre) {
      const otra = await sugerida(conexion, { idParqueadero: celda.idParqueadero, tipo, f });
      const error = errores.conflicto('La celda no está disponible en ese horario', 'CELDA_NO_DISPONIBLE');
      error.details = [{ campo: 'idCelda', mensaje: otra ? `Celda sugerida: ${otra.codigo}.` : `No hay otra celda de ${PLURAL[tipo]} libre en ese horario.`, sugerida: otra }];
      throw error;
    }
    return celda;
  }
  const idP = idParqueadero ?? (await repositorio.parqueaderoPrincipal({ conexion }));
  for (const candidata of await repositorio.celdasLibres({ idParqueadero: idP, tipo, desde: f.desde, hasta: f.hasta, limit: 20 }, { conexion })) {
    // Se bloquea y se vuelve a revisar: otra reserva pudo tomarla entre la consulta y el bloqueo.
    const celda = await celdasRepositorio.obtenerPorId(candidata.idCelda, { conexion, bloquear: true });
    if (celda.estado !== 'inhabilitada' && !(await repositorio.celdaCruzada(celda.idCelda, f, { conexion }))) return celda;
  }
  throw errores.conflicto(`No hay celdas de ${PLURAL[tipo]} libres en ese horario.`, 'SIN_CELDAS');
}

// ---------------------------------------------------------------- HU-52
/** RF-RES-01..03, RN-26. */
async function reservar({ idVehiculo, fechaHoraInicio, idCelda, idParqueadero }, actor) {
  const ahora = reloj.ahora();
  const invalida = validarInicio(fechaHoraInicio, ahora, env.RESERVA_ANTICIPACION_DIAS);
  if (invalida) throw campo('fechaHoraInicio', invalida);
  const minutosEspera = env.RESERVA_MINUTOS_ESPERA;
  const f = franja(fechaHoraInicio, minutosEspera);
  const avisos = [];
  const id = await withTransaction(async (conexion) => {
    const vehiculo = await vehiculosRepositorio.obtenerPorId(idVehiculo, { conexion, bloquear: true });
    if (!vehiculo) throw campo('idVehiculo', 'El vehículo no existe.');
    if (vehiculo.estado !== 'activo') throw campo('idVehiculo', 'El vehículo está inactivo.');
    if (!vehiculo.propietario) throw campo('idVehiculo', 'Asocie primero el vehículo a un cliente.');
    // Alcance por permiso: sin reservas.ver (el Cliente) solo reserva con sus vehículos.
    if (!actor.permisos.includes('reservas.ver') && vehiculo.propietario.idUsuario !== actor.idUsuario) {
      throw errores.sinPermiso('Solo puede reservar con sus propios vehículos.');
    }
    const cruzada = await repositorio.cruceDeVehiculo(idVehiculo, f, { conexion });
    if (cruzada) throw errores.conflicto(`El vehículo ${vehiculo.placa} ya tiene la reserva ${cruzada} en ese horario.`, 'RESERVA_VEHICULO_CRUZADA');
    const celda = await celdaPara(conexion, { idCelda, idParqueadero, tipo: vehiculo.tipo, f });

    const codigo = await siguienteConsecutivo(conexion, 'reserva');
    const idReserva = await repositorio.insertar(
      { codigo, idCliente: vehiculo.propietario.idUsuario, idVehiculo, idCelda: celda.idCelda, inicio: fechaHoraInicio, minutosEspera },
      { conexion }
    );
    await bitacora(conexion, actor, 'reservar', idReserva, { codigo, idVehiculo, idCelda: celda.idCelda, inicio: aIsoBogota(fechaHoraInicio), minutosEspera });
    const reserva = await repositorio.obtenerPorId(idReserva, { conexion });
    avisos.push(
      await avisar(conexion, reserva, {
        titulo: `Reserva ${codigo} confirmada`,
        mensaje: `Su reserva ${codigo} para ${vehiculo.placa} en la celda ${celda.codigo} (${reserva.celda.parqueadero}) es el ${formatearFechaHora(fechaHoraInicio)}. La celda le espera hasta las ${hora(f.hasta)}.`,
      })
    );
    return idReserva;
  });
  await enviarAvisos(avisos);
  return publica(await repositorio.obtenerPorId(id));
}

/** GET /celdas/disponibles: libres en la franja de esa hora. */
async function disponibles({ fecha, tipo, idParqueadero }) {
  const f = franja(fecha, env.RESERVA_MINUTOS_ESPERA);
  const idP = idParqueadero ?? (await repositorio.parqueaderoPrincipal());
  return repositorio.celdasLibres({ idParqueadero: idP, tipo, desde: f.desde, hasta: f.hasta });
}

// ---------------------------------------------------------------- HU-53
/** RF-RES-04, RF-RES-05: solo confirmadas que no han iniciado; el Cliente, solo las suyas. */
async function cancelar(id, actor) {
  const avisos = [];
  await withTransaction(async (conexion) => {
    const reserva = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!reserva) throw NO_ENCONTRADA();
    if (!actor.permisos.includes('reservas.ver') && reserva.cliente.idUsuario !== actor.idUsuario) {
      throw errores.sinPermiso('Solo puede cancelar sus propias reservas.');
    }
    if (reserva.estado !== 'confirmada') throw errores.conflicto(`La reserva está ${reserva.estado}: no se puede cancelar.`, 'RESERVA_NO_CANCELABLE');
    if (new Date(reserva.fechaHoraInicio) <= reloj.ahora()) throw errores.conflicto('La reserva ya inició: no se puede cancelar.', 'RESERVA_INICIADA');
    await repositorio.cambiarEstado(id, 'cancelada', { conexion });
    await bitacora(conexion, actor, 'cancelar', id, { estado: 'cancelada' }, { estado: 'confirmada' });
    avisos.push(
      await avisar(conexion, reserva, {
        titulo: `Reserva ${reserva.codigo} cancelada`,
        mensaje: `Canceló la reserva ${reserva.codigo} de ${reserva.vehiculo.placa} (celda ${reserva.celda.codigo}, ${formatearFechaHora(reserva.fechaHoraInicio)}). La celda quedó libre en esa franja.`,
      })
    );
  });
  await enviarAvisos(avisos);
  return publica(await repositorio.obtenerPorId(id));
}

/** GET /usuarios/me/reservas: las del Cliente, las más recientes primero. */
async function mias(filtros, actor) {
  const { filas, total } = await repositorio.listar({ estado: filtros.estado, idCliente: actor.idUsuario, descendente: true, ...aLimites(filtros) });
  return { data: filas.map(publica), meta: meta(filtros, total) };
}

// ---------------------------------------------------------------- HU-54
/** RF-RES-06: las de una fecha (hoy por defecto), ordenadas por hora. */
async function listar(filtros) {
  const dia = filtros.fecha ?? enBogota(reloj.ahora()).fecha;
  const { filas, total } = await repositorio.listar({
    desde: new Date(`${dia}T00:00:00-05:00`),
    hasta: new Date(`${sumarDias(dia, 1)}T00:00:00-05:00`),
    estado: filtros.estado,
    q: filtros.q,
    ...aLimites(filtros),
  });
  return { data: filas.map(publica), meta: { ...meta(filtros, total), fecha: dia } };
}

// ---------------------------------------------------------------- HU-55
/**
 * RF-RES-07 (R-08): dentro de la transacción de la entrada, la reserva confirmada del vehículo cuya franja contiene
 * `ahora` en ese parqueadero (o null).
 */
async function paraEntrada(conexion, { idVehiculo, idParqueadero, ahora }) {
  const reserva = await repositorio.enFranjaDeVehiculo(idVehiculo, ahora, { conexion });
  return reserva && reserva.celda.idParqueadero === idParqueadero ? reserva : null;
}

/** RF-RES-07: la reserva queda cumplida con su movimiento (misma transacción de la entrada). */
async function cumplir(conexion, reserva, idMovimiento, actor) {
  await repositorio.cambiarEstado(reserva.idReserva, 'cumplida', { conexion, idMovimiento });
  await bitacora(conexion, actor, 'cumplir', reserva.idReserva, { estado: 'cumplida', idMovimiento }, { estado: 'confirmada' });
}

/**
 * RF-RES-08, RF-RES-09, RN-27 (R-07): vence las confirmadas cuya espera terminó (celda libre y aviso) y marca como
 * reservada la celda de las que están en su franja; si esa celda está ocupada o inhabilitada, reasigna otra libre.
 * Devuelve { vencidas, activadas, reasignadas }.
 */
async function controlar(ahora = reloj.ahora()) {
  const avisos = [];
  const resultado = await withTransaction(async (conexion) => {
    const cuenta = { vencidas: 0, activadas: 0, reasignadas: 0 };
    for (const r of await repositorio.porVencer(ahora, { conexion })) {
      await repositorio.cambiarEstado(r.idReserva, 'vencida', { conexion });
      await repositorio.estadoCelda(r.celda.idCelda, { desde: 'reservada', hacia: 'disponible' }, { conexion });
      await bitacora(conexion, null, 'vencer', r.idReserva, { estado: 'vencida' }, { estado: 'confirmada' });
      avisos.push(
        await avisar(conexion, r, {
          titulo: `Reserva ${r.codigo} vencida`,
          mensaje: `${r.vehiculo.placa} no llegó antes de las ${hora(r.finEspera)}: la reserva ${r.codigo} venció y la celda ${r.celda.codigo} quedó libre.`,
        })
      );
      cuenta.vencidas += 1;
    }
    for (const r of await repositorio.porActivar(ahora, { conexion })) {
      if (await repositorio.estadoCelda(r.celda.idCelda, { desde: 'disponible', hacia: 'reservada' }, { conexion })) {
        cuenta.activadas += 1;
        continue;
      }
      // La celda está ocupada o inhabilitada: se busca otra libre del tipo en el mismo parqueadero.
      const f = { desde: r.fechaHoraInicio, hasta: r.finEspera };
      const [otra] = await repositorio.celdasLibres(
        { idParqueadero: r.celda.idParqueadero, tipo: r._tipoCelda, desde: f.desde, hasta: f.hasta, soloDisponibles: true, excluir: r.idReserva, limit: 1 },
        { conexion }
      );
      if (!otra || !(await repositorio.estadoCelda(otra.idCelda, { desde: 'disponible', hacia: 'reservada' }, { conexion }))) continue;
      await repositorio.reasignar(r.idReserva, otra.idCelda, { conexion });
      await bitacora(conexion, null, 'reasignar', r.idReserva, { idCelda: otra.idCelda }, { idCelda: r.celda.idCelda });
      avisos.push(
        await avisar(conexion, r, {
          titulo: `Reserva ${r.codigo}: nueva celda`,
          mensaje: `La celda ${r.celda.codigo} no estaba disponible: su reserva ${r.codigo} para ${r.vehiculo.placa} ahora es en la celda ${otra.codigo}.`,
        })
      );
      cuenta.reasignadas += 1;
    }
    return cuenta;
  });
  await enviarAvisos(avisos);
  return resultado;
}

module.exports = { reservar, disponibles, cancelar, mias, listar, paraEntrada, cumplir, controlar, publica };
