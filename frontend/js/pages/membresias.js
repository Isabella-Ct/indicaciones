/**
 * Membresías / mensualidades (wireframe 07 corregido) — REQ-MEM-1: buscador de cliente →
 * su vehículo → tipo → fecha de inicio; fecha fin y valor los calcula el servidor (solo
 * lectura). Celda fija opcional. Crear y cancelar: admin; el operador consulta.
 */
import { el } from '../utils/dom.js';
import { montarApp } from './comun/montar-app.js';
import { confirmar } from './comun/confirmar.js';
import { limpiarErrores, mostrarErrorApi, marcarError } from './comun/formularios.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createField } from '../components/molecules/field/field.js';
import { createTiles } from '../components/molecules/tiles/tiles.js';
import { createAlert } from '../components/molecules/alert/alert.js';
import { createDataList } from '../components/molecules/data-list/data-list.js';
import { createSearchBox } from '../components/molecules/search-box/search-box.js';
import {
  createUserPicker,
  setUserPickerError,
} from '../components/molecules/user-picker/user-picker.js';
import { showToast } from '../components/molecules/toast/toast.js';
import { createDataTable } from '../components/organisms/data-table/data-table.js';
import { createModal, openModal, closeModal } from '../components/organisms/modal/modal.js';
import { createButton, setButtonLoading } from '../components/atoms/button/button.js';
import { createInput } from '../components/atoms/input/input.js';
import { createSelect } from '../components/atoms/select/select.js';
import { createPlate } from '../components/atoms/plate/plate.js';
import { createStatusChip } from '../components/atoms/status-chip/status-chip.js';
import {
  listarMembresias,
  cotizarMembresia,
  crearMembresia,
  cancelarMembresia,
  urlFacturaPdf,
} from '../services/facturacion.service.js';
import { buscarClientes } from '../services/usuarios.service.js';
import { listarVehiculos } from '../services/vehiculos.service.js';
import { listarCeldas } from '../services/celdas.service.js';
import { normalizarPlaca } from '../utils/placa.js';
import { formatearCOP, formatearFecha, hoyBogota, METODOS_PAGO } from '../utils/formato.js';
import { tienePermiso } from '../utils/sesion.js';

const estado = {
  sesion: null,
  filtros: { estado: 'activa', q: '', placa: '', pagina: 1, limite: 20 },
  resultado: { data: [], meta: null },
  cargando: false,
};
const contenedorTabla = el('div');
const puede = (codigo) => tienePermiso(estado.sesion, codigo);

function chipEstado(m) {
  if (m.estado === 'cancelada') return createStatusChip({ text: 'Cancelada', variant: 'out' });
  if (m.estado === 'vencida') return createStatusChip({ text: 'Vencida', variant: 'neutral' });
  if (!m.vigente) return createStatusChip({ text: 'Programada', variant: 'reserved' });
  if (m.dias_restantes !== null && m.dias_restantes <= 3)
    return createStatusChip({ text: `Vence en ${m.dias_restantes} d`, variant: 'occupied' });
  return createStatusChip({ text: 'Vigente', variant: 'free' });
}

// ---------------------------------------------------------------------------
// Nueva membresía
// ---------------------------------------------------------------------------
function abrirNueva(origen) {
  let cliente = null;
  let vehiculos = [];
  let tipo = 'mensual';
  let metodo = 'efectivo';
  let cotizacion = null;
  let celdas = null; // se cargan al elegir vehículo

  const vehiculo = createSelect({
    options: [{ value: '', label: 'Elige primero el cliente' }],
    disabled: true,
  });
  const fecha = createInput({ type: 'date', value: hoyBogota() });
  fecha.min = hoyBogota();
  const celda = createSelect({ options: [{ value: '', label: 'Sin celda fija' }], disabled: true });

  const calculo = el('div', { attrs: { 'aria-live': 'polite' } });
  const picker = createUserPicker({
    label: 'Cliente titular',
    hint: 'Busca al cliente por documento (solo clientes activos).',
    buscar: buscarClientes,
    onChange: async (usuario) => {
      cliente = usuario;
      vehiculos = [];
      vehiculo.replaceChildren(
        el('option', {
          text: usuario ? 'Cargando…' : 'Elige primero el cliente',
          attrs: { value: '' },
        })
      );
      vehiculo.disabled = true;
      await cotizar();
      if (!usuario) return;
      try {
        const { data } = await listarVehiculos({ usuario_id: usuario.id, limite: 100 });
        vehiculos = data.filter((v) => v.activo !== false);
        vehiculo.replaceChildren(
          el('option', {
            text: vehiculos.length ? 'Elige el vehículo' : 'El cliente no tiene vehículos',
            attrs: { value: '' },
          }),
          ...vehiculos.map((v) =>
            el('option', {
              text: `${v.placa} · ${v.tipo === 'moto' ? 'Moto' : 'Carro'} · ${v.marca ?? ''} ${v.modelo ?? ''}`.trim(),
              attrs: { value: String(v.id) },
            })
          )
        );
        vehiculo.disabled = vehiculos.length === 0;
        if (vehiculos.length === 1) {
          vehiculo.value = String(vehiculos[0].id);
          await alElegirVehiculo();
        }
      } catch (error) {
        setUserPickerError(picker, error.message);
      }
    },
  });
  const campos = {
    vehiculo_id: createField({ label: 'Vehículo', control: vehiculo, required: true }),
    fecha_inicio: createField({ label: 'Fecha de inicio', control: fecha, required: true }),
    celda_asignada_id: createField({
      label: 'Celda fija (opcional)',
      control: celda,
      hint: 'Queda reservada para el titular mientras la mensualidad esté vigente.',
    }),
  };
  const alerta = createAlert();

  function pintarCotizacion(mensaje) {
    calculo.replaceChildren(
      createDataList({
        items: [
          { term: 'Fecha de fin', value: cotizacion ? formatearFecha(cotizacion.fecha_fin) : '—' },
          { term: 'Valor', value: cotizacion ? formatearCOP(cotizacion.valor) : '—' },
        ],
      }),
      mensaje ? el('p', { className: 'field-hint', text: mensaje }) : null
    );
  }

  async function cotizar() {
    cotizacion = null;
    const vehiculoId = Number(vehiculo.value);
    if (!cliente || !vehiculoId || !fecha.value) {
      pintarCotizacion('Calculados por el sistema al elegir vehículo, tipo y fecha.');
      return;
    }
    try {
      cotizacion = await cotizarMembresia({
        vehiculo_id: vehiculoId,
        tipo,
        fecha_inicio: fecha.value,
      });
      pintarCotizacion(`Valor ${tipo} para ${cotizacion.tipo_vehiculo}s (configuración).`);
    } catch (error) {
      pintarCotizacion();
      calculo.append(el('p', { className: 'field-error', text: error.message }));
    }
  }

  async function alElegirVehiculo() {
    const v = vehiculos.find((x) => x.id === Number(vehiculo.value));
    celda.replaceChildren(el('option', { text: 'Sin celda fija', attrs: { value: '' } }));
    celda.disabled = !v;
    if (v) {
      try {
        celdas ??= await listarCeldas();
        celdas
          .filter((c) => c.tipo === v.tipo && c.estado === 'disponible')
          .forEach((c) =>
            celda.append(
              el('option', {
                text: `${c.codigo} · ${c.piso.nombre}${c.es_accesible ? ' · accesible' : ''}`,
                attrs: { value: String(c.id) },
              })
            )
          );
      } catch {
        /* sin celdas: se puede crear sin celda fija */
      }
    }
    await cotizar();
  }

  vehiculo.addEventListener('change', alElegirVehiculo);
  fecha.addEventListener('change', cotizar);

  const formulario = el(
    'form',
    { className: 'stack', attrs: { id: 'form-membresia', novalidate: true } },
    [
      alerta,
      picker,
      el('div', { className: 'form-grid' }, [
        campos.vehiculo_id,
        createTiles({
          name: 'tipo-membresia',
          label: 'Tipo',
          value: tipo,
          columns: 2,
          options: [
            { value: 'mensual', label: 'Mensual' },
            { value: 'anual', label: 'Anual' },
          ],
          onChange: (v) => {
            tipo = v;
            cotizar();
          },
        }),
        campos.fecha_inicio,
        campos.celda_asignada_id,
      ]),
      calculo,
      createTiles({
        name: 'metodo-membresia',
        label: 'Método de pago',
        value: metodo,
        columns: 3,
        options: Object.entries(METODOS_PAGO).map(([value, label]) => ({ value, label })),
        onChange: (v) => (metodo = v),
      }),
    ]
  );
  const guardar = createButton({ label: 'Crear y cobrar', type: 'submit', icon: 'i-check' });
  guardar.setAttribute('form', 'form-membresia');
  const modal = createModal({
    title: 'Nueva membresía',
    subtitle: 'se genera la factura de la mensualidad al crearla',
    size: 'md',
    body: [formulario],
    footer: [
      createButton({ label: 'Cancelar', variant: 'ghost', onClick: () => closeModal(modal) }),
      guardar,
    ],
    onClose: () => modal.remove(),
  });

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarErrores(campos, alerta);
    setUserPickerError(picker, '');
    let ok = true;
    if (!cliente) {
      setUserPickerError(picker, 'Elige el cliente.');
      ok = false;
    }
    if (!vehiculo.value) ok = marcarError(campos.vehiculo_id, 'Elige el vehículo.');
    if (!fecha.value || fecha.value < hoyBogota())
      ok = marcarError(campos.fecha_inicio, 'Desde hoy en adelante.');
    if (!ok) return;
    setButtonLoading(guardar, true, 'Guardando…');
    try {
      const creada = await crearMembresia({
        usuario_id: cliente.id,
        vehiculo_id: Number(vehiculo.value),
        tipo,
        fecha_inicio: fecha.value,
        celda_asignada_id: celda.value ? Number(celda.value) : null,
        metodo_pago: metodo,
      });
      showToast(
        `Membresía ${creada.tipo} de ${creada.vehiculo.placa} creada · ${creada.factura?.numero ?? ''}.`,
        'success'
      );
      closeModal(modal);
      await recargar();
    } catch (error) {
      setButtonLoading(guardar, false);
      mostrarErrorApi(error, campos, alerta);
    }
  });

  pintarCotizacion('Calculados por el sistema al elegir vehículo, tipo y fecha.');
  openModal(modal, origen);
}

async function cancelar(m, origen) {
  const ok = await confirmar({
    titulo: `Cancelar membresía de ${m.vehiculo.placa}`,
    mensaje: `${m.titular.nombre_completo} · ${m.tipo} hasta ${formatearFecha(m.fecha_fin)}.${
      m.celda ? ` La celda ${m.celda.codigo} se libera.` : ''
    } No se hace reembolso automático.`,
    textoConfirmar: 'Cancelar membresía',
    origen,
  });
  if (!ok) return;
  try {
    await cancelarMembresia(m.id);
    showToast('Membresía cancelada.', 'success');
    await recargar();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// Listado
// ---------------------------------------------------------------------------
function pintar() {
  const { data, meta } = estado.resultado;
  contenedorTabla.replaceChildren(
    createDataTable({
      caption: 'Membresías',
      minWidth: 960,
      rows: data,
      loading: estado.cargando,
      empty: { title: 'Sin membresías', text: 'No hay membresías con esos filtros.' },
      columns: [
        {
          key: 'titular',
          label: 'Titular',
          render: (m) =>
            el('span', {}, [
              el('span', { text: m.titular.nombre_completo }),
              el('span', {
                className: 'cell-sub cell-nowrap',
                text: `${m.titular.tipo_documento} ${m.titular.numero_documento}`,
              }),
            ]),
        },
        {
          key: 'vehiculo',
          label: 'Vehículo',
          render: (m) => createPlate({ placa: m.vehiculo.placa }),
        },
        { key: 'tipo', label: 'Tipo', render: (m) => (m.tipo === 'anual' ? 'Anual' : 'Mensual') },
        {
          key: 'vigencia',
          label: 'Vigencia',
          render: (m) =>
            el('span', {
              className: 'cell-nowrap',
              text: `${formatearFecha(m.fecha_inicio)} → ${formatearFecha(m.fecha_fin)}`,
            }),
        },
        { key: 'celda', label: 'Celda fija', render: (m) => m.celda?.codigo ?? '—' },
        {
          key: 'valor',
          label: 'Valor',
          align: 'right',
          render: (m) => el('span', { className: 'cell-nowrap', text: formatearCOP(m.valor) }),
        },
        { key: 'estado', label: 'Estado', render: chipEstado },
        {
          key: 'acciones',
          label: 'Acciones',
          align: 'right',
          render: (m) => {
            const botones = [];
            if (m.factura) {
              const pdf = createButton({
                label: m.factura.numero,
                variant: 'ghost',
                size: 'sm',
                icon: 'i-print',
                ariaLabel: `Factura ${m.factura.numero} en PDF`,
                href: urlFacturaPdf(m.factura.id),
              });
              pdf.setAttribute('target', '_blank');
              pdf.setAttribute('rel', 'noopener');
              botones.push(pdf);
            }
            if (puede('membresias.gestionar') && m.estado === 'activa') {
              botones.push(
                createButton({
                  label: 'Cancelar',
                  variant: 'dark',
                  size: 'sm',
                  onClick: (e) => cancelar(m, e.currentTarget),
                })
              );
            }
            return el('div', { className: 'row-actions' }, botones);
          },
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
    estado.resultado = await listarMembresias(estado.filtros);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    estado.cargando = false;
    pintar();
  }
}

function filtros() {
  const aplicar = (clave) => (valor) => {
    estado.filtros[clave] = valor;
    estado.filtros.pagina = 1;
    recargar();
  };
  return el('div', { className: 'filters' }, [
    createSearchBox({
      label: 'Titular',
      placeholder: 'Documento o nombre',
      onSearch: aplicar('q'),
    }),
    createSearchBox({
      label: 'Placa',
      placeholder: 'Ej. MNP908',
      transform: normalizarPlaca,
      onSearch: aplicar('placa'),
    }),
    createField({
      label: 'Estado',
      control: createSelect({
        value: estado.filtros.estado,
        options: [
          { value: '', label: 'Todas' },
          { value: 'activa', label: 'Activas' },
          { value: 'vencida', label: 'Vencidas' },
          { value: 'cancelada', label: 'Canceladas' },
        ],
        onChange: (e) => aplicar('estado')(e.target.value),
      }),
    }),
  ]);
}

async function iniciar() {
  const app = await montarApp({
    paginaId: 'membresias',
    cabecera: (sesion) => ({
      titulo: 'Membresías',
      subtitulo: 'mensualidades y anualidades · celda fija opcional',
      acciones: tienePermiso(sesion, 'membresias.gestionar')
        ? [
            createButton({
              label: 'Nueva membresía',
              icon: 'i-check',
              onClick: (e) => abrirNueva(e.currentTarget),
            }),
          ]
        : [],
    }),
  });
  if (!app) return;
  estado.sesion = app.sesion;
  app.main.append(createPanel({ title: 'Membresías', children: [filtros(), contenedorTabla] }));
  await recargar();
}

iniciar();
