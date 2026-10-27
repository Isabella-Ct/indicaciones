/**
 * Disponibilidad (portal del cliente) — REQ-CLD-02 y REQ-RES-1: mapa de celdas en solo
 * lectura y en vivo (sin placas ajenas). Al tocar una celda libre del tipo de alguno de
 * sus vehículos aparece "Reservar"; sus reservas y su celda fija se resaltan (is-selected).
 * HTML en app/disponibilidad.html.
 */
import { montarMarco } from './comun/marco-app.js';
import { abrirModal, confirmar, mostrarAviso } from './comun/dialogos.js';
import {
  clonar,
  llenarSelect,
  ponerChip,
  mostrarAlerta,
  botonCargando,
} from './comun/plantillas.js';
import { ponerKpi } from './comun/tablas.js';
import { conectarMapa, pisoGuardado } from './comun/mapa.js';
import { iniciarCuentaRegresiva } from './comun/cuenta-regresiva.js';
import {
  listarPisos,
  listarCeldas,
  obtenerResumen,
  suscribirCeldas,
} from '../services/celdas.service.js';
import { listarMisVehiculos } from '../services/usuarios.service.js';
import { crearReserva, cancelarReserva, misReservas } from '../services/reservas.service.js';
import { formatearHora } from '../utils/formato.js';
import { formatearPlaca } from '../utils/placa.js';

const $ = (id) => document.getElementById(id);
const mostrar = (nodo, visible) => nodo.classList.toggle('hidden', !visible);
const ESTADOS = {
  disponible: ['Libre', 'free'],
  ocupada: ['Ocupado', 'occupied'],
  reservada: ['Reservado', 'reserved'],
  fuera_servicio: ['Fuera de servicio', 'out'],
};
const estado = {
  pisos: [],
  celdas: new Map(),
  resumen: null,
  vehiculos: [],
  reservas: [], // activas
  pisoActivoId: null,
  seleccionadaId: null,
};

const mapa = conectarMapa({
  estado,
  resaltadas: () => new Set([...estado.celdas.values()].filter((c) => c.propia).map((c) => c.id)),
  onSeleccionar: (id) => {
    estado.seleccionadaId = id;
    mapa.pintar();
    pintarDetalle();
    mapa.enfocarEspacio(id);
  },
});

/** Vehículos que pueden reservar esa celda (mismo tipo y sin reserva activa). */
function vehiculosPara(celda) {
  const conReserva = new Set(estado.reservas.map((r) => r.vehiculo.id));
  return estado.vehiculos.filter((v) => v.tipo === celda.tipo && !conReserva.has(v.id));
}

// ---------------------------------------------------------------------------
// Pintado
// ---------------------------------------------------------------------------
function pintarKpis() {
  const r = estado.resumen;
  if (!r) return;
  const carro = r.por_tipo.carro;
  ponerKpi('kpi-carro', {
    valor: carro.disponible,
    medidor: carro.total ? (carro.disponible / carro.total) * 100 : 0,
    nota: `de ${carro.total} celdas de carro`,
  });
  ponerKpi('kpi-moto', {
    valor: r.por_tipo.moto.disponible,
    nota: `de ${r.por_tipo.moto.total} celdas de moto`,
  });
  ponerKpi('kpi-reservas', {
    valor: estado.reservas.length,
    nota: estado.reservas.length
      ? 'Llega antes de que venza'
      : 'Toca una celda libre para reservar',
  });
}

function pintarReservas() {
  mostrar($('panel-reservas'), estado.reservas.length > 0);
  $('panel-reservas-titulo').textContent =
    estado.reservas.length > 1 ? 'Tus reservas' : 'Tu reserva';
  const filas = estado.reservas.map((r) => {
    const fila = clonar('tpl-mi-reserva');
    const [, datos, boton] = fila.children;
    datos.querySelector('.atom-plate').textContent = formatearPlaca(r.vehiculo.placa);
    const [celda, vence] = datos.querySelectorAll('dd');
    celda.textContent = `${r.celda.codigo} · ${r.celda.piso}`;
    vence.textContent = formatearHora(r.fecha_hora_expiracion);
    boton.addEventListener('click', () => cancelar(r, boton));
    return fila;
  });
  $('lista-reservas').replaceChildren(...filas);
  // La cuenta empieza con la caja ya en la página (si no, se detiene sola).
  filas.forEach((fila, i) => {
    const r = estado.reservas[i];
    iniciarCuentaRegresiva(fila.firstElementChild, {
      hasta: r.fecha_hora_expiracion,
      etiqueta: `Para llegar a ${r.celda.codigo}`,
      onFin: () => setTimeout(recargarReservas, 2000),
    });
  });
}

function ponerNota(texto) {
  $('detalle-nota').textContent = texto;
  mostrar($('detalle-nota'), true);
}

function pintarAcciones(celda) {
  mostrar($('detalle-nota'), false);
  mostrar($('detalle-cancelar'), false);
  mostrar($('detalle-reservar'), false);
  if (celda.propia === 'reserva') {
    ponerNota('Tu reserva. Llega antes de que venza.');
    mostrar(
      $('detalle-cancelar'),
      estado.reservas.some((x) => x.celda.id === celda.id)
    );
  } else if (celda.propia === 'mensualidad') {
    ponerNota('Tu celda fija de mensualidad: queda reservada para ti.');
  } else if (celda.propia === 'vehiculo') {
    ponerNota('Aquí está parqueado tu vehículo.');
  } else if (celda.estado === 'disponible') {
    if (vehiculosPara(celda).length) mostrar($('detalle-reservar'), true);
    else
      ponerNota(
        estado.vehiculos.some((v) => v.tipo === celda.tipo)
          ? 'Tu vehículo de este tipo ya tiene una reserva activa.'
          : `Celda de ${celda.tipo}: no tienes vehículos de este tipo.`
      );
  }
}

function pintarDetalle() {
  const celda = estado.celdas.get(estado.seleccionadaId) ?? null;
  mostrar($('detalle-vacio'), !celda);
  mostrar($('detalle-panel'), Boolean(celda));
  if (!celda) return;
  $('detalle-panel').setAttribute('aria-label', `Detalle del espacio ${celda.codigo}`);
  $('detalle-ubicacion').textContent =
    `${celda.piso.nombre} · ${celda.tipo === 'moto' ? 'Moto' : 'Carro'}${celda.es_accesible ? ' · Accesible' : ''}`;
  $('detalle-codigo').textContent = celda.codigo;
  const [texto, variante] = ESTADOS[celda.estado];
  ponerChip($('detalle-estado'), texto, variante);

  // Sin ver ocupantes: solo el estado de la celda.
  const mensajes = {
    disponible: 'Espacio libre: puede asignarse en el próximo ingreso.',
    fuera_servicio: celda.nota || 'Sin nota registrada.',
    reservada: `Reservado para una ${celda.reserva_origen === 'mensualidad' ? 'mensualidad con celda fija' : 'reserva'}.`,
    ocupada: 'Espacio ocupado.',
  };
  $('detalle-mensaje').textContent = mensajes[celda.estado];
  mostrar($('detalle-mensaje-titulo'), celda.estado === 'fuera_servicio');
  pintarAcciones(celda);
}

function pintarTodo() {
  pintarKpis();
  pintarReservas();
  mapa.pintar();
  pintarDetalle();
}

// ---------------------------------------------------------------------------
// Reservar y cancelar
// ---------------------------------------------------------------------------
let celdaReserva = null;
let detenerCuenta = null;

function abrirReserva(celda, origen) {
  celdaReserva = celda;
  $('modal-reservar-titulo').textContent = `Reservar ${celda.codigo}`;
  $('reservar-celda').textContent = `${celda.codigo} · ${celda.piso.nombre}`;
  $('reservar-tipo').textContent = celda.tipo === 'moto' ? 'Moto' : 'Carro';
  llenarSelect($('reservar-vehiculo'), {
    opciones: vehiculosPara(celda).map((v) => ({
      value: String(v.id),
      label: `${v.placa} · ${v.marca ?? ''} ${v.modelo ?? ''}`.trim(),
    })),
  });
  $('reservar-accesible').checked = false;
  mostrar($('reservar-accesible-etiqueta'), Boolean(celda.es_accesible));
  mostrarAlerta($('reservar-alerta'), '');
  botonCargando($('reservar-confirmar'), false);
  mostrar($('form-reservar'), true);
  mostrar($('reservar-pie-form'), true);
  mostrar($('reservar-exito'), false);
  mostrar($('reservar-listo'), false);
  abrirModal($('modal-reservar'), { origen, alCerrar: () => detenerCuenta?.() });
}

$('form-reservar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const boton = $('reservar-confirmar');
  mostrarAlerta($('reservar-alerta'), '');
  botonCargando(boton, true, 'Reservando…');
  try {
    const reserva = await crearReserva({
      vehiculo_id: Number($('reservar-vehiculo').value),
      celda_id: celdaReserva.id,
      requiere_accesible: $('reservar-accesible').checked,
    });
    mostrarAviso(`Celda ${reserva.celda.codigo} reservada.`, 'success');
    $('reservar-exito-mensaje').textContent =
      `Reserva confirmada: ${reserva.celda.codigo} para ${reserva.vehiculo.placa}.`;
    $('reservar-exito-texto').textContent =
      `Llega antes de las ${formatearHora(reserva.fecha_hora_expiracion)}. En la puerta, el operador te asigna la celda ${reserva.celda.codigo}.`;
    detenerCuenta?.();
    detenerCuenta = iniciarCuentaRegresiva($('reservar-cuenta'), {
      hasta: reserva.fecha_hora_expiracion,
      etiqueta: 'Tiempo para llegar',
    });
    mostrar($('form-reservar'), false);
    mostrar($('reservar-pie-form'), false);
    mostrar($('reservar-exito'), true);
    mostrar($('reservar-listo'), true);
    $('reservar-listo').focus();
    await recargarReservas();
  } catch (error) {
    botonCargando(boton, false);
    mostrarAlerta($('reservar-alerta'), error.message);
  }
});

async function cancelar(reserva, origen) {
  const ok = await confirmar({
    titulo: 'Cancelar reserva',
    mensaje: `La celda ${reserva.celda.codigo} quedará libre para otras personas.`,
    textoConfirmar: 'Cancelar reserva',
    origen,
  });
  if (!ok) return;
  try {
    await cancelarReserva(reserva.id);
    mostrarAviso('Reserva cancelada.', 'success');
    await recargarReservas();
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }
}

$('detalle-reservar').addEventListener('click', (e) => {
  const celda = estado.celdas.get(estado.seleccionadaId);
  if (celda) abrirReserva(celda, e.currentTarget);
});
$('detalle-cancelar').addEventListener('click', (e) => {
  const r = estado.reservas.find((x) => x.celda.id === estado.seleccionadaId);
  if (r) cancelar(r, e.currentTarget);
});
$('detalle-cerrar').addEventListener('click', () => {
  const id = estado.seleccionadaId;
  estado.seleccionadaId = null;
  mapa.pintar();
  pintarDetalle();
  mapa.enfocarEspacio(id);
});

// ---------------------------------------------------------------------------
// Datos y tiempo real
// ---------------------------------------------------------------------------
async function recargarReservas() {
  try {
    estado.reservas = (await misReservas({ activas: '1', limite: 10 })).data;
    // Las celdas cambian por SSE; se vuelve a pedir el mapa por si el evento ya pasó.
    estado.celdas = new Map((await listarCeldas()).map((c) => [c.id, c]));
    pintarTodo();
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }
}

async function cargarDatos() {
  const [pisos, celdas, resumen, vehiculos, reservas] = await Promise.all([
    listarPisos(),
    listarCeldas(),
    obtenerResumen(),
    listarMisVehiculos(),
    misReservas({ activas: '1', limite: 10 }),
  ]);
  estado.pisos = pisos;
  estado.celdas = new Map(celdas.map((c) => [c.id, c]));
  estado.resumen = resumen;
  estado.vehiculos = vehiculos.filter((v) => v.activo !== false);
  estado.reservas = reservas.data;
  if (!pisos.some((p) => p.id === estado.pisoActivoId)) {
    const guardado = pisoGuardado();
    const propia = celdas.find((c) => c.propia);
    estado.pisoActivoId =
      propia?.piso.id ?? (pisos.some((p) => p.id === guardado) ? guardado : pisos[0]?.id);
  }
}

const TEXTOS_VIVO = {
  conectando: 'Conectando…',
  'en-vivo': 'En vivo',
  reconectando: 'Reconectando…',
};

function conectar() {
  suscribirCeldas({
    onCelda: (celda) => {
      if (celda.activa === false) estado.celdas.delete(celda.id);
      else estado.celdas.set(celda.id, celda);
      mapa.pintar();
      if (estado.seleccionadaId === celda.id) pintarDetalle();
    },
    onResumen: (resumen) => {
      estado.resumen = resumen;
      pintarKpis();
    },
    onEstado: async (nuevo, reconectado) => {
      const indicador = $('indicador-vivo');
      indicador.className = `molecule-live-status molecule-live-status--${nuevo}`;
      indicador.textContent = TEXTOS_VIVO[nuevo];
      if (reconectado) {
        await cargarDatos().catch(() => {});
        pintarTodo();
      }
    },
  });
}

async function iniciar() {
  const app = await montarMarco({ paginaId: 'disponibilidad' });
  if (!app) return;
  try {
    await cargarDatos();
  } catch (error) {
    mostrarAviso(error.message, 'error');
    return;
  }
  pintarTodo();
  conectar();
}

iniciar();
