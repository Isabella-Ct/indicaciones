// Reglas de negocio de celdas — REQ-CLD-01, REQ-CLD-02, REQ-CLD-03.
const { enTransaccion } = require('../../config/db');
const { AppError, errores } = require('../../utils/errores');
const { publicarCambioCelda } = require('../../realtime/celdas-tiempo-real');
const vehiculosService = require('../vehiculos/vehiculos.service');
const repo = require('./celdas.repository');
const { aPublico, puedeVerOcupantes } = require('./celdas.mapper');
const { construirResumen } = require('./celdas.resumen');

const conflicto = (codigo, mensaje, detalles) => new AppError(409, codigo, mensaje, detalles);

async function listar(filtros, solicitante) {
  const verInactivas =
    filtros.incluir_inactivas === '1' && solicitante.permisos.includes('celdas.gestionar');
  const filas = await repo.listar({ ...filtros, incluirInactivas: verInactivas });
  const verOcupantes = puedeVerOcupantes(solicitante);
  const propios = verOcupantes ? null : await repo.vehiculosDeUsuario(solicitante.id);
  return filas.map((f) => aPublico(f, verOcupantes, propios));
}

async function obtener(id, solicitante) {
  const fila = await repo.buscarDetalle(id);
  if (!fila || (!fila.activa && !solicitante.permisos.includes('celdas.gestionar'))) {
    throw errores.noEncontrado('La celda no existe.');
  }
  const verOcupantes = puedeVerOcupantes(solicitante);
  const propios = verOcupantes ? null : await repo.vehiculosDeUsuario(solicitante.id);
  return aPublico(fila, verOcupantes, propios);
}

async function resumen() {
  return construirResumen(await repo.filasResumen());
}

/** Valida que el vehículo pueda ocupar la celda (mismo tipo, activo, sin otra celda). */
async function validarOcupante(celda, vehiculoId, conexion) {
  let vehiculo;
  try {
    vehiculo = await vehiculosService.obtener(vehiculoId);
  } catch {
    throw errores.validacion(
      [{ campo: 'vehiculo_id', mensaje: 'El vehículo no existe.' }],
      'El vehículo no existe.'
    );
  }
  if (!vehiculo.activo) {
    throw errores.validacion(
      [{ campo: 'vehiculo_id', mensaje: 'El vehículo está inactivo.' }],
      'El vehículo está inactivo.'
    );
  }
  if (vehiculo.tipo !== celda.tipo) {
    const mensaje = `La celda ${celda.codigo} es de ${celda.tipo} y el vehículo ${vehiculo.placa} es ${vehiculo.tipo}.`;
    throw new AppError(422, 'TIPO_INCOMPATIBLE', mensaje, [{ campo: 'vehiculo_id', mensaje }]);
  }
  const otra = await repo.celdaDelVehiculo(vehiculoId, conexion);
  if (otra && otra.id !== celda.id) {
    throw conflicto(
      'VEHICULO_YA_UBICADO',
      `El vehículo ${vehiculo.placa} ya ocupa la celda ${otra.codigo}.`
    );
  }
  return vehiculo;
}

/**
 * REQ-CLD-03: cambio manual de estado.
 * - ocupada: con un vehículo del mismo tipo que no esté en otra celda.
 * - disponible: nunca con una estadía en curso; si es celda fija de una
 *   mensualidad (o tiene reserva activa) vuelve a "reservada".
 * - fuera_servicio: con nota; no si está ocupada.
 */
async function cambiarEstado(id, { estado, vehiculo_id, nota }) {
  const resultado = await enTransaccion(async (conexion) => {
    const celda = await repo.bloquear(id, conexion);
    if (!celda) throw errores.noEncontrado('La celda no existe.');
    if (!celda.activa)
      throw conflicto('CELDA_INACTIVA', `La celda ${celda.codigo} está desactivada.`);

    const membresia = await repo.membresiaFija(id, conexion);
    const reserva = await repo.reservaActiva(id, conexion);

    if (estado === 'ocupada') {
      if (celda.estado === 'ocupada')
        throw conflicto('CELDA_OCUPADA', `La celda ${celda.codigo} ya está ocupada.`);
      if (celda.estado === 'fuera_servicio') {
        throw conflicto(
          'CELDA_FUERA_SERVICIO',
          `La celda ${celda.codigo} está fuera de servicio: habilítala primero.`
        );
      }
      const titular = membresia?.vehiculo_id ?? reserva?.vehiculo_id;
      if (celda.estado === 'reservada' && titular && titular !== vehiculo_id) {
        throw conflicto(
          'CELDA_RESERVADA',
          `La celda ${celda.codigo} está reservada para otro vehículo.`
        );
      }
      await validarOcupante(celda, vehiculo_id, conexion);
      try {
        await repo.actualizarEstado(
          id,
          { estado: 'ocupada', vehiculo_actual_id: vehiculo_id },
          conexion
        );
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY')
          throw conflicto('VEHICULO_YA_UBICADO', 'El vehículo ya ocupa otra celda.');
        throw err;
      }
      return { estado: 'ocupada' };
    }

    if (estado === 'disponible') {
      if (await repo.tieneEstadiaAbierta(id, conexion)) {
        throw conflicto(
          'ESTADIA_EN_CURSO',
          `La celda ${celda.codigo} tiene un vehículo con estadía en curso: registra su salida para liberarla.`
        );
      }
      const final = membresia || reserva ? 'reservada' : 'disponible';
      if (celda.estado === final) {
        throw conflicto(
          'SIN_CAMBIO',
          `La celda ${celda.codigo} ya está ${final === 'reservada' ? 'reservada' : 'disponible'}.`
        );
      }
      await repo.actualizarEstado(id, { estado: final }, conexion);
      return { estado: final };
    }

    // fuera_servicio
    if (celda.estado === 'ocupada') {
      throw conflicto(
        'CELDA_OCUPADA',
        `La celda ${celda.codigo} está ocupada: libérala antes de sacarla de servicio.`
      );
    }
    await repo.actualizarEstado(id, { estado: 'fuera_servicio', nota }, conexion);
    return { estado: 'fuera_servicio' };
  });

  await publicarCambioCelda(id);
  return resultado;
}

async function validarDatos(datos, excluirId = 0) {
  const piso = await repo.obtenerPiso(datos.piso_id);
  if (!piso) throw errores.validacion([{ campo: 'piso_id', mensaje: 'El piso no existe.' }]);
  if (await repo.existeCodigo(piso.parqueadero_id, datos.codigo, excluirId)) {
    throw conflicto('CODIGO_DUPLICADO', `Ya existe una celda con el código ${datos.codigo}.`, [
      { campo: 'codigo', mensaje: 'Este código ya existe.' },
    ]);
  }
  const ocupante = await repo.celdaEnPosicion(
    datos.piso_id,
    datos.fila_mapa,
    datos.posicion,
    excluirId
  );
  if (ocupante) {
    throw conflicto(
      'POSICION_OCUPADA',
      `La posición ${datos.posicion} de la fila ${datos.fila_mapa} en ${piso.nombre} ya la tiene la celda ${ocupante}.`,
      [{ campo: 'posicion', mensaje: `Posición ocupada por ${ocupante}.` }]
    );
  }
  return piso;
}

async function crear(datos, solicitante) {
  const piso = await validarDatos(datos);
  const id = await repo.insertar({ ...datos, parqueadero_id: piso.parqueadero_id });
  await publicarCambioCelda(id);
  return obtener(id, solicitante);
}

async function actualizar(id, datos, solicitante) {
  const actual = await repo.buscarDetalle(id);
  if (!actual) throw errores.noEncontrado('La celda no existe.');
  const piso = await validarDatos(datos, id);
  if (
    datos.tipo !== actual.tipo &&
    (actual.estado === 'ocupada' || actual.membresia_id || actual.reserva_id)
  ) {
    throw conflicto(
      'CELDA_EN_USO',
      `No se puede cambiar el tipo de ${actual.codigo} mientras esté ocupada o asignada a una mensualidad o reserva.`
    );
  }
  await repo.actualizar(id, { ...datos, parqueadero_id: piso.parqueadero_id });
  await publicarCambioCelda(id);
  return obtener(id, solicitante);
}

/** Borrado lógico: solo celdas libres o fuera de servicio y sin mensualidad/reserva. */
async function cambiarActiva(id, activa, solicitante) {
  const actual = await repo.buscarDetalle(id);
  if (!actual) throw errores.noEncontrado('La celda no existe.');
  if (Boolean(actual.activa) === activa) {
    throw conflicto(
      'SIN_CAMBIO',
      `La celda ${actual.codigo} ya está ${activa ? 'activa' : 'desactivada'}.`
    );
  }
  if (
    !activa &&
    (!['disponible', 'fuera_servicio'].includes(actual.estado) ||
      actual.membresia_id ||
      actual.reserva_id)
  ) {
    throw conflicto(
      'CELDA_EN_USO',
      `La celda ${actual.codigo} está en uso (ocupada, reservada o con mensualidad): no se puede desactivar.`
    );
  }
  await repo.actualizarActiva(id, activa);
  await publicarCambioCelda(id);
  return obtener(id, solicitante);
}

/** Vehículos de un cliente (para el SSE del mapa). */
const vehiculosDeUsuario = (usuarioId) => repo.vehiculosDeUsuario(usuarioId);

module.exports = {
  vehiculosDeUsuario,
  listar,
  obtener,
  resumen,
  cambiarEstado,
  crear,
  actualizar,
  cambiarActiva,
};
