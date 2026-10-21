/**
 * Disponibilidad (portal del cliente) — REQ-CLD-02 y REQ-RES-1: mapa de celdas en solo
 * lectura y en vivo (sin placas ajenas). Al tocar una celda libre del tipo de alguno de
 * sus vehículos aparece "Reservar"; sus reservas y su celda fija se resaltan (is-selected).
 */
import { el } from '../utils/dom.js';
import { montarApp } from './comun/montar-app.js';
import { createParkingMap } from '../components/organisms/parking-map/parking-map.js';
import { createSpaceDetail } from '../components/organisms/space-detail/space-detail.js';
import { createKpis } from '../components/organisms/kpis/kpis.js';
import { createModal, openModal, closeModal } from '../components/organisms/modal/modal.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createField } from '../components/molecules/field/field.js';
import { createCheck } from '../components/molecules/check/check.js';
import { createAlert, setAlert } from '../components/molecules/alert/alert.js';
import { createDataList } from '../components/molecules/data-list/data-list.js';
import { createCountdown } from '../components/molecules/countdown/countdown.js';
import { showToast } from '../components/molecules/toast/toast.js';
import {
  createLiveStatus,
  setLiveStatus,
} from '../components/molecules/live-status/live-status.js';
import { createButton, setButtonLoading } from '../components/atoms/button/button.js';
import { createSelect } from '../components/atoms/select/select.js';
import { createPlate } from '../components/atoms/plate/plate.js';
import { confirmar } from './comun/confirmar.js';
import {
  listarPisos,
  listarCeldas,
  obtenerResumen,
  suscribirCeldas,
} from '../services/celdas.service.js';
import { listarMisVehiculos } from '../services/usuarios.service.js';
import { crearReserva, cancelarReserva, misReservas } from '../services/reservas.service.js';
import { formatearHora } from '../utils/formato.js';

const CLAVE_PISO = 'parko.piso';
const estado = {
  pisos: [],
  celdas: new Map(),
  resumen: null,
  vehiculos: [],
  reservas: [], // activas
  pisoActivoId: null,
  seleccionadaId: null,
};
const zonas = {
  kpis: el('div'),
  reserva: el('div'),
  mapa: el('div'),
  detalle: el('aside', {
    className: 'detail-column',
    attrs: { 'aria-live': 'polite', 'aria-label': 'Detalle del espacio' },
  }),
};
const indicador = createLiveStatus();
const TIPO = { carro: 'carro', moto: 'moto' };

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
  zonas.kpis.replaceChildren(
    createKpis({
      label: 'Disponibilidad',
      items: [
        {
          label: 'Libres para carro',
          value: r.por_tipo.carro.disponible,
          main: true,
          meter: r.por_tipo.carro.total ? (r.por_tipo.carro.disponible / r.por_tipo.carro.total) * 100 : 0,
          note: `de ${r.por_tipo.carro.total} celdas de carro`,
        },
        {
          label: 'Libres para moto',
          value: r.por_tipo.moto.disponible,
          note: `de ${r.por_tipo.moto.total} celdas de moto`,
        },
        {
          label: 'Mis reservas activas',
          value: estado.reservas.length,
          note: estado.reservas.length ? 'Llega antes de que venza' : 'Toca una celda libre para reservar',
        },
      ],
    })
  );
}

function pintarReservas() {
  if (!estado.reservas.length) {
    zonas.reserva.replaceChildren();
    return;
  }
  zonas.reserva.replaceChildren(
    createPanel({
      title: estado.reservas.length > 1 ? 'Tus reservas' : 'Tu reserva',
      children: [
        el(
          'div',
          { className: 'reservation-list' },
          estado.reservas.map((r) =>
            el('div', { className: 'reservation' }, [
              createCountdown({
                hasta: r.fecha_hora_expiracion,
                etiqueta: `Para llegar a ${r.celda.codigo}`,
                onFin: () => setTimeout(recargarReservas, 2000),
              }),
              el('div', {}, [
                createPlate({ placa: r.vehiculo.placa, large: true }),
                createDataList({
                  items: [
                    { term: 'Celda', value: `${r.celda.codigo} · ${r.celda.piso}` },
                    { term: 'Vence a las', value: formatearHora(r.fecha_hora_expiracion) },
                  ],
                }),
              ]),
              createButton({
                label: 'Cancelar reserva',
                variant: 'dark',
                onClick: (e) => cancelar(r, e.currentTarget),
              }),
            ])
          )
        ),
        el('p', {
          className: 'field-hint',
          text: 'Al llegar, el operador lee tu placa y te asigna la celda reservada. Si no llegas a tiempo, la reserva vence y la celda se libera.',
        }),
      ],
    })
  );
}

function resaltadas() {
  return new Set([...estado.celdas.values()].filter((c) => c.propia).map((c) => c.id));
}

function pintarMapa() {
  const enfocada = document.activeElement?.closest?.('.space');
  const idEnfocado = enfocada?.getAttribute('data-id');
  zonas.mapa.replaceChildren(
    createParkingMap({
      pisos: estado.pisos,
      celdas: [...estado.celdas.values()],
      pisoActivoId: estado.pisoActivoId,
      seleccionadaId: estado.seleccionadaId,
      resaltadas: resaltadas(),
      onSelectPiso: (id, { enfocar } = {}) => {
        estado.pisoActivoId = id;
        try {
          localStorage.setItem(CLAVE_PISO, String(id));
        } catch {
          /* preferencia opcional */
        }
        pintarMapa();
        if (enfocar) zonas.mapa.querySelector('.level-tab.is-active')?.focus();
      },
      onSelectCelda: (celda) => {
        estado.seleccionadaId = celda.id;
        pintarMapa();
        pintarDetalle();
        zonas.mapa.querySelector(`.space[data-id="${celda.id}"]`)?.focus();
      },
    })
  );
  if (idEnfocado) zonas.mapa.querySelector(`.space[data-id="${idEnfocado}"]`)?.focus();
}

function nota(texto) {
  return el('p', { className: 'detail-note detail-actions-full', text: texto });
}

function acciones(celda) {
  const lista = [];
  if (celda.propia === 'reserva') {
    const r = estado.reservas.find((x) => x.celda.id === celda.id);
    lista.push(nota('Tu reserva. Llega antes de que venza.'));
    if (r) {
      const boton = createButton({
        label: 'Cancelar reserva',
        variant: 'dark',
        onClick: (e) => cancelar(r, e.currentTarget),
      });
      boton.classList.add('detail-actions-full');
      lista.push(boton);
    }
  } else if (celda.propia === 'mensualidad') {
    lista.push(nota('Tu celda fija de mensualidad: queda reservada para ti.'));
  } else if (celda.propia === 'vehiculo') {
    lista.push(nota('Aquí está parqueado tu vehículo.'));
  } else if (celda.estado === 'disponible') {
    const posibles = vehiculosPara(celda);
    if (posibles.length) {
      const boton = createButton({
        label: 'Reservar',
        icon: 'i-check',
        onClick: (e) => abrirReserva(celda, e.currentTarget),
      });
      boton.classList.add('detail-actions-full');
      lista.push(boton);
    } else {
      lista.push(
        nota(
          estado.vehiculos.some((v) => v.tipo === celda.tipo)
            ? 'Tu vehículo de este tipo ya tiene una reserva activa.'
            : `Celda de ${TIPO[celda.tipo]}: no tienes vehículos de este tipo.`
        )
      );
    }
  }
  const cerrar = createButton({
    label: 'Cerrar detalle',
    variant: 'ghost',
    onClick: () => {
      const id = estado.seleccionadaId;
      estado.seleccionadaId = null;
      pintarMapa();
      pintarDetalle();
      zonas.mapa.querySelector(`.space[data-id="${id}"]`)?.focus();
    },
  });
  cerrar.classList.add('detail-actions-full');
  lista.push(cerrar);
  return lista;
}

function pintarDetalle() {
  const celda = estado.celdas.get(estado.seleccionadaId) ?? null;
  zonas.detalle.replaceChildren(
    createSpaceDetail({ celda, verOcupantes: false, acciones: celda ? acciones(celda) : [] })
  );
}

function pintarTodo() {
  pintarKpis();
  pintarReservas();
  pintarMapa();
  pintarDetalle();
}

// ---------------------------------------------------------------------------
// Reservar y cancelar
// ---------------------------------------------------------------------------
function abrirReserva(celda, origen) {
  const posibles = vehiculosPara(celda);
  const vehiculo = createSelect({
    options: posibles.map((v) => ({
      value: String(v.id),
      label: `${v.placa} · ${v.marca ?? ''} ${v.modelo ?? ''}`.trim(),
    })),
  });
  let accesible = false;
  const alerta = createAlert();
  const confirmarBtn = createButton({ label: 'Confirmar reserva', type: 'submit', icon: 'i-check' });
  confirmarBtn.setAttribute('form', 'form-reserva');
  const formulario = el('form', { className: 'stack', attrs: { id: 'form-reserva', novalidate: true } }, [
    alerta,
    createDataList({
      items: [
        { term: 'Celda', value: `${celda.codigo} · ${celda.piso.nombre}` },
        { term: 'Tipo', value: celda.tipo === 'moto' ? 'Moto' : 'Carro' },
      ],
    }),
    createField({ label: 'Vehículo', control: vehiculo, required: true }),
    celda.es_accesible
      ? createCheck({
          label: 'Necesito celda accesible (movilidad reducida)',
          onChange: (v) => (accesible = v),
        })
      : null,
    el('p', {
      className: 'field-hint',
      text: 'La celda queda reservada por un tiempo limitado. Si tienes pico y placa en este momento no podrás reservar.',
    }),
  ]);
  const modal = createModal({
    title: `Reservar ${celda.codigo}`,
    subtitle: 'confirma el vehículo con el que vas a llegar',
    size: 'sm',
    body: [formulario],
    footer: [
      createButton({ label: 'Cancelar', variant: 'ghost', onClick: () => closeModal(modal) }),
      confirmarBtn,
    ],
    onClose: () => modal.remove(),
  });

  function exito(reserva) {
    modal.querySelector('.modal-body').replaceChildren(
      el('div', { className: 'stack' }, [
        createAlert({
          message: `Reserva confirmada: ${reserva.celda.codigo} para ${reserva.vehiculo.placa}.`,
          variant: 'success',
        }),
        createCountdown({ hasta: reserva.fecha_hora_expiracion, etiqueta: 'Tiempo para llegar' }),
        el('p', {
          text: `Llega antes de las ${formatearHora(reserva.fecha_hora_expiracion)}. En la puerta, el operador te asigna la celda ${reserva.celda.codigo}.`,
        }),
      ])
    );
    const listo = createButton({ label: 'Entendido', onClick: () => closeModal(modal) });
    modal.querySelector('.modal-foot').replaceChildren(listo);
    listo.focus();
  }

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    setAlert(alerta, '');
    setButtonLoading(confirmarBtn, true, 'Reservando…');
    try {
      const reserva = await crearReserva({
        vehiculo_id: Number(vehiculo.value),
        celda_id: celda.id,
        requiere_accesible: accesible,
      });
      showToast(`Celda ${reserva.celda.codigo} reservada.`, 'success');
      exito(reserva);
      await recargarReservas();
    } catch (error) {
      setButtonLoading(confirmarBtn, false);
      setAlert(alerta, error.message, 'error');
    }
  });
  openModal(modal, origen);
}

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
    showToast('Reserva cancelada.', 'success');
    await recargarReservas();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

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
    showToast(error.message, 'error');
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
  let guardado = null;
  try {
    guardado = Number(localStorage.getItem(CLAVE_PISO));
  } catch {
    /* sin almacenamiento */
  }
  if (!pisos.some((p) => p.id === estado.pisoActivoId)) {
    const propia = celdas.find((c) => c.propia);
    estado.pisoActivoId = propia?.piso.id ?? (pisos.some((p) => p.id === guardado) ? guardado : pisos[0]?.id);
  }
}

function conectar() {
  suscribirCeldas({
    onCelda: (celda) => {
      if (celda.activa === false) estado.celdas.delete(celda.id);
      else estado.celdas.set(celda.id, celda);
      pintarMapa();
      if (estado.seleccionadaId === celda.id) pintarDetalle();
    },
    onResumen: (resumen) => {
      estado.resumen = resumen;
      pintarKpis();
    },
    onEstado: async (nuevo, reconectado) => {
      setLiveStatus(indicador, nuevo);
      if (reconectado) {
        await cargarDatos().catch(() => {});
        pintarTodo();
      }
    },
  });
}

async function iniciar() {
  const app = await montarApp({
    paginaId: 'disponibilidad',
    cabecera: () => ({
      titulo: 'Disponibilidad',
      subtitulo: 'celdas libres en tiempo real · toca una libre para reservarla',
      acciones: [indicador],
    }),
  });
  if (!app) return;
  app.main.append(
    zonas.kpis,
    zonas.reserva,
    el('div', { className: 'workspace' }, [zonas.mapa, zonas.detalle])
  );
  try {
    await cargarDatos();
  } catch (error) {
    showToast(error.message, 'error');
    return;
  }
  pintarTodo();
  conectar();
}

iniciar();
