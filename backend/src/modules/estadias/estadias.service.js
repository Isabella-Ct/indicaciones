// Entradas y salidas — REQ-INEX-1..4, REQ-PLA-1, REQ-TCK-1. Todas las horas las pone
// el servidor (new Date() aquí), nunca el cliente. El cobro se conecta en la Fase 4.
const { enTransaccion } = require('../../config/db');
const { AppError, errores } = require('../../utils/errores');
const { aLimites, meta } = require('../../utils/paginacion');
const { minutosEntre, formatearDuracion } = require('../../utils/fechas');
const { guardarImagen } = require('../../utils/archivos');
const { publicar } = require('../../realtime/emisor');
const { publicarCambioCelda } = require('../../realtime/celdas-tiempo-real');
const celdasRepo = require('../celdas/celdas.repository');
const picoPlacaService = require('../pico-placa/pico-placa.service');
const notificaciones = require('../notificaciones/notificaciones.service');
const repo = require('./estadias.repository');
const { elegirCelda } = require('./estadias.asignacion');

// ---------------------------------------------------------------- formas públicas
function aPublico(e, ahora = new Date()) {
  const minutos =
    e.estado === 'en_curso' ? minutosEntre(e.fecha_hora_entrada, ahora) : e.minutos_estadia;
  return {
    id: e.id,
    codigo_ticket: e.codigo_ticket,
    estado: e.estado,
    tipo_cliente: e.tipo_cliente,
    vehiculo: {
      id: e.vehiculo_id,
      placa: e.placa,
      tipo: e.tipo,
      marca: e.marca,
      modelo: e.modelo,
      color: e.color,
      propietario: e.propietario_nombre || null,
    },
    celda: { id: e.celda_id, codigo: e.celda_codigo, piso: e.piso_nombre },
    puerta_entrada: e.puerta_entrada,
    puerta_salida: e.puerta_salida ?? null,
    fecha_hora_entrada: e.fecha_hora_entrada,
    fecha_hora_salida: e.fecha_hora_salida ?? null,
    minutos,
    tiempo: formatearDuracion(minutos ?? 0),
    requiere_accesible: Boolean(e.requiere_accesible),
    observaciones_entrada: e.observaciones_entrada,
    deja_llaves: Boolean(e.deja_llaves),
    registrada_entrada_por: e.registrada_entrada_por,
    registrada_salida_por: e.registrada_salida_por ?? null,
    valor_pagado: e.valor_pagado ?? null,
  };
}

const conflicto = (codigo, mensaje, detalles) => new AppError(409, codigo, mensaje, detalles);

async function validarPuerta(puertaId, sentido) {
  const puerta = await repo.puerta(puertaId);
  const invalida =
    !puerta || !puerta.activa || (puerta.tipo !== 'mixta' && puerta.tipo !== sentido);
  if (invalida) {
    const mensaje = `La puerta no está activa o no permite registrar ${sentido === 'entrada' ? 'entradas' : 'salidas'}.`;
    throw errores.validacion([{ campo: 'puerta_id', mensaje }], mensaje);
  }
  return puerta;
}

/** Celda fija de la mensualidad o de la reserva, si está utilizable. */
async function celdaPreasignada(membresia, reserva) {
  const id = reserva?.celda_id ?? membresia?.celda_asignada_id;
  if (!id) return null;
  const celda = await repo.celdaPorId(id);
  if (!celda || !celda.activa || !['reservada', 'disponible'].includes(celda.estado)) return null;
  return celda;
}

async function tarifaTexto(tipo) {
  const t = await repo.tarifaVigente(tipo);
  if (!t) return null;
  const unidad = t.minutos_fraccion === 1 ? 'min' : `${t.minutos_fraccion} min`;
  return {
    valor_fraccion: t.valor_fraccion,
    minutos_fraccion: t.minutos_fraccion,
    tope_dia: t.valor_dia_maximo,
    unidad,
  };
}

// ---------------------------------------------------------------- previsualización
/**
 * Datos para el modal de ingreso mientras se escribe la placa: si el vehículo existe,
 * tipo de cliente detectado, celda sugerida y si hoy tiene pico y placa.
 */
async function previsualizar({ placa, requiere_accesible }) {
  const ahora = new Date();
  const vehiculo = await repo.vehiculoPorPlaca(placa);
  if (!vehiculo) return { placa, registrado: false, vehiculo: null };

  const [membresia, reserva, abierta, restriccion, tarifa] = await Promise.all([
    repo.membresiaVigente(vehiculo.id),
    repo.reservaVigente(vehiculo.id, ahora),
    repo.estadiaAbiertaDeVehiculo(vehiculo.id),
    picoPlacaService.evaluar(placa, vehiculo.tipo, ahora),
    tarifaTexto(vehiculo.tipo),
  ]);

  let sugerida = await celdaPreasignada(membresia, reserva);
  let requiereConfirmacion = false;
  let sinCupo = false;
  if (!sugerida) {
    try {
      sugerida = elegirCelda({
        libres: await repo.celdasLibres(vehiculo.tipo),
        requiereAccesible: requiere_accesible,
      });
    } catch (err) {
      if (err.codigo === 'CONFIRMAR_ACCESIBLE') {
        requiereConfirmacion = true;
        sugerida = { id: err.detalles[0].celda_id, codigo: err.detalles[0].codigo };
      } else sinCupo = true;
    }
  }

  return {
    placa,
    registrado: true,
    vehiculo: {
      id: vehiculo.id,
      placa: vehiculo.placa,
      tipo: vehiculo.tipo,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      color: vehiculo.color,
      activo: Boolean(vehiculo.activo),
      propietario: vehiculo.propietario_nombre || null,
    },
    tipo_cliente: membresia ? 'mensualidad' : 'visitante',
    titular: membresia?.titular ?? null,
    celda_fija: Boolean(membresia?.celda_asignada_id || reserva),
    estadia_abierta: abierta
      ? { codigo_ticket: abierta.codigo_ticket, celda: abierta.celda_codigo }
      : null,
    pico_placa: restriccion.restringido ? restriccion.regla : null,
    celda_sugerida: sugerida
      ? { id: sugerida.id, codigo: sugerida.codigo, piso: sugerida.piso_nombre ?? null }
      : null,
    requiere_confirmacion_accesible: requiereConfirmacion,
    sin_cupo: sinCupo,
    tarifa,
  };
}

// ---------------------------------------------------------------- entrada
/** REQ-INEX-1 / REQ-INEX-4 / REQ-PLA-1. */
async function registrarEntrada(datos, imagen, solicitante) {
  const ahora = new Date();
  const puerta = await validarPuerta(datos.puerta_id, 'entrada');

  // REQ-PLA-1: toda lectura (simulada) queda registrada con su foto, aunque la entrada se rechace.
  const imagenUrl = imagen ? await guardarImagen(imagen, 'lecturas') : null;
  const lecturaId = await repo.insertarLectura({
    placa: datos.placa,
    imagen_url: imagenUrl,
    fecha_hora: ahora,
    puerta_id: puerta.id,
    registrada_por: solicitante.id,
  });

  const vehiculo = await repo.vehiculoPorPlaca(datos.placa);
  if (!vehiculo) {
    throw new AppError(
      404,
      'VEHICULO_NO_REGISTRADO',
      `La placa ${datos.placa} no está registrada. Regístrala como vehículo de visitante para continuar.`,
      [{ campo: 'placa', mensaje: 'Placa no registrada.' }]
    );
  }
  if (!vehiculo.activo)
    throw conflicto('VEHICULO_INACTIVO', `El vehículo ${vehiculo.placa} está inactivo.`);

  const abierta = await repo.estadiaAbiertaDeVehiculo(vehiculo.id);
  if (abierta) {
    throw conflicto(
      'ESTADIA_ABIERTA',
      `${vehiculo.placa} ya está dentro del parqueadero (celda ${abierta.celda_codigo}, ticket ${abierta.codigo_ticket}).`
    );
  }

  // REQ-INEX-4: pico y placa con la hora del servidor.
  const restriccion = await picoPlacaService.evaluar(vehiculo.placa, vehiculo.tipo, ahora);
  if (restriccion.restringido) {
    const motivo = `Pico y placa: ${restriccion.regla.descripcion}`;
    await repo.insertarDenegado({
      placa: vehiculo.placa,
      tipo_vehiculo: vehiculo.tipo,
      puerta_id: puerta.id,
      fecha_hora: ahora,
      motivo,
      regla_pico_placa_id: restriccion.regla.id,
      registrado_por: solicitante.id,
    });
    await notificaciones.notificarAdministradores({
      titulo: 'Entrada rechazada por pico y placa',
      mensaje: `${vehiculo.placa} intentó ingresar por la puerta ${puerta.nombre}. ${motivo}.`,
      tipo: 'pico_placa',
    });
    throw new AppError(403, 'PICO_Y_PLACA', `Entrada rechazada. ${motivo}.`, [
      { campo: 'placa', mensaje: motivo, regla: restriccion.regla },
    ]);
  }

  // Celda: reserva vigente o mensualidad con celda fija; si no, la elegida o la primera libre.
  const [membresia, reserva] = await Promise.all([
    repo.membresiaVigente(vehiculo.id),
    repo.reservaVigente(vehiculo.id, ahora),
  ]);
  let celda = await celdaPreasignada(membresia, reserva);
  if (!celda) {
    celda = elegirCelda({
      libres: await repo.celdasLibres(vehiculo.tipo),
      solicitadaId: datos.celda_id ?? null,
      requiereAccesible: datos.requiere_accesible,
      confirmarAccesible: datos.confirmar_accesible,
    });
  }
  const usaReserva = reserva && reserva.celda_id === celda.id;

  const estadia = await enTransaccion(async (conexion) => {
    const bloqueada = await repo.celdaPorId(celda.id, conexion, true);
    const permitidos = celda.estado === 'reservada' ? ['reservada', 'disponible'] : ['disponible'];
    if (
      !bloqueada.activa ||
      !permitidos.includes(bloqueada.estado) ||
      bloqueada.tipo !== vehiculo.tipo
    ) {
      throw conflicto(
        'CELDA_NO_DISPONIBLE',
        `La celda ${bloqueada.codigo} acaba de dejar de estar disponible. Intenta de nuevo.`
      );
    }
    let creada;
    try {
      creada = await repo.insertarEstadia(
        {
          vehiculo_id: vehiculo.id,
          celda_id: celda.id,
          tipo_cliente: membresia ? 'mensualidad' : 'visitante',
          membresia_id: membresia?.id,
          reserva_id: usaReserva ? reserva.id : null,
          puerta_entrada_id: puerta.id,
          fecha_hora_entrada: ahora,
          requiere_accesible: datos.requiere_accesible,
          observaciones_entrada: datos.observaciones_entrada,
          deja_llaves: datos.deja_llaves,
          registrada_entrada_por: solicitante.id,
        },
        conexion
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY')
        throw conflicto('ESTADIA_ABIERTA', `${vehiculo.placa} ya tiene una estadía abierta.`);
      throw err;
    }
    await repo.ocuparCelda(celda.id, vehiculo.id, conexion);
    await repo.asociarLectura(lecturaId, creada.id, conexion);
    if (usaReserva) await repo.marcarReservaCumplida(reserva.id, conexion);
    return creada;
  });

  await publicarCambioCelda(celda.id);
  publicar('movimiento-registrado', {
    movimiento: 'entrada',
    estadia_id: estadia.id,
    fecha: ahora,
    placa: vehiculo.placa,
    tipo: vehiculo.tipo,
    celda: celda.codigo,
    puerta: puerta.nombre,
    valor: null,
  });
  return obtenerTicket(estadia.id);
}

// ---------------------------------------------------------------- ticket
async function obtenerTicket(id) {
  const e = await repo.buscarDetalle(id);
  if (!e) throw errores.noEncontrado('La estadía no existe.');
  const [tarifa, pie] = await Promise.all([
    tarifaTexto(e.tipo),
    repo.valorConfiguracion('ticket_mensaje_pie'),
  ]);
  return { ...aPublico(e), tarifa, mensaje_pie: pie };
}

// ---------------------------------------------------------------- salida
async function buscarAbiertaOFallar({ placa, codigo_ticket }) {
  const e = await repo.buscarAbierta({ placa, codigo_ticket });
  if (!e) {
    throw errores.noEncontrado(
      placa
        ? `No hay una estadía en curso para la placa ${placa}.`
        : `No hay una estadía en curso con el ticket ${codigo_ticket}.`
    );
  }
  return e;
}

/** REQ-INEX-2/3: liquidación preliminar (tiempo). No cierra: eso es POST /:id/cerrar. */
async function liquidarSalida({ puerta_id, placa, codigo_ticket }) {
  const ahora = new Date();
  await validarPuerta(puerta_id, 'salida');
  const e = await buscarAbiertaOFallar({ placa, codigo_ticket });
  const minutos = minutosEntre(e.fecha_hora_entrada, ahora);
  return {
    estadia: aPublico(e, ahora),
    fecha_hora_entrada: e.fecha_hora_entrada,
    fecha_hora_salida: ahora,
    minutos,
    tiempo: formatearDuracion(minutos),
  };
}

/** Cierra la estadía y libera la celda (vuelve a "reservada" si es celda fija o reservada). */
async function cerrar(id, { puerta_id }, solicitante) {
  const ahora = new Date();
  const puerta = await validarPuerta(puerta_id, 'salida');
  const cerrada = await enTransaccion(async (conexion) => {
    const e = await repo.bloquearEstadia(id, conexion);
    if (!e) throw errores.noEncontrado('La estadía no existe.');
    if (e.estado !== 'en_curso')
      throw conflicto('ESTADIA_CERRADA', `La estadía ${e.codigo_ticket} ya fue cerrada.`);
    const minutos = minutosEntre(e.fecha_hora_entrada, ahora);
    await repo.cerrarEstadia(
      id,
      {
        salida: ahora,
        minutos,
        puerta_salida_id: puerta.id,
        registrada_salida_por: solicitante.id,
      },
      conexion
    );
    const fija =
      (await celdasRepo.membresiaFija(e.celda_id, conexion)) ||
      (await celdasRepo.reservaActiva(e.celda_id, conexion));
    await repo.liberarCelda(e.celda_id, fija ? 'reservada' : 'disponible', conexion);
    return e;
  });

  await publicarCambioCelda(cerrada.celda_id);
  const detalle = await repo.buscarDetalle(id);
  publicar('movimiento-registrado', {
    movimiento: 'salida',
    estadia_id: id,
    fecha: ahora,
    placa: detalle.placa,
    tipo: detalle.tipo,
    celda: detalle.celda_codigo,
    puerta: puerta.nombre,
    valor: detalle.valor_pagado ?? null,
  });
  return aPublico(detalle);
}

// ---------------------------------------------------------------- consultas
async function enCurso() {
  const ahora = new Date();
  return (await repo.listarEnCurso()).map((e) => aPublico(e, ahora));
}

async function historial(filtros) {
  const { filas, total } = await repo.listarHistorial(filtros, aLimites(filtros));
  return { data: filas.map((e) => aPublico(e)), meta: meta(filtros, total) };
}

async function historialDeUsuario(usuarioId, filtros) {
  return historial({ ...filtros, usuario_id: usuarioId });
}

async function ultimosMovimientos(limite) {
  return repo.ultimosMovimientos(limite);
}

async function accesosDenegados(filtros) {
  const { filas, total } = await repo.listarDenegados(filtros, aLimites(filtros));
  return { data: filas, meta: meta(filtros, total) };
}

module.exports = {
  previsualizar,
  registrarEntrada,
  obtenerTicket,
  liquidarSalida,
  cerrar,
  enCurso,
  historial,
  historialDeUsuario,
  ultimosMovimientos,
  accesosDenegados,
};
