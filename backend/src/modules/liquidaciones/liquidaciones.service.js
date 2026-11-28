// Liquidación de un movimiento (spec 009, research R-03): RF-FAC-01..04, RN-19, RN-20, RN-21.
// Cerrado → se guarda una vez; abierto → vista previa con el reloj; anulado → 409. Sin tarifa → 409 y alerta.
const { withTransaction } = require('../../config/db');
const repositorio = require('./liquidaciones.repository');
const tarifasRepositorio = require('../tarifas/tarifas.repository');
const tarifas = require('../tarifas/tarifas.service');
const reloj = require('../../utils/reloj');
const { AppError, errores } = require('../../utils/errores');
const { registrarBitacora } = require('../../utils/bitacora');
const { tipoClienteDe } = require('../tarifas/tarifas.reglas');
const { minutosEstadia } = require('../movimientos/movimientos.reglas');
const { calcular } = require('./liquidaciones.reglas');

const NO_ENCONTRADO = () => errores.noEncontrado('Movimiento no encontrado.', 'MOVIMIENTO_NO_ENCONTRADO');

/** Tarifa para la API (solo los valores del cálculo). */
const resumenTarifa = (t) =>
  t && {
    idTarifa: t.idTarifa,
    nombre: t.nombre,
    valorPrimeraHora: t.valorPrimeraHora,
    minutosFraccion: t.minutosFraccion,
    valorFraccion: t.valorFraccion,
    topeDiario: t.topeDiario,
    minutosGracia: t.minutosGracia,
  };

function respuesta(movimiento, tarifa, calculo, guardada) {
  return {
    idMovimiento: movimiento.idMovimiento,
    persistida: Boolean(guardada),
    placa: movimiento.placa,
    tipoVehiculo: movimiento.tipoVehiculo,
    tipoCliente: tipoClienteDe({ idPropietario: movimiento.idPropietario }),
    tarifa: resumenTarifa(tarifa),
    minutos: calculo.minutos,
    fracciones: calculo.fracciones,
    dias: calculo.dias,
    topeAplicado: calculo.topeAplicado,
    valorBruto: guardada ? guardada.valorBruto : calculo.valorBruto,
    valorDescuento: guardada ? guardada.valorDescuento : calculo.valorDescuento,
    cubiertoPorMembresia: guardada ? guardada.cubiertoPorMembresia : calculo.cubiertoPorMembresia,
    total: guardada ? guardada.total : calculo.total,
    explicacion: calculo.explicacion,
    pagada: Boolean(guardada?.idFactura),
    idFactura: guardada?.idFactura ?? null,
    idLiquidacion: guardada?.idLiquidacion ?? null,
  };
}

/** Calcula con la tarifa vigente a la hora de entrada y la membresía que la cubre (lanza SIN_TARIFA). */
async function calcularPara(movimiento, minutos, conexion) {
  const tipoCliente = tipoClienteDe({ idPropietario: movimiento.idPropietario });
  const tarifa = await tarifas.vigenteEn({ tipoVehiculo: movimiento.tipoVehiculo, tipoCliente, fechaHora: movimiento.entrada }, { conexion });
  if (!tarifa) {
    const error = new AppError(409, 'SIN_TARIFA', `No hay tarifa vigente para ${movimiento.tipoVehiculo}`);
    error.alerta = { idMovimiento: movimiento.idMovimiento, mensaje: `No hay tarifa vigente para ${movimiento.tipoVehiculo} ${tipoCliente} (movimiento ${movimiento.idMovimiento}, placa ${movimiento.placa}).` };
    throw error;
  }
  const idMembresia = await repositorio.membresiaQueCubre(movimiento.idVehiculo, movimiento.entrada, { conexion });
  return { tarifa, idMembresia, calculo: calcular({ minutos, tarifa, cubiertoPorMembresia: Boolean(idMembresia) }) };
}

/**
 * RF-FAC-01..04. Si se pasa `conexion`, se usa la transacción de quien llama (p. ej. el pago) y la
 * alerta «sin tarifa» la escribe quien llama; si no, se abre una transacción propia.
 */
async function liquidarEn(conexion, idMovimiento, actor) {
  const movimiento = await repositorio.movimientoParaLiquidar(idMovimiento, { conexion, bloquear: true });
  if (!movimiento) throw NO_ENCONTRADO();
  if (movimiento.estado === 'anulado') throw errores.conflicto('El movimiento está anulado y no se liquida.', 'MOVIMIENTO_ANULADO');

  if (movimiento.estado === 'abierto') {
    // Vista previa «en vivo» (no se guarda).
    const { tarifa, calculo } = await calcularPara(movimiento, minutosEstadia(movimiento.entrada, reloj.ahora()), conexion);
    return respuesta(movimiento, tarifa, calculo, null);
  }

  const guardada = await repositorio.porMovimiento(idMovimiento, { conexion, bloquear: true });
  if (guardada) {
    const tarifa = guardada.idTarifa ? await tarifasRepositorio.obtenerPorId(guardada.idTarifa, { conexion }) : null;
    const calculo = tarifa
      ? calcular({ minutos: guardada.minutos, tarifa, cubiertoPorMembresia: guardada.cubiertoPorMembresia })
      : { minutos: guardada.minutos, fracciones: 0, dias: 0, topeAplicado: false, explicacion: 'Cubierto por membresía' };
    return respuesta(movimiento, tarifa, calculo, guardada);
  }

  const { tarifa, calculo } = await calcularPara(movimiento, movimiento.minutosEstadia, conexion);
  const nueva = {
    idMovimiento,
    idTarifa: tarifa.idTarifa,
    minutos: calculo.minutos,
    valorBruto: calculo.valorBruto,
    valorDescuento: calculo.valorDescuento,
    cubiertoPorMembresia: calculo.cubiertoPorMembresia,
    total: calculo.total,
  };
  const idLiquidacion = await repositorio.insertar(nueva, { conexion });
  await registrarBitacora(conexion, {
    idUsuario: actor?.idUsuario ?? null,
    accion: 'liquidar',
    entidad: 'liquidacion',
    idRegistro: idLiquidacion,
    anterior: null,
    nuevo: { ...nueva, explicacion: calculo.explicacion },
    ip: actor?.ip ?? null,
  });
  return respuesta(movimiento, tarifa, calculo, { ...nueva, idLiquidacion, idFactura: null });
}

/** Escribe la alerta «sin tarifa» que trae el error (fuera de la transacción que falló). */
async function alertarSiFaltaTarifa(error) {
  if (error.code === 'SIN_TARIFA' && error.alerta) {
    await repositorio.alertarSinTarifa({ ...error.alerta, fecha: reloj.ahora() });
  }
}

/** GET /movimientos/:id/liquidacion. */
async function liquidar(idMovimiento, actor) {
  try {
    return await withTransaction((conexion) => liquidarEn(conexion, idMovimiento, actor));
  } catch (error) {
    await alertarSiFaltaTarifa(error);
    throw error;
  }
}

module.exports = { liquidar, liquidarEn, alertarSiFaltaTarifa };
