/**
 * Control de espacios — REQ-CLD-01 (celdas por piso/área), REQ-CLD-02 (cliente: solo
 * lectura, sin placas), REQ-CLD-03 (cambiar estado). Mapa en vivo por SSE.
 * Entradas (REQ-INEX-1, REQ-PLA-1) y salidas con cobro (REQ-INEX-2/3, REQ-TAR-2, REQ-FAC-1).
 *
 * Todo el marcado está en app/celdas.html. Este archivo solo maneja eventos, rellena
 * textos y muestra u oculta partes; las listas de la BD se copian de sus <template>.
 */
import { montarMarco } from './comun/marco-app.js';
import { abrirModal, cerrarModal, confirmar, mostrarAviso } from './comun/dialogos.js';
import {
  clonar,
  llenarSelect,
  marcarCampo,
  mostrarAlerta,
  botonCargando,
} from './comun/plantillas.js';
import { conectarMapa, pisoGuardado } from './comun/mapa.js';
import { pintarBitacora } from './comun/bitacora.js';
import {
  listarPisos,
  listarCeldas,
  obtenerResumen,
  cambiarEstadoCelda,
  crearCelda,
  actualizarCelda,
  cambiarActivaCelda,
  suscribirCeldas,
} from '../services/celdas.service.js';
import { obtenerVehiculoPorPlaca, crearVehiculo } from '../services/vehiculos.service.js';
import {
  previsualizarEntrada,
  registrarEntrada,
  liquidarSalida,
  liquidarEstadia,
  pagarEstadia,
  ultimosMovimientos,
  urlTicketPdf,
} from '../services/estadias.service.js';
import { resumenFacturacionHoy, urlFacturaPdf } from '../services/facturacion.service.js';
import {
  listarPuertas,
  crearPuerta,
  actualizarPuerta,
  cambiarActivaPuerta,
} from '../services/puertas.service.js';
import { leerPuertaPreferida, guardarPuertaPreferida } from '../utils/almacen.js';
import {
  formatearCOP,
  formatearHora,
  formatearFechaHora,
  formatearFechaCorta,
} from '../utils/formato.js';
import { formatearPlaca, normalizarPlaca, esPlacaValida } from '../utils/placa.js';
import { tienePermiso } from '../utils/sesion.js';

const $ = (id) => document.getElementById(id);
const mostrar = (nodo, visible) => nodo.classList.toggle('hidden', !visible);
const FOTO_MAX_BYTES = 2 * 1024 * 1024;

const estado = {
  sesion: null,
  sede: null,
  pisos: [],
  celdas: new Map(),
  resumen: null,
  pisoActivoId: null,
  seleccionadaId: null,
  facturacion: null, // GET /facturas/resumen-hoy (KPIs del personal)
  liquidacion: null, // { estadiaId, datos } de la celda seleccionada
};

const puede = (codigo) => tienePermiso(estado.sesion, codigo);
const verOcupantes = () => puede('celdas.cambiar_estado');
const celdaSeleccionada = () => estado.celdas.get(estado.seleccionadaId) ?? null;

const ESTADOS = {
  disponible: { chip: 'free', texto: 'Libre', espacio: 'free', lectura: 'libre' },
  ocupada: { chip: 'occupied', texto: 'Ocupado', espacio: 'occupied', lectura: 'ocupado' },
  reservada: { chip: 'reserved', texto: 'Reservado', espacio: 'reserved', lectura: 'reservado' },
  fuera_servicio: {
    chip: 'out',
    texto: 'Fuera de servicio',
    espacio: 'out',
    lectura: 'fuera de servicio',
  },
};

function formatearDuracion(minutos) {
  if (minutos < 60) return `${minutos} min`;
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  const resto = minutos % 60;
  return [dias ? `${dias} d` : null, `${horas} h`, `${resto} min`].filter(Boolean).join(' ');
}

function ponerMedidor(medidor, valor) {
  const v = Math.max(0, Math.min(100, Math.round(Number(valor) || 0)));
  medidor.setAttribute('aria-valuenow', String(v));
  medidor.firstElementChild.style.setProperty('--v', String(v));
}

// ===========================================================================
// KPIs
// ===========================================================================
const abreviarPiso = (nombre) => nombre.replace(/^(\p{L})\p{L}*\s*(\d+)$/u, '$1$2');

function ponerKpi(n, { titulo, valor, unidad = '', nota }) {
  $(`kpi-${n}-titulo`).textContent = titulo;
  $(`kpi-${n}`).textContent = String(valor);
  $(`kpi-${n}-unidad`).textContent = unidad ? ` ${unidad}` : '';
  mostrar($(`kpi-${n}-unidad`), Boolean(unidad));
  $(`kpi-${n}-nota`).textContent = nota;
}

function pintarKpis() {
  const r = estado.resumen;
  if (!r) return;
  $('kpi-ocupacion').textContent = String(r.ocupacion_pct);
  ponerMedidor($('kpi-ocupacion-medidor'), r.ocupacion_pct);
  $('kpi-ocupacion-nota').textContent =
    `${r.por_estado.ocupada} de ${r.habilitadas} espacios habilitados`;
  $('kpi-libres').textContent = String(r.por_estado.disponible);
  $('kpi-libres-nota').textContent = r.por_piso
    .map((p) => `${abreviarPiso(p.nombre)}: ${p.disponible}`)
    .join(' · ');
  $('kpi-dentro').textContent = String(r.por_estado.ocupada);
  $('kpi-dentro-nota').textContent =
    `${r.por_tipo.moto.ocupada} motos · ${r.por_tipo.carro.ocupada} carros`;

  const f = estado.facturacion;
  if (!f) {
    ponerKpi(4, {
      titulo: 'Reservados',
      valor: r.por_estado.reservada,
      nota: 'Mensualidades y reservas',
    });
    ponerKpi(5, {
      titulo: 'Fuera de servicio',
      valor: r.por_estado.fuera_servicio,
      nota: `de ${r.total} celdas`,
    });
    return;
  }
  const salidas = f.salidas_cobradas;
  ponerKpi(4, {
    titulo: 'Recaudo de hoy',
    valor: formatearCOP(f.recaudo),
    nota: `${salidas} salida${salidas === 1 ? '' : 's'} cobrada${salidas === 1 ? '' : 's'}`,
  });
  const prom = f.permanencia_promedio_min;
  const sinDato = prom === null || prom === undefined;
  ponerKpi(5, {
    titulo: 'Permanencia prom.',
    valor: sinDato ? '—' : String(Math.round(prom)),
    unidad: sinDato ? '' : 'min',
    nota: 'Visitantes que salieron hoy',
  });
}

async function cargarFacturacion() {
  if (!puede('facturas.ver')) return;
  try {
    estado.facturacion = await resumenFacturacionHoy();
    pintarKpis();
  } catch {
    /* los KPI de dinero son secundarios */
  }
}

// ===========================================================================
// Mapa (comun/mapa.js)
// ===========================================================================
const mapa = conectarMapa({ estado, onSeleccionar: (id) => seleccionar(id) });

function seleccionar(id) {
  estado.seleccionadaId = id;
  mapa.pintar();
  pintarDetalle();
  actualizarLiquidacion();
  if (id) mapa.enfocarEspacio(id);
}

// ===========================================================================
// Detalle de la celda
// ===========================================================================
const BLOQUES = ['mensaje', 'reserva', 'vehiculo', 'datos', 'cobro', 'nota'];

function horaEntrada(fecha, ahora) {
  const mismoDia = formatearFechaCorta(fecha) === formatearFechaCorta(ahora);
  return mismoDia ? formatearHora(fecha) : formatearFechaHora(fecha);
}

function liquidacionDe(celda) {
  const l = estado.liquidacion;
  return celda?.estadia && l && l.estadiaId === celda.estadia.id ? l.datos : null;
}

function ponerMensaje(texto, titulo = false) {
  $('detalle-mensaje').textContent = texto;
  mostrar($('detalle-mensaje-titulo'), titulo);
  return ['mensaje'];
}

/** Rellena los bloques según el estado y devuelve cuáles quedan visibles. */
function rellenarBloques(celda, ahora) {
  if (celda.estado === 'disponible') {
    return ponerMensaje('Espacio libre: puede asignarse en el próximo ingreso.');
  }
  if (celda.estado === 'fuera_servicio') {
    return ponerMensaje(celda.nota || 'Sin nota registrada.', true);
  }
  if (celda.estado === 'reservada') {
    const origen =
      celda.reserva_origen === 'mensualidad' ? 'mensualidad con celda fija' : 'reserva';
    const visibles = ponerMensaje(`Reservado para una ${origen}.`);
    const datos = celda.mensualidad ?? celda.reserva;
    if (verOcupantes() && datos) {
      $('detalle-reserva-placa').textContent = formatearPlaca(datos.placa);
      $('detalle-reserva-termino').textContent = celda.mensualidad ? 'Titular' : 'Vence';
      $('detalle-reserva-valor').textContent = celda.mensualidad
        ? celda.mensualidad.titular
        : formatearFechaHora(celda.reserva.expira);
      visibles.push('reserva');
    }
    return visibles;
  }

  // ocupada
  if (!verOcupantes()) return ponerMensaje('Espacio ocupado.');
  const { ocupante, estadia } = celda;
  const liquidacion = liquidacionDe(celda);
  const visibles = [];
  if (ocupante) {
    $('detalle-placa').textContent = formatearPlaca(ocupante.placa);
    $('detalle-vehiculo').textContent = [
      `${ocupante.marca ?? ''} ${ocupante.modelo ?? ''}`.trim(),
      ocupante.color,
    ]
      .filter(Boolean)
      .join(' · ');
    visibles.push('vehiculo');
  }
  const minutos = estadia
    ? Math.max(0, Math.floor((ahora - new Date(estadia.fecha_hora_entrada)) / 60000))
    : null;
  $('detalle-cliente').textContent =
    estadia?.tipo_cliente === 'mensualidad' ? 'Mensualidad' : 'Visitante';
  $('detalle-titular').textContent = ocupante?.propietario ?? 'Sin propietario';
  $('detalle-ticket').textContent = estadia?.codigo_ticket ?? 'Sin estadía';
  $('detalle-entrada').textContent = estadia ? horaEntrada(estadia.fecha_hora_entrada, ahora) : '—';
  $('detalle-tiempo').textContent = minutos === null ? '—' : formatearDuracion(minutos);
  mostrar($('detalle-tarifa-fila'), Boolean(liquidacion));
  mostrar($('detalle-tope-fila'), Boolean(liquidacion));
  if (liquidacion) {
    const { tarifa } = liquidacion;
    $('detalle-tarifa').textContent = `${formatearCOP(tarifa.valor_fraccion)} / ${tarifa.unidad}`;
    $('detalle-tope').textContent = formatearCOP(tarifa.valor_dia_maximo);
  }
  visibles.push('datos');

  // Cobro en vivo: calculado por el servidor y refrescado cada minuto.
  if (estadia && liquidacion) {
    const { cobro } = liquidacion;
    const conTope =
      !cobro.membresia && cobro.porcentajeTope !== null && cobro.porcentajeTope !== undefined;
    $('detalle-cobro-valor').textContent = formatearCOP(cobro.total);
    $('detalle-cobro-pct').textContent = conTope ? `${cobro.porcentajeTope} % del tope` : '';
    mostrar($('detalle-cobro-medidor'), conTope);
    if (conTope) ponerMedidor($('detalle-cobro-medidor'), cobro.porcentajeTope);
    $('detalle-cobro-nota').textContent = cobro.nota ?? '';
    visibles.push('cobro');
  } else {
    $('detalle-nota').textContent = estadia
      ? 'Calculando el valor a pagar…'
      : 'Ocupación registrada manualmente, sin ticket de ingreso.';
    visibles.push('nota');
  }
  return visibles;
}

function pintarAcciones(celda) {
  const cambia = puede('celdas.cambiar_estado');
  const libreOReservada = celda.estado === 'disponible' || celda.estado === 'reservada';
  const conEstadia = celda.estado === 'ocupada' && celda.estadia;
  mostrar($('detalle-ocupar'), cambia && libreOReservada);
  mostrar($('detalle-fuera'), cambia && libreOReservada);
  mostrar($('detalle-liberar'), cambia && celda.estado === 'ocupada' && !celda.estadia);
  mostrar($('detalle-habilitar'), cambia && celda.estado === 'fuera_servicio');
  const salida = Boolean(cambia && conEstadia && puede('movimientos.registrar'));
  mostrar($('detalle-salida'), salida);
  mostrar($('detalle-imprimir'), salida);
  if (salida) {
    const texto = `Imprimir ticket ${celda.estadia.codigo_ticket}`;
    $('detalle-imprimir').setAttribute('aria-label', texto);
    $('detalle-imprimir').title = texto;
  }
  mostrar($('detalle-editar'), puede('celdas.gestionar'));
}

function pintarDetalle() {
  const celda = celdaSeleccionada();
  mostrar($('detalle-vacio'), !celda);
  mostrar($('detalle-panel'), Boolean(celda));
  if (!celda) return;

  const info = ESTADOS[celda.estado];
  $('detalle-panel').setAttribute('aria-label', `Detalle del espacio ${celda.codigo}`);
  $('detalle-ubicacion').textContent =
    `${celda.piso.nombre} · ${celda.tipo === 'moto' ? 'Moto' : 'Carro'}${celda.es_accesible ? ' · Accesible' : ''}`;
  $('detalle-codigo').textContent = celda.codigo;
  const chip = $('detalle-estado');
  chip.className = `atom-status-chip atom-status-chip--${info.chip}`;
  chip.textContent = info.texto;

  const visibles = rellenarBloques(celda, new Date());
  BLOQUES.forEach((nombre) => {
    const bloque = $(`detalle-bloque-${nombre}`);
    mostrar(bloque, visibles.includes(nombre));
    bloque.classList.toggle('is-first', nombre === visibles[0]);
  });
  pintarAcciones(celda);
}

/** Pide al servidor el cobro en vivo de la celda seleccionada (si tiene estadía). */
async function actualizarLiquidacion() {
  const celda = celdaSeleccionada();
  if (!celda?.estadia || !puede('movimientos.registrar')) {
    estado.liquidacion = null;
    return;
  }
  const estadiaId = celda.estadia.id;
  try {
    const datos = await liquidarEstadia(estadiaId);
    if (celdaSeleccionada()?.estadia?.id !== estadiaId) return;
    estado.liquidacion = { estadiaId, datos };
    pintarDetalle();
  } catch {
    /* sin tarifa vigente u otro error: el detalle se muestra sin dinero */
  }
}

/** Aplica la respuesta de la API sin esperar el evento SSE. */
function aplicarCelda(celda) {
  if (celda.activa === false) estado.celdas.delete(celda.id);
  else estado.celdas.set(celda.id, celda);
  mapa.pintar();
  pintarDetalle();
}

$('detalle-cerrar').addEventListener('click', () => {
  const id = estado.seleccionadaId;
  estado.seleccionadaId = null;
  mapa.pintar();
  pintarDetalle();
  mapa.enfocarEspacio(id);
});
$('detalle-ocupar').addEventListener('click', (e) =>
  abrirOcupar(celdaSeleccionada(), e.currentTarget)
);
$('detalle-fuera').addEventListener('click', (e) =>
  abrirFuera(celdaSeleccionada(), e.currentTarget)
);
$('detalle-liberar').addEventListener('click', (e) =>
  liberar(celdaSeleccionada(), e.currentTarget, 'Liberar celda')
);
$('detalle-habilitar').addEventListener('click', (e) =>
  liberar(celdaSeleccionada(), e.currentTarget, 'Habilitar celda')
);
$('detalle-salida').addEventListener('click', (e) =>
  abrirSalida(celdaSeleccionada(), e.currentTarget)
);
$('detalle-imprimir').addEventListener('click', () => {
  const estadia = celdaSeleccionada()?.estadia;
  if (estadia) window.open(urlTicketPdf(estadia.id), '_blank', 'noopener');
});
$('detalle-editar').addEventListener('click', (e) =>
  abrirGestion(celdaSeleccionada(), e.currentTarget)
);

// ===========================================================================
// Ocupar manualmente (REQ-CLD-03)
// ===========================================================================
const ocupar = { celda: null, vehiculo: null };
const placaOcupar = $('ocupar-placa');
const alertaOcupar = $('form-ocupar').querySelector('.molecule-alert');

function limpiarResultadoOcupar() {
  ocupar.vehiculo = null;
  mostrar($('ocupar-vehiculo'), false);
  mostrar($('ocupar-propietario'), false);
  $('ocupar-error').textContent = '';
}

function abrirOcupar(celda, origen) {
  ocupar.celda = celda;
  $('ocupar-titulo').textContent = `Ocupar ${celda.codigo}`;
  $('ocupar-subtitulo').textContent = `// ${celda.piso.nombre} · celda de ${celda.tipo}`;
  placaOcupar.value = '';
  marcarCampo(placaOcupar, '');
  mostrarAlerta(alertaOcupar, '');
  limpiarResultadoOcupar();
  abrirModal($('modal-ocupar'), { origen, foco: placaOcupar });
}

async function buscarParaOcupar() {
  limpiarResultadoOcupar();
  if (!placaOcupar.value) return marcarCampo(placaOcupar, 'Escribe la placa.');
  try {
    const vehiculo = await obtenerVehiculoPorPlaca(placaOcupar.value);
    ocupar.vehiculo = vehiculo;
    $('ocupar-vehiculo-placa').textContent = formatearPlaca(vehiculo.placa);
    $('ocupar-vehiculo-texto').textContent =
      `${vehiculo.marca} ${vehiculo.modelo} · ${vehiculo.color} · ${vehiculo.tipo === 'moto' ? 'Moto' : 'Carro'}`;
    mostrar($('ocupar-vehiculo'), true);
    if (vehiculo.tipo === ocupar.celda.tipo) {
      $('ocupar-propietario').textContent = vehiculo.propietario
        ? `Propietario: ${vehiculo.propietario.nombre_completo}`
        : 'Vehículo de visitante.';
      mostrar($('ocupar-propietario'), true);
    } else {
      $('ocupar-error').textContent =
        `La celda ${ocupar.celda.codigo} es de ${ocupar.celda.tipo}: este vehículo no puede ocuparla.`;
    }
  } catch (error) {
    $('ocupar-error').textContent = error.message;
  }
}

placaOcupar.addEventListener('input', () => {
  placaOcupar.value = normalizarPlaca(placaOcupar.value);
  limpiarResultadoOcupar();
});
placaOcupar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    buscarParaOcupar();
  }
});
$('ocupar-buscar').addEventListener('click', buscarParaOcupar);

$('form-ocupar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const boton = $('modal-ocupar').querySelector('[type="submit"]');
  mostrarAlerta(alertaOcupar, '');
  marcarCampo(placaOcupar, '');
  if (!ocupar.vehiculo) {
    await buscarParaOcupar();
    if (!ocupar.vehiculo) return;
  }
  botonCargando(boton, true, 'Guardando…');
  try {
    const { data } = await cambiarEstadoCelda(ocupar.celda.id, {
      estado: 'ocupada',
      vehiculo_id: ocupar.vehiculo.id,
    });
    aplicarCelda(data);
    mostrarAviso(`${data.codigo} ocupada por ${ocupar.vehiculo.placa}.`, 'success');
    cerrarModal($('modal-ocupar'));
  } catch (error) {
    mostrarAlerta(alertaOcupar, error.message);
  } finally {
    botonCargando(boton, false);
  }
});

// ===========================================================================
// Fuera de servicio y liberar
// ===========================================================================
let celdaFuera = null;
const notaFuera = $('fuera-nota');
const alertaFuera = $('form-fuera').querySelector('.molecule-alert');

function abrirFuera(celda, origen) {
  celdaFuera = celda;
  $('fuera-titulo').textContent = `${celda.codigo} fuera de servicio`;
  notaFuera.value = '';
  marcarCampo(notaFuera, '');
  mostrarAlerta(alertaFuera, '');
  abrirModal($('modal-fuera'), { origen, foco: notaFuera });
}

$('form-fuera').addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrarAlerta(alertaFuera, '');
  if (!marcarCampo(notaFuera, notaFuera.value.trim() ? '' : 'Escribe el motivo.')) return;
  const boton = $('modal-fuera').querySelector('[type="submit"]');
  botonCargando(boton, true, 'Guardando…');
  try {
    const { data } = await cambiarEstadoCelda(celdaFuera.id, {
      estado: 'fuera_servicio',
      nota: notaFuera.value,
    });
    aplicarCelda(data);
    mostrarAviso(`${data.codigo} quedó fuera de servicio.`, 'success');
    cerrarModal($('modal-fuera'));
  } catch (error) {
    mostrarAlerta(alertaFuera, error.message);
  } finally {
    botonCargando(boton, false);
  }
});

async function liberar(celda, origen, titulo) {
  const ok = await confirmar({
    titulo: `${titulo} ${celda.codigo}`,
    mensaje:
      celda.estado === 'fuera_servicio'
        ? 'La celda vuelve a estar disponible (o reservada, si es la celda fija de una mensualidad).'
        : 'La celda quedará disponible y sin vehículo asociado.',
    textoConfirmar: titulo,
    origen,
  });
  if (!ok) return;
  try {
    const { data, meta } = await cambiarEstadoCelda(celda.id, { estado: 'disponible' });
    aplicarCelda(data);
    mostrarAviso(
      meta.estado_final === 'reservada'
        ? `${data.codigo} vuelve a estar reservada para su mensualidad.`
        : `${data.codigo} quedó disponible.`,
      'success'
    );
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }
}

// ===========================================================================
// Gestionar celdas (admin): crear, editar, activar/desactivar
// ===========================================================================
const gestion = { todas: [] };
const g = {
  selector: $('gestion-celda'),
  codigo: $('gestion-codigo'),
  area: $('gestion-area'),
  piso: $('gestion-piso'),
  fila: $('gestion-fila'),
  posicion: $('gestion-posicion'),
  accesible: $('gestion-accesible'),
  activar: $('gestion-activar'),
  alerta: $('gestion-alerta'),
};
const camposGestion = {
  codigo: g.codigo,
  area: g.area,
  piso_id: g.piso,
  fila_mapa: g.fila,
  posicion: g.posicion,
};
const tipoGestion = () =>
  $('form-gestion').querySelector('input[name="gestion-tipo"]:checked').value;

function cargarCeldaGestion(id) {
  const celda = gestion.todas.find((c) => c.id === Number(id));
  g.codigo.value = celda?.codigo ?? '';
  g.area.value = celda?.area ?? '';
  g.piso.value = String(celda?.piso.id ?? estado.pisoActivoId);
  g.fila.value = celda?.fila_mapa ?? 'superior';
  g.posicion.value = celda?.posicion ?? '';
  $('form-gestion').querySelector(`input[value="${celda?.tipo ?? 'carro'}"]`).checked = true;
  g.accesible.checked = Boolean(celda?.es_accesible);
  $('gestion-estado').textContent = celda
    ? `Estado actual: ${celda.estado.replace('_', ' ')}${celda.activa ? '' : ' · desactivada'}`
    : 'La celda nueva queda disponible.';
  mostrar(g.activar, Boolean(celda));
  g.activar.querySelector('span').textContent = celda?.activa ? 'Desactivar' : 'Activar';
  Object.values(camposGestion).forEach((c) => marcarCampo(c, ''));
}

async function abrirGestion(celdaInicial, origen) {
  try {
    gestion.todas = await listarCeldas({ incluir_inactivas: '1' });
  } catch (error) {
    mostrarAviso(error.message, 'error');
    return;
  }
  llenarSelect(g.selector, {
    opciones: [{ value: '', label: '+ Nueva celda' }],
    grupos: estado.pisos.map((p) => ({
      label: p.nombre,
      options: gestion.todas
        .filter((c) => c.piso.id === p.id)
        .map((c) => ({
          value: String(c.id),
          label: `${c.codigo} · ${c.tipo}${c.activa ? '' : ' (desactivada)'}`,
        })),
    })),
  });
  llenarSelect(g.piso, {
    opciones: estado.pisos.map((p) => ({ value: String(p.id), label: p.nombre })),
  });
  g.selector.value = celdaInicial ? String(celdaInicial.id) : '';
  mostrarAlerta(g.alerta, '');
  cargarCeldaGestion(g.selector.value);
  abrirModal($('modal-gestion'), { origen });
}

g.selector.addEventListener('change', () => cargarCeldaGestion(g.selector.value));

g.activar.addEventListener('click', async () => {
  const celda = gestion.todas.find((c) => c.id === Number(g.selector.value));
  if (!celda) return;
  if (celda.activa) {
    const ok = await confirmar({
      titulo: `Desactivar ${celda.codigo}`,
      mensaje:
        'La celda sale del mapa y no se podrá asignar. Su historial se conserva y puedes activarla de nuevo.',
      textoConfirmar: 'Desactivar',
      origen: g.activar,
    });
    if (!ok) return;
  }
  try {
    const actualizada = await cambiarActivaCelda(celda.id, !celda.activa);
    Object.assign(celda, actualizada);
    mostrarAviso(`${celda.codigo} ${actualizada.activa ? 'activada' : 'desactivada'}.`, 'success');
    if (actualizada.activa) estado.celdas.set(actualizada.id, actualizada);
    else estado.celdas.delete(actualizada.id);
    if (estado.seleccionadaId === actualizada.id && !actualizada.activa)
      estado.seleccionadaId = null;
    mapa.pintar();
    pintarDetalle();
    cerrarModal($('modal-gestion'));
  } catch (error) {
    mostrarAlerta(g.alerta, error.message);
  }
});

$('form-gestion').addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrarAlerta(g.alerta, '');
  Object.values(camposGestion).forEach((c) => marcarCampo(c, ''));
  let ok = true;
  if (!/^[A-Za-z]{1,3}-\d{1,3}$/.test(g.codigo.value.trim()))
    ok = marcarCampo(g.codigo, 'Formato letras-número, ej. A-01.');
  if (!/^[A-Za-z]{1,5}$/.test(g.area.value.trim()))
    ok = marcarCampo(g.area, 'Escribe la letra del área.');
  if (!(Number(g.posicion.value) >= 1)) ok = marcarCampo(g.posicion, 'Posición desde 1.');
  if (!ok) return;

  const datos = {
    codigo: g.codigo.value.trim(),
    area: g.area.value.trim(),
    piso_id: Number(g.piso.value),
    fila_mapa: g.fila.value,
    posicion: Number(g.posicion.value),
    tipo: tipoGestion(),
    es_accesible: g.accesible.checked,
  };
  const boton = $('modal-gestion').querySelector('[type="submit"]');
  botonCargando(boton, true, 'Guardando…');
  try {
    const id = Number(g.selector.value);
    const celda = id ? await actualizarCelda(id, datos) : await crearCelda(datos);
    if (celda.activa) estado.celdas.set(celda.id, celda);
    estado.seleccionadaId = celda.id;
    estado.pisoActivoId = celda.piso.id;
    mapa.pintar();
    pintarDetalle();
    mostrarAviso(`Celda ${celda.codigo} ${id ? 'actualizada' : 'creada'}.`, 'success');
    cerrarModal($('modal-gestion'));
  } catch (error) {
    let primero = null;
    for (const detalle of error.detalles ?? []) {
      const control = camposGestion[detalle.campo];
      if (control) {
        marcarCampo(control, detalle.mensaje);
        primero ??= control;
      }
    }
    mostrarAlerta(g.alerta, error.message);
    primero?.focus();
  } finally {
    botonCargando(boton, false);
  }
});

// ===========================================================================
// Registrar ingreso (REQ-INEX-1, REQ-INEX-4, REQ-PLA-1)
// ===========================================================================
const i = {
  placa: $('ingreso-placa'),
  cliente: $('ingreso-cliente'),
  tipos: $('ingreso-tipos'),
  accesible: $('ingreso-accesible'),
  marca: $('ingreso-marca'),
  modelo: $('ingreso-modelo'),
  color: $('ingreso-color'),
  celda: $('ingreso-celda'),
  hora: $('ingreso-hora'),
  puerta: $('ingreso-puerta'),
  observaciones: $('ingreso-observaciones'),
  llaves: $('ingreso-llaves'),
  foto: $('ingreso-foto'),
  alerta: $('ingreso-alerta'),
  generar: $('ingreso-generar'),
  vehiculoNuevo: $('ingreso-vehiculo-nuevo'),
};
const ingreso = {
  tipo: 'carro',
  preview: null,
  desconocida: false,
  confirmarAccesible: false,
  consulta: 0,
  reloj: null,
  espera: null,
  urlFoto: null,
  ticket: null,
};

const textoTarifa = (t) => (t ? `${formatearCOP(t.valor_fraccion)}/${t.unidad}` : '—');

function puertaActual() {
  const puertas = estado.sede?.puertas ?? [];
  const preferida = puertas.find((p) => p.id === leerPuertaPreferida());
  return (preferida ?? puertas[0])?.id ?? null;
}

/** Celdas libres del tipo, desde el estado del mapa (para el select del modal). */
function celdasLibres(tipo) {
  return [...estado.celdas.values()].filter((c) => c.tipo === tipo && c.estado === 'disponible');
}

function elegirTipo(tipo) {
  ingreso.tipo = tipo;
  i.tipos.querySelector(`input[value="${tipo}"]`).checked = true;
}

function opcionesCelda() {
  const p = ingreso.preview;
  const sugerida = p?.celda_sugerida;
  if (p?.celda_fija && sugerida) {
    const origen = p.tipo_cliente === 'mensualidad' ? 'mensualidad' : 'reserva';
    llenarSelect(i.celda, {
      opciones: [{ value: '', label: `${sugerida.codigo} · celda fija (${origen})` }],
    });
    i.celda.disabled = true;
    return;
  }
  const libres = celdasLibres(ingreso.tipo);
  const grupos = new Map();
  for (const c of libres) {
    if (!grupos.has(c.piso.nombre)) grupos.set(c.piso.nombre, []);
    const tipo = c.es_accesible ? 'Accesible' : ingreso.tipo === 'moto' ? 'Moto' : 'Carro';
    grupos.get(c.piso.nombre).push({ value: String(c.id), label: `${c.codigo} · ${tipo}` });
  }
  llenarSelect(i.celda, {
    opciones: [
      {
        value: '',
        label: sugerida ? `Automática (sugerida ${sugerida.codigo})` : 'Automática (primera libre)',
      },
    ],
    grupos: [...grupos].map(([label, options]) => ({ label, options })),
  });
  i.celda.disabled = false;
  const preseleccionar =
    sugerida && !p?.requiere_confirmacion_accesible && libres.some((c) => c.id === sugerida.id);
  i.celda.value = preseleccionar ? String(sugerida.id) : '';
}

function espacioElegido() {
  const p = ingreso.preview;
  if (p?.celda_fija && p.celda_sugerida) return p.celda_sugerida.codigo;
  const opcion = i.celda.selectedOptions[0];
  if (!opcion || !opcion.value)
    return p?.celda_sugerida?.codigo ? `${p.celda_sugerida.codigo} (sugerida)` : 'Automática';
  const libre = celdasLibres(ingreso.tipo).find((c) => String(c.id) === opcion.value);
  return libre ? `${libre.codigo} · ${libre.piso.nombre}` : opcion.textContent;
}

function pintarTicket() {
  const p = ingreso.preview;
  const valores = {
    placa: i.placa.value ? formatearPlaca(i.placa.value) : '',
    espacio: espacioElegido(),
    entrada: i.hora.value,
    tarifa: textoTarifa(p?.tarifa ?? p?.tarifas?.[ingreso.tipo]),
    cliente: p?.registrado
      ? p.tipo_cliente === 'mensualidad'
        ? `Mensualidad · ${p.titular}`
        : 'Visitante'
      : i.placa.value
        ? 'Visitante (nuevo)'
        : '',
    puerta: i.puerta.selectedOptions[0]?.textContent ?? '',
  };
  for (const [clave, valor] of Object.entries(valores)) {
    $(`ticket-${clave}`).textContent = valor || '—';
  }
}

function habilitarVehiculoNuevo(activo) {
  ingreso.desconocida = activo;
  i.vehiculoNuevo.classList.toggle('is-disabled', !activo);
  for (const control of [i.marca, i.modelo, i.color]) control.disabled = !activo;
  for (const radio of i.tipos.querySelectorAll('input'))
    radio.disabled = !activo && Boolean(ingreso.preview?.registrado);
}

function pintarCliente() {
  const p = ingreso.preview;
  i.cliente.className = 'organism-entry-modal-client';
  if (!p) {
    i.cliente.textContent = '';
    return;
  }
  if (!p.registrado) {
    i.cliente.textContent = 'Placa nueva · se registrará como visitante';
    i.cliente.classList.add('organism-entry-modal-client--new');
    return;
  }
  let texto = [
    p.tipo_cliente === 'mensualidad' ? `Mensualidad · ${p.titular}` : 'Visitante',
    [p.vehiculo.marca, p.vehiculo.modelo, p.vehiculo.color].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(' · ');
  let alerta = true;
  if (p.pico_placa) texto += ` · ⚠ Pico y placa: ${p.pico_placa.descripcion}`;
  else if (p.estadia_abierta) texto += ` · ⚠ Ya está dentro (celda ${p.estadia_abierta.celda})`;
  else if (p.sin_cupo) texto += ' · ⚠ Sin celdas libres para este tipo';
  else alerta = false;
  i.cliente.textContent = texto;
  if (alerta) i.cliente.classList.add('organism-entry-modal-client--alert');
}

async function consultarPlaca() {
  const valor = i.placa.value;
  const turno = ++ingreso.consulta;
  if (valor.length < 5) {
    ingreso.preview = null;
    habilitarVehiculoNuevo(false);
    for (const radio of i.tipos.querySelectorAll('input')) radio.disabled = false;
    pintarCliente();
    opcionesCelda();
    pintarTicket();
    return;
  }
  try {
    const p = await previsualizarEntrada(valor, i.accesible.checked);
    if (turno !== ingreso.consulta) return; // llegó una respuesta vieja
    ingreso.preview = p;
    if (p.registrado) elegirTipo(p.vehiculo.tipo);
    habilitarVehiculoNuevo(!p.registrado);
    pintarCliente();
    opcionesCelda();
    pintarTicket();
  } catch {
    /* la previsualización es una ayuda: si falla, se valida al enviar */
  }
}

function ponerHora() {
  i.hora.value = formatearFechaHora(new Date());
  pintarTicket();
}

function limpiarFoto() {
  if (ingreso.urlFoto) URL.revokeObjectURL(ingreso.urlFoto);
  ingreso.urlFoto = null;
  i.foto.value = '';
  $('ingreso-foto-vista').removeAttribute('src');
  mostrar($('ingreso-foto-vista'), false);
  mostrar($('ingreso-foto-vacia'), true);
}

function abrirIngreso(origen) {
  Object.assign(ingreso, {
    tipo: 'carro',
    preview: null,
    desconocida: false,
    confirmarAccesible: false,
    ticket: null,
  });
  $('form-ingreso').reset();
  [i.placa, i.celda, i.puerta, i.observaciones].forEach((c) => marcarCampo(c, ''));
  $('ingreso-vehiculo-error').textContent = '';
  $('ingreso-foto-error').textContent = '';
  mostrarAlerta(i.alerta, '');
  mostrar($('ingreso-confirmar-accesible'), false);
  limpiarFoto();
  elegirTipo('carro');
  llenarSelect(i.puerta, {
    opciones: (estado.sede?.puertas ?? [])
      .filter((p) => p.tipo !== 'salida')
      .map((p) => ({ value: String(p.id), label: p.nombre })),
  });
  const puertaId = puertaActual();
  if (puertaId && [...i.puerta.options].some((o) => o.value === String(puertaId)))
    i.puerta.value = String(puertaId);

  habilitarVehiculoNuevo(false);
  for (const radio of i.tipos.querySelectorAll('input')) radio.disabled = false;
  pintarCliente();
  opcionesCelda();
  ponerHora();
  $('ticket-numero').textContent = 'Al generar';
  mostrar($('ingreso-cuerpo'), true);
  mostrar($('ingreso-pie'), true);
  mostrar($('ingreso-exito'), false);
  mostrar($('ingreso-pie-exito'), false);
  botonCargando(i.generar, false);

  clearInterval(ingreso.reloj);
  ingreso.reloj = setInterval(ponerHora, 15 * 1000);
  abrirModal($('modal-ingreso'), {
    origen,
    foco: i.placa,
    alCerrar: () => {
      clearInterval(ingreso.reloj);
      clearTimeout(ingreso.espera);
    },
  });
}

i.placa.addEventListener('input', () => {
  i.placa.value = normalizarPlaca(i.placa.value);
  marcarCampo(i.placa, '');
  ingreso.confirmarAccesible = false;
  mostrar($('ingreso-confirmar-accesible'), false);
  pintarTicket();
  clearTimeout(ingreso.espera);
  ingreso.espera = setTimeout(consultarPlaca, 250);
});
i.tipos.addEventListener('change', (e) => {
  ingreso.tipo = e.target.value;
  opcionesCelda();
  pintarTicket();
});
i.accesible.addEventListener('change', consultarPlaca);
i.celda.addEventListener('change', pintarTicket);
i.puerta.addEventListener('change', () => {
  pintarTicket();
  guardarPuertaPreferida(Number(i.puerta.value));
});
$('ingreso-confirmar-check').addEventListener('change', (e) => {
  ingreso.confirmarAccesible = e.target.checked;
});

i.foto.addEventListener('change', () => {
  $('ingreso-foto-error').textContent = '';
  const elegido = i.foto.files[0];
  const error = !elegido
    ? ''
    : !['image/jpeg', 'image/png'].includes(elegido.type)
      ? 'La foto debe ser JPG o PNG.'
      : elegido.size > FOTO_MAX_BYTES
        ? 'La foto no puede pesar más de 2 MB.'
        : '';
  if (!elegido || error) {
    limpiarFoto();
    $('ingreso-foto-error').textContent = error;
    return;
  }
  if (ingreso.urlFoto) URL.revokeObjectURL(ingreso.urlFoto);
  ingreso.urlFoto = URL.createObjectURL(elegido);
  $('ingreso-foto-vista').src = ingreso.urlFoto;
  mostrar($('ingreso-foto-vista'), true);
  mostrar($('ingreso-foto-vacia'), false);
});

function datosIngreso() {
  const datos = new FormData();
  datos.set('puerta_id', i.puerta.value);
  datos.set('placa', i.placa.value);
  if (!i.celda.disabled && i.celda.value) datos.set('celda_id', i.celda.value);
  datos.set('requiere_accesible', String(i.accesible.checked));
  datos.set('confirmar_accesible', String(ingreso.confirmarAccesible));
  if (i.observaciones.value.trim())
    datos.set('observaciones_entrada', i.observaciones.value.trim());
  datos.set('deja_llaves', String(i.llaves.checked));
  if (i.foto.files[0]) datos.set('foto', i.foto.files[0]);
  return datos;
}

function mostrarIngresoExitoso(t) {
  ingreso.ticket = t;
  $('ingreso-exito-mensaje').textContent =
    `Ingreso registrado: ${formatearPlaca(t.vehiculo.placa)} en la celda ${t.celda.codigo}.`;
  $('ingreso-exito-ticket').textContent = t.codigo_ticket;
  $('ingreso-exito-llaves').textContent = t.deja_llaves
    ? 'El conductor dejó las llaves en la caseta.'
    : 'El conductor conserva las llaves.';
  const emitido = {
    numero: t.codigo_ticket,
    placa: formatearPlaca(t.vehiculo.placa),
    espacio: `${t.celda.codigo} · ${t.celda.piso}`,
    entrada: formatearFechaHora(t.fecha_hora_entrada),
    tarifa: textoTarifa(t.tarifa),
    cliente: t.tipo_cliente === 'mensualidad' ? 'Mensualidad' : 'Visitante',
    puerta: t.puerta_entrada,
  };
  for (const [clave, valor] of Object.entries(emitido)) {
    $(`emitido-${clave}`).textContent = valor || '—';
  }
  $('emitido-nota').textContent = t.observaciones_entrada
    ? `Observaciones: ${t.observaciones_entrada}`
    : 'Conserve este ticket.';
  mostrar($('ingreso-cuerpo'), false);
  mostrar($('ingreso-pie'), false);
  mostrar($('ingreso-exito'), true);
  mostrar($('ingreso-pie-exito'), true);
  $('ingreso-imprimir').focus();

  mostrarAviso(
    `Ingreso registrado: ${formatearPlaca(t.vehiculo.placa)} → ${t.celda.codigo}.`,
    'success'
  );
  // El mapa se actualiza por SSE; se deja seleccionada la celda para ver su detalle.
  estado.seleccionadaId = t.celda.id;
  const celda = estado.celdas.get(t.celda.id);
  if (celda) estado.pisoActivoId = celda.piso.id;
}

$('ingreso-imprimir').addEventListener('click', () => {
  if (ingreso.ticket) window.open(urlTicketPdf(ingreso.ticket.id), '_blank', 'noopener');
});

$('form-ingreso').addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrarAlerta(i.alerta, '');
  marcarCampo(i.placa, '');
  $('ingreso-vehiculo-error').textContent = '';
  if (!esPlacaValida(i.placa.value, 'carro') && !esPlacaValida(i.placa.value, 'moto')) {
    marcarCampo(i.placa, 'Escribe una placa válida: ABC123 (carro) o ABC12D (moto).');
    i.placa.focus();
    return;
  }
  botonCargando(i.generar, true, 'Generando…');
  try {
    if (ingreso.desconocida) {
      if (!esPlacaValida(i.placa.value, ingreso.tipo)) {
        marcarCampo(i.placa, `La placa no corresponde a un ${ingreso.tipo}.`);
        botonCargando(i.generar, false);
        return;
      }
      if (![i.marca, i.modelo, i.color].every((c) => c.value.trim())) {
        $('ingreso-vehiculo-error').textContent =
          'Completa marca, modelo y color del vehículo nuevo.';
        botonCargando(i.generar, false);
        return;
      }
      await crearVehiculo({
        placa: i.placa.value,
        tipo: ingreso.tipo,
        marca: i.marca.value.trim(),
        modelo: i.modelo.value.trim(),
        color: i.color.value.trim(),
      });
      ingreso.desconocida = false;
    }
    mostrarIngresoExitoso(await registrarEntrada(datosIngreso()));
  } catch (error) {
    botonCargando(i.generar, false);
    switch (error.codigo) {
      case 'VEHICULO_NO_REGISTRADO':
        ingreso.preview = { registrado: false };
        habilitarVehiculoNuevo(true);
        pintarCliente();
        mostrarAlerta(
          i.alerta,
          'Placa no registrada: elige el tipo y completa marca, modelo y color para registrarla como visitante.',
          'info'
        );
        i.marca.focus();
        break;
      case 'CONFIRMAR_ACCESIBLE':
        $('ingreso-confirmar-texto').textContent = error.message;
        $('ingreso-confirmar-check').checked = false;
        mostrar($('ingreso-confirmar-accesible'), true);
        $('ingreso-confirmar-check').focus();
        break;
      default:
        mostrarAlerta(i.alerta, error.message, 'error');
        if (['PICO_Y_PLACA', 'SIN_CUPO', 'ESTADIA_ABIERTA'].includes(error.codigo))
          i.alerta.classList.add('molecule-alert--large');
        for (const d of error.detalles ?? []) {
          const control = { placa: i.placa, celda_id: i.celda, puerta_id: i.puerta }[d.campo];
          if (control) marcarCampo(control, d.mensaje);
        }
    }
  }
});

// ===========================================================================
// Salida y cobro (REQ-INEX-2/3, REQ-TAR-2, REQ-FAC-1)
// ===========================================================================
const METODOS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
const cobro = { estadia: null, actual: null, factura: null };
const alertaCobro = $('cobro-alerta');
const botonCobrar = $('cobro-cobrar');

function pintarCobro() {
  const { cobro: c } = cobro.actual;
  $('cobro-pasos').replaceChildren(
    ...c.detalle
      .filter((d) => d.paso !== 'total')
      .map((d) => {
        const li = clonar('tpl-paso');
        li.textContent = d.texto;
        return li;
      })
  );
  const conTope =
    !c.membresia &&
    !c.porcentajeDescuento &&
    c.porcentajeTope !== null &&
    c.porcentajeTope !== undefined;
  $('cobro-total').textContent = formatearCOP(c.total);
  $('cobro-pct').textContent = conTope ? `${c.porcentajeTope} % del tope` : '';
  mostrar($('cobro-medidor'), conTope);
  if (conTope) ponerMedidor($('cobro-medidor'), c.porcentajeTope);
  $('cobro-nota').textContent = c.membresia ? c.nota : '';
  $('cobro-subtotal').textContent = formatearCOP(c.membresia ? 0 : c.subtotal);
  $('cobro-valor-descuento').textContent = c.valorDescuento
    ? `− ${formatearCOP(c.valorDescuento)}`
    : '—';
  botonCobrar.querySelector('span').textContent = `Cobrar ${formatearCOP(c.total)}`;
}

async function abrirSalida(celda, origen) {
  const puertaId = puertaActual();
  const salidas = (estado.sede?.puertas ?? []).filter((p) => p.tipo !== 'entrada');
  let liquidacion;
  try {
    liquidacion = await liquidarSalida({
      puerta_id: salidas.find((p) => p.id === puertaId)?.id ?? salidas[0]?.id,
      placa: celda.ocupante.placa,
    });
  } catch (error) {
    mostrarAviso(error.message, 'error');
    return;
  }
  const { estadia } = liquidacion;
  Object.assign(cobro, { estadia, actual: liquidacion, factura: null });

  $('cobro-subtitulo').textContent =
    `// ticket ${estadia.codigo_ticket} · celda ${estadia.celda.codigo}`;
  $('cobro-placa').textContent = formatearPlaca(estadia.vehiculo.placa);
  $('cobro-vehiculo').textContent = [
    `${estadia.vehiculo.marca ?? ''} ${estadia.vehiculo.modelo ?? ''}`.trim(),
    estadia.vehiculo.color,
  ]
    .filter(Boolean)
    .join(' · ');
  $('cobro-entrada').textContent = formatearFechaHora(liquidacion.fecha_hora_entrada);
  $('cobro-salida').textContent = formatearFechaHora(liquidacion.fecha_hora_salida);
  $('cobro-tiempo').textContent = liquidacion.tiempo;
  $('cobro-cliente').textContent = liquidacion.membresia
    ? `Mensualidad · ${liquidacion.membresia.titular}`
    : 'Visitante';
  $('cobro-tarifa').textContent = liquidacion.tarifa.descripcion;
  $('cobro-ticket').textContent = estadia.codigo_ticket;

  const descuento = $('cobro-descuento');
  llenarSelect(descuento, {
    opciones: [
      { value: '', label: 'Sin descuento' },
      ...liquidacion.descuentos.map((d) => ({
        value: String(d.id),
        label: `${d.nombre} · ${d.porcentaje} %`,
      })),
    ],
  });
  descuento.disabled = Boolean(liquidacion.membresia) || liquidacion.descuentos.length === 0;
  $('cobro-descuento-ayuda').textContent = liquidacion.membresia
    ? 'Las mensualidades no pagan: no aplica descuento.'
    : 'Uno por factura.';
  llenarSelect($('cobro-puerta'), {
    opciones: salidas.map((p) => ({ value: String(p.id), label: p.nombre })),
  });
  $('cobro-puerta').value = String(
    salidas.find((p) => p.id === puertaId)?.id ?? salidas[0]?.id ?? ''
  );
  $('form-cobro').querySelector('input[value="efectivo"]').checked = true;

  mostrarAlerta(alertaCobro, '');
  botonCargando(botonCobrar, false);
  botonCobrar.disabled = false;
  mostrar($('cobro-cuerpo'), true);
  mostrar($('cobro-pie'), true);
  mostrar($('cobro-exito'), false);
  mostrar($('cobro-pie-exito'), false);
  pintarCobro();
  abrirModal($('modal-cobro'), { origen });
}

$('cobro-descuento').addEventListener('change', async (e) => {
  mostrarAlerta(alertaCobro, '');
  botonCobrar.disabled = true;
  try {
    const valor = e.target.value ? Number(e.target.value) : null;
    cobro.actual = { ...cobro.actual, ...(await liquidarEstadia(cobro.estadia.id, valor)) };
    pintarCobro();
  } catch (error) {
    mostrarAlerta(alertaCobro, error.message);
  } finally {
    botonCobrar.disabled = false;
  }
});

function mostrarCobroExitoso({ factura, estadia: cerrada }) {
  cobro.factura = factura;
  $('cobro-exito-mensaje').textContent =
    `Pago registrado: ${formatearPlaca(cerrada.vehiculo.placa)} salió de la celda ${cerrada.celda.codigo}.`;
  $('cobro-exito-factura').textContent = factura.numero;
  $('cobro-exito-total').textContent = formatearCOP(factura.total);
  $('cobro-exito-metodo').textContent = METODOS[factura.metodo_pago] ?? factura.metodo_pago;
  $('cobro-exito-tiempo').textContent = cerrada.tiempo;
  $('cobro-exito-salida').textContent = formatearFechaHora(cerrada.fecha_hora_salida);
  $('cobro-exito-valor').textContent = formatearCOP(factura.total);
  $('cobro-exito-nota').textContent = factura.descuento
    ? `Incluye descuento ${factura.descuento.nombre}`
    : '';
  mostrar($('cobro-cuerpo'), false);
  mostrar($('cobro-pie'), false);
  mostrar($('cobro-exito'), true);
  mostrar($('cobro-pie-exito'), true);
  $('cobro-imprimir').focus();
}

$('cobro-imprimir').addEventListener('click', () => {
  if (cobro.factura) window.open(urlFacturaPdf(cobro.factura.id), '_blank', 'noopener');
});

$('form-cobro').addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrarAlerta(alertaCobro, '');
  botonCargando(botonCobrar, true, 'Cobrando…');
  const descuento = $('cobro-descuento').value;
  const datos = {
    puerta_id: Number($('cobro-puerta').value),
    metodo_pago: $('form-cobro').querySelector('input[name="metodo_pago"]:checked').value,
    descuento_id: descuento ? Number(descuento) : undefined,
  };
  try {
    const resultado = await pagarEstadia(cobro.estadia.id, datos);
    guardarPuertaPreferida(datos.puerta_id);
    mostrarCobroExitoso(resultado);
    mostrarAviso(
      `Salida cobrada: ${formatearPlaca(resultado.estadia.vehiculo.placa)} · ${formatearCOP(resultado.factura.total)} · ${resultado.factura.numero}.`,
      'success'
    );
    estado.liquidacion = null;
    // El mapa y la bitácora llegan por SSE; el recaudo se recarga aquí.
    cargarFacturacion();
  } catch (error) {
    botonCargando(botonCobrar, false);
    mostrarAlerta(alertaCobro, error.message);
  }
});

// ===========================================================================
// Puertas de acceso (admin)
// ===========================================================================
const TIPOS_PUERTA = {
  mixta: 'Mixta (entrada y salida)',
  entrada: 'Solo entrada',
  salida: 'Solo salida',
};
const pu = {
  nombre: $('puertas-nombre'),
  tipo: $('puertas-tipo'),
  alerta: $('puertas-alerta'),
  guardar: $('puertas-guardar'),
  cancelar: $('puertas-cancelar-edicion'),
  editando: null,
};

function modoEdicionPuerta(p) {
  pu.editando = p;
  pu.nombre.value = p?.nombre ?? '';
  pu.tipo.value = p?.tipo ?? 'mixta';
  pu.guardar.querySelector('span').textContent = p ? 'Guardar cambios' : 'Agregar puerta';
  mostrar(pu.cancelar, Boolean(p));
  marcarCampo(pu.nombre, '');
  marcarCampo(pu.tipo, '');
  mostrarAlerta(pu.alerta, '');
  pu.nombre.focus();
}

async function alternarPuerta(p, boton) {
  if (p.activa) {
    const ok = await confirmar({
      titulo: `Desactivar la puerta ${p.nombre}`,
      mensaje: 'Dejará de aparecer al registrar entradas y salidas. Su historial se conserva.',
      textoConfirmar: 'Desactivar',
      origen: boton,
    });
    if (!ok) return;
  }
  try {
    await cambiarActivaPuerta(p.id, !p.activa);
    mostrarAviso(`Puerta ${p.nombre} ${p.activa ? 'desactivada' : 'activada'}.`, 'success');
    await recargarPuertas();
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }
}

async function recargarPuertas() {
  const puertas = await listarPuertas({ todas: true });
  // El modal de ingreso y el cobro usan las puertas activas de la sede.
  if (estado.sede) estado.sede.puertas = puertas.filter((p) => p.activa);
  $('puertas-filas').replaceChildren(
    ...puertas.map((p) => {
      const fila = clonar('tpl-puerta');
      const celdas = fila.children;
      celdas[0].querySelector('strong').textContent = p.nombre;
      celdas[1].textContent = TIPOS_PUERTA[p.tipo] ?? p.tipo;
      const chip = celdas[2].querySelector('.atom-status-chip');
      chip.textContent = p.activa ? 'Activa' : 'Inactiva';
      chip.classList.toggle('atom-status-chip--free', p.activa);
      const editar = fila.querySelector('.organism-doors-edit');
      editar.setAttribute('aria-label', `Editar la puerta ${p.nombre}`);
      editar.addEventListener('click', () => modoEdicionPuerta(p));
      const alternar = fila.querySelector('.organism-doors-toggle');
      const accion = p.activa ? 'Desactivar' : 'Activar';
      alternar.querySelector('span').textContent = accion;
      alternar.setAttribute('aria-label', `${accion} la puerta ${p.nombre}`);
      alternar.addEventListener('click', () => alternarPuerta(p, alternar));
      return fila;
    })
  );
}

async function abrirPuertas(origen) {
  try {
    await recargarPuertas();
  } catch (error) {
    mostrarAviso(error.message, 'error');
    return;
  }
  abrirModal($('modal-puertas'), { origen });
  modoEdicionPuerta(null);
}

pu.cancelar.addEventListener('click', () => modoEdicionPuerta(null));

$('form-puertas').addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrarAlerta(pu.alerta, '');
  marcarCampo(pu.nombre, '');
  const datos = { nombre: pu.nombre.value.trim(), tipo: pu.tipo.value };
  if (datos.nombre.length < 2) return marcarCampo(pu.nombre, 'Escribe el nombre de la puerta.');
  botonCargando(pu.guardar, true, 'Guardando…');
  try {
    if (pu.editando) await actualizarPuerta(pu.editando.id, datos);
    else await crearPuerta(datos);
    mostrarAviso(`Puerta ${datos.nombre} ${pu.editando ? 'actualizada' : 'creada'}.`, 'success');
    botonCargando(pu.guardar, false);
    modoEdicionPuerta(null);
    await recargarPuertas();
  } catch (error) {
    for (const d of error.detalles ?? []) {
      const control = { nombre: pu.nombre, tipo: pu.tipo }[d.campo];
      if (control) marcarCampo(control, d.mensaje);
    }
    mostrarAlerta(pu.alerta, error.message);
  } finally {
    botonCargando(pu.guardar, false);
  }
});

// ===========================================================================
// Buscador por placa o ticket y bitácora
// ===========================================================================
$('buscador').addEventListener('submit', (e) => {
  e.preventDefault();
  const valor = $('buscador-texto').value.trim().toUpperCase();
  if (!valor) return;
  const placa = normalizarPlaca(valor);
  const celda = [...estado.celdas.values()].find(
    (c) => c.ocupante?.placa === placa || c.estadia?.codigo_ticket === valor
  );
  if (!celda) {
    mostrarAviso(`No hay un vehículo dentro con la placa o ticket "${valor}".`, 'error');
    return;
  }
  estado.pisoActivoId = celda.piso.id;
  estado.seleccionadaId = celda.id;
  mapa.pintar();
  pintarDetalle();
  actualizarLiquidacion();
  $('detalle-panel')
    .querySelector('.organism-space-detail-actions .atom-button:not(.hidden)')
    ?.focus();
});

async function cargarBitacora() {
  if (!puede('movimientos.ver')) return;
  try {
    pintarBitacora('bitacora', await ultimosMovimientos(10));
  } catch {
    /* la bitácora es secundaria: no bloquea la pantalla */
  }
}

// ===========================================================================
// Datos y tiempo real
// ===========================================================================
const TEXTOS_VIVO = {
  conectando: 'Conectando…',
  'en-vivo': 'En vivo',
  reconectando: 'Reconectando…',
};

function ponerIndicador(nuevo) {
  const indicador = $('indicador-vivo');
  indicador.className = `molecule-live-status molecule-live-status--${nuevo}`;
  indicador.textContent = TEXTOS_VIVO[nuevo];
}

async function cargarDatos() {
  const [pisos, celdas, resumen] = await Promise.all([
    listarPisos(),
    listarCeldas(),
    obtenerResumen(),
  ]);
  estado.pisos = pisos;
  estado.celdas = new Map(celdas.map((c) => [c.id, c]));
  estado.resumen = resumen;
  const guardado = pisoGuardado();
  if (!pisos.some((p) => p.id === estado.pisoActivoId)) {
    estado.pisoActivoId = pisos.some((p) => p.id === guardado) ? guardado : pisos[0]?.id;
  }
  if (!estado.celdas.has(estado.seleccionadaId)) estado.seleccionadaId = null;
}

function pintarTodo() {
  pintarKpis();
  mapa.pintar();
  pintarDetalle();
}

function conectar() {
  suscribirCeldas({
    onCelda: (celda) => {
      if (celda.activa === false) {
        estado.celdas.delete(celda.id);
        if (estado.seleccionadaId === celda.id) estado.seleccionadaId = null;
      } else {
        estado.celdas.set(celda.id, celda);
      }
      mapa.pintar();
      if (!estado.seleccionadaId || estado.seleccionadaId === celda.id) {
        pintarDetalle();
        if (estado.seleccionadaId === celda.id) actualizarLiquidacion();
      }
    },
    onResumen: (resumen) => {
      estado.resumen = resumen;
      pintarKpis();
    },
    onMovimiento: () => {
      cargarBitacora();
      cargarFacturacion();
    },
    onEstado: async (nuevo, reconectado) => {
      ponerIndicador(nuevo);
      // Tras una caída pudo haber cambios perdidos: se vuelve a cargar todo.
      if (reconectado) {
        try {
          await cargarDatos();
          pintarTodo();
        } catch {
          /* se intentará en la próxima reconexión */
        }
      }
    },
  });
}

async function iniciar() {
  const app = await montarMarco({ paginaId: 'celdas' });
  if (!app) return;
  estado.sesion = app.sesion;
  estado.sede = app.sede;

  $('pagina-titulo').textContent = puede('celdas.cambiar_estado')
    ? 'Control de espacios'
    : 'Disponibilidad de celdas';
  mostrar($('buscador'), puede('movimientos.registrar'));
  mostrar($('accion-ingreso'), puede('movimientos.registrar'));
  mostrar($('accion-gestionar'), puede('celdas.gestionar'));
  mostrar($('accion-puertas'), puede('puertas.gestionar'));
  $('accion-ingreso').addEventListener('click', (e) => abrirIngreso(e.currentTarget));
  $('accion-gestionar').addEventListener('click', (e) => abrirGestion(null, e.currentTarget));
  $('accion-puertas').addEventListener('click', (e) => abrirPuertas(e.currentTarget));

  try {
    await cargarDatos();
  } catch (error) {
    mostrarAviso(error.message, 'error');
    return;
  }
  pintarTodo();
  conectar();
  cargarBitacora();
  cargarFacturacion();

  // El "tiempo dentro" y el valor a pagar del detalle avanzan solos (cobro por minuto).
  setInterval(() => {
    if (!estado.seleccionadaId) return;
    pintarDetalle();
    actualizarLiquidacion();
  }, 60 * 1000);
}

iniciar();
