/**
 * Reportes del administrador — REQ-REP-01…11. Menú lateral (pestañas verticales) con los
 * 11 reportes; cada uno en un panel con filtros, tabla, gráfico, "Exportar CSV" e "Imprimir".
 * El reporte elegido queda en el hash (#ocupacion) para enlazarlo o recargar.
 * HTML en app/reportes.html: los 11 paneles están escritos; aquí se cargan y rellenan.
 */
import { montarMarco } from './comun/marco-app.js';
import { mostrarAviso } from './comun/dialogos.js';
import { clonar, llenarSelect, ponerChip } from './comun/plantillas.js';
import { conectarTabla, conectarBusqueda, ponerKpi } from './comun/tablas.js';
import { conectarPestanas } from './comun/pestanas.js';
import {
  pintarColumnas,
  pintarBarrasH,
  pintarApilada,
  pintarCalor,
  pintarLinea,
} from './comun/graficos.js';
import { obtenerReporte, urlReporteCsv } from '../services/reportes.service.js';
import { listarTiposIncidencia } from '../services/incidencias.service.js';
import { normalizarPlaca, formatearPlaca } from '../utils/placa.js';
import {
  formatearCOP,
  formatearFecha,
  formatearFechaHora,
  formatearHora,
  hoyBogota,
  METODOS_PAGO,
} from '../utils/formato.js';
import { etiquetaRol } from '../utils/sesion.js';

const $ = (id) => document.getElementById(id);
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
const estadoActivo = (activo) => [activo ? 'Activo' : 'Inactivo', activo ? 'free' : 'out'];

function rangoTexto(meta) {
  return meta.desde === meta.hasta
    ? formatearFecha(meta.desde)
    : `${formatearFecha(meta.desde)} – ${formatearFecha(meta.hasta)}`;
}

/**
 * Rellena una fila según el marcado de cada celda (ver la plantilla de la página):
 * chip → [texto, variante] (o un texto si la celda admite texto en lugar del chip);
 * placa → placa o [placa, subtítulo]; texto + subtítulo → [principal, secundario];
 * el resto → texto.
 */
function rellenarFila(fila, valores) {
  [...fila.cells].forEach((celda, i) => {
    const v = valores[i];
    const chip = celda.querySelector('.atom-status-chip');
    if (chip) {
      if (Array.isArray(v)) return ponerChip(chip, v[0], v[1]);
      chip.classList.add('hidden');
      chip.nextElementSibling.textContent = v ?? '—';
      return;
    }
    const placa = celda.querySelector('.atom-plate');
    const sub = celda.querySelector('.organism-data-table-cell-sub');
    const [principal, secundario] = Array.isArray(v) ? v : [v, ''];
    if (placa) {
      placa.textContent = formatearPlaca(principal);
      if (sub) sub.textContent = secundario ?? '';
      return;
    }
    if (sub) {
      sub.previousElementSibling.textContent = principal ?? '—';
      sub.textContent = secundario ?? '';
      return;
    }
    (celda.firstElementChild ?? celda).textContent =
      v === null || v === undefined || v === '' ? '—' : String(v);
  });
}

// ---------------------------------------------------------------------------
// Definición de los 11 reportes: filtros (ids en el HTML) y cómo pintar la respuesta
// ---------------------------------------------------------------------------
const REPORTES = [
  {
    id: 'usuarios',
    paginado: true,
    filtros: ['rol', 'estado'],
    tablas: {
      usuarios: (u) => [
        String(u.id).padStart(5, '0'),
        [u.nombre_completo, u.correo],
        `${u.tipo_documento} ${u.numero_documento}`,
        u.celular,
        etiquetaRol(u.rol),
        estadoActivo(u.estado === 'activo'),
        String(u.vehiculos),
        u.ultimo_acceso ? formatearFechaHora(u.ultimo_acceso) : 'Nunca',
      ],
    },
    pintar: ({ data, meta }, t) => t.usuarios.pintar(data, { meta }),
  },
  {
    id: 'vehiculos',
    paginado: true,
    filtros: ['tipo', 'propietario'],
    tablas: {
      vehiculos: (v) => [
        v.placa,
        v.tipo === 'moto' ? 'Moto' : 'Carro',
        [`${v.marca} ${v.modelo}`, v.color],
        v.propietario
          ? [
              v.propietario.nombre_completo,
              `${v.propietario.tipo_documento} ${v.propietario.numero_documento}`,
            ]
          : ['Visitante', ''],
        String(v.visitas),
        estadoActivo(v.activo),
      ],
    },
    pintar: ({ data, meta }, t) => t.vehiculos.pintar(data, { meta }),
  },
  {
    id: 'entradas',
    paginado: true,
    filtros: ['rango', 'tipo', 'puerta_id', 'placa'],
    tablas: {
      entradas: (e) => [
        formatearFechaHora(e.fecha_hora_entrada),
        e.codigo_ticket,
        [e.placa, `${e.marca} ${e.modelo}`],
        e.tipo_cliente === 'mensualidad' ? 'Mensualidad' : 'Visitante',
        e.puerta,
        [e.celda, e.piso],
        e.registro,
        e.estado === 'en_curso' ? ['Dentro', 'occupied'] : 'Salió',
      ],
    },
    pintar: ({ data, meta }, t) => {
      ponerKpi('entradas-kpi-1', { valor: meta.total, nota: rangoTexto(meta) });
      ponerKpi('entradas-kpi-2', {
        valor: Math.round(meta.total / meta.dias),
        nota: `${meta.dias} días`,
      });
      t.entradas.pintar(data, { meta });
    },
  },
  {
    id: 'salidas',
    paginado: true,
    filtros: ['rango', 'tipo', 'puerta_id', 'placa'],
    tablas: {
      salidas: (s) => [
        [formatearFechaHora(s.fecha_hora_salida), `Entró ${formatearHora(s.fecha_hora_entrada)}`],
        s.codigo_ticket,
        s.placa,
        s.puerta ?? '—',
        s.celda,
        s.tiempo,
        s.valor === null ? '—' : cop(s.valor),
        [METODOS_PAGO[s.metodo_pago] ?? '—', s.factura],
      ],
    },
    pintar: ({ data, meta }, t) => {
      ponerKpi('salidas-kpi-1', { valor: cop(meta.recaudado), nota: rangoTexto(meta) });
      ponerKpi('salidas-kpi-2', {
        valor: meta.total,
        nota: `${Math.round(meta.total / meta.dias)} por día`,
      });
      ponerKpi('salidas-kpi-3', {
        valor: meta.permanencia_promedio_min,
        nota: minutosATexto(meta.permanencia_promedio_min),
      });
      t.salidas.pintar(data, { meta });
    },
  },
  {
    id: 'incidencias',
    paginado: true,
    filtros: ['rango', 'tipo'],
    tablas: {
      incidencias: (i) => [
        [i.codigo, formatearFechaHora(i.fecha_hora)],
        [i.tipo, 'occupied'],
        [i.placa, i.propietario ?? 'Visitante'],
        i.celda ?? '—',
        i.descripcion,
        i.registro,
      ],
    },
    pintar: ({ data, meta }, t) => {
      ponerKpi('incidencias-kpi-1', { valor: meta.total, nota: rangoTexto(meta) });
      ponerKpi('incidencias-kpi-2', {
        valor: String(Math.round((meta.total / meta.dias) * 70) / 10).replace('.', ','),
        nota: 'promedio del período',
      });
      t.incidencias.pintar(data, { meta });
    },
  },
  {
    id: 'pico-placa',
    filtros: ['fecha'],
    tablas: {
      'pico-vehiculos': (v) => [
        v.placa,
        v.tipo === 'moto' ? 'Moto' : 'Carro',
        `${v.marca} ${v.modelo}`,
        v.propietario ?? 'Visitante',
        v.horario,
      ],
      'pico-denegados': (d) => [formatearHora(d.fecha_hora), d.placa, d.puerta, d.motivo],
    },
    pintar: ({ data, meta }, t) => {
      ponerKpi('pico-placa-kpi-1', {
        valor: meta.total_restringidos,
        nota: `${meta.dia_nombre} ${formatearFecha(meta.fecha)}`,
      });
      ponerKpi('pico-placa-kpi-2', {
        valor: meta.por_tipo.carro.restringidos,
        nota: `de ${meta.por_tipo.carro.registrados} registrados`,
      });
      ponerKpi('pico-placa-kpi-3', {
        valor: meta.por_tipo.moto.restringidos,
        nota: `de ${meta.por_tipo.moto.registrados} registradas`,
      });
      ponerKpi('pico-placa-kpi-4', {
        valor: meta.total_denegados,
        nota: 'ese día, en las puertas',
      });
      $('pico-reglas').replaceChildren(
        ...data.reglas.map((r) => {
          const chip = clonar('tpl-chip');
          chip.textContent = `${r.tipo_vehiculo === 'moto' ? 'Motos' : 'Carros'} · ${r.digito} · ${r.hora_inicio}–${r.hora_fin}`;
          return chip;
        })
      );
      $('pico-reglas').classList.toggle('hidden', data.reglas.length === 0);
      $('pico-sin-reglas').classList.toggle('hidden', data.reglas.length > 0);
      t['pico-vehiculos'].pintar(data.vehiculos);
      t['pico-denegados'].pintar(data.denegados);
    },
  },
  {
    id: 'celdas-ocupadas',
    filtros: ['fecha'],
    tablas: {
      'celdas-dia': (c) => [
        c.codigo,
        c.piso,
        c.tipo === 'moto' ? 'Moto' : 'Carro',
        String(c.estadias),
        c.tiempo,
      ],
    },
    pintar: ({ data, meta }, t) => {
      ponerKpi('celdas-ocupadas-kpi-1', {
        valor: meta.total_celdas_ocupadas,
        medidor: meta.porcentaje,
        nota: `de ${meta.habilitadas} habilitadas · ${pct(meta.porcentaje)}`,
      });
      ponerKpi('celdas-ocupadas-kpi-2', { valor: meta.estadias, nota: formatearFecha(meta.fecha) });
      ponerKpi('celdas-ocupadas-kpi-3', {
        valor: meta.maximo_simultaneo,
        nota: meta.momento_maximo ? `a las ${formatearHora(meta.momento_maximo)}` : '—',
      });
      ponerKpi('celdas-ocupadas-kpi-4', {
        valor: pct(meta.porcentaje_maximo),
        nota: 'en ese momento',
      });
      pintarColumnas($('grafico-celdas-hora'), {
        label: `Celdas ocupadas por hora el ${formatearFecha(meta.fecha)}`,
        items: data.por_hora.map((h) => ({
          etiqueta: `${h.hora}h`,
          valor: h.porcentaje,
          estado: h.estado,
          titulo: `${hora(h.hora)} · ${h.celdas} celdas · ${pct(h.porcentaje)}`,
        })),
      });
      t['celdas-dia'].pintar(data.celdas);
    },
  },
  {
    id: 'celdas-mas-usadas',
    filtros: ['rango', 'tipo', 'limite'],
    tablas: {
      'celdas-top': (c) => [
        String(c.puesto),
        [c.codigo, `${c.piso} · ${c.tipo}`],
        String(c.estadias),
        c.tiempo,
        pct(c.participacion),
      ],
    },
    pintar: ({ data, meta }, t) => {
      $('celdas-top-titulo').textContent = `Top ${data.length} por estadías`;
      pintarBarrasH($('grafico-celdas-top'), {
        label: 'Celdas más usadas por número de estadías',
        items: data.map((c) => ({
          etiqueta: c.codigo,
          detalle: c.piso,
          valor: c.estadias,
          texto: `${c.estadias} · ${pct(c.participacion)}`,
        })),
      });
      t['celdas-top'].pintar(data);
      $('celdas-top-nota').textContent =
        `${meta.total_estadias} estadías en el período (${rangoTexto(meta)}).`;
    },
  },
  {
    id: 'vehiculos-frecuentes',
    filtros: ['rango', 'tipo', 'limite'],
    tablas: {
      frecuentes: (v) => [
        String(v.puesto),
        [v.placa, v.propietario ?? 'Visitante'],
        String(v.visitas),
        v.tiempo,
        cop(v.pagado),
        formatearFechaHora(v.ultima_visita),
      ],
    },
    pintar: ({ data, meta }, t) => {
      $('frecuentes-titulo').textContent = `Top ${data.length} por visitas`;
      pintarBarrasH($('grafico-frecuentes'), {
        label: 'Vehículos con más visitas',
        items: data.map((v) => ({
          etiqueta: v.placa,
          detalle: v.propietario ?? 'Visitante',
          valor: v.visitas,
          texto: `${v.visitas} visitas`,
        })),
      });
      t.frecuentes.pintar(data);
      $('frecuentes-nota').textContent =
        `${meta.total_estadias} estadías en el período (${rangoTexto(meta)}).`;
    },
  },
  {
    id: 'ocupacion',
    filtros: ['rango'],
    tablas: {},
    pintar: ({ data, meta }) => {
      ponerKpi('ocupacion-kpi-1', {
        valor: hora(meta.hora_pico.hora),
        medidor: meta.hora_pico.porcentaje,
        nota: `${pct(meta.hora_pico.porcentaje)} en promedio`,
      });
      ponerKpi('ocupacion-kpi-2', {
        valor: DIAS[meta.dia_pico.dia],
        nota: `${pct(meta.dia_pico.porcentaje)} promedio del día`,
      });
      ponerKpi('ocupacion-kpi-3', {
        valor: `${DIAS_CORTOS[meta.franja_pico.dia]} ${hora(meta.franja_pico.hora)}`,
        nota: `${pct(meta.franja_pico.porcentaje)} · ${meta.franja_pico.promedio} celdas`,
      });
      ponerKpi('ocupacion-kpi-4', { valor: meta.habilitadas, nota: rangoTexto(meta) });
      pintarCalor($('grafico-calor'), {
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
      });
      pintarColumnas($('grafico-ocupacion-hora'), {
        label: 'Ocupación promedio por hora del día',
        items: data.por_hora.map((h) => ({
          etiqueta: `${h.hora}h`,
          valor: h.porcentaje,
          estado: h.hora === meta.hora_pico.hora ? 'actual' : 'pasada',
          titulo: `${hora(h.hora)} · ${pct(h.porcentaje)}`,
        })),
      });
      pintarBarrasH($('grafico-ocupacion-dia'), {
        label: 'Ocupación promedio por día de la semana',
        max: 100,
        items: [...data.por_dia]
          .sort((a, b) => b.porcentaje - a.porcentaje)
          .map((d) => ({ etiqueta: DIAS[d.dia], valor: d.porcentaje, texto: pct(d.porcentaje) })),
      });
    },
  },
  {
    id: 'financiero',
    filtros: ['rango', 'agrupar'],
    tablas: {
      periodos: (p) => [p.periodoTexto, String(p.facturas), cop(p.descuentos), cop(p.total)],
      descuentos: (d) => [[d.nombre, `${d.porcentaje} %`], String(d.facturas), cop(d.descuentos)],
    },
    pintar: ({ data, meta }, t) => {
      const etiquetaPeriodo = (p) =>
        meta.agrupar === 'mes'
          ? p
          : meta.agrupar === 'semana'
            ? `Sem. ${formatearFecha(p).slice(0, 5)}`
            : formatearFecha(p).slice(0, 5);
      const segmentos = (lista) =>
        lista.map((x) => ({ etiqueta: x.etiqueta, valor: x.total, texto: cop(x.total) }));
      ponerKpi('financiero-kpi-1', { valor: cop(meta.total), nota: rangoTexto(meta) });
      ponerKpi('financiero-kpi-2', {
        valor: meta.facturas,
        nota: `${meta.sin_cobro} en $ 0 (mensualidades)`,
      });
      ponerKpi('financiero-kpi-3', { valor: cop(meta.ticket_promedio), nota: 'parqueo con cobro' });
      ponerKpi('financiero-kpi-4', {
        valor: cop(meta.descuentos),
        nota: `sobre ${cop(meta.subtotal)}`,
      });
      $('financiero-linea-titulo').textContent =
        `Ingresos por ${meta.agrupar === 'dia' ? 'día' : meta.agrupar}`;
      pintarLinea($('grafico-ingresos'), {
        label: `Ingresos por ${meta.agrupar}`,
        formato: cop,
        formatoCorto: copCorto,
        puntos: data.por_periodo.map((p) => ({
          etiqueta: etiquetaPeriodo(p.periodo),
          valor: p.total,
          titulo: `${p.periodo} · ${cop(p.total)} · ${p.facturas} facturas`,
        })),
      });
      pintarApilada($('grafico-metodo'), {
        label: 'Ingresos por método de pago',
        segmentos: segmentos(data.por_metodo),
      });
      pintarApilada($('grafico-tipo'), {
        label: 'Ingresos por tipo de vehículo',
        segmentos: segmentos(data.por_tipo_vehiculo),
      });
      pintarApilada($('grafico-concepto'), {
        label: 'Ingresos por concepto',
        segmentos: segmentos(data.por_concepto),
      });
      t.periodos.pintar(
        [...data.por_periodo].reverse().map((p) => ({
          ...p,
          periodoTexto: meta.agrupar === 'mes' ? p.periodo : formatearFecha(p.periodo),
        }))
      );
      t.descuentos.pintar(data.descuentos);
    },
  },
];

// ---------------------------------------------------------------------------
// Estado, filtros y carga
// ---------------------------------------------------------------------------
const estado = { activo: REPORTES[0].id, filtros: {}, tablas: {}, peticion: 0 };

function valoresIniciales(reporte) {
  const v = reporte.paginado ? { pagina: 1, limite: 20 } : {};
  for (const clave of reporte.filtros) {
    if (clave === 'rango') Object.assign(v, RANGO);
    else if (clave === 'fecha') v.fecha = hoy;
    else if (clave === 'limite') v.limite = 10;
    else if (clave !== 'placa') v[clave] = $(`${reporte.id}-${clave}`).value;
  }
  return v;
}

function conectarFiltros(reporte) {
  const valores = estado.filtros[reporte.id];
  const aplicar = (clave, valor) => {
    valores[clave] = valor;
    if (reporte.paginado) valores.pagina = 1;
    cargar();
  };
  const fecha = (clave) => {
    const input = $(`${reporte.id}-${clave}`);
    input.value = valores[clave];
    input.max = hoy;
    input.addEventListener('change', () => input.value && aplicar(clave, input.value));
  };
  for (const clave of reporte.filtros) {
    if (clave === 'rango') {
      fecha('desde');
      fecha('hasta');
    } else if (clave === 'fecha') {
      fecha('fecha');
    } else if (clave === 'placa') {
      conectarBusqueda($(`${reporte.id}-placa`), (valor) => aplicar('placa', valor), {
        transform: normalizarPlaca,
      });
    } else {
      const select = $(`${reporte.id}-${clave}`);
      select.value = String(valores[clave] ?? '');
      select.addEventListener('change', () => aplicar(clave, select.value));
    }
  }
}

async function cargar() {
  const reporte = REPORTES.find((r) => r.id === estado.activo);
  const filtros = estado.filtros[reporte.id];
  const id = reporte.id;
  $(`${id}-exportar`).href = urlReporteCsv(id, filtros);
  const numero = ++estado.peticion;
  $(`${id}-resultado`).setAttribute('aria-busy', 'true');
  $(`${id}-cargando`).classList.remove('hidden');
  $(`${id}-error`).classList.add('hidden');
  $(`${id}-datos`).classList.add('hidden');
  try {
    const respuesta = await obtenerReporte(id, filtros);
    if (numero !== estado.peticion) return; // llegó una respuesta más nueva
    reporte.pintar(respuesta, estado.tablas[id]);
    $(`${id}-datos`).classList.remove('hidden');
  } catch (error) {
    if (numero !== estado.peticion) return;
    $(`${id}-error`).querySelector('p').textContent = error.message;
    $(`${id}-error`).classList.remove('hidden');
    mostrarAviso(error.message, 'error');
  } finally {
    if (numero === estado.peticion) {
      $(`${id}-cargando`).classList.add('hidden');
      $(`${id}-resultado`).setAttribute('aria-busy', 'false');
    }
  }
}

const pestanas = conectarPestanas($('reportes-nav'), {
  vertical: true,
  onChange: (id) => {
    estado.activo = id;
    try {
      history.replaceState(null, '', `#${id}`);
    } catch {
      /* sin historial: solo no se recuerda */
    }
    cargar();
  },
});

async function iniciar() {
  const app = await montarMarco({ paginaId: 'reportes' });
  if (!app) return;

  // Opciones que vienen de la BD: puertas de la sede y tipos de incidencia.
  const puertas = [
    { value: '', label: 'Todas' },
    ...(app.sede?.puertas ?? []).map((p) => ({ value: String(p.id), label: p.nombre })),
  ];
  llenarSelect($('entradas-puerta_id'), { opciones: puertas });
  llenarSelect($('salidas-puerta_id'), { opciones: puertas });
  try {
    const tipos = await listarTiposIncidencia();
    llenarSelect($('incidencias-tipo'), {
      opciones: [
        { value: '', label: 'Todos' },
        ...tipos.map((t) => ({ value: String(t.id), label: t.nombre })),
      ],
    });
  } catch {
    /* el filtro de tipo queda solo con "Todos" */
  }

  for (const reporte of REPORTES) {
    estado.filtros[reporte.id] = valoresIniciales(reporte);
    conectarFiltros(reporte);
    $(`${reporte.id}-imprimir`).addEventListener('click', () => window.print());
    estado.tablas[reporte.id] = Object.fromEntries(
      Object.entries(reporte.tablas).map(([tablaId, valores]) => [
        tablaId,
        conectarTabla($(`tabla-${tablaId}`), {
          plantilla: `tpl-${tablaId}`,
          rellenar: (fila, dato) => rellenarFila(fila, valores(dato)),
          onPagina: (pagina) => {
            estado.filtros[reporte.id].pagina = pagina;
            cargar();
          },
        }),
      ])
    );
  }

  const inicial = location.hash.slice(1);
  if (REPORTES.some((r) => r.id === inicial)) estado.activo = inicial;
  pestanas.activar(estado.activo);
  await cargar();
}

iniciar();
