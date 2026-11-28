// Membresías (spec 010): RF-MEM-03..10, RN-23, RN-24. La membresía nace activa solo con su pago: membresía,
// factura y pago van en la misma transacción (research R-03); la renovación alarga la misma fila con una
// factura nueva (R-04) y el proceso diario marca las vencidas (R-05).
const { withTransaction } = require('../../config/db');
const repositorio = require('./membresias.repository');
const planesRepositorio = require('../planes/planes.repository');
const vehiculosRepositorio = require('../vehiculos/vehiculos.repository');
const facturas = require('../facturas/facturas.service');
const reloj = require('../../utils/reloj');
const { errores } = require('../../utils/errores');
const { registrarBitacora } = require('../../utils/bitacora');
const { aLimites, meta } = require('../../utils/paginacion');
const { enBogota } = require('../../utils/fechas');
const { finDe, periodoRenovacion, diasRestantes, avisoRenovacion, fechaColombiana } = require('./membresias.reglas');

const NO_ENCONTRADA = () => errores.noEncontrado('Membresía no encontrada.', 'MEMBRESIA_NO_ENCONTRADA');
const PLAN_INACTIVO = () => errores.conflicto('El plan está inactivo: no admite suscripciones ni renovaciones.', 'PLAN_INACTIVO');
const YA_ACTIVA = (fechaFin) =>
  errores.conflicto(`El vehículo ya tiene una membresía activa${fechaFin ? ` hasta ${fechaColombiana(fechaFin)}` : ''}`, 'MEMBRESIA_ACTIVA');
const campo = (nombre, mensaje) => errores.validacion([{ campo: nombre, mensaje }]);
const PLURAL = { carro: 'carros', moto: 'motos' };

/** Fecha de hoy en Bogotá ('AAAA-MM-DD') según el reloj del servidor. */
const hoy = () => enBogota(reloj.ahora()).fecha;

const bitacora = (conexion, actor, accion, idRegistro, nuevo, anterior = null) =>
  registrarBitacora(conexion, { idUsuario: actor?.idUsuario ?? null, accion, entidad: 'membresia', idRegistro, anterior, nuevo, ip: actor?.ip });

/** Membresía para la API con los días restantes y el aviso de renovación (RF-MEM-09). */
const publica = (m, dia = hoy()) => m && { ...m, diasRestantes: diasRestantes(m, dia), avisoRenovacion: avisoRenovacion(m, dia) };

/** RN-23: carrera entre dos suscripciones del mismo vehículo (UNIQUE de la activa). */
function traducirDuplicado(error) {
  if (error.code === 'ER_DUP_ENTRY' && String(error.message).includes('uq_membresia_activa')) throw YA_ACTIVA(null);
  throw error;
}

/** Plan bloqueado y activo, o el error que corresponda. */
async function planActivo(conexion, idPlan, { comoCampo }) {
  const plan = await planesRepositorio.obtenerPorId(idPlan, { conexion, bloquear: true });
  if (!plan) throw comoCampo ? campo('idPlan', 'El plan no existe.') : errores.noEncontrado('Plan no encontrado.', 'PLAN_NO_ENCONTRADO');
  if (plan.estado !== 'activo') throw PLAN_INACTIVO();
  return plan;
}

// ---------------------------------------------------------------- HU-46
/** RF-MEM-03..05, RN-23, RN-24: suscribe un vehículo con propietario a un plan activo de su tipo, con el pago. */
async function suscribir({ idVehiculo, idPlan, pago }, actor) {
  let resultado;
  try {
    resultado = await withTransaction(async (conexion) => {
      const plan = await planActivo(conexion, idPlan, { comoCampo: true });
      const vehiculo = await vehiculosRepositorio.obtenerPorId(idVehiculo, { conexion, bloquear: true });
      if (!vehiculo) throw campo('idVehiculo', 'El vehículo no existe.');
      if (vehiculo.estado !== 'activo') throw campo('idVehiculo', 'El vehículo está inactivo.');
      if (!vehiculo.propietario) throw campo('idVehiculo', 'Asocie primero el vehículo a un cliente.');
      // Alcance por permiso: sin membresias.ver (el Cliente) solo suscribe sus vehículos.
      if (!actor.permisos.includes('membresias.ver') && vehiculo.propietario.idUsuario !== actor.idUsuario) {
        throw errores.sinPermiso('Solo puede suscribir sus propios vehículos.');
      }
      if (vehiculo.tipo !== plan.tipoVehiculo) throw campo('idPlan', `El plan es para ${PLURAL[plan.tipoVehiculo]}: el vehículo es ${vehiculo.tipo === 'moto' ? 'una moto' : 'un carro'}.`);
      const activa = await repositorio.activaDelVehiculo(idVehiculo, { conexion });
      if (activa) throw YA_ACTIVA(activa.fechaFin);

      const fechaInicio = hoy();
      const fechaFin = finDe(fechaInicio, plan.diasVigencia);
      const idMembresia = await repositorio.insertar({ idPlan, idCliente: vehiculo.propietario.idUsuario, idVehiculo, fechaInicio, fechaFin }, { conexion });
      // RN-24: si el pago no es válido, cobrar lanza el error y la transacción descarta la membresía.
      const idFactura = await facturas.cobrar(conexion, {
        idMembresia,
        total: plan.valorMensual,
        idCliente: vehiculo.propietario.idUsuario,
        pago,
        actor,
        accion: 'cobrar_membresia',
        prefijoCampo: 'pago.',
      });
      await bitacora(conexion, actor, 'suscribir', idMembresia, { idPlan, idVehiculo, fechaInicio, fechaFin, idFactura });
      return { idMembresia, idFactura };
    });
  } catch (error) {
    traducirDuplicado(error);
  }
  const membresia = publica(await repositorio.obtenerPorId(resultado.idMembresia));
  return { membresia, factura: await facturas.obtener(resultado.idFactura) };
}

// ---------------------------------------------------------------- HU-47
/** RF-MEM-06: activa → desde el día siguiente al fin; vencida → desde hoy. Cobra el valor actual del plan. */
async function renovar(id, { pago }, actor) {
  let resultado;
  try {
    resultado = await withTransaction(async (conexion) => {
      const actual = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
      if (!actual) throw NO_ENCONTRADA();
      if (actual.estado === 'cancelada') throw errores.conflicto('La membresía está cancelada: no se puede renovar.', 'MEMBRESIA_CANCELADA');
      const plan = await planActivo(conexion, actual.plan.idPlan, { comoCampo: false });
      const dia = hoy();
      // Una activa cuyo fin ya pasó (el proceso diario aún no corrió) se renueva como vencida.
      const estadoEfectivo = actual.estado === 'activa' && actual.fechaFin < dia ? 'vencida' : actual.estado;
      if (estadoEfectivo === 'vencida') {
        const otra = await repositorio.activaDelVehiculo(actual.vehiculo.idVehiculo, { conexion });
        if (otra && otra.idMembresia !== actual.idMembresia) throw YA_ACTIVA(otra.fechaFin);
      }
      const periodo = periodoRenovacion({ estado: estadoEfectivo, fechaFin: actual.fechaFin }, plan.diasVigencia, dia);
      const fechaInicio = estadoEfectivo === 'activa' ? actual.fechaInicio : periodo.desde;
      await repositorio.renovar(id, { fechaInicio, fechaFin: periodo.hasta }, { conexion });
      const idFactura = await facturas.cobrar(conexion, {
        idMembresia: id,
        total: plan.valorMensual,
        idCliente: actual.cliente.idUsuario,
        pago,
        actor,
        accion: 'cobrar_membresia',
        prefijoCampo: 'pago.',
      });
      await bitacora(
        conexion,
        actor,
        'renovar',
        id,
        { estado: 'activa', fechaInicio, fechaFin: periodo.hasta, periodo, idFactura },
        { estado: actual.estado, fechaInicio: actual.fechaInicio, fechaFin: actual.fechaFin }
      );
      return { periodo, idFactura };
    });
  } catch (error) {
    traducirDuplicado(error);
  }
  return {
    membresia: publica(await repositorio.obtenerPorId(id)),
    periodo: resultado.periodo,
    factura: await facturas.obtener(resultado.idFactura),
  };
}

/** RF-MEM-07: desde la cancelación la liquidación ya no la encuentra (exige estado activa). */
async function cancelar(id, { motivo }, actor) {
  await withTransaction(async (conexion) => {
    const actual = await repositorio.obtenerPorId(id, { conexion, bloquear: true });
    if (!actual) throw NO_ENCONTRADA();
    if (actual.estado !== 'activa') throw errores.conflicto(`La membresía no está activa (está ${actual.estado}).`, 'MEMBRESIA_NO_ACTIVA');
    await repositorio.cancelar(id, motivo, { conexion });
    await bitacora(conexion, actor, 'cancelar', id, { estado: 'cancelada', motivo }, { estado: 'activa' });
  });
  return publica(await repositorio.obtenerPorId(id));
}

/** RF-MEM-08 (R-05): marca como vencidas las activas cuya fecha de fin ya pasó. Devuelve cuántas. */
async function vencer(dia = hoy()) {
  return withTransaction(async (conexion) => {
    const pendientes = await repositorio.vencidasPendientes(dia, { conexion });
    await repositorio.marcarVencidas(
      pendientes.map((p) => p.idMembresia),
      { conexion }
    );
    for (const p of pendientes) await bitacora(conexion, null, 'vencer', p.idMembresia, { estado: 'vencida', fechaFin: p.fechaFin }, { estado: 'activa' });
    return pendientes.length;
  });
}

// ---------------------------------------------------------------- consultas
/** GET /membresias [Propuesta]: listado del personal. */
async function listar(filtros) {
  const { filas, total } = await repositorio.listar({ ...filtros, ...aLimites(filtros) });
  const dia = hoy();
  return { data: filas.map((m) => publica(m, dia)), meta: meta(filtros, total) };
}

/** HU-48 (R-06): las membresías del Cliente con sus facturas; los planes activos si no tiene una activa. */
async function mias(actor) {
  const dia = hoy();
  const propias = await repositorio.delCliente(actor.idUsuario);
  const porMembresia = await repositorio.facturasDe(propias.map((m) => m.idMembresia));
  const membresias = propias.map((m) => ({ ...publica(m, dia), facturas: porMembresia.get(m.idMembresia) ?? [] }));
  const tieneActiva = membresias.some((m) => m.estado === 'activa' && m.diasRestantes > 0);
  return { membresias, planesDisponibles: tieneActiva ? [] : await planesRepositorio.activos() };
}

module.exports = { suscribir, renovar, cancelar, vencer, listar, mias, hoy };
