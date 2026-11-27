// Reglas de entradas y salidas (spec 007): RF-MOV-01..17, RN-13, RN-15, RN-16. Cada operación es una
// transacción con bloqueo de filas, usa el reloj del servidor y deja su bitácora.
const { withTransaction } = require('../../config/db');
const repositorio = require('./movimientos.repository');
const vehiculos = require('../vehiculos/vehiculos.repository');
const parqueaderos = require('../parqueaderos/parqueaderos.repository');
const celdasRepositorio = require('../celdas/celdas.repository');
const celdas = require('../celdas/celdas.service');
const restricciones = require('../restricciones/restricciones.service');
const reloj = require('../../utils/reloj');
const { AppError, errores } = require('../../utils/errores');
const { registrarBitacora } = require('../../utils/bitacora');
const { siguienteConsecutivo } = require('../../utils/consecutivos');
const { aLimites, meta } = require('../../utils/paginacion');
const { anioActualBogota } = require('../../utils/fechas');
const { ROL_ADMINISTRADOR } = require('../../config/constantes');
const { placaValida, mensajeFormato } = require('../vehiculos/vehiculos.reglas');
const { minutosEstadia, masDe24h, puedeAnularOperador, mensajePicoPlaca } = require('./movimientos.reglas');

const SIN_REGISTRAR = 'Sin registrar';
const NO_ABIERTO = () => new AppError(404, 'MOVIMIENTO_NO_ABIERTO', 'El vehículo no tiene una entrada registrada');

const bitacora = (conexion, actor, accion, entidad, idRegistro, nuevo) =>
  registrarBitacora(conexion, { idUsuario: actor.idUsuario, accion, entidad, idRegistro, anterior: null, nuevo, ip: actor.ip });

/** Movimiento para la API: minutos transcurridos (abiertos, con el reloj) y marca de más de 24 h. */
function publico(movimiento, ahora = reloj.ahora()) {
  if (!movimiento) return movimiento;
  const { _entrada, ...resto } = movimiento;
  const minutos = resto.estado === 'abierto' ? minutosEstadia(_entrada, ahora) : (resto.minutosEstadia ?? 0);
  return { ...resto, minutosTranscurridos: minutos, masDe24h: resto.estado === 'abierto' && masDe24h(minutos) };
}

/** Puerta activa del uso pedido (entrada | salida, o mixta) de un parqueadero activo; si no → 409. */
async function puertaPara(uso, idPuerta, conexion) {
  const puerta = await parqueaderos.obtenerPuerta(idPuerta, { conexion });
  if (!puerta) throw errores.validacion([{ campo: 'idPuerta', mensaje: 'La puerta no existe.' }]);
  const parqueadero = await parqueaderos.obtenerPorId(puerta.idParqueadero, { conexion });
  if (puerta.estado !== 'activo' || ![uso, 'mixta'].includes(puerta.tipo) || parqueadero?.estado !== 'activo') {
    throw errores.conflicto(`La puerta «${puerta.nombre}» no está habilitada para ${uso === 'entrada' ? 'entradas' : 'salidas'}.`, 'PUERTA_NO_VALIDA');
  }
  return puerta;
}

/** Celda elegida por el operador: del parqueadero de la puerta, del tipo y disponible (RF-MOV-04). */
async function celdaElegida(idCelda, { idParqueadero, tipo }, conexion) {
  const celda = await celdasRepositorio.obtenerPorId(idCelda, { conexion, bloquear: true });
  if (!celda || celda.idParqueadero !== idParqueadero) {
    throw errores.validacion([{ campo: 'idCelda', mensaje: 'La celda no pertenece al parqueadero de la puerta.' }]);
  }
  if (celda.tipoVehiculo !== tipo) {
    throw errores.validacion([{ campo: 'idCelda', mensaje: `La celda ${celda.codigo} es para ${celda.tipoVehiculo}.` }]);
  }
  if (celda.estado !== 'disponible') throw errores.conflicto(`La celda ${celda.codigo} no está disponible.`, 'CELDA_NO_DISPONIBLE');
  return celda.idCelda;
}

// ---------------------------------------------------------------- HU-31, HU-32
/** RF-MOV-01..06 (research R-03): entrada en una transacción; el rechazo por pico y placa se guarda aparte (R-04). */
async function registrarEntrada(datos, actor) {
  const ahora = reloj.ahora();
  const { placa } = datos;
  let rechazo = null;
  let idMovimiento;
  try {
    idMovimiento = await withTransaction(async (conexion) => {
      const puerta = await puertaPara('entrada', datos.idPuerta, conexion);

      let vehiculo = await vehiculos.obtenerPorPlaca(placa, { conexion, bloquear: true });
      if (!vehiculo && !datos.tipo) {
        throw errores.validacion([{ campo: 'tipo', mensaje: 'Indique el tipo del vehículo: la placa no está registrada.' }]);
      }
      if (vehiculo && datos.tipo && datos.tipo !== vehiculo.tipo) {
        throw errores.validacion([{ campo: 'tipo', mensaje: `La placa ${placa} está registrada como ${vehiculo.tipo}.` }]);
      }
      const tipo = vehiculo?.tipo ?? datos.tipo;
      if (!placaValida(placa, tipo)) throw errores.validacion([{ campo: 'placa', mensaje: mensajeFormato(tipo) }]);

      // RF-MOV-03 / RN-15: un vehículo dentro no está entrando (se revisa antes del pico y placa).
      if (vehiculo) {
        const abierto = await repositorio.abiertoDeVehiculo(vehiculo.idVehiculo, { conexion });
        if (abierto) throw errores.conflicto(`El vehículo ya se encuentra dentro (celda ${abierto.celda.codigo})`, 'VEHICULO_DENTRO');
      }

      // RF-MOV-02 / RN-13.
      const evaluacion = await restricciones.evaluar({ placa, tipo, fechaHora: ahora }, { conexion });
      if (evaluacion.restringido) {
        rechazo = { placa, tipo, idVehiculo: vehiculo?.idVehiculo, idPuerta: puerta.idPuerta, fecha: ahora, motivo: evaluacion.motivo, idOperador: actor.idUsuario };
        const error = errores.conflicto(mensajePicoPlaca(placa, evaluacion.restriccion), 'PICO_Y_PLACA');
        error.details = [{ campo: 'placa', mensaje: evaluacion.motivo }];
        throw error;
      }

      // RF-MOV-05: placa nueva → vehículo ocasional (sin propietario).
      if (!vehiculo) {
        const nuevo = {
          placa,
          tipo,
          color: datos.color ?? SIN_REGISTRAR,
          marca: datos.marca ?? SIN_REGISTRAR,
          modelo: datos.modelo ?? anioActualBogota(ahora),
        };
        const idVehiculo = await vehiculos.insertar(nuevo, { conexion });
        await bitacora(conexion, actor, 'crear', 'vehiculo', idVehiculo, { ...nuevo, ocasional: true });
        vehiculo = { idVehiculo, tipo };
      }

      // RF-MOV-04: la celda elegida o la disponible de menor código.
      const idCelda = datos.idCelda
        ? await celdaElegida(datos.idCelda, { idParqueadero: puerta.idParqueadero, tipo }, conexion)
        : await celdas.sugerir(conexion, { idParqueadero: puerta.idParqueadero, tipoVehiculo: tipo });
      if (!idCelda) throw errores.conflicto(`Sin celdas disponibles para ${tipo}`, 'SIN_CELDAS');
      await celdas.ocupar(conexion, { idCelda, idVehiculo: vehiculo.idVehiculo, tipoVehiculo: tipo });

      const id = await repositorio.insertar(
        { idVehiculo: vehiculo.idVehiculo, idCelda, idPuerta: puerta.idPuerta, entrada: ahora, idOperador: actor.idUsuario },
        { conexion }
      );
      // RF-MOV-06: el consecutivo se toma en la misma transacción (sin huecos si la entrada falla).
      const codigo = await siguienteConsecutivo(conexion, 'ticket');
      await repositorio.insertarTicket(id, codigo, ahora, { conexion });
      await bitacora(conexion, actor, 'registrar_entrada', 'movimiento', id, { placa, idCelda, idPuerta: puerta.idPuerta, ticket: codigo });
      return id;
    });
  } catch (error) {
    if (rechazo) await repositorio.insertarRechazo(rechazo);
    if (error.code === 'ER_DUP_ENTRY') {
      // Carrera: otra entrada de la misma placa ganó (uq_movimiento_abierto o uq_vehiculo_placa).
      throw errores.conflicto('El vehículo ya se encuentra dentro', 'VEHICULO_DENTRO');
    }
    throw error;
  }
  return publico(await repositorio.obtenerPorId(idMovimiento), ahora);
}

// ---------------------------------------------------------------- HU-33
/** RF-MOV-09..12 (research R-06). */
async function registrarSalida(id, { idPuerta, ticketExtraviado }, actor) {
  const ahora = reloj.ahora();
  await withTransaction(async (conexion) => {
    const movimiento = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!movimiento || movimiento.estado !== 'abierto') throw NO_ABIERTO();
    const puerta = await puertaPara('salida', idPuerta, conexion);
    if (puerta.idParqueadero !== movimiento.parqueadero.idParqueadero) {
      throw errores.conflicto(`La puerta «${puerta.nombre}» es de otro parqueadero.`, 'PUERTA_NO_VALIDA');
    }
    const minutos = minutosEstadia(movimiento._entrada, ahora);
    await repositorio.cerrar(id, { idPuerta, salida: ahora, minutos, idOperador: actor.idUsuario, ticketExtraviado }, { conexion });
    await celdas.liberar(conexion, movimiento.celda.idCelda);
    await bitacora(conexion, actor, 'registrar_salida', 'movimiento', id, { idPuerta, minutosEstadia: minutos, ticketExtraviado });
  });
  // La liquidación (valor a pagar) la calcula la spec 009: GET /movimientos/:id/liquidacion.
  return { ...publico(await repositorio.obtenerPorId(id), ahora), liquidacion: null };
}

// ---------------------------------------------------------------- HU-34
/** RF-MOV-13, RF-MOV-14 (research R-07). */
async function listar(filtros) {
  const ahora = reloj.ahora();
  const { filas, total } = await repositorio.listar({ ...filtros, ...aLimites(filtros) });
  return { data: filas.map((m) => publico(m, ahora)), meta: meta(filtros, total) };
}

// ---------------------------------------------------------------- HU-35
/** RF-MOV-15..17 (research R-08): solo abiertos; el Operador, dentro de los 15 minutos. */
async function anular(id, { motivo }, actor) {
  const ahora = reloj.ahora();
  await withTransaction(async (conexion) => {
    const movimiento = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!movimiento) throw errores.noEncontrado('Movimiento no encontrado.', 'MOVIMIENTO_NO_ENCONTRADO');
    if (movimiento.estado !== 'abierto') {
      throw errores.conflicto(`El movimiento está ${movimiento.estado} y no se puede anular.`, 'MOVIMIENTO_NO_ANULABLE');
    }
    if (actor.rol !== ROL_ADMINISTRADOR && !puedeAnularOperador(movimiento._entrada, ahora)) {
      throw new AppError(403, 'SOLO_ADMIN_ANULA', 'Solo el Administrador puede anular esta entrada (pasaron más de 15 minutos).');
    }
    await repositorio.anular(id, { motivo, idUsuario: actor.idUsuario, fecha: ahora }, { conexion });
    await celdas.liberar(conexion, movimiento.celda.idCelda);
    await bitacora(conexion, actor, 'anular', 'movimiento', id, { motivo });
  });
  return publico(await repositorio.obtenerPorId(id), ahora);
}

module.exports = { registrarEntrada, registrarSalida, listar, anular, publico };
