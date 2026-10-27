/**
 * Inicio = dashboard por rol (Fase 6). Administrador: negocio del día; operador: su turno;
 * cliente: sus vehículos, mensualidad, reserva y facturas. La ocupación se actualiza por
 * SSE; con cada entrada/salida se recargan las cifras, el gráfico y la bitácora.
 * HTML en app/inicio.html: los tres cuerpos están escritos y se muestra el del rol.
 */
import { montarMarco } from './comun/marco-app.js';
import { mostrarAviso } from './comun/dialogos.js';
import { clonar, ponerChip } from './comun/plantillas.js';
import { conectarTabla, ponerKpi } from './comun/tablas.js';
import { rellenarFactura } from './comun/tabla-facturas.js';
import { pintarColumnas } from './comun/graficos.js';
import { pintarBitacora } from './comun/bitacora.js';
import { obtenerDashboard } from '../services/reportes.service.js';
import { obtenerResumen, suscribirCeldas } from '../services/celdas.service.js';
import {
  formatearCOP,
  formatearFecha,
  formatearFechaHora,
  formatearHora,
} from '../utils/formato.js';
import { formatearPlaca } from '../utils/placa.js';
import { etiquetaRol, primerNombre } from '../utils/sesion.js';

const $ = (id) => document.getElementById(id);
const mostrar = (nodo, visible) => nodo.classList.toggle('hidden', !visible);
const estado = { datos: null, resumen: null };
const abreviarPiso = (nombre) => nombre.replace(/^(\p{L})\p{L}*\s*(\d+)$/u, '$1$2');

/** "+12,5 % vs. ayer a esta hora" */
function comparacion(actual, anterior, formato = String) {
  if (!anterior) return `ayer a esta hora: ${formato(anterior ?? 0)}`;
  const variacion = Math.round(((actual - anterior) / anterior) * 1000) / 10;
  const signo = variacion > 0 ? '+' : '';
  return `${signo}${String(variacion).replace('.', ',')} % vs. ayer (${formato(anterior)})`;
}

const ocupacion = (r) => ({
  titulo: 'Ocupación actual',
  valor: r.ocupacion_pct,
  unidad: '%',
  medidor: r.ocupacion_pct,
  nota: `${r.por_estado.ocupada} de ${r.habilitadas} espacios habilitados`,
});

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
      ocupacion(r),
      {
        titulo: 'Ingresos de hoy',
        valor: formatearCOP(d.ingresos.hoy),
        nota: comparacion(d.ingresos.hoy, d.ingresos.ayer_a_esta_hora, formatearCOP),
      },
      {
        titulo: 'Entradas de hoy',
        valor: d.entradas_hoy,
        nota: comparacion(d.entradas_hoy, d.entradas_ayer_a_esta_hora),
      },
      {
        titulo: 'Accesos denegados',
        valor: d.accesos_denegados_hoy,
        nota: 'Hoy, por pico y placa',
      },
      { titulo: 'Incidencias', valor: d.incidencias_semana.total, nota: 'Últimos 7 días' },
    ];
  } else if (d.rol === 'operador') {
    items = [
      ocupacion(r),
      {
        titulo: 'Espacios libres',
        valor: r.por_estado.disponible,
        nota: r.por_piso.map((p) => `${abreviarPiso(p.nombre)}: ${p.disponible}`).join(' · '),
      },
      {
        titulo: 'Vehículos dentro',
        valor: r.por_estado.ocupada,
        nota: `${r.por_tipo.moto.ocupada} motos · ${r.por_tipo.carro.ocupada} carros`,
      },
      {
        titulo: 'Entradas de hoy',
        valor: d.turno.entradas,
        nota: `${d.turno.mis_entradas} registradas por ti`,
      },
      {
        titulo: 'Salidas de hoy',
        valor: d.turno.salidas,
        nota: `${d.turno.mis_salidas} cobradas por ti`,
      },
    ];
  } else {
    const dentro = d.vehiculos.filter((v) => v.dentro).length;
    items = [
      {
        titulo: 'Libres para carro',
        valor: r.por_tipo.carro.disponible,
        unidad: '',
        nota: `de ${r.por_tipo.carro.total} celdas · en vivo`,
      },
      {
        titulo: 'Libres para moto',
        valor: r.por_tipo.moto.disponible,
        nota: `de ${r.por_tipo.moto.total} celdas`,
      },
      {
        titulo: 'Mis vehículos dentro',
        valor: dentro,
        nota: `de ${d.vehiculos.length} registrados`,
      },
      {
        titulo: 'Mensualidad',
        valor: d.membresia_activa ? 'Activa' : 'No',
        nota: d.membresia_activa
          ? `hasta ${formatearFecha(d.membresia_activa.fecha_fin)}`
          : 'Pregunta en la caseta',
      },
    ];
  }
  // La maqueta tiene 5 indicadores; con 4 se usa la variante de cuatro columnas.
  $('inicio-kpis').classList.toggle('organism-kpis--4', items.length === 4);
  mostrar($('kpi-1-medidor'), items[0].medidor !== undefined);
  [1, 2, 3, 4, 5].forEach((n) => {
    const item = items[n - 1];
    mostrar($(`kpi-${n}-tarjeta`), Boolean(item));
    if (item) ponerKpi(`kpi-${n}`, { unidad: '', ...item });
  });
}

// ---------------------------------------------------------------------------
// Cuerpo según el rol
// ---------------------------------------------------------------------------
const tablaPorVencer = conectarTabla($('tabla-por-vencer'), {
  plantilla: 'tpl-por-vencer',
  rellenar: (fila, m) => {
    const [titular, placa, celda, vence] = fila.cells;
    titular.textContent = m.titular;
    placa.firstElementChild.textContent = formatearPlaca(m.placa);
    celda.textContent = m.celda ?? '—';
    ponerChip(
      vence.firstElementChild,
      m.dias_restantes === 0 ? 'Hoy' : `En ${m.dias_restantes} d`,
      m.dias_restantes <= 3 ? 'occupied' : 'reserved'
    );
  },
});

const tablaIncidencias = conectarTabla($('tabla-incidencias'), {
  plantilla: 'tpl-incidencia',
  rellenar: (fila, i) => {
    const [codigo, tipo, placa, fecha] = fila.cells;
    codigo.firstElementChild.textContent = i.codigo;
    codigo.firstElementChild.href = `/app/incidencias.html?id=${i.id}`;
    tipo.textContent = i.tipo;
    placa.firstElementChild.textContent = formatearPlaca(i.placa);
    fecha.textContent = formatearFechaHora(i.fecha_hora);
  },
});

const tablaFacturas = conectarTabla($('tabla-facturas'), {
  plantilla: 'tpl-factura',
  rellenar: (fila, f) => rellenarFactura(fila, f, { conCliente: false }),
});

function pintarInferior(d) {
  mostrar($('inicio-inferior-contenedor'), true);
  pintarColumnas($('grafico-ocupacion'), {
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
  });
  pintarBitacora('bitacora', d.ultimos_movimientos);
}

function cuerpoAdmin(d) {
  $('panel-por-vencer-titulo').textContent =
    `Membresías por vencer · ${d.membresias_por_vencer.dias} días`;
  tablaPorVencer.pintar(d.membresias_por_vencer.lista);
  tablaIncidencias.pintar(d.incidencias_semana.ultimas);
  pintarInferior(d);
}

function cuerpoOperador(d) {
  const reglas = d.pico_placa_hoy.reglas;
  const digitos = (tipo) =>
    reglas
      .filter((r) => r.tipo_vehiculo === tipo)
      .map((r) => r.digito)
      .join(' y ') || 'Sin restricción';
  $('panel-pico-titulo').textContent = `Pico y placa · ${d.pico_placa_hoy.dia_nombre}`;
  $('pico-carro').textContent = digitos('carro');
  $('pico-moto').textContent = digitos('moto');
  $('pico-horario').textContent = reglas[0]
    ? `${reglas[0].hora_inicio}–${reglas[0].hora_fin}`
    : '—';
  $('pico-rechazos').textContent = String(d.accesos_denegados_hoy);
  pintarInferior(d);
}

function cuerpoCliente(d) {
  $('mis-vehiculos').replaceChildren(
    ...d.vehiculos.map((v) => {
      const item = clonar('tpl-mi-vehiculo');
      item.classList.toggle('is-inside', v.dentro);
      const [placa, datos, chip] = item.children;
      placa.textContent = formatearPlaca(v.placa);
      datos.querySelector('strong').textContent = `${v.marca} ${v.modelo}`;
      datos.querySelector('span').textContent = v.dentro
        ? `Celda ${v.estadia.celda} · ${v.estadia.piso} · desde las ${formatearHora(v.estadia.desde)} (${v.estadia.tiempo})`
        : `${v.tipo === 'moto' ? 'Moto' : 'Carro'} · ${v.color}`;
      ponerChip(chip, v.dentro ? 'Dentro' : 'Fuera', v.dentro ? 'occupied' : 'neutral');
      return item;
    })
  );
  mostrar($('mis-vehiculos'), d.vehiculos.length > 0);
  mostrar($('mis-vehiculos-vacio'), d.vehiculos.length === 0);
  const m = d.membresia_activa;
  const r = d.reserva_activa;
  $('cliente-mensualidad').textContent = m
    ? `${m.tipo === 'anual' ? 'Anual' : 'Mensual'} · ${m.vehiculo.placa}`
    : 'Sin mensualidad activa';
  $('cliente-vigencia').textContent = m
    ? `${formatearFecha(m.fecha_inicio)} → ${formatearFecha(m.fecha_fin)}`
    : '—';
  $('cliente-celda').textContent = m?.celda?.codigo ?? '—';
  $('cliente-reserva').textContent = r
    ? `${r.celda} · ${r.placa} · vence ${formatearHora(r.fecha_hora_expiracion)}`
    : 'Sin reserva activa';
  tablaFacturas.pintar(d.ultimas_facturas);
}

function pintarCuerpo() {
  const d = estado.datos;
  const rol = ['administrador', 'operador'].includes(d.rol) ? d.rol : 'usuario';
  for (const r of ['administrador', 'operador', 'usuario']) mostrar($(`cuerpo-${r}`), r === rol);
  if (rol === 'administrador') cuerpoAdmin(d);
  else if (rol === 'operador') cuerpoOperador(d);
  else cuerpoCliente(d);
}

async function recargar() {
  try {
    estado.datos = await obtenerDashboard();
    if (estado.datos.ocupacion) estado.resumen = estado.datos.ocupacion;
    else if (!estado.resumen) estado.resumen = await obtenerResumen();
    pintarKpis();
    pintarCuerpo();
  } catch (error) {
    mostrarAviso(error.message, 'error');
  } finally {
    $('inicio-cargando').classList.add('hidden');
  }
}

let pendiente = null;
const recargarPronto = () => {
  clearTimeout(pendiente);
  pendiente = setTimeout(recargar, 800);
};

async function iniciar() {
  const app = await montarMarco({ paginaId: 'inicio' });
  if (!app) return;
  const { sesion, sede } = app;
  $('pagina-titulo').textContent = `Hola, ${primerNombre(sesion)}`;
  $('pagina-subtitulo').textContent = `// ${[
    etiquetaRol(sesion.rol),
    sede ? `${sede.nombre} · ${sede.ciudad}` : null,
  ]
    .filter(Boolean)
    .join(' · ')}`;
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
