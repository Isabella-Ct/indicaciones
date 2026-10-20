/**
 * Inicio = dashboard por rol (Fase 6). Administrador: negocio del día; operador: su turno;
 * cliente: sus vehículos, mensualidad, reserva y facturas. La ocupación se actualiza por
 * SSE; con cada entrada/salida se recargan las cifras, el gráfico y la bitácora.
 */
import { el } from '../utils/dom.js';
import { montarApp } from './comun/montar-app.js';
import { columnasFacturas } from './comun/tabla-facturas.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createDataList } from '../components/molecules/data-list/data-list.js';
import { createEmptyState } from '../components/molecules/empty-state/empty-state.js';
import { showToast } from '../components/molecules/toast/toast.js';
import { createKpis } from '../components/organisms/kpis/kpis.js';
import { createColChart } from '../components/organisms/col-chart/col-chart.js';
import { createMovementLog } from '../components/organisms/movement-log/movement-log.js';
import { createDataTable } from '../components/organisms/data-table/data-table.js';
import { createButton } from '../components/atoms/button/button.js';
import { createPlate } from '../components/atoms/plate/plate.js';
import { createStatusChip } from '../components/atoms/status-chip/status-chip.js';
import { obtenerDashboard } from '../services/reportes.service.js';
import { obtenerResumen, suscribirCeldas } from '../services/celdas.service.js';
import {
  formatearCOP,
  formatearFecha,
  formatearFechaHora,
  formatearHora,
} from '../utils/formato.js';
import { etiquetaRol, primerNombre } from '../utils/sesion.js';

const estado = { datos: null, resumen: null };
const zonas = { kpis: el('div'), cuerpo: el('div') };
const abreviarPiso = (nombre) => nombre.replace(/^(\p{L})\p{L}*\s*(\d+)$/u, '$1$2');

/** "+12,5 % vs. ayer a esta hora" */
function comparacion(actual, anterior, formato = String) {
  if (!anterior) return `ayer a esta hora: ${formato(anterior ?? 0)}`;
  const variacion = Math.round(((actual - anterior) / anterior) * 1000) / 10;
  const signo = variacion > 0 ? '+' : '';
  return `${signo}${String(variacion).replace('.', ',')} % vs. ayer (${formato(anterior)})`;
}

function kpiOcupacion(r) {
  return {
    label: 'Ocupación actual',
    value: r.ocupacion_pct,
    unit: '%',
    main: true,
    meter: r.ocupacion_pct,
    note: `${r.por_estado.ocupada} de ${r.habilitadas} espacios habilitados`,
  };
}

function kpiLibres(r) {
  return {
    label: 'Espacios libres',
    value: r.por_estado.disponible,
    note: r.por_piso.map((p) => `${abreviarPiso(p.nombre)}: ${p.disponible}`).join(' · '),
  };
}

// ---------------------------------------------------------------------------
// KPIs (se repintan cuando llega un resumen por SSE)
// ---------------------------------------------------------------------------
function pintarKpis() {
  const d = estado.datos;
  const r = estado.resumen ?? d?.ocupacion;
  if (!d || !r) return;
  let items;
  if (d.rol === 'administrador') {
    items = [
      kpiOcupacion(r),
      {
        label: 'Ingresos de hoy',
        value: formatearCOP(d.ingresos.hoy),
        note: comparacion(d.ingresos.hoy, d.ingresos.ayer_a_esta_hora, formatearCOP),
      },
      {
        label: 'Entradas de hoy',
        value: d.entradas_hoy,
        note: comparacion(d.entradas_hoy, d.entradas_ayer_a_esta_hora),
      },
      { label: 'Accesos denegados', value: d.accesos_denegados_hoy, note: 'Hoy, por pico y placa' },
      {
        label: 'Incidencias',
        value: d.incidencias_semana.total,
        note: 'Últimos 7 días',
      },
    ];
  } else if (d.rol === 'operador') {
    items = [
      kpiOcupacion(r),
      kpiLibres(r),
      {
        label: 'Vehículos dentro',
        value: r.por_estado.ocupada,
        note: `${r.por_tipo.moto.ocupada} motos · ${r.por_tipo.carro.ocupada} carros`,
      },
      {
        label: 'Entradas de hoy',
        value: d.turno.entradas,
        note: `${d.turno.mis_entradas} registradas por ti`,
      },
      {
        label: 'Salidas de hoy',
        value: d.turno.salidas,
        note: `${d.turno.mis_salidas} cobradas por ti`,
      },
    ];
  } else {
    const dentro = d.vehiculos.filter((v) => v.dentro).length;
    items = [
      {
        label: 'Libres para carro',
        value: r.por_tipo.carro.disponible,
        main: true,
        note: `de ${r.por_tipo.carro.total} celdas · en vivo`,
      },
      {
        label: 'Libres para moto',
        value: r.por_tipo.moto.disponible,
        note: `de ${r.por_tipo.moto.total} celdas`,
      },
      {
        label: 'Mis vehículos dentro',
        value: dentro,
        note: `de ${d.vehiculos.length} registrados`,
      },
      {
        label: 'Mensualidad',
        value: d.membresia_activa ? 'Activa' : 'No',
        note: d.membresia_activa
          ? `hasta ${formatearFecha(d.membresia_activa.fecha_fin)}`
          : 'Pregunta en la caseta',
      },
    ];
  }
  zonas.kpis.replaceChildren(createKpis({ label: 'Indicadores', items }));
}

// ---------------------------------------------------------------------------
// Cuerpo según el rol
// ---------------------------------------------------------------------------
function inferior(d) {
  return el('div', { className: 'bottom' }, [
    createPanel({
      title: 'Ocupación por hora · hoy',
      children: [
        createColChart({
          label: 'Ocupación por hora hoy',
          items: d.ocupacion_por_hora.map((f) => ({
            etiqueta: `${f.hora}h`,
            valor: f.porcentaje,
            estado: f.estado,
            titulo:
              f.estado === 'futura'
                ? `${f.hora}:00 · pendiente`
                : `${f.hora}:00 · ${f.porcentaje} % (${f.celdas} celdas)`,
          })),
        }),
      ],
    }),
    createMovementLog({ movimientos: d.ultimos_movimientos }),
  ]);
}

function cuerpoAdmin(d) {
  const porVencer = d.membresias_por_vencer.lista;
  const incidencias = d.incidencias_semana.ultimas;
  return [
    el('div', { className: 'page-grid' }, [
      createPanel({
        title: `Membresías por vencer · ${d.membresias_por_vencer.dias} días`,
        actions: [
          createButton({
            label: 'Membresías',
            size: 'sm',
            href: '/app/membresias.html',
          }),
        ],
        children: [
          createDataTable({
            caption: 'Membresías por vencer',
            minWidth: 420,
            rows: porVencer,
            empty: { title: 'Ninguna', text: 'No hay mensualidades por vencer esta semana.' },
            columns: [
              { key: 'titular', label: 'Titular', render: (m) => m.titular },
              { key: 'placa', label: 'Vehículo', render: (m) => createPlate({ placa: m.placa }) },
              { key: 'celda', label: 'Celda', render: (m) => m.celda ?? '—' },
              {
                key: 'fin',
                label: 'Vence',
                render: (m) =>
                  createStatusChip({
                    text: m.dias_restantes === 0 ? 'Hoy' : `En ${m.dias_restantes} d`,
                    variant: m.dias_restantes <= 3 ? 'occupied' : 'reserved',
                  }),
              },
            ],
          }),
        ],
      }),
      createPanel({
        title: 'Incidencias recientes',
        actions: [
          createButton({
            label: 'Incidencias',
            size: 'sm',
            href: '/app/incidencias.html',
          }),
        ],
        children: [
          createDataTable({
            caption: 'Incidencias de los últimos 7 días',
            minWidth: 420,
            rows: incidencias,
            empty: { title: 'Sin incidencias', text: 'Ninguna en los últimos 7 días.' },
            columns: [
              {
                key: 'codigo',
                label: 'Código',
                render: (i) =>
                  el('a', {
                    className: 'link',
                    text: i.codigo,
                    attrs: { href: `/app/incidencias.html?id=${i.id}` },
                  }),
              },
              { key: 'tipo', label: 'Tipo', render: (i) => i.tipo },
              { key: 'placa', label: 'Vehículo', render: (i) => createPlate({ placa: i.placa }) },
              { key: 'fecha', label: 'Fecha', render: (i) => formatearFechaHora(i.fecha_hora) },
            ],
          }),
        ],
      }),
    ]),
    inferior(d),
  ];
}

function cuerpoOperador(d) {
  const reglas = d.pico_placa_hoy.reglas;
  const digitos = (tipo) =>
    reglas
      .filter((r) => r.tipo_vehiculo === tipo)
      .map((r) => r.digito)
      .join(' y ') || 'Sin restricción';
  const horario = reglas[0] ? `${reglas[0].hora_inicio}–${reglas[0].hora_fin}` : '—';
  return [
    el('div', { className: 'page-grid' }, [
      createPanel({
        title: `Pico y placa · ${d.pico_placa_hoy.dia_nombre}`,
        actions: [
          createButton({
            label: 'Reglas',
            size: 'sm',
            href: '/app/pico-placa.html',
          }),
        ],
        children: [
          createDataList({
            items: [
              { term: 'Carros · último dígito', value: digitos('carro') },
              { term: 'Motos · primer dígito', value: digitos('moto') },
              { term: 'Horario', value: horario },
              { term: 'Entradas rechazadas hoy', value: String(d.accesos_denegados_hoy) },
            ],
          }),
        ],
      }),
      createPanel({
        title: 'Tu turno',
        children: [
          el('div', { className: 'link-grid' }, [
            createButton({ label: 'Registrar ingreso', icon: 'i-in', href: '/app/celdas.html' }),
            createButton({
              label: 'Salida y cobro',
              icon: 'i-out',
              variant: 'dark',
              href: '/app/celdas.html',
            }),
            createButton({ label: 'Movimientos', variant: 'ghost', href: '/app/historial.html' }),
            createButton({
              label: 'Incidencia',
              icon: 'i-alert',
              variant: 'ghost',
              href: '/app/incidencias.html',
            }),
          ]),
        ],
      }),
    ]),
    inferior(d),
  ];
}

function cuerpoCliente(d) {
  const vehiculos = d.vehiculos.length
    ? el(
        'ul',
        { className: 'my-vehicles' },
        d.vehiculos.map((v) =>
          el('li', { className: v.dentro ? 'my-vehicle is-inside' : 'my-vehicle' }, [
            createPlate({ placa: v.placa, large: true }),
            el('div', {}, [
              el('strong', { text: `${v.marca} ${v.modelo}` }),
              el('span', {
                className: 'cell-sub',
                text: v.dentro
                  ? `Celda ${v.estadia.celda} · ${v.estadia.piso} · desde las ${formatearHora(v.estadia.desde)} (${v.estadia.tiempo})`
                  : `${v.tipo === 'moto' ? 'Moto' : 'Carro'} · ${v.color}`,
              }),
            ]),
            createStatusChip({
              text: v.dentro ? 'Dentro' : 'Fuera',
              variant: v.dentro ? 'occupied' : 'neutral',
            }),
          ])
        )
      )
    : createEmptyState({ title: 'Sin vehículos', text: 'Acércate a la caseta para registrarlos.' });
  const m = d.membresia_activa;
  const r = d.reserva_activa;
  return [
    el('div', { className: 'page-grid' }, [
      createPanel({ title: 'Mis vehículos', children: [vehiculos] }),
      createPanel({
        title: 'Mensualidad y reserva',
        children: [
          createDataList({
            items: [
              {
                term: 'Mensualidad',
                value: m
                  ? `${m.tipo === 'anual' ? 'Anual' : 'Mensual'} · ${m.vehiculo.placa}`
                  : 'Sin mensualidad activa',
              },
              {
                term: 'Vigencia',
                value: m
                  ? `${formatearFecha(m.fecha_inicio)} → ${formatearFecha(m.fecha_fin)}`
                  : '—',
              },
              { term: 'Celda fija', value: m?.celda?.codigo ?? '—' },
              {
                term: 'Reserva',
                value: r
                  ? `${r.celda} · ${r.placa} · vence ${formatearHora(r.fecha_hora_expiracion)}`
                  : 'Sin reserva activa',
              },
            ],
          }),
        ],
      }),
      el('div', { className: 'page-grid-full' }, [
        createPanel({
          title: 'Últimas facturas',
          actions: [
            createButton({
              label: 'Ver todas',
              size: 'sm',
              href: '/app/mi-cuenta.html#mis-facturas',
            }),
          ],
          children: [
            createDataTable({
              caption: 'Últimas facturas',
              minWidth: 760,
              rows: d.ultimas_facturas,
              empty: {
                title: 'Sin facturas',
                text: 'Aquí verás tus pagos de parqueo y mensualidades.',
              },
              columns: columnasFacturas({ conCliente: false }),
            }),
          ],
        }),
      ]),
    ]),
  ];
}

function pintarCuerpo() {
  const d = estado.datos;
  const cuerpo =
    d.rol === 'administrador'
      ? cuerpoAdmin(d)
      : d.rol === 'operador'
        ? cuerpoOperador(d)
        : cuerpoCliente(d);
  zonas.cuerpo.replaceChildren(el('div', { className: 'stack' }, cuerpo));
}

async function recargar() {
  try {
    estado.datos = await obtenerDashboard();
    if (estado.datos.ocupacion) estado.resumen = estado.datos.ocupacion;
    else if (!estado.resumen) estado.resumen = await obtenerResumen();
    pintarKpis();
    pintarCuerpo();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

let pendiente = null;
const recargarPronto = () => {
  clearTimeout(pendiente);
  pendiente = setTimeout(recargar, 800);
};

async function iniciar() {
  const app = await montarApp({
    paginaId: 'inicio',
    cabecera: (sesion, sede) => ({
      titulo: `Hola, ${primerNombre(sesion)}`,
      subtitulo: [etiquetaRol(sesion.rol), sede ? `${sede.nombre} · ${sede.ciudad}` : null]
        .filter(Boolean)
        .join(' · '),
    }),
  });
  if (!app) return;
  app.main.append(zonas.kpis, zonas.cuerpo);
  await recargar();

  // En vivo: ocupación por SSE; cada entrada/salida recarga cifras, gráfico y bitácora.
  suscribirCeldas({
    onCelda: () => {},
    onResumen: (resumen) => {
      estado.resumen = resumen;
      pintarKpis();
    },
    onMovimiento: recargarPronto,
    onEstado: (_estado, reconectado) => reconectado && recargar(),
  });
  // El tiempo dentro y la franja actual del gráfico avanzan solos.
  setInterval(recargar, 60 * 1000);
}

iniciar();
