// Membresías — REQ-MEM-1: mensual o anual, usuario + vehículo, celda fija opcional,
// valor desde `configuracion`, factura propia al crearla.
const { enTransaccion } = require('../../config/db');
const { AppError, errores } = require('../../utils/errores');
const { aLimites, meta } = require('../../utils/paginacion');
const { enBogota, formatearFechaHora } = require('../../utils/fechas');
const { publicarCambioCelda } = require('../../realtime/celdas-tiempo-real');
const celdasRepo = require('../celdas/celdas.repository');
const facturasRepo = require('../facturas/facturas.repository');
const usuariosService = require('../usuarios/usuarios.service');
const notificaciones = require('../notificaciones/notificaciones.service');
const repo = require('./membresias.repository');

const ENLACE = (id) => `/app/mis-movimientos.html?membresia=${id}`;
const dia = (fecha) => formatearFechaHora(fecha).slice(0, 10);

function aPublico(m) {
  return {
    id: m.id,
    tipo: m.tipo,
    estado: m.estado,
    vigente: Boolean(m.vigente),
    valor: Number(m.valor),
    fecha_inicio: m.fecha_inicio,
    fecha_fin: m.fecha_fin,
    dias_restantes: m.dias_restantes,
    titular: {
      id: m.usuario_id,
      nombre_completo: m.titular,
      tipo_documento: m.tipo_documento,
      numero_documento: m.numero_documento,
    },
    vehiculo: {
      id: m.vehiculo_id,
      placa: m.placa,
      tipo: m.tipo_vehiculo,
      marca: m.marca,
      modelo: m.modelo,
      color: m.color,
    },
    celda: m.celda_asignada_id ? { id: m.celda_asignada_id, codigo: m.celda_codigo } : null,
    factura: m.factura_id ? { id: m.factura_id, numero: m.factura_numero } : null,
  };
}

/**
 * Libera una celda fija si quedó "reservada" sin mensualidad vigente ni reserva activa.
 * @returns {Promise<boolean>} si cambió
 */
async function liberarCeldaSiCorresponde(celdaId, conexion) {
  if (!celdaId) return false;
  const c = await repo.celda(celdaId, conexion, true);
  if (!c || c.estado !== 'reservada') return false;
  if (
    (await celdasRepo.membresiaFija(celdaId, conexion)) ||
    (await celdasRepo.reservaActiva(celdaId, conexion))
  )
    return false;
  await repo.cambiarEstadoCelda(celdaId, 'disponible', conexion);
  return true;
}

async function listar(filtros) {
  const { filas, total } = await repo.listar(filtros, aLimites(filtros));
  return { data: filas.map(aPublico), meta: meta(filtros, total) };
}

async function deUsuario(usuarioId) {
  return (await repo.deUsuario(usuarioId)).map(aPublico);
}

async function obtener(id) {
  const m = await repo.buscarDetalle(id);
  if (!m) throw errores.noEncontrado('La membresía no existe.');
  return aPublico(m);
}

/** Valor y fecha fin calculados (para el formulario, en solo lectura). */
async function cotizar({ vehiculo_id, tipo, fecha_inicio }) {
  const v = await repo.vehiculo(vehiculo_id);
  if (!v) throw errores.noEncontrado('El vehículo no existe.');
  const clave = `membresia_valor_${tipo}_${v.tipo}`;
  const valor = Number(await repo.valorConfiguracion(clave));
  if (!valor) throw errores.conflicto(`No hay un valor configurado (${clave}).`, 'SIN_VALOR');
  return {
    tipo,
    fecha_inicio,
    fecha_fin: await repo.calcularFin(fecha_inicio, tipo),
    valor,
    tipo_vehiculo: v.tipo,
  };
}

async function crear(datos, solicitante) {
  const hoy = enBogota().fecha;
  if (datos.fecha_inicio < hoy) {
    throw errores.validacion([
      { campo: 'fecha_inicio', mensaje: 'La fecha de inicio no puede ser anterior a hoy.' },
    ]);
  }
  const cliente = await usuariosService.obtenerClienteActivo(datos.usuario_id);
  if (!cliente)
    throw errores.validacion([
      { campo: 'usuario_id', mensaje: 'El titular debe ser un cliente activo.' },
    ]);
  const vehiculo = await repo.vehiculo(datos.vehiculo_id);
  if (!vehiculo || !vehiculo.activo || vehiculo.usuario_id !== datos.usuario_id) {
    throw errores.validacion([
      { campo: 'vehiculo_id', mensaje: 'El vehículo debe ser activo y pertenecer al cliente.' },
    ]);
  }
  const { fecha_fin, valor } = await cotizar(datos);
  const rango = { inicio: datos.fecha_inicio, fin: fecha_fin };

  const solapada = (await repo.traslapadas({ vehiculo_id: vehiculo.id, ...rango }))[0];
  if (solapada) {
    throw new AppError(
      409,
      'MEMBRESIA_TRASLAPADA',
      `El vehículo ${vehiculo.placa} ya tiene una membresía activa del ${dia(solapada.fecha_inicio)} al ${dia(solapada.fecha_fin)}.`
    );
  }

  if (datos.celda_asignada_id) {
    const c = await repo.celda(datos.celda_asignada_id);
    if (!c || !c.activa || c.tipo !== vehiculo.tipo || c.estado === 'fuera_servicio') {
      throw errores.validacion([
        {
          campo: 'celda_asignada_id',
          mensaje: `La celda fija debe estar activa, en servicio y ser de ${vehiculo.tipo}.`,
        },
      ]);
    }
    const otra = (await repo.traslapadas({ celda_id: c.id, ...rango }))[0];
    if (otra) {
      throw new AppError(
        409,
        'CELDA_CON_MENSUALIDAD',
        `La celda ${c.codigo} ya es la celda fija de ${otra.placa} en esas fechas.`
      );
    }
    const reserva = await celdasRepo.reservaActiva(c.id);
    if (reserva && reserva.vehiculo_id !== vehiculo.id) {
      throw new AppError(409, 'CELDA_RESERVADA', `La celda ${c.codigo} tiene una reserva activa.`);
    }
  }

  const ahora = new Date();
  const { id, celdaCambio } = await enTransaccion(async (conexion) => {
    const nuevoId = await repo.insertar(
      {
        ...datos,
        fecha_inicio: rango.inicio,
        fecha_fin: rango.fin,
        valor,
        creado_por: solicitante.id,
      },
      conexion
    );
    await facturasRepo.insertar(
      {
        numero: await facturasRepo.siguienteNumero(conexion),
        concepto: 'membresia',
        membresia_id: nuevoId,
        cliente_id: datos.usuario_id,
        subtotal: valor,
        total: valor,
        metodo_pago: datos.metodo_pago,
        observacion: `${datos.tipo === 'anual' ? 'Anualidad' : 'Mensualidad'} ${vehiculo.tipo} ${vehiculo.placa} (${rango.inicio} a ${rango.fin})`,
        fecha_pago: ahora,
        registrada_por: solicitante.id,
      },
      conexion
    );
    // Si ya está vigente y la celda fija está libre, queda reservada (etiqueta MENSUAL en el mapa).
    let cambio = false;
    if (datos.celda_asignada_id && datos.fecha_inicio <= enBogota().fecha) {
      const c = await repo.celda(datos.celda_asignada_id, conexion, true);
      if (c.estado === 'disponible') {
        await repo.cambiarEstadoCelda(c.id, 'reservada', conexion);
        cambio = true;
      }
    }
    return { id: nuevoId, celdaCambio: cambio };
  });

  if (celdaCambio) await publicarCambioCelda(datos.celda_asignada_id);
  return obtener(id);
}

async function cancelar(id) {
  const m = await repo.buscarDetalle(id);
  if (!m) throw errores.noEncontrado('La membresía no existe.');
  if (m.estado !== 'activa')
    throw errores.conflicto(`La membresía ya está ${m.estado}.`, 'MEMBRESIA_NO_ACTIVA');
  const liberada = await enTransaccion(async (conexion) => {
    await repo.actualizarEstado(id, 'cancelada', conexion);
    return liberarCeldaSiCorresponde(m.celda_asignada_id, conexion);
  });
  if (liberada) await publicarCambioCelda(m.celda_asignada_id);
  return obtener(id);
}

/**
 * Tarea programada (cada hora): vence membresías, reserva las celdas fijas de las
 * que empiezan hoy, libera las de las vencidas y avisa al cliente N días antes.
 */
async function ejecutarMantenimiento() {
  const resumen = { vencidas: 0, celdas_liberadas: 0, celdas_reservadas: 0, avisos: 0 };
  const celdasCambiadas = new Set();

  for (const m of await repo.activasVencidas()) {
    const liberada = await enTransaccion(async (conexion) => {
      await repo.actualizarEstado(m.id, 'vencida', conexion);
      return liberarCeldaSiCorresponde(m.celda_asignada_id, conexion);
    });
    resumen.vencidas += 1;
    if (liberada) {
      resumen.celdas_liberadas += 1;
      celdasCambiadas.add(m.celda_asignada_id);
    }
  }

  for (const m of await repo.celdasFijasPorReservar()) {
    await repo.cambiarEstadoCelda(m.celda_id, 'reservada');
    resumen.celdas_reservadas += 1;
    celdasCambiadas.add(m.celda_id);
  }

  const dias = Number(await repo.valorConfiguracion('membresia_dias_aviso_vencimiento')) || 3;
  const porVencer = await repo.porVencerSinAviso(dias);
  for (const m of porVencer) {
    await notificaciones.notificar({
      usuarios: [m.usuario_id],
      titulo: 'Tu mensualidad está por vencer',
      mensaje:
        m.dias_restantes === 0
          ? `La mensualidad del vehículo ${m.placa} vence hoy.`
          : `La mensualidad del vehículo ${m.placa} vence en ${m.dias_restantes} día(s), el ${dia(m.fecha_fin)}.`,
      tipo: 'membresia_por_vencer',
      enlace: ENLACE(m.id),
    });
  }
  resumen.avisos = porVencer.length;

  if (celdasCambiadas.size) await publicarCambioCelda(...celdasCambiadas);
  return resumen;
}

module.exports = {
  listar,
  deUsuario,
  obtener,
  cotizar,
  crear,
  cancelar,
  ejecutarMantenimiento,
  liberarCeldaSiCorresponde,
};
