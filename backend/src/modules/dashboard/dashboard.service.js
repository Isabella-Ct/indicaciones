// Dashboard por rol (Fase 6): el administrador ve el negocio, el operador su turno y el
// cliente sus vehículos. Las cifras de ocupación se actualizan luego por SSE (celdas).
const { enBogota, minutosEntre, formatearDuracion } = require('../../utils/fechas');
const repo = require('./dashboard.repository');
const celdasService = require('../celdas/celdas.service');
const picoPlacaService = require('../pico-placa/pico-placa.service');
const estadiasService = require('../estadias/estadias.service');
const membresiasService = require('../membresias/membresias.service');
const facturasService = require('../facturas/facturas.service');
const reportesService = require('../reportes/reportes.service');

const DIAS_AVISO_MEMBRESIA = 7;

/** "Ocupación por hora · hoy" como en la maqueta: franjas de 2 h de 6 h a 22 h. */
async function ocupacionHoy() {
  const franjas = await reportesService.ocupacionPorHora(enBogota().fecha, 2);
  return franjas.filter((f) => f.hora >= 6 && f.hora <= 22);
}

const variacion = (actual, anterior) =>
  anterior ? Math.round(((actual - anterior) / anterior) * 1000) / 10 : null;

async function administrador() {
  const [ocupacion, ingresos, movimientos, incidencias, porVencer, porHora, ultimos] =
    await Promise.all([
      celdasService.resumen(),
      repo.ingresos(),
      repo.movimientosHoy(),
      repo.incidenciasSemana(),
      repo.membresiasPorVencer(DIAS_AVISO_MEMBRESIA),
      ocupacionHoy(),
      estadiasService.ultimosMovimientos(6),
    ]);
  const hoy = Number(ingresos.hoy);
  const ayerAEstaHora = Number(ingresos.ayer_a_esta_hora);
  return {
    rol: 'administrador',
    ocupacion,
    ingresos: {
      hoy,
      facturas_hoy: Number(ingresos.facturas_hoy),
      ayer: Number(ingresos.ayer),
      ayer_a_esta_hora: ayerAEstaHora,
      variacion_pct: variacion(hoy, ayerAEstaHora),
    },
    entradas_hoy: movimientos.entradas,
    entradas_ayer_a_esta_hora: movimientos.entradas_ayer_a_esta_hora,
    salidas_hoy: movimientos.salidas,
    accesos_denegados_hoy: movimientos.denegados,
    incidencias_semana: { total: incidencias.length, ultimas: incidencias.slice(0, 5) },
    membresias_por_vencer: { dias: DIAS_AVISO_MEMBRESIA, lista: porVencer },
    ocupacion_por_hora: porHora,
    ultimos_movimientos: ultimos,
  };
}

async function operador(usuario) {
  const [ocupacion, movimientos, picoPlaca, porHora, ultimos] = await Promise.all([
    celdasService.resumen(),
    repo.movimientosHoy(usuario.id),
    picoPlacaService.deHoy(),
    ocupacionHoy(),
    estadiasService.ultimosMovimientos(6),
  ]);
  return {
    rol: 'operador',
    ocupacion,
    vehiculos_dentro: movimientos.dentro,
    turno: {
      entradas: movimientos.entradas,
      salidas: movimientos.salidas,
      mis_entradas: movimientos.mis_entradas,
      mis_salidas: movimientos.mis_salidas,
    },
    accesos_denegados_hoy: movimientos.denegados,
    pico_placa_hoy: picoPlaca,
    ocupacion_por_hora: porHora,
    ultimos_movimientos: ultimos,
  };
}

async function cliente(usuario) {
  const ahora = new Date();
  const [vehiculos, membresias, reserva, facturas] = await Promise.all([
    repo.vehiculosDelCliente(usuario.id),
    membresiasService.deUsuario(usuario.id),
    repo.reservaActiva(usuario.id),
    facturasService.listarDeCliente(usuario.id, { pagina: 1, limite: 5 }),
  ]);
  return {
    rol: 'usuario',
    vehiculos: vehiculos.map((v) => {
      const minutos = v.estadia_id ? minutosEntre(v.fecha_hora_entrada, ahora) : null;
      return {
        id: v.id,
        placa: v.placa,
        tipo: v.tipo,
        marca: v.marca,
        modelo: v.modelo,
        color: v.color,
        dentro: Boolean(v.estadia_id),
        estadia: v.estadia_id
          ? {
              codigo_ticket: v.codigo_ticket,
              celda: v.celda,
              piso: v.piso,
              desde: v.fecha_hora_entrada,
              minutos,
              tiempo: formatearDuracion(minutos),
            }
          : null,
      };
    }),
    membresia_activa: membresias.find((m) => m.vigente) ?? null,
    reserva_activa: reserva,
    ultimas_facturas: facturas.data,
  };
}

/** El contenido depende de los permisos del rol, no del nombre del rol. */
async function paraUsuario(usuario) {
  if (usuario.permisos.includes('reportes.ver')) return administrador();
  if (usuario.permisos.includes('movimientos.registrar')) return operador(usuario);
  return cliente(usuario);
}

module.exports = { paraUsuario };
