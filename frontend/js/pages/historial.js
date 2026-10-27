/**
 * Historial de movimientos (wireframe 10 con estilo PARKO) — REQ-INEX-3:
 * entradas y salidas con fecha, hora, duración, celda y puertas; exportar CSV.
 * HTML en app/historial.html.
 */
import { montarMarco } from './comun/marco-app.js';
import { mostrarAviso } from './comun/dialogos.js';
import { llenarSelect, botonCargando, descargarCsv } from './comun/plantillas.js';
import { conectarTabla, conectarBusqueda } from './comun/tablas.js';
import { historialEstadias, urlTicketPdf } from '../services/estadias.service.js';
import { normalizarPlaca, formatearPlaca } from '../utils/placa.js';
import { formatearFechaHora } from '../utils/formato.js';

const $ = (id) => document.getElementById(id);
const filtros = {
  placa: '',
  desde: '',
  hasta: '',
  puerta_id: '',
  estado: '',
  pagina: 1,
  limite: 20,
};

const observaciones = (e) =>
  [e.observaciones_entrada, e.deja_llaves ? 'Dejó llaves' : null].filter(Boolean).join(' · ') ||
  '—';

const tabla = conectarTabla($('tabla-movimientos'), {
  plantilla: 'tpl-movimiento',
  rellenar: (fila, e) => {
    const [vehiculo, entrada, salida, duracion, celda, puertas, notas, ticket] = fila.cells;
    const [placa, sub] = vehiculo.firstElementChild.children;
    placa.textContent = formatearPlaca(e.vehiculo.placa);
    sub.textContent = `${e.vehiculo.tipo === 'moto' ? 'Moto' : 'Carro'} · ${e.codigo_ticket}`;
    entrada.firstElementChild.textContent = formatearFechaHora(e.fecha_hora_entrada);
    const [hora, dentro] = salida.children;
    hora.textContent = e.fecha_hora_salida ? formatearFechaHora(e.fecha_hora_salida) : '';
    dentro.classList.toggle('hidden', Boolean(e.fecha_hora_salida));
    duracion.firstElementChild.textContent = e.tiempo;
    celda.firstElementChild.textContent = `${e.celda.codigo} · ${e.celda.piso}`;
    puertas.textContent = [e.puerta_entrada, e.puerta_salida].filter(Boolean).join(' → ') || '—';
    notas.textContent = observaciones(e);
    const enlace = ticket.firstElementChild;
    enlace.href = urlTicketPdf(e.id);
    enlace.setAttribute('aria-label', `Ticket ${e.codigo_ticket} en PDF`);
  },
  onPagina: (pagina) => {
    filtros.pagina = pagina;
    recargar();
  },
});

async function recargar() {
  tabla.cargando(true);
  try {
    const { data, meta } = await historialEstadias(filtros);
    tabla.pintar(data, { meta });
  } catch (error) {
    mostrarAviso(error.message, 'error');
  } finally {
    tabla.cargando(false);
  }
}

function aplicar(clave, valor) {
  filtros[clave] = valor;
  filtros.pagina = 1;
  recargar();
}

/** CSV con todos los registros del filtro (página a página, 100 por petición). */
async function exportarCsv(boton) {
  botonCargando(boton, true, 'Exportando…');
  try {
    const filas = [];
    for (let pagina = 1; ; pagina++) {
      const { data, meta } = await historialEstadias({ ...filtros, pagina, limite: 100 });
      filas.push(...data);
      if (pagina >= meta.total_paginas) break;
    }
    descargarCsv(
      [
        'Ticket',
        'Placa',
        'Tipo',
        'Ingreso',
        'Salida',
        'Minutos',
        'Duración',
        'Celda',
        'Piso',
        'Puerta entrada',
        'Puerta salida',
        'Observaciones',
        'Llaves',
      ],
      filas.map((e) => [
        e.codigo_ticket,
        e.vehiculo.placa,
        e.vehiculo.tipo,
        formatearFechaHora(e.fecha_hora_entrada),
        e.fecha_hora_salida ? formatearFechaHora(e.fecha_hora_salida) : '',
        e.minutos,
        e.tiempo,
        e.celda.codigo,
        e.celda.piso,
        e.puerta_entrada,
        e.puerta_salida ?? '',
        e.observaciones_entrada ?? '',
        e.deja_llaves ? 'Sí' : 'No',
      ]),
      `parko-movimientos-${new Date().toISOString().slice(0, 10)}.csv`
    );
    mostrarAviso(`CSV exportado con ${filas.length} movimientos.`, 'success');
  } catch (error) {
    mostrarAviso(error.message, 'error');
  } finally {
    botonCargando(boton, false);
  }
}

async function iniciar() {
  const app = await montarMarco({ paginaId: 'historial' });
  if (!app) return;
  llenarSelect($('filtro-puerta'), {
    opciones: [
      { value: '', label: 'Todas' },
      ...(app.sede?.puertas ?? []).map((p) => ({ value: String(p.id), label: p.nombre })),
    ],
  });
  conectarBusqueda($('filtro-placa'), (valor) => aplicar('placa', valor), {
    transform: normalizarPlaca,
  });
  $('filtro-desde').addEventListener('change', (e) => aplicar('desde', e.target.value));
  $('filtro-hasta').addEventListener('change', (e) => aplicar('hasta', e.target.value));
  $('filtro-puerta').addEventListener('change', (e) => aplicar('puerta_id', e.target.value));
  $('filtro-estado').addEventListener('change', (e) => aplicar('estado', e.target.value));
  $('accion-exportar').addEventListener('click', (e) => exportarCsv(e.currentTarget));
  await recargar();
}

iniciar();
