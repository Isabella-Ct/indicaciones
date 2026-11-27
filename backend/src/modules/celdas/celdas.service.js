// Reglas de celdas (spec 004): RF-CLD-09..21, RN-09, RN-10, RNF-SAF-01. Además ofrece a la spec 007 las
// operaciones de dominio ocupar, liberar y sugerir, que corren dentro de la transacción del movimiento.
const { withTransaction } = require('../../config/db');
const repositorio = require('./celdas.repository');
const { codigosDelRango, transicionManual } = require('./celdas.reglas');
const { errores, AppError } = require('../../utils/errores');
const { registrarBitacora } = require('../../utils/bitacora');
const { aLimites, meta } = require('../../utils/paginacion');

const NO_ENCONTRADA = () => errores.noEncontrado('Celda no encontrada.', 'CELDA_NO_ENCONTRADA');
const MOTIVO_RETIRO = 'Retirada por el administrador';

/** RF-CLD-18 / RNF-PRI-02: la placa y la hora solo para quien tiene movimientos.ver. */
function publica(celda, actor) {
  if (!celda) return celda;
  const { _ocupante, _parqueaderoEstado: _e, _pisos: _p, _idVehiculoActual: _v, ...resto } = celda;
  const veOcupante = actor?.permisos?.includes('movimientos.ver');
  return { ...resto, ocupante: veOcupante ? _ocupante : null };
}

function traducirDuplicado(error) {
  if (error.code === 'ER_DUP_ENTRY' && String(error.message).includes('uq_celda_codigo')) {
    throw errores.conflicto('La celda ya existe en este parqueadero.', 'CELDA_DUPLICADA');
  }
  throw error;
}

/** Parqueadero existente, activo y con el piso dentro de 1..pisos (RF-CLD-11). */
async function parqueaderoValido(idParqueadero, piso, conexion) {
  const parqueadero = await repositorio.parqueaderoParaCeldas(idParqueadero, { conexion });
  if (!parqueadero) throw errores.validacion([{ campo: 'idParqueadero', mensaje: 'El parqueadero no existe.' }]);
  if (parqueadero.estado !== 'activo') throw errores.conflicto('El parqueadero está inactivo.', 'PARQUEADERO_INACTIVO');
  if (piso > parqueadero.pisos) {
    throw errores.validacion([{ campo: 'piso', mensaje: `El parqueadero tiene ${parqueadero.pisos} pisos.` }]);
  }
  return parqueadero;
}

const ocupadaPor = (celda) =>
  errores.conflicto(`La celda está ocupada por ${celda._ocupante?.placa ?? 'un vehículo'}.`, 'CELDA_OCUPADA');

const bitacora = (conexion, actor, accion, idRegistro, anterior, nuevo) =>
  registrarBitacora(conexion, { idUsuario: actor.idUsuario, accion, entidad: 'celda', idRegistro, anterior, nuevo, ip: actor.ip });

// ---------------------------------------------------------------- HU-20
/** RF-CLD-09..11. */
async function crear(datos, actor) {
  try {
    const id = await withTransaction(async (conexion) => {
      await parqueaderoValido(datos.idParqueadero, datos.piso, conexion);
      const idCelda = await repositorio.insertar(datos, { conexion });
      await bitacora(conexion, actor, 'crear', idCelda, null, { ...datos, estado: 'disponible' });
      return idCelda;
    });
    return publica(await repositorio.obtenerPorId(id), actor);
  } catch (error) {
    return traducirDuplicado(error);
  }
}

/** RF-CLD-12: crea las que no existen e informa las omitidas. */
async function crearLote({ idParqueadero, prefijo, desde, hasta, tipoVehiculo, piso, area }, actor) {
  let codigos;
  try {
    codigos = codigosDelRango(prefijo, desde, hasta);
  } catch (error) {
    throw errores.validacion([{ campo: error.campo, mensaje: error.message }]);
  }
  return withTransaction(async (conexion) => {
    await parqueaderoValido(idParqueadero, piso, conexion);
    const existentes = new Set(await repositorio.codigosExistentes(idParqueadero, codigos, { conexion }));
    const creadas = codigos.filter((c) => !existentes.has(c));
    const omitidas = codigos.filter((c) => existentes.has(c));
    await repositorio.insertarVarias(idParqueadero, creadas, { tipoVehiculo, piso, area }, { conexion });
    if (creadas.length) {
      await registrarBitacora(conexion, {
        idUsuario: actor.idUsuario,
        accion: 'crear_lote',
        entidad: 'celda',
        idRegistro: idParqueadero,
        nuevo: { creadas, tipoVehiculo, piso, area },
        ip: actor.ip,
      });
    }
    return { creadas, omitidas };
  });
}

// ---------------------------------------------------------------- HU-22
/** RF-CLD-16..18. */
async function listar({ page, limit, q, parqueadero, piso, tipo, estado }, actor) {
  const { celdas, total } = await repositorio.listar({
    idParqueadero: parqueadero,
    piso,
    tipo,
    estado,
    q,
    ...aLimites({ page, limit }),
  });
  return { data: celdas.map((c) => publica(c, actor)), meta: meta({ page, limit }, total) };
}

async function obtener(id, actor) {
  const celda = await repositorio.obtenerPorId(id);
  if (!celda) throw NO_ENCONTRADA();
  return publica(celda, actor);
}

// ---------------------------------------------------------------- HU-21
/** RF-CLD-13: editar una celda que no esté ocupada. */
async function actualizar(id, datos, actor) {
  try {
    await withTransaction(async (conexion) => {
      const celda = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
      if (!celda) throw NO_ENCONTRADA();
      if (celda.estado === 'ocupada') throw ocupadaPor(celda);
      if (datos.piso > celda._pisos) {
        throw errores.validacion([{ campo: 'piso', mensaje: `El parqueadero tiene ${celda._pisos} pisos.` }]);
      }
      const anterior = { codigo: celda.codigo, tipoVehiculo: celda.tipoVehiculo, piso: celda.piso, area: celda.area };
      const cambiados = Object.keys(anterior).filter((k) => anterior[k] !== datos[k]);
      if (cambiados.length === 0) return;
      await repositorio.actualizar(id, datos, { conexion });
      await bitacora(
        conexion,
        actor,
        'editar',
        id,
        Object.fromEntries(cambiados.map((k) => [k, anterior[k]])),
        Object.fromEntries(cambiados.map((k) => [k, datos[k]]))
      );
    });
  } catch (error) {
    return traducirDuplicado(error);
  }
  return obtener(id, actor);
}

const MENSAJES_TRANSICION = {
  CAMBIO_ESTADO_NO_PERMITIDO: () => 'La ocupación se registra con una entrada; la reserva, desde Reservas.',
  CELDA_RESERVADA: () => 'La celda está reservada; se libera desde Reservas.',
};

/** RF-CLD-14/15, RN-09 (research R-05): solo inhabilitar y habilitar a mano. */
async function cambiarEstado(id, { estado, motivo }, actor) {
  await withTransaction(async (conexion) => {
    const celda = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!celda) throw NO_ENCONTRADA();
    const transicion = transicionManual(celda.estado, estado);
    if (!transicion.permitido) {
      if (transicion.code === 'CELDA_OCUPADA') throw ocupadaPor(celda);
      throw errores.conflicto(MENSAJES_TRANSICION[transicion.code](), transicion.code);
    }
    if (transicion.sinCambios) return;
    const nuevoMotivo = estado === 'inhabilitada' ? motivo : null;
    await repositorio.cambiarEstado(id, estado, nuevoMotivo, { conexion });
    await bitacora(
      conexion,
      actor,
      'cambiar_estado',
      id,
      { estado: celda.estado, motivo: celda.motivoInhabilitacion },
      { estado, motivo: nuevoMotivo }
    );
  });
  return obtener(id, actor);
}

/** DELETE /celdas/:id: inhabilitación lógica (RF-CLD-14). */
const inhabilitar = (id, actor) => cambiarEstado(id, { estado: 'inhabilitada', motivo: MOTIVO_RETIRO }, actor);

// ---------------------------------------------------------------- HU-23 · operaciones de dominio (spec 007)
/**
 * RF-CLD-19, RNF-SAF-01: ocupa la celda con el vehículo dentro de la transacción del movimiento.
 * La celda debe estar disponible o reservada (la reserva del mismo vehículo la valida la spec 012),
 * ser del tipo del vehículo y pertenecer a un parqueadero activo.
 */
async function ocupar(conexion, { idCelda, idVehiculo, tipoVehiculo }) {
  const celda = await repositorio.obtenerPorId(idCelda, { conexion, bloquear: true });
  if (!celda) throw NO_ENCONTRADA();
  if (celda._parqueaderoEstado !== 'activo' || !['disponible', 'reservada'].includes(celda.estado)) {
    throw errores.conflicto(`La celda ${celda.codigo} no está disponible.`, 'CELDA_NO_DISPONIBLE');
  }
  if (celda.tipoVehiculo !== tipoVehiculo) {
    throw errores.conflicto(`La celda ${celda.codigo} es para ${celda.tipoVehiculo}.`, 'TIPO_CELDA_INCOMPATIBLE');
  }
  try {
    await repositorio.ocupar(idCelda, idVehiculo, { conexion });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw errores.conflicto('El vehículo ya ocupa otra celda.', 'VEHICULO_EN_OTRA_CELDA');
    }
    throw error;
  }
  return celda;
}

/** RF-CLD-20: libera la celda (salida o anulación de la entrada). */
async function liberar(conexion, idCelda) {
  const celda = await repositorio.obtenerPorId(idCelda, { conexion, bloquear: true });
  if (!celda) throw NO_ENCONTRADA();
  if (celda.estado !== 'ocupada') {
    throw new AppError(409, 'CELDA_NO_OCUPADA', `La celda ${celda.codigo} no está ocupada.`);
  }
  await repositorio.liberar(idCelda, { conexion });
}

/** RF-MOV-04: id de la celda disponible de menor código del tipo, o null si no hay. */
const sugerir = (conexion, { idParqueadero, tipoVehiculo }) =>
  repositorio.primeraDisponible(idParqueadero, tipoVehiculo, { conexion });

module.exports = {
  crear,
  crearLote,
  listar,
  obtener,
  actualizar,
  cambiarEstado,
  inhabilitar,
  ocupar,
  liberar,
  sugerir,
};
