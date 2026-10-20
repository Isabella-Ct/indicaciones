/**
 * Reportes del administrador — REQ-REP-01…11. Menú lateral (level-tabs vertical) con los
 * 11 reportes; cada uno en un panel con filtros, tabla, gráfico, "Exportar CSV" e "Imprimir".
 * El reporte elegido queda en el hash (#ocupacion) para enlazarlo o recargar.
 */
import { el } from '../utils/dom.js';
import { montarApp } from './comun/montar-app.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createField } from '../components/molecules/field/field.js';
import { createSearchBox } from '../components/molecules/search-box/search-box.js';
import { createLevelTabs } from '../components/molecules/level-tabs/level-tabs.js';
import { createEmptyState } from '../components/molecules/empty-state/empty-state.js';
import { showToast } from '../components/molecules/toast/toast.js';
import { createKpis } from '../components/organisms/kpis/kpis.js';
import { createDataTable } from '../components/organisms/data-table/data-table.js';
import { createColChart } from '../components/organisms/col-chart/col-chart.js';
import { createHbarChart } from '../components/organisms/hbar-chart/hbar-chart.js';
import { createLineChart } from '../components/organisms/line-chart/line-chart.js';
import { createHeatmap } from '../components/organisms/heatmap/heatmap.js';
import { createStackedMeter } from '../components/organisms/stacked-meter/stacked-meter.js';
import { createButton } from '../components/atoms/button/button.js';
import { createInput } from '../components/atoms/input/input.js';
import { createSelect } from '../components/atoms/select/select.js';
import { createPlate } from '../components/atoms/plate/plate.js';
import { createStatusChip } from '../components/atoms/status-chip/status-chip.js';
import { createLabelCaps } from '../components/atoms/label-caps/label-caps.js';
import { createSpinner } from '../components/atoms/spinner/spinner.js';
import { obtenerReporte, urlReporteCsv } from '../services/reportes.service.js';
import { listarTiposIncidencia } from '../services/incidencias.service.js';
import { normalizarPlaca } from '../utils/placa.js';
import {
  formatearCOP,
  formatearFecha,
  formatearFechaHora,
  formatearHora,
  hoyBogota,
  METODOS_PAGO,
} from '../utils/formato.js';
import { etiquetaRol } from '../utils/sesion.js';

const ID_PANEL = 'reporte-activo';
const TIPOS = [
  { value: '', label: 'Todos' },
  { value: 'carro', label: 'Carros' },
  { value: 'moto', label: 'Motos' },
];
const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_CORTOS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** 'AAAA-MM-DD' ± n días. */
function sumarDias(fecha, dias) {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}
const hoy = hoyBogota();
const RANGO = { desde: sumarDias(hoy, -29), hasta: hoy };
const minutosATexto = (min) => {
  const h = Math.floor(min / 60);
  return h ? `${h} h ${min % 60} min` : `${min} min`;
};
const pct = (v) => `${String(v).replace('.', ',')} %`;
const hora = (h) => `${String(h).padStart(2, '0')}:00`;
const cop = (v) => formatearCOP(v);
const copCorto = (v) =>
  v >= 1e6
    ? `$ ${(v / 1e6).toLocaleString('es-CO')} M`
    : v >= 1e3
      ? `$ ${Math.round(v / 1e3)} mil`
      : cop(v);
const sub = (texto) => el('span', { className: 'cell-sub', text: texto ?? '' });
const conSub = (principal, secundario) =>
  el('span', {}, [el('span', { text: principal ?? '—' }), sub(secundario)]);
const nowrap = (texto) => el('span', { className: 'cell-nowrap', text: texto });
const tabla = (props) => createDataTable({ minWidth: 760, ...props });
const subPanel = (titulo, hijos) =>
  el('section', { className: 'report-block' }, [createLabelCaps({ text: titulo }), ...hijos]);

// ---------------------------------------------------------------------------
// Definición de los 11 reportes
// ---------------------------------------------------------------------------
const REPORTES = [
  {
    id: 'usuarios',
    req: 'REP-01',
    titulo: 'Usuarios',
    descripcion: 'Todos los usuarios con sus datos y su rol (nunca la contraseña).',
    paginado: true,
    filtros: [
      {
        tipo: 'select',
        clave: 'rol',
        label: 'Rol',
        opciones: [
          { value: '', label: 'Todos' },
          { value: 'administrador', label: 'Administradores' },
          { value: 'operador', label: 'Operadores' },
          { value: 'usuario', label: 'Clientes' },
        ],
      },
      {
        tipo: 'select',
        clave: 'estado',
        label: 'Estado',
        opciones: [
          { value: '', label: 'Todos' },
          { value: 'activo', label: 'Activos' },
          { value: 'inactivo', label: 'Inactivos' },
        ],
      },
    ],
    pintar: ({ data }, paginacion) => [
      tabla({
        caption: 'Usuarios',
        minWidth: 980,
        rows: data,
        pagination: paginacion,
        columns: [
          { key: 'codigo', label: 'Código', render: (u) => String(u.id).padStart(5, '0') },
          { key: 'nombre', label: 'Nombre', render: (u) => conSub(u.nombre_completo, u.correo) },
          {
            key: 'doc',
            label: 'Documento',
            render: (u) => nowrap(`${u.tipo_documento} ${u.numero_documento}`),
          },
          { key: 'celular', label: 'Celular', render: (u) => u.celular },
          { key: 'rol', label: 'Rol', render: (u) => etiquetaRol(u.rol) },
          {
            key: 'estado',
            label: 'Estado',
            render: (u) =>
              createStatusChip({
                text: u.estado === 'activo' ? 'Activo' : 'Inactivo',
                variant: u.estado === 'activo' ? 'free' : 'out',
              }),
          },
          {
            key: 'vehiculos',
            label: 'Vehículos',
            align: 'right',
            render: (u) => String(u.vehiculos),
          },
          {
            key: 'acceso',
            label: 'Último acceso',
            render: (u) => nowrap(u.ultimo_acceso ? formatearFechaHora(u.ultimo_acceso) : 'Nunca'),
          },
        ],
      }),
    ],
  },
  {
    id: 'vehiculos',
    req: 'REP-02',
    titulo: 'Vehículos',
    descripcion: 'Vehículos registrados con sus datos y el usuario propietario.',
    paginado: true,
    filtros: [
      { tipo: 'select', clave: 'tipo', label: 'Tipo', opciones: TIPOS },
      {
        tipo: 'select',
        clave: 'propietario',
        label: 'Propietario',
        opciones: [
          { value: '', label: 'Todos' },
          { value: 'con', label: 'Con propietario' },
          { value: 'sin', label: 'Visitantes' },
        ],
      },
    ],
    pintar: ({ data }, paginacion) => [
      tabla({
        caption: 'Vehículos',
        rows: data,
        pagination: paginacion,
        columns: [
          { key: 'placa', label: 'Placa', render: (v) => createPlate({ placa: v.placa }) },
          { key: 'tipo', label: 'Tipo', render: (v) => (v.tipo === 'moto' ? 'Moto' : 'Carro') },
          {
            key: 'modelo',
            label: 'Marca y modelo',
            render: (v) => conSub(`${v.marca} ${v.modelo}`, v.color),
          },
          {
            key: 'propietario',
            label: 'Propietario',
            render: (v) =>
              v.propietario
                ? conSub(
                    v.propietario.nombre_completo,
                    `${v.propietario.tipo_documento} ${v.propietario.numero_documento}`
                  )
                : 'Visitante',
          },
          { key: 'visitas', label: 'Visitas', align: 'right', render: (v) => String(v.visitas) },
          {
            key: 'activo',
            label: 'Estado',
            render: (v) =>
              createStatusChip({
                text: v.activo ? 'Activo' : 'Inactivo',
                variant: v.activo ? 'free' : 'out',
              }),
          },
        ],
      }),
    ],
  },
  {
    id: 'entradas',
    req: 'REP-03',
    titulo: 'Entradas',
    descripcion: 'Entradas con fecha, hora, vehículo, puerta y celda.',
    paginado: true,
    filtros: [
      { tipo: 'rango' },
      { tipo: 'select', clave: 'tipo', label: 'Tipo', opciones: TIPOS },
      { tipo: 'puerta' },
      { tipo: 'placa' },
    ],
    pintar: ({ data, meta }, paginacion) => [
      createKpis({
        label: 'Resumen de entradas',
        items: [
          { label: 'Entradas', value: meta.total, main: true, note: rangoTexto(meta) },
          {
            label: 'Promedio diario',
            value: Math.round(meta.total / meta.dias),
            note: `${meta.dias} días`,
          },
        ],
      }),
      tabla({
        caption: 'Entradas',
        minWidth: 960,
        rows: data,
        pagination: paginacion,
        columns: [
          {
            key: 'fecha',
            label: 'Fecha y hora',
            render: (e) => nowrap(formatearFechaHora(e.fecha_hora_entrada)),
          },
          { key: 'ticket', label: 'Ticket', render: (e) => nowrap(e.codigo_ticket) },
          {
            key: 'placa',
            label: 'Vehículo',
            render: (e) =>
              el('span', {}, [createPlate({ placa: e.placa }), sub(`${e.marca} ${e.modelo}`)]),
          },
          {
            key: 'cliente',
            label: 'Cliente',
            render: (e) => (e.tipo_cliente === 'mensualidad' ? 'Mensualidad' : 'Visitante'),
          },
          { key: 'puerta', label: 'Puerta', render: (e) => e.puerta },
          { key: 'celda', label: 'Celda', render: (e) => conSub(e.celda, e.piso) },
          { key: 'registro', label: 'Registró', render: (e) => e.registro },
          {
            key: 'estado',
            label: 'Estado',
            render: (e) =>
              e.estado === 'en_curso'
                ? createStatusChip({ text: 'Dentro', variant: 'occupied' })
                : 'Salió',
          },
        ],
      }),
    ],
  },
  {
    id: 'salidas',
    req: 'REP-04',
    titulo: 'Salidas',
    descripcion: 'Salidas con fecha, hora, vehículo, puerta, duración y valor cobrado.',
    paginado: true,
    filtros: [
      { tipo: 'rango' },
      { tipo: 'select', clave: 'tipo', label: 'Tipo', opciones: TIPOS },
      { tipo: 'puerta' },
      { tipo: 'placa' },
    ],
    pintar: ({ data, meta }, paginacion) => [
      createKpis({
        label: 'Resumen de salidas',
        items: [
          { label: 'Recaudado', value: cop(meta.recaudado), main: true, note: rangoTexto(meta) },
          {
            label: 'Salidas',
            value: meta.total,
            note: `${Math.round(meta.total / meta.dias)} por día`,
          },
          {
            label: 'Permanencia prom.',
            value: meta.permanencia_promedio_min,
            unit: 'min',
            note: minutosATexto(meta.permanencia_promedio_min),
          },
        ],
      }),
      tabla({
        caption: 'Salidas',
        minWidth: 980,
        rows: data,
        pagination: paginacion,
        columns: [
          {
            key: 'fecha',
            label: 'Salida',
            render: (s) =>
              conSub(
                formatearFechaHora(s.fecha_hora_salida),
                `Entró ${formatearHora(s.fecha_hora_entrada)}`
              ),
          },
          { key: 'ticket', label: 'Ticket', render: (s) => nowrap(s.codigo_ticket) },
          { key: 'placa', label: 'Vehículo', render: (s) => createPlate({ placa: s.placa }) },
          { key: 'puerta', label: 'Puerta', render: (s) => s.puerta ?? '—' },
          { key: 'celda', label: 'Celda', render: (s) => s.celda },
          { key: 'tiempo', label: 'Duración', render: (s) => nowrap(s.tiempo) },
          {
            key: 'valor',
            label: 'Valor',
            align: 'right',
            render: (s) =>
              el('strong', {
                className: 'cell-nowrap',
                text: s.valor === null ? '—' : cop(s.valor),
              }),
          },
          {
            key: 'metodo',
            label: 'Método',
            render: (s) => conSub(METODOS_PAGO[s.metodo_pago] ?? '—', s.factura),
          },
        ],
      }),
    ],
  },
  {
    id: 'incidencias',
    req: 'REP-05',
    titulo: 'Incidencias',
    descripcion: 'Incidencias registradas en el parqueadero, por tipo y fecha.',
    paginado: true,
    filtros: [{ tipo: 'rango' }, { tipo: 'tipo-incidencia' }],
    pintar: ({ data, meta }, paginacion) => [
      createKpis({
        label: 'Resumen de incidencias',
        items: [
          { label: 'Incidencias', value: meta.total, main: true, note: rangoTexto(meta) },
          {
            label: 'Por semana',
            value: String(Math.round((meta.total / meta.dias) * 70) / 10).replace('.', ','),
            note: 'promedio del período',
          },
        ],
      }),
      tabla({
        caption: 'Incidencias',
        minWidth: 960,
        rows: data,
        pagination: paginacion,
        empty: { title: 'Sin incidencias', text: 'No hay incidencias en el período.' },
        columns: [
          {
            key: 'codigo',
            label: 'Código',
            render: (i) => conSub(i.codigo, formatearFechaHora(i.fecha_hora)),
          },
          {
            key: 'tipo',
            label: 'Tipo',
            render: (i) => createStatusChip({ text: i.tipo, variant: 'occupied' }),
          },
          {
            key: 'placa',
            label: 'Vehículo',
            render: (i) =>
              el('span', {}, [createPlate({ placa: i.placa }), sub(i.propietario ?? 'Visitante')]),
          },
          { key: 'celda', label: 'Celda', render: (i) => i.celda ?? '—' },
          {
            key: 'descripcion',
            label: 'Descripción',
            render: (i) => el('span', { className: 'cell-clamp', text: i.descripcion }),
          },
          { key: 'registro', label: 'Registró', render: (i) => i.registro },
        ],
      }),
    ],
  },
  {
    id: 'pico-placa',
    req: 'REP-06',
    titulo: 'Pico y placa',
    descripcion:
      'Vehículos registrados que no pueden ingresar ese día según las reglas activas, y los accesos rechazados reales.',
    filtros: [{ tipo: 'fecha' }],
    pintar: ({ data, meta }) => [
      createKpis({
        label: 'Resumen de pico y placa',
        items: [
          {
            label: 'No pueden ingresar',
            value: meta.total_restringidos,
            main: true,
            note: `${meta.dia_nombre} ${formatearFecha(meta.fecha)}`,
          },
          {
            label: 'Carros',
            value: meta.por_tipo.carro.restringidos,
            note: `de ${meta.por_tipo.carro.registrados} registrados`,
          },
          {
            label: 'Motos',
            value: meta.por_tipo.moto.restringidos,
            note: `de ${meta.por_tipo.moto.registrados} registradas`,
          },
          {
            label: 'Entradas rechazadas',
            value: meta.total_denegados,
            note: 'ese día, en las puertas',
          },
        ],
      }),
      subPanel('Reglas activas del día', [
        data.reglas.length
          ? el(
              'p',
              { className: 'report-rules' },
              data.reglas.map((r) =>
                createStatusChip({
                  text: `${r.tipo_vehiculo === 'moto' ? 'Motos' : 'Carros'} · ${r.digito} · ${r.hora_inicio}–${r.hora_fin}`,
                  variant: 'occupied',
                })
              )
            )
          : el('p', { className: 'field-hint', text: 'Sin restricción ese día.' }),
      ]),
      subPanel('Vehículos registrados con restricción', [
        tabla({
          caption: 'Vehículos con pico y placa',
          minWidth: 640,
          rows: data.vehiculos,
          empty: {
            title: 'Ninguno',
            text: 'Ningún vehículo registrado tiene restricción ese día.',
          },
          columns: [
            { key: 'placa', label: 'Placa', render: (v) => createPlate({ placa: v.placa }) },
            { key: 'tipo', label: 'Tipo', render: (v) => (v.tipo === 'moto' ? 'Moto' : 'Carro') },
            { key: 'modelo', label: 'Marca y modelo', render: (v) => `${v.marca} ${v.modelo}` },
            {
              key: 'propietario',
              label: 'Propietario',
              render: (v) => v.propietario ?? 'Visitante',
            },
            { key: 'horario', label: 'Horario', render: (v) => nowrap(v.horario) },
          ],
        }),
      ]),
      subPanel('Accesos rechazados', [
        tabla({
          caption: 'Accesos rechazados por pico y placa',
          minWidth: 640,
          rows: data.denegados,
          empty: { title: 'Sin rechazos', text: 'Nadie intentó entrar con restricción ese día.' },
          columns: [
            { key: 'hora', label: 'Hora', render: (d) => formatearHora(d.fecha_hora) },
            { key: 'placa', label: 'Placa', render: (d) => createPlate({ placa: d.placa }) },
            { key: 'puerta', label: 'Puerta', render: (d) => d.puerta },
            { key: 'motivo', label: 'Motivo', render: (d) => d.motivo },
          ],
        }),
      ]),
    ],
  },
  {
    id: 'celdas-ocupadas',
    req: 'REP-07',
    titulo: 'Celdas ocupadas',
    descripcion: 'Celdas distintas ocupadas en un día y la ocupación máxima simultánea.',
    filtros: [{ tipo: 'fecha' }],
    pintar: ({ data, meta }) => [
      createKpis({
        label: 'Resumen del día',
        items: [
          {
            label: 'Celdas ocupadas',
            value: meta.total_celdas_ocupadas,
            main: true,
            meter: meta.porcentaje,
            note: `de ${meta.habilitadas} habilitadas · ${pct(meta.porcentaje)}`,
          },
          { label: 'Estadías', value: meta.estadias, note: formatearFecha(meta.fecha) },
          {
            label: 'Máximo simultáneo',
            value: meta.maximo_simultaneo,
            note: meta.momento_maximo ? `a las ${formatearHora(meta.momento_maximo)}` : '—',
          },
          {
            label: 'Ocupación máxima',
            value: pct(meta.porcentaje_maximo),
            note: 'en ese momento',
          },
        ],
      }),
      subPanel('Ocupación por hora', [
        createColChart({
          label: `Celdas ocupadas por hora el ${formatearFecha(meta.fecha)}`,
          items: data.por_hora.map((h) => ({
            etiqueta: `${h.hora}h`,
            valor: h.porcentaje,
            estado: h.estado,
            titulo: `${hora(h.hora)} · ${h.celdas} celdas · ${pct(h.porcentaje)}`,
          })),
        }),
      ]),
      subPanel('Detalle por celda', [
        tabla({
          caption: 'Celdas ocupadas ese día',
          minWidth: 560,
          rows: data.celdas,
          empty: { title: 'Sin ocupación', text: 'Ninguna celda se ocupó ese día.' },
          columns: [
            { key: 'codigo', label: 'Celda', render: (c) => el('strong', { text: c.codigo }) },
            { key: 'piso', label: 'Piso', render: (c) => c.piso },
            { key: 'tipo', label: 'Tipo', render: (c) => (c.tipo === 'moto' ? 'Moto' : 'Carro') },
            {
              key: 'estadias',
              label: 'Estadías',
              align: 'right',
              render: (c) => String(c.estadias),
            },
            {
              key: 'tiempo',
              label: 'Tiempo ocupada',
              align: 'right',
              render: (c) => nowrap(c.tiempo),
            },
          ],
        }),
      ]),
    ],
  },
  {
    id: 'celdas-mas-usadas',
    req: 'REP-08',
    titulo: 'Celdas más usadas',
    descripcion: 'Ranking de celdas por número de estadías y tiempo ocupadas en el período.',
    filtros: [
      { tipo: 'rango' },
      { tipo: 'select', clave: 'tipo', label: 'Tipo', opciones: TIPOS },
      { tipo: 'limite' },
    ],
    pintar: ({ data, meta }) => [
      el('div', { className: 'report-grid' }, [
        subPanel(`Top ${data.length} por estadías`, [
          createHbarChart({
            label: 'Celdas más usadas por número de estadías',
            items: data.map((c) => ({
              etiqueta: c.codigo,
              detalle: c.piso,
              valor: c.estadias,
              texto: `${c.estadias} · ${pct(c.participacion)}`,
            })),
          }),
        ]),
        subPanel('Detalle', [
          tabla({
            caption: 'Celdas más usadas',
            minWidth: 520,
            rows: data,
            empty: { title: 'Sin estadías', text: 'No hubo estadías en el período.' },
            columns: [
              { key: 'puesto', label: '#', render: (c) => String(c.puesto) },
              {
                key: 'codigo',
                label: 'Celda',
                render: (c) => conSub(c.codigo, `${c.piso} · ${c.tipo}`),
              },
              {
                key: 'estadias',
                label: 'Estadías',
                align: 'right',
                render: (c) => String(c.estadias),
              },
              { key: 'tiempo', label: 'Tiempo', align: 'right', render: (c) => nowrap(c.tiempo) },
              {
                key: 'part',
                label: '% del total',
                align: 'right',
                render: (c) => pct(c.participacion),
              },
            ],
          }),
        ]),
      ]),
      el('p', {
        className: 'field-hint',
        text: `${meta.total_estadias} estadías en el período (${rangoTexto(meta)}).`,
      }),
    ],
  },
  {
    id: 'vehiculos-frecuentes',
    req: 'REP-09',
    titulo: 'Vehículos frecuentes',
    descripcion: 'Vehículos que más usan el parqueadero: visitas, tiempo total y lo pagado.',
    filtros: [
      { tipo: 'rango' },
      { tipo: 'select', clave: 'tipo', label: 'Tipo', opciones: TIPOS },
      { tipo: 'limite' },
    ],
    pintar: ({ data, meta }) => [
      el('div', { className: 'report-grid' }, [
        subPanel(`Top ${data.length} por visitas`, [
          createHbarChart({
            label: 'Vehículos con más visitas',
            items: data.map((v) => ({
              etiqueta: v.placa,
              detalle: v.propietario ?? 'Visitante',
              valor: v.visitas,
              texto: `${v.visitas} visitas`,
            })),
          }),
        ]),
        subPanel('Detalle', [
          tabla({
            caption: 'Vehículos frecuentes',
            minWidth: 600,
            rows: data,
            empty: { title: 'Sin visitas', text: 'No hubo estadías en el período.' },
            columns: [
              { key: 'puesto', label: '#', render: (v) => String(v.puesto) },
              {
                key: 'placa',
                label: 'Vehículo',
                render: (v) =>
                  el('span', {}, [
                    createPlate({ placa: v.placa }),
                    sub(v.propietario ?? 'Visitante'),
                  ]),
              },
              {
                key: 'visitas',
                label: 'Visitas',
                align: 'right',
                render: (v) => String(v.visitas),
              },
              {
                key: 'tiempo',
                label: 'Tiempo total',
                align: 'right',
                render: (v) => nowrap(v.tiempo),
              },
              {
                key: 'pagado',
                label: 'Pagado',
                align: 'right',
                render: (v) => nowrap(cop(v.pagado)),
              },
              {
                key: 'ultima',
                label: 'Última visita',
                render: (v) => nowrap(formatearFechaHora(v.ultima_visita)),
              },
            ],
          }),
        ]),
      ]),
      el('p', {
        className: 'field-hint',
        text: `${meta.total_estadias} estadías en el período (${rangoTexto(meta)}).`,
      }),
    ],
  },
  {
    id: 'ocupacion',
    req: 'REP-10',
    titulo: 'Horas y días pico',
    descripcion:
      'Ocupación promedio por día de la semana y hora, con la hora y el día de mayor ocupación.',
    filtros: [{ tipo: 'rango' }],
    pintar: ({ data, meta }) => [
      createKpis({
        label: 'Picos de ocupación',
        items: [
          {
            label: 'Hora pico',
            value: hora(meta.hora_pico.hora),
            main: true,
            meter: meta.hora_pico.porcentaje,
            note: `${pct(meta.hora_pico.porcentaje)} en promedio`,
          },
          {
            label: 'Día pico',
            value: DIAS[meta.dia_pico.dia],
            note: `${pct(meta.dia_pico.porcentaje)} promedio del día`,
          },
          {
            label: 'Franja pico',
            value: `${DIAS_CORTOS[meta.franja_pico.dia]} ${hora(meta.franja_pico.hora)}`,
            note: `${pct(meta.franja_pico.porcentaje)} · ${meta.franja_pico.promedio} celdas`,
          },
          { label: 'Celdas habilitadas', value: meta.habilitadas, note: rangoTexto(meta) },
        ],
      }),
      subPanel('Ocupación promedio · día × hora', [
        createHeatmap({
          label: 'Mapa de calor de la ocupación promedio por día de la semana y hora',
          resumen: `Hora pico ${hora(meta.hora_pico.hora)}; día pico ${DIAS[meta.dia_pico.dia]}; franja pico ${DIAS[meta.franja_pico.dia]} ${hora(meta.franja_pico.hora)} con ${pct(meta.franja_pico.porcentaje)}.`,
          columnas: Array.from({ length: 24 }, (_, h) => String(h)),
          filas: [1, 2, 3, 4, 5, 6, 7].map((dia) => ({
            etiqueta: DIAS_CORTOS[dia],
            celdas: data.matriz
              .filter((c) => c.dia === dia)
              .map((c) => ({
                valor: c.porcentaje,
                texto: `${pct(c.porcentaje)} (${c.promedio} celdas)`,
              })),
          })),
        }),
      ]),
      el('div', { className: 'report-grid' }, [
        subPanel('Promedio por hora (todos los días)', [
          createColChart({
            label: 'Ocupación promedio por hora del día',
            items: data.por_hora.map((h) => ({
              etiqueta: `${h.hora}h`,
              valor: h.porcentaje,
              estado: h.hora === meta.hora_pico.hora ? 'actual' : 'pasada',
              titulo: `${hora(h.hora)} · ${pct(h.porcentaje)}`,
            })),
          }),
        ]),
        subPanel('Promedio por día', [
          createHbarChart({
            label: 'Ocupación promedio por día de la semana',
            max: 100,
            items: [...data.por_dia]
              .sort((a, b) => b.porcentaje - a.porcentaje)
              .map((d) => ({
                etiqueta: DIAS[d.dia],
                valor: d.porcentaje,
                texto: pct(d.porcentaje),
              })),
          }),
        ]),
      ]),
    ],
  },
  {
    id: 'financiero',
    req: 'REP-11',
    titulo: 'Financiero',
    descripcion:
      'Ingresos por período, método de pago, tipo de vehículo y concepto; descuentos otorgados.',
    filtros: [
      { tipo: 'rango' },
      {
        tipo: 'select',
        clave: 'agrupar',
        label: 'Agrupar por',
        opciones: [
          { value: 'dia', label: 'Día' },
          { value: 'semana', label: 'Semana' },
          { value: 'mes', label: 'Mes' },
        ],
      },
    ],
    pintar: ({ data, meta }) => {
      const etiquetaPeriodo = (p) =>
        meta.agrupar === 'mes'
          ? p
          : meta.agrupar === 'semana'
            ? `Sem. ${formatearFecha(p).slice(0, 5)}`
            : formatearFecha(p).slice(0, 5);
      const segmentos = (lista) =>
        lista.map((x) => ({ etiqueta: x.etiqueta, valor: x.total, texto: cop(x.total) }));
      return [
        createKpis({
          label: 'Resumen financiero',
          items: [
            {
              label: 'Ingresos del período',
              value: cop(meta.total),
              main: true,
              note: rangoTexto(meta),
            },
            {
              label: 'Facturas',
              value: meta.facturas,
              note: `${meta.sin_cobro} en $ 0 (mensualidades)`,
            },
            {
              label: 'Ticket promedio',
              value: cop(meta.ticket_promedio),
              note: 'parqueo con cobro',
            },
            {
              label: 'Descuentos',
              value: cop(meta.descuentos),
              note: `sobre ${cop(meta.subtotal)}`,
            },
          ],
        }),
        subPanel(`Ingresos por ${meta.agrupar === 'dia' ? 'día' : meta.agrupar}`, [
          createLineChart({
            label: `Ingresos por ${meta.agrupar}`,
            formato: cop,
            formatoCorto: copCorto,
            puntos: data.por_periodo.map((p) => ({
              etiqueta: etiquetaPeriodo(p.periodo),
              valor: p.total,
              titulo: `${p.periodo} · ${cop(p.total)} · ${p.facturas} facturas`,
            })),
          }),
        ]),
        el('div', { className: 'report-grid report-grid--3' }, [
          subPanel('Por método de pago', [
            createStackedMeter({
              label: 'Ingresos por método de pago',
              segmentos: segmentos(data.por_metodo),
            }),
          ]),
          subPanel('Por tipo de vehículo', [
            createStackedMeter({
              label: 'Ingresos por tipo de vehículo',
              segmentos: segmentos(data.por_tipo_vehiculo),
            }),
          ]),
          subPanel('Por concepto', [
            createStackedMeter({
              label: 'Ingresos por concepto',
              segmentos: segmentos(data.por_concepto),
            }),
          ]),
        ]),
        el('div', { className: 'report-grid' }, [
          subPanel('Detalle por período', [
            tabla({
              caption: 'Ingresos por período',
              minWidth: 480,
              rows: [...data.por_periodo].reverse(),
              rowKey: (p) => p.periodo,
              columns: [
                {
                  key: 'periodo',
                  label: 'Período',
                  render: (p) =>
                    nowrap(meta.agrupar === 'mes' ? p.periodo : formatearFecha(p.periodo)),
                },
                {
                  key: 'facturas',
                  label: 'Facturas',
                  align: 'right',
                  render: (p) => String(p.facturas),
                },
                {
                  key: 'desc',
                  label: 'Descuentos',
                  align: 'right',
                  render: (p) => nowrap(cop(p.descuentos)),
                },
                {
                  key: 'total',
                  label: 'Total',
                  align: 'right',
                  render: (p) => el('strong', { className: 'cell-nowrap', text: cop(p.total) }),
                },
              ],
            }),
          ]),
          subPanel('Descuentos otorgados', [
            tabla({
              caption: 'Descuentos otorgados',
              minWidth: 420,
              rows: data.descuentos,
              empty: { title: 'Sin descuentos', text: 'No se aplicaron descuentos en el período.' },
              columns: [
                {
                  key: 'nombre',
                  label: 'Descuento',
                  render: (d) => conSub(d.nombre, `${d.porcentaje} %`),
                },
                {
                  key: 'facturas',
                  label: 'Facturas',
                  align: 'right',
                  render: (d) => String(d.facturas),
                },
                {
                  key: 'valor',
                  label: 'Descontado',
                  align: 'right',
                  render: (d) => nowrap(cop(d.descuentos)),
                },
              ],
            }),
          ]),
        ]),
      ];
    },
  },
];

function rangoTexto(meta) {
  return meta.desde === meta.hasta
    ? formatearFecha(meta.desde)
    : `${formatearFecha(meta.desde)} – ${formatearFecha(meta.hasta)}`;
}

// ---------------------------------------------------------------------------
// Estado, filtros y pintado
// ---------------------------------------------------------------------------
const estado = {
  activo: REPORTES[0].id,
  filtros: Object.fromEntries(REPORTES.map((r) => [r.id, valoresIniciales(r)])),
  puertas: [],
  tipos: [],
  peticion: 0,
};
const zonas = {
  nav: el('div', { className: 'reports-nav' }),
  contenido: el('div', { className: 'reports-main' }),
};

function valoresIniciales(reporte) {
  const v = reporte.paginado ? { pagina: 1, limite: 20 } : {};
  for (const f of reporte.filtros) {
    if (f.tipo === 'rango') Object.assign(v, RANGO);
    if (f.tipo === 'fecha') v.fecha = hoy;
    if (f.tipo === 'limite') v.limite = 10;
    if (f.tipo === 'select') v[f.clave] = f.opciones[0].value;
  }
  return v;
}

function controlesFiltro(reporte) {
  const valores = estado.filtros[reporte.id];
  const aplicar = (clave) => (valor) => {
    valores[clave] = valor;
    if (reporte.paginado) valores.pagina = 1;
    cargar();
  };
  const fecha = (clave, label) => {
    const input = createInput({ type: 'date', value: valores[clave] });
    input.max = hoy;
    input.addEventListener('change', () => input.value && aplicar(clave)(input.value));
    return createField({ label, control: input });
  };
  const select = (clave, label, opciones) =>
    createField({
      label,
      control: createSelect({
        options: opciones,
        value: valores[clave] ?? '',
        onChange: (e) => aplicar(clave)(e.target.value),
      }),
    });
  const controles = reporte.filtros.flatMap((f) => {
    switch (f.tipo) {
      case 'rango':
        return [fecha('desde', 'Desde'), fecha('hasta', 'Hasta')];
      case 'fecha':
        return [fecha('fecha', 'Fecha')];
      case 'select':
        return [select(f.clave, f.label, f.opciones)];
      case 'limite':
        return [
          select(
            'limite',
            'Mostrar',
            [5, 10, 20, 50].map((n) => ({ value: String(n), label: `Top ${n}` }))
          ),
        ];
      case 'puerta':
        return [
          select('puerta_id', 'Puerta', [
            { value: '', label: 'Todas' },
            ...estado.puertas.map((p) => ({ value: String(p.id), label: p.nombre })),
          ]),
        ];
      case 'tipo-incidencia':
        return [
          select('tipo', 'Tipo', [
            { value: '', label: 'Todos' },
            ...estado.tipos.map((t) => ({ value: String(t.id), label: t.nombre })),
          ]),
        ];
      case 'placa':
        return [
          createSearchBox({
            label: 'Placa',
            placeholder: 'Ej. MNP908',
            value: valores.placa ?? '',
            transform: normalizarPlaca,
            onSearch: aplicar('placa'),
          }),
        ];
      default:
        return [];
    }
  });
  return el('div', { className: 'filters' }, controles);
}

function pintarNav() {
  zonas.nav.replaceChildren(
    createLevelTabs({
      niveles: REPORTES.map((r) => ({ id: r.id, nombre: `${r.req.slice(4)} · ${r.titulo}` })),
      activoId: estado.activo,
      idPanel: (id) => `${ID_PANEL}-${id}`,
      label: 'Reportes',
      vertical: true,
      onChange: (id, { enfocar } = {}) => {
        seleccionar(id);
        if (enfocar) zonas.nav.querySelector('.level-tab.is-active')?.focus();
      },
    })
  );
}

function seleccionar(id) {
  estado.activo = id;
  try {
    history.replaceState(null, '', `#${id}`);
  } catch {
    /* sin historial: solo no se recuerda */
  }
  pintarNav();
  pintarReporte();
}

let resultado = el('div', { attrs: { 'aria-live': 'polite' } });
let exportar = null;

function pintarReporte() {
  const reporte = REPORTES.find((r) => r.id === estado.activo);
  resultado = el('div', {
    className: 'stack',
    attrs: { 'aria-live': 'polite', 'aria-busy': 'true' },
  });
  exportar = createButton({
    label: 'Exportar CSV',
    variant: 'dark',
    size: 'sm',
    icon: 'i-out',
    href: '#',
  });
  exportar.setAttribute('download', '');
  const panel = createPanel({
    title: `${reporte.req} · ${reporte.titulo}`,
    actions: [
      el('div', { className: 'report-actions' }, [
        exportar,
        createButton({
          label: 'Imprimir',
          size: 'sm',
          icon: 'i-print',
          onClick: () => window.print(),
        }),
      ]),
    ],
    children: [
      el('div', { className: 'stack' }, [
        el('p', { className: 'report-description', text: reporte.descripcion }),
        controlesFiltro(reporte),
        resultado,
      ]),
    ],
  });
  panel.id = `${ID_PANEL}-${reporte.id}`;
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', `tab-${panel.id}`);
  zonas.contenido.replaceChildren(panel);
  cargar();
}

async function cargar() {
  const reporte = REPORTES.find((r) => r.id === estado.activo);
  const filtros = estado.filtros[reporte.id];
  exportar?.setAttribute('href', urlReporteCsv(reporte.id, filtros));
  const numero = ++estado.peticion;
  resultado.setAttribute('aria-busy', 'true');
  resultado.replaceChildren(
    el('div', { className: 'report-loading' }, [createSpinner({ label: 'Generando reporte…' })])
  );
  try {
    const respuesta = await obtenerReporte(reporte.id, filtros);
    if (numero !== estado.peticion) return; // llegó una respuesta más nueva
    const paginacion = reporte.paginado
      ? {
          pagina: respuesta.meta.pagina,
          totalPaginas: respuesta.meta.total_paginas,
          total: respuesta.meta.total,
          onChange: (pagina) => {
            filtros.pagina = pagina;
            cargar();
          },
        }
      : undefined;
    resultado.replaceChildren(...reporte.pintar(respuesta, paginacion).filter(Boolean));
  } catch (error) {
    if (numero !== estado.peticion) return;
    resultado.replaceChildren(
      createEmptyState({ title: 'No se pudo generar el reporte', text: error.message })
    );
    showToast(error.message, 'error');
  } finally {
    if (numero === estado.peticion) resultado.setAttribute('aria-busy', 'false');
  }
}

async function iniciar() {
  const app = await montarApp({
    paginaId: 'reportes',
    cabecera: () => ({
      titulo: 'Reportes',
      subtitulo: 'los 11 reportes del administrador · exportar a CSV e imprimir',
    }),
  });
  if (!app) return;
  estado.puertas = app.sede?.puertas ?? [];
  try {
    estado.tipos = await listarTiposIncidencia();
  } catch {
    /* el filtro de tipo queda solo con "Todos" */
  }
  const inicial = location.hash.slice(1);
  if (REPORTES.some((r) => r.id === inicial)) estado.activo = inicial;
  app.main.append(el('div', { className: 'reports' }, [zonas.nav, zonas.contenido]));
  pintarNav();
  pintarReporte();
}

iniciar();
