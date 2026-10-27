/**
 * Mis movimientos (portal del cliente): estadías, facturas (PDF), membresías, reservas e
 * incidencias de sus vehículos, en pestañas. La pestaña va en el hash (#facturas) para
 * los enlaces del dashboard y de las notificaciones (?membresia=ID abre Membresías).
 * HTML en app/mis-movimientos.html: una tabla escrita por pestaña.
 */
import { montarMarco } from './comun/marco-app.js';
import { mostrarAviso } from './comun/dialogos.js';
import { ponerChip } from './comun/plantillas.js';
import { conectarTabla } from './comun/tablas.js';
import { conectarPestanas } from './comun/pestanas.js';
import { rellenarFactura } from './comun/tabla-facturas.js';
import { misFacturas, misMembresias } from '../services/facturacion.service.js';
import { misIncidencias } from '../services/incidencias.service.js';
import { misReservas, misEstadias } from '../services/reservas.service.js';
import { formatearCOP, formatearFecha, formatearFechaHora } from '../utils/formato.js';
import { formatearPlaca } from '../utils/placa.js';

const $ = (id) => document.getElementById(id);

const ESTADO_RESERVA = {
  pendiente: ['Pendiente', 'reserved'],
  confirmada: ['Activa', 'reserved'],
  cumplida: ['Cumplida', 'free'],
  cancelada: ['Cancelada', 'neutral'],
  expirada: ['Expirada', 'out'],
};

function chipMembresia(chip, m) {
  if (m.estado === 'cancelada') return ponerChip(chip, 'Cancelada', 'out');
  if (m.estado === 'vencida') return ponerChip(chip, 'Vencida');
  if (!m.vigente) return ponerChip(chip, 'Programada', 'reserved');
  const pronto = m.dias_restantes <= 3;
  return ponerChip(
    chip,
    pronto ? `Vence en ${m.dias_restantes} d` : 'Vigente',
    pronto ? 'occupied' : 'free'
  );
}

/** Texto principal + secundario en un <span><span/><span/></span>. */
function conSub(celda, principal, secundario) {
  const [uno, dos] = celda.firstElementChild.children;
  uno.textContent = principal;
  dos.textContent = secundario ?? '';
}

const placa = (celda, valor) => {
  celda.firstElementChild.textContent = formatearPlaca(valor);
};

/** Cada pestaña: cómo cargar sus datos y cómo rellenar una fila de su tabla. */
const PESTANAS = {
  estadias: {
    cargar: (f) => misEstadias(f),
    plantilla: 'tpl-estadia',
    rellenar: (fila, e) => {
      const [vehiculo, entrada, salida, tiempo, celda, valor, ticket] = fila.cells;
      placa(vehiculo, e.vehiculo.placa);
      entrada.firstElementChild.textContent = formatearFechaHora(e.fecha_hora_entrada);
      const [hora, dentro] = salida.children;
      hora.textContent = e.fecha_hora_salida ? formatearFechaHora(e.fecha_hora_salida) : '';
      dentro.classList.toggle('hidden', Boolean(e.fecha_hora_salida));
      tiempo.firstElementChild.textContent = e.tiempo;
      conSub(celda, e.celda.codigo, e.celda.piso);
      valor.firstElementChild.textContent =
        e.valor_pagado === null ? '—' : formatearCOP(e.valor_pagado);
      // El PDF del ticket es del personal; el cliente tiene el de la factura.
      ticket.firstElementChild.textContent = e.codigo_ticket;
    },
  },
  facturas: {
    cargar: (f) => misFacturas(f),
    plantilla: 'tpl-factura',
    rellenar: (fila, f) => rellenarFactura(fila, f, { conCliente: false }),
  },
  membresias: {
    cargar: async () => ({ data: await misMembresias() }),
    plantilla: 'tpl-membresia',
    rellenar: (fila, m) => {
      const [vehiculo, tipo, vigencia, celda, valor, chip] = fila.cells;
      placa(vehiculo, m.vehiculo.placa);
      tipo.textContent = m.tipo === 'anual' ? 'Anual' : 'Mensual';
      vigencia.firstElementChild.textContent = `${formatearFecha(m.fecha_inicio)} → ${formatearFecha(m.fecha_fin)}`;
      celda.textContent = m.celda?.codigo ?? '—';
      valor.textContent = formatearCOP(m.valor);
      chipMembresia(chip.firstElementChild, m);
      if (new URLSearchParams(location.search).get('membresia') === String(m.id))
        fila.classList.add('is-highlighted');
    },
  },
  reservas: {
    cargar: (f) => misReservas(f),
    plantilla: 'tpl-reserva',
    rellenar: (fila, r) => {
      const [vehiculo, celda, fecha, vence, chip, ticket] = fila.cells;
      placa(vehiculo, r.vehiculo.placa);
      conSub(celda, r.celda.codigo, r.celda.piso);
      fecha.firstElementChild.textContent = formatearFechaHora(r.fecha_hora_reserva);
      vence.firstElementChild.textContent = formatearFechaHora(r.fecha_hora_expiracion);
      const [texto, variante] = ESTADO_RESERVA[r.estado];
      ponerChip(chip.firstElementChild, texto, variante);
      ticket.textContent = r.estadia?.codigo_ticket ?? '—';
    },
  },
  incidencias: {
    cargar: (f) => misIncidencias(f),
    plantilla: 'tpl-incidencia',
    rellenar: (fila, i) => {
      const [codigo, vehiculo, tipo, celda, descripcion] = fila.cells;
      conSub(codigo, i.codigo, formatearFechaHora(i.fecha_hora));
      placa(vehiculo, i.vehiculo.placa);
      tipo.textContent = i.tipo.nombre;
      celda.textContent = i.celda?.codigo ?? '—';
      descripcion.firstElementChild.textContent = i.descripcion;
    },
  },
};

const estado = { activa: 'estadias', pagina: 1, peticion: 0 };
const tablas = Object.fromEntries(
  Object.entries(PESTANAS).map(([id, p]) => [
    id,
    conectarTabla($(`tabla-${id}`), {
      plantilla: p.plantilla,
      rellenar: p.rellenar,
      onPagina: (pagina) => {
        estado.pagina = pagina;
        cargar();
      },
    }),
  ])
);

async function cargar() {
  const id = estado.activa;
  const numero = ++estado.peticion;
  $('mis-cargando').classList.remove('hidden');
  $(`panel-${id}`).classList.add('hidden');
  try {
    const { data, meta } = await PESTANAS[id].cargar({ pagina: estado.pagina, limite: 15 });
    if (numero !== estado.peticion) return;
    tablas[id].pintar(data, { meta });
    $(`panel-${id}`).classList.remove('hidden');
  } catch (error) {
    if (numero === estado.peticion) mostrarAviso(error.message, 'error');
  } finally {
    if (numero === estado.peticion) $('mis-cargando').classList.add('hidden');
  }
}

const pestanas = conectarPestanas($('pestanas'), {
  onChange: (id) => {
    estado.activa = id;
    estado.pagina = 1;
    try {
      history.replaceState(null, '', `${location.search}#${id}`);
    } catch {
      /* sin historial */
    }
    cargar();
  },
});

async function iniciar() {
  const app = await montarMarco({ paginaId: 'mis-movimientos' });
  if (!app) return;
  const pedida = location.hash.slice(1);
  if (PESTANAS[pedida]) estado.activa = pedida;
  else if (new URLSearchParams(location.search).has('membresia')) estado.activa = 'membresias';
  pestanas.activar(estado.activa);
  await cargar();
}

iniciar();
