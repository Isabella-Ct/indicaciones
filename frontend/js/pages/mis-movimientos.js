/**
 * Mis movimientos (portal del cliente): estadías, facturas (PDF), membresías, reservas e
 * incidencias de sus vehículos, en pestañas. La pestaña va en el hash (#facturas) para
 * los enlaces del dashboard y de las notificaciones (?membresia=ID abre Membresías).
 */
import { el } from '../utils/dom.js';
import { montarApp } from './comun/montar-app.js';
import { columnasFacturas } from './comun/tabla-facturas.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createLevelTabs } from '../components/molecules/level-tabs/level-tabs.js';
import { showToast } from '../components/molecules/toast/toast.js';
import { createDataTable } from '../components/organisms/data-table/data-table.js';
import { createPlate } from '../components/atoms/plate/plate.js';
import { createStatusChip } from '../components/atoms/status-chip/status-chip.js';
import { createSpinner } from '../components/atoms/spinner/spinner.js';
import { misFacturas, misMembresias } from '../services/facturacion.service.js';
import { misIncidencias } from '../services/incidencias.service.js';
import { misReservas, misEstadias } from '../services/reservas.service.js';
import { formatearCOP, formatearFecha, formatearFechaHora } from '../utils/formato.js';

const ID_PANEL = 'mis-movimientos';
const nowrap = (texto) => el('span', { className: 'cell-nowrap', text: texto });
const conSub = (principal, secundario) =>
  el('span', {}, [
    el('span', { className: 'cell-nowrap', text: principal }),
    el('span', { className: 'cell-sub cell-nowrap', text: secundario ?? '' }),
  ]);
const paginacion = (meta, cambiar) => ({
  pagina: meta.pagina,
  totalPaginas: meta.total_paginas,
  total: meta.total,
  onChange: cambiar,
});

const ESTADO_RESERVA = {
  pendiente: ['Pendiente', 'reserved'],
  confirmada: ['Activa', 'reserved'],
  cumplida: ['Cumplida', 'free'],
  cancelada: ['Cancelada', 'neutral'],
  expirada: ['Expirada', 'out'],
};

function chipMembresia(m) {
  if (m.estado === 'cancelada') return createStatusChip({ text: 'Cancelada', variant: 'out' });
  if (m.estado === 'vencida') return createStatusChip({ text: 'Vencida' });
  if (!m.vigente) return createStatusChip({ text: 'Programada', variant: 'reserved' });
  return createStatusChip({
    text: m.dias_restantes <= 3 ? `Vence en ${m.dias_restantes} d` : 'Vigente',
    variant: m.dias_restantes <= 3 ? 'occupied' : 'free',
  });
}

/** Cada pestaña: cómo cargar sus datos (paginados o no) y cómo pintarlos. */
const PESTANAS = [
  {
    id: 'estadias',
    nombre: 'Estadías',
    paginado: true,
    cargar: (f) => misEstadias(f),
    tabla: ({ data }) => ({
      caption: 'Mis estadías',
      minWidth: 760,
      rows: data,
      empty: { title: 'Sin estadías', text: 'Aquí verás cada entrada y salida de tus vehículos.' },
      columns: [
        { key: 'placa', label: 'Vehículo', render: (e) => createPlate({ placa: e.vehiculo.placa }) },
        { key: 'entrada', label: 'Entrada', render: (e) => nowrap(formatearFechaHora(e.fecha_hora_entrada)) },
        {
          key: 'salida',
          label: 'Salida',
          render: (e) =>
            e.fecha_hora_salida
              ? nowrap(formatearFechaHora(e.fecha_hora_salida))
              : createStatusChip({ text: 'Dentro', variant: 'occupied' }),
        },
        { key: 'tiempo', label: 'Tiempo', render: (e) => nowrap(e.tiempo) },
        { key: 'celda', label: 'Celda', render: (e) => conSub(e.celda.codigo, e.celda.piso) },
        {
          key: 'valor',
          label: 'Pagado',
          align: 'right',
          render: (e) => (e.valor_pagado === null ? '—' : nowrap(formatearCOP(e.valor_pagado))),
        },
        // El PDF del ticket es del personal; el cliente tiene el de la factura.
        { key: 'ticket', label: 'Ticket', align: 'right', render: (e) => nowrap(e.codigo_ticket) },
      ],
    }),
  },
  {
    id: 'facturas',
    nombre: 'Facturas',
    paginado: true,
    cargar: (f) => misFacturas(f),
    tabla: ({ data }) => ({
      caption: 'Mis facturas',
      minWidth: 760,
      rows: data,
      empty: { title: 'Sin facturas', text: 'Aquí aparecerán tus pagos de parqueo y mensualidades.' },
      columns: columnasFacturas({ conCliente: false }),
    }),
  },
  {
    id: 'membresias',
    nombre: 'Membresías',
    cargar: async () => ({ data: await misMembresias() }),
    tabla: ({ data }) => ({
      caption: 'Mis membresías',
      minWidth: 640,
      rows: data,
      rowClass: (m) =>
        new URLSearchParams(location.search).get('membresia') === String(m.id) ? 'is-highlighted' : '',
      empty: {
        title: 'Sin membresías',
        text: 'No tienes mensualidades. Pregunta en la caseta por los planes mensual y anual.',
      },
      columns: [
        { key: 'placa', label: 'Vehículo', render: (m) => createPlate({ placa: m.vehiculo.placa }) },
        { key: 'tipo', label: 'Tipo', render: (m) => (m.tipo === 'anual' ? 'Anual' : 'Mensual') },
        {
          key: 'vigencia',
          label: 'Vigencia',
          render: (m) => nowrap(`${formatearFecha(m.fecha_inicio)} → ${formatearFecha(m.fecha_fin)}`),
        },
        { key: 'celda', label: 'Celda fija', render: (m) => m.celda?.codigo ?? '—' },
        { key: 'valor', label: 'Valor', align: 'right', render: (m) => formatearCOP(m.valor) },
        { key: 'estado', label: 'Estado', render: chipMembresia },
      ],
    }),
  },
  {
    id: 'reservas',
    nombre: 'Reservas',
    paginado: true,
    cargar: (f) => misReservas(f),
    tabla: ({ data }) => ({
      caption: 'Mis reservas',
      minWidth: 640,
      rows: data,
      empty: { title: 'Sin reservas', text: 'Reserva una celda desde Disponibilidad.' },
      columns: [
        { key: 'placa', label: 'Vehículo', render: (r) => createPlate({ placa: r.vehiculo.placa }) },
        { key: 'celda', label: 'Celda', render: (r) => conSub(r.celda.codigo, r.celda.piso) },
        { key: 'fecha', label: 'Reservada', render: (r) => nowrap(formatearFechaHora(r.fecha_hora_reserva)) },
        { key: 'vence', label: 'Vencía', render: (r) => nowrap(formatearFechaHora(r.fecha_hora_expiracion)) },
        {
          key: 'estado',
          label: 'Estado',
          render: (r) => {
            const [texto, variante] = ESTADO_RESERVA[r.estado];
            return createStatusChip({ text: texto, variant: variante });
          },
        },
        { key: 'ticket', label: 'Ingreso', render: (r) => r.estadia?.codigo_ticket ?? '—' },
      ],
    }),
  },
  {
    id: 'incidencias',
    nombre: 'Incidencias',
    paginado: true,
    cargar: (f) => misIncidencias(f),
    tabla: ({ data }) => ({
      caption: 'Incidencias de mis vehículos',
      minWidth: 640,
      rows: data,
      empty: { title: 'Sin incidencias', text: 'No hay incidencias registradas con tus vehículos.' },
      columns: [
        { key: 'codigo', label: 'Código', render: (i) => conSub(i.codigo, formatearFechaHora(i.fecha_hora)) },
        { key: 'placa', label: 'Vehículo', render: (i) => createPlate({ placa: i.vehiculo.placa }) },
        { key: 'tipo', label: 'Tipo', render: (i) => i.tipo.nombre },
        { key: 'celda', label: 'Celda', render: (i) => i.celda?.codigo ?? '—' },
        { key: 'descripcion', label: 'Descripción', render: (i) => el('span', { className: 'text-long', text: i.descripcion }) },
      ],
    }),
  },
];

const estado = { activa: PESTANAS[0].id, pagina: 1, peticion: 0 };
const zonas = { tabs: el('div'), contenido: el('div', { attrs: { role: 'tabpanel' } }) };

function pintarTabs() {
  zonas.tabs.replaceChildren(
    createLevelTabs({
      niveles: PESTANAS.map((p) => ({ id: p.id, nombre: p.nombre })),
      activoId: estado.activa,
      idPanel: (id) => `${ID_PANEL}-${id}`,
      label: 'Mis movimientos',
      onChange: (id, { enfocar } = {}) => {
        estado.activa = id;
        estado.pagina = 1;
        try {
          history.replaceState(null, '', `${location.search}#${id}`);
        } catch {
          /* sin historial */
        }
        pintarTabs();
        if (enfocar) zonas.tabs.querySelector('.level-tab.is-active')?.focus();
        cargar();
      },
    })
  );
  zonas.contenido.id = `${ID_PANEL}-${estado.activa}`;
  zonas.contenido.setAttribute('aria-labelledby', `tab-${zonas.contenido.id}`);
}

async function cargar() {
  const pestana = PESTANAS.find((p) => p.id === estado.activa);
  const numero = ++estado.peticion;
  zonas.contenido.replaceChildren(el('div', { className: 'report-loading' }, [createSpinner({ label: 'Cargando…' })]));
  try {
    const resultado = await pestana.cargar({ pagina: estado.pagina, limite: 15 });
    if (numero !== estado.peticion) return;
    const props = pestana.tabla(resultado);
    if (pestana.paginado && resultado.meta) {
      props.pagination = paginacion(resultado.meta, (p) => {
        estado.pagina = p;
        cargar();
      });
    }
    zonas.contenido.replaceChildren(createDataTable(props));
  } catch (error) {
    if (numero === estado.peticion) showToast(error.message, 'error');
  }
}

async function iniciar() {
  const app = await montarApp({
    paginaId: 'mis-movimientos',
    cabecera: () => ({
      titulo: 'Mis movimientos',
      subtitulo: 'estadías, facturas, membresías, reservas e incidencias de tus vehículos',
    }),
  });
  if (!app) return;
  const pedida = location.hash.slice(1);
  if (PESTANAS.some((p) => p.id === pedida)) estado.activa = pedida;
  else if (new URLSearchParams(location.search).has('membresia')) estado.activa = 'membresias';
  app.main.append(
    createPanel({ title: 'Historial', actions: [zonas.tabs], flush: true, children: [zonas.contenido] })
  );
  pintarTabs();
  await cargar();
}

iniciar();
