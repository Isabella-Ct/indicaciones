/**
 * Reservas (admin/operador) — REQ-RES-1: todas las reservas con filtros y cancelación, y
 * "Nueva reserva" para el vehículo de un cliente.
 * Las activas muestran cuánto les queda; la lista se refresca sola cada 30 s.
 */
import { el } from '../utils/dom.js';
import { montarApp } from './comun/montar-app.js';
import { confirmar } from './comun/confirmar.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createField } from '../components/molecules/field/field.js';
import { createSearchBox } from '../components/molecules/search-box/search-box.js';
import { showToast } from '../components/molecules/toast/toast.js';
import { createDataTable } from '../components/organisms/data-table/data-table.js';
import { createKpis } from '../components/organisms/kpis/kpis.js';
import { createCheck } from '../components/molecules/check/check.js';
import { createAlert } from '../components/molecules/alert/alert.js';
import { createModal, openModal, closeModal } from '../components/organisms/modal/modal.js';
import { createButton, setButtonLoading } from '../components/atoms/button/button.js';
import { createInput } from '../components/atoms/input/input.js';
import { createSelect } from '../components/atoms/select/select.js';
import { createPlate } from '../components/atoms/plate/plate.js';
import { createStatusChip } from '../components/atoms/status-chip/status-chip.js';
import { limpiarErrores, mostrarErrorApi, marcarError } from './comun/formularios.js';
import { listarReservas, cancelarReserva, crearReserva } from '../services/reservas.service.js';
import { obtenerVehiculoPorPlaca } from '../services/vehiculos.service.js';
import { listarCeldas } from '../services/celdas.service.js';
import { tienePermiso } from '../utils/sesion.js';
import { normalizarPlaca } from '../utils/placa.js';
import { formatearFechaHora, formatearHora } from '../utils/formato.js';

const ESTADOS = {
  pendiente: ['Pendiente', 'reserved'],
  confirmada: ['Activa', 'reserved'],
  cumplida: ['Cumplida', 'free'],
  cancelada: ['Cancelada', 'neutral'],
  expirada: ['Expirada', 'out'],
};
const estado = {
  filtros: { estado: '', activas: '1', placa: '', desde: '', hasta: '', pagina: 1, limite: 20 },
  resultado: { data: [], meta: null },
  cargando: false,
};
const zonas = { resumen: el('div'), tabla: el('div') };

const restante = (r) => {
  const s = Math.max(0, Math.round((new Date(r.fecha_hora_expiracion) - Date.now()) / 1000));
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
};

async function cancelar(r, origen) {
  const ok = await confirmar({
    titulo: `Cancelar la reserva de ${r.vehiculo.placa}`,
    mensaje: `${r.titular.nombre_completo} · celda ${r.celda.codigo}. La celda queda libre.`,
    textoConfirmar: 'Cancelar reserva',
    origen,
  });
  if (!ok) return;
  try {
    await cancelarReserva(r.id);
    showToast('Reserva cancelada.', 'success');
    await recargar();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ---------------------------------------------------------------- nueva reserva (personal)
/** El personal reserva para el vehículo de un cliente (el dueño la ve en su portal). */
function abrirNueva(origen) {
  let vehiculo = null;
  const placa = createInput({ name: 'placa', placeholder: 'ABC123', maxLength: 8, plate: true });
  const buscar = createButton({ label: 'Buscar', variant: 'dark', icon: 'i-in' });
  const campoPlaca = createField({ label: 'Placa del vehículo', control: placa, required: true });
  const datosVehiculo = el('p', { className: 'field-hint', attrs: { 'aria-live': 'polite' } });
  const celda = createSelect({ name: 'celda_id', placeholder: 'Busca primero el vehículo' });
  celda.disabled = true;
  const campoCelda = createField({ label: 'Celda libre', control: celda, required: true });
  let requiereAccesible = false;
  const accesible = createCheck({
    label: 'Requiere celda accesible',
    name: 'requiere_accesible',
    onChange: (marcado) => (requiereAccesible = marcado),
  });
  const alerta = createAlert();
  const guardar = createButton({ label: 'Reservar', type: 'submit', icon: 'i-check' });
  guardar.disabled = true;

  async function buscarVehiculo() {
    limpiarErrores({ placa: campoPlaca, celda_id: campoCelda }, alerta);
    vehiculo = null;
    guardar.disabled = true;
    celda.disabled = true;
    datosVehiculo.textContent = '';
    const valor = normalizarPlaca(placa.value);
    if (!valor) return marcarError(campoPlaca, 'Escribe la placa.');
    try {
      const v = await obtenerVehiculoPorPlaca(valor);
      if (!v.propietario) {
        return marcarError(
          campoPlaca,
          `${v.placa} es de un visitante: solo se reserva para clientes.`
        );
      }
      const libres = await listarCeldas({ tipo: v.tipo, estado: 'disponible' });
      vehiculo = v;
      datosVehiculo.textContent = `${v.marca} ${v.modelo} · ${v.tipo === 'moto' ? 'Moto' : 'Carro'} · ${v.propietario.nombre_completo} (${v.propietario.tipo_documento} ${v.propietario.numero_documento})`;
      celda.replaceChildren(
        ...(libres.length
          ? libres.map((c) =>
              el('option', {
                text: `${c.codigo} · ${c.piso.nombre}${c.es_accesible ? ' · accesible' : ''}`,
                attrs: { value: String(c.id) },
              })
            )
          : [el('option', { text: `No hay celdas libres de ${v.tipo}`, attrs: { value: '' } })])
      );
      celda.disabled = libres.length === 0;
      guardar.disabled = libres.length === 0;
    } catch (error) {
      marcarError(
        campoPlaca,
        error.estado === 404 ? 'No hay un vehículo con esa placa.' : error.message
      );
    }
  }
  buscar.addEventListener('click', buscarVehiculo);
  placa.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarVehiculo();
    }
  });

  const formulario = el('form', { attrs: { novalidate: true, id: 'form-reserva' } }, [
    alerta,
    campoPlaca,
    el('div', {}, [buscar]),
    datosVehiculo,
    campoCelda,
    accesible,
    el('p', {
      className: 'field-hint',
      text: 'La reserva vence sola si el vehículo no llega a tiempo; al entrar, ocupa esta celda.',
    }),
  ]);
  const modal = createModal({
    title: 'Nueva reserva',
    subtitle: 'para el vehículo de un cliente',
    size: 'sm',
    body: [formulario],
    footer: [
      createButton({ label: 'Cancelar', variant: 'ghost', onClick: () => closeModal(modal) }),
      guardar,
    ],
    onClose: () => modal.remove(),
  });
  guardar.setAttribute('form', 'form-reserva');
  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!vehiculo || !celda.value) return;
    setButtonLoading(guardar, true, 'Reservando…');
    try {
      const r = await crearReserva({
        vehiculo_id: vehiculo.id,
        celda_id: Number(celda.value),
        requiere_accesible: requiereAccesible,
      });
      closeModal(modal);
      showToast(
        `Celda ${r.celda.codigo} reservada para ${r.vehiculo.placa} hasta las ${formatearHora(r.fecha_hora_expiracion)}.`,
        'success'
      );
      await recargar();
    } catch (error) {
      setButtonLoading(guardar, false);
      mostrarErrorApi(error, { vehiculo_id: campoPlaca, celda_id: campoCelda }, alerta);
    }
  });
  openModal(modal, origen);
  placa.focus();
}

function pintar() {
  const { data, meta } = estado.resultado;
  const activas = data.filter((r) => r.activa);
  if (meta) {
    zonas.resumen.replaceChildren(
      createKpis({
        label: 'Resumen de reservas',
        items: [
          {
            label: estado.filtros.activas ? 'Reservas activas' : 'Reservas',
            value: meta.total,
            main: true,
            note: 'con los filtros aplicados',
          },
          {
            label: 'Próxima a vencer',
            value: activas.length
              ? formatearHora(activas.map((r) => r.fecha_hora_expiracion).sort()[0])
              : '—',
            note: activas.length
              ? `celda ${[...activas].sort((a, b) => a.segundos_restantes - b.segundos_restantes)[0].celda.codigo}`
              : 'Ninguna activa',
          },
        ],
      })
    );
  }
  zonas.tabla.replaceChildren(
    createDataTable({
      caption: 'Reservas',
      minWidth: 900,
      rows: data,
      loading: estado.cargando,
      empty: { title: 'Sin reservas', text: 'No hay reservas con esos filtros.' },
      columns: [
        {
          key: 'titular',
          label: 'Titular',
          render: (r) =>
            el('span', {}, [
              el('span', { text: r.titular.nombre_completo }),
              el('span', {
                className: 'cell-sub cell-nowrap',
                text: `${r.titular.tipo_documento} ${r.titular.numero_documento}`,
              }),
            ]),
        },
        {
          key: 'vehiculo',
          label: 'Vehículo',
          render: (r) => createPlate({ placa: r.vehiculo.placa }),
        },
        {
          key: 'celda',
          label: 'Celda',
          render: (r) =>
            el('span', {}, [
              el('strong', { text: r.celda.codigo }),
              el('span', { className: 'cell-sub', text: r.celda.piso }),
            ]),
        },
        {
          key: 'creada',
          label: 'Reservada',
          render: (r) =>
            el('span', {
              className: 'cell-nowrap',
              text: formatearFechaHora(r.fecha_hora_reserva),
            }),
        },
        {
          key: 'vence',
          label: 'Vence',
          render: (r) =>
            el('span', {}, [
              el('span', {
                className: 'cell-nowrap',
                text: formatearFechaHora(r.fecha_hora_expiracion),
              }),
              r.activa
                ? el('span', { className: 'cell-sub cell-nowrap', text: `quedan ${restante(r)}` })
                : null,
            ]),
        },
        {
          key: 'estado',
          label: 'Estado',
          render: (r) => {
            const [texto, variante] = ESTADOS[r.estado];
            return createStatusChip({ text: texto, variant: variante });
          },
        },
        {
          key: 'acciones',
          label: 'Acciones',
          align: 'right',
          render: (r) =>
            r.activa
              ? createButton({
                  label: 'Cancelar',
                  variant: 'dark',
                  size: 'sm',
                  onClick: (e) => cancelar(r, e.currentTarget),
                })
              : r.estadia
                ? el('span', { className: 'cell-nowrap', text: r.estadia.codigo_ticket })
                : '',
        },
      ],
      pagination: meta && {
        pagina: meta.pagina,
        totalPaginas: meta.total_paginas,
        total: meta.total,
        onChange: (pagina) => {
          estado.filtros.pagina = pagina;
          recargar();
        },
      },
    })
  );
}

async function recargar() {
  estado.cargando = true;
  pintar();
  try {
    estado.resultado = await listarReservas(estado.filtros);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    estado.cargando = false;
    pintar();
  }
}

function filtros() {
  const aplicar = (cambios) => {
    Object.assign(estado.filtros, cambios, { pagina: 1 });
    recargar();
  };
  const fecha = (clave) => {
    const input = createInput({ type: 'date' });
    input.addEventListener('change', () => aplicar({ [clave]: input.value }));
    return input;
  };
  return el('div', { className: 'filters' }, [
    createField({
      label: 'Estado',
      control: createSelect({
        value: 'activas',
        options: [
          { value: 'activas', label: 'Activas' },
          { value: '', label: 'Todas' },
          { value: 'cumplida', label: 'Cumplidas' },
          { value: 'expirada', label: 'Expiradas' },
          { value: 'cancelada', label: 'Canceladas' },
        ],
        onChange: (e) =>
          aplicar(
            e.target.value === 'activas'
              ? { activas: '1', estado: '' }
              : { activas: '', estado: e.target.value }
          ),
      }),
    }),
    createSearchBox({
      label: 'Placa',
      placeholder: 'Ej. GMR58K',
      transform: normalizarPlaca,
      onSearch: (placa) => aplicar({ placa }),
    }),
    createField({ label: 'Desde', control: fecha('desde') }),
    createField({ label: 'Hasta', control: fecha('hasta') }),
  ]);
}

async function iniciar() {
  const app = await montarApp({
    paginaId: 'reservas',
    cabecera: (sesion) => ({
      titulo: 'Reservas',
      subtitulo: 'reservas de celdas de los clientes · vencen solas si el vehículo no llega',
      acciones: tienePermiso(sesion, 'reservas.crear')
        ? [
            createButton({
              label: 'Nueva reserva',
              icon: 'i-calendar',
              onClick: (e) => abrirNueva(e.currentTarget),
            }),
          ]
        : [],
    }),
  });
  if (!app) return;
  app.main.append(
    el('div', { className: 'stack' }, [
      zonas.resumen,
      createPanel({ title: 'Reservas', children: [filtros(), zonas.tabla] }),
    ])
  );
  await recargar();
  setInterval(() => {
    if (!estado.cargando) recargar();
  }, 30 * 1000);
}

iniciar();
