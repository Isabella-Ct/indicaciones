/**
 * Incidencias (wireframe 06 corregido) — REQ-INCD-1: tipo, placa del vehículo afectado
 * (autocompletar), celda opcional y descripción. El código INC-AAAAMMDD-0001 y la
 * fecha/hora las pone el servidor. Tabla filtrable con detalle en modal; tipos (admin).
 */
import { el } from '../utils/dom.js';
import { montarApp } from './comun/montar-app.js';
import { confirmar } from './comun/confirmar.js';
import { limpiarErrores, mostrarErrorApi, marcarError } from './comun/formularios.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createField } from '../components/molecules/field/field.js';
import { createAlert } from '../components/molecules/alert/alert.js';
import { createDataList } from '../components/molecules/data-list/data-list.js';
import { createSearchBox } from '../components/molecules/search-box/search-box.js';
import { showToast } from '../components/molecules/toast/toast.js';
import { createDataTable } from '../components/organisms/data-table/data-table.js';
import { createModal, openModal, closeModal } from '../components/organisms/modal/modal.js';
import { createButton, setButtonLoading } from '../components/atoms/button/button.js';
import { createInput } from '../components/atoms/input/input.js';
import { createSelect } from '../components/atoms/select/select.js';
import { createTextarea } from '../components/atoms/textarea/textarea.js';
import { createPlate } from '../components/atoms/plate/plate.js';
import { createStatusChip } from '../components/atoms/status-chip/status-chip.js';
import { createLabelCaps } from '../components/atoms/label-caps/label-caps.js';
import {
  listarTiposIncidencia,
  crearTipoIncidencia,
  actualizarTipoIncidencia,
  cambiarActivoTipoIncidencia,
  listarIncidencias,
  obtenerIncidencia,
  registrarIncidencia,
} from '../services/incidencias.service.js';
import { listarVehiculos, obtenerVehiculoPorPlaca } from '../services/vehiculos.service.js';
import { listarPisos, listarCeldas } from '../services/celdas.service.js';
import { normalizarPlaca } from '../utils/placa.js';
import { formatearFechaHora } from '../utils/formato.js';
import { tienePermiso } from '../utils/sesion.js';

const estado = {
  sesion: null,
  tipos: [],
  filtros: { tipo_id: '', placa: '', desde: '', hasta: '', pagina: 1, limite: 20 },
  resultado: { data: [], meta: null },
  cargando: false,
};
const zonas = { tabla: el('div'), tipos: el('div') };
const puede = (codigo) => tienePermiso(estado.sesion, codigo);

// ---------------------------------------------------------------------------
// Detalle
// ---------------------------------------------------------------------------
async function abrirDetalle(id, origen) {
  let i;
  try {
    i = await obtenerIncidencia(id);
  } catch (error) {
    showToast(error.message, 'error');
    return;
  }
  const v = i.vehiculo;
  const modal = createModal({
    title: `Incidencia ${i.codigo}`,
    subtitle: `${i.tipo.nombre} · ${formatearFechaHora(i.fecha_hora)}`,
    size: 'sm',
    body: [
      el('div', { className: 'stack' }, [
        el('div', { className: 'vehicle-line' }, [
          createPlate({ placa: v.placa, large: true }),
          el('p', {
            text: [`${v.marca ?? ''} ${v.modelo ?? ''}`.trim(), v.color]
              .filter(Boolean)
              .join(' · '),
          }),
        ]),
        createDataList({
          items: [
            { term: 'Tipo', value: i.tipo.nombre },
            { term: 'Fecha y hora', value: formatearFechaHora(i.fecha_hora) },
            { term: 'Propietario', value: v.propietario?.nombre_completo ?? 'Visitante' },
            {
              term: 'Celda',
              value: i.celda ? `${i.celda.codigo} · ${i.celda.piso}` : 'No indicada',
            },
            { term: 'Registró', value: i.registrada_por.nombre_completo },
            { term: 'Estadía', value: i.estadia_id ? 'Vehículo dentro al registrar' : '—' },
          ],
        }),
        el('div', {}, [
          createLabelCaps({ text: 'Descripción' }),
          el('p', { className: 'text-long', text: i.descripcion }),
        ]),
      ]),
    ],
    footer: [createButton({ label: 'Cerrar', variant: 'ghost', onClick: () => closeModal(modal) })],
    onClose: () => modal.remove(),
  });
  openModal(modal, origen);
}

// ---------------------------------------------------------------------------
// Registrar
// ---------------------------------------------------------------------------
function panelRegistro(pisos, celdas) {
  const tipo = createSelect({
    placeholder: 'Elige el tipo',
    options: estado.tipos
      .filter((t) => t.activo)
      .map((t) => ({ value: String(t.id), label: t.nombre })),
  });
  const idSugerencias = 'placas-registradas';
  const sugerencias = el('datalist', { attrs: { id: idSugerencias } });
  const placa = createInput({
    plate: true,
    placeholder: 'ABC 123',
    maxLength: 8,
    autocomplete: 'off',
  });
  placa.setAttribute('list', idSugerencias);
  const vehiculo = el('div', { attrs: { 'aria-live': 'polite' } });
  const celda = createSelect({
    options: [{ value: '', label: 'Sin celda' }],
    groups: pisos.map((p) => ({
      label: p.nombre,
      options: celdas
        .filter((c) => c.piso.id === p.id)
        .map((c) => ({ value: String(c.id), label: `${c.codigo} · ${c.tipo}` })),
    })),
  });
  const descripcion = createTextarea({
    maxLength: 2000,
    rows: 5,
    placeholder: 'Qué pasó, dónde y qué daños se ven',
  });
  const campos = {
    tipo_incidencia_id: createField({ label: 'Tipo de incidencia', control: tipo, required: true }),
    placa: createField({
      label: 'Placa del vehículo afectado',
      control: placa,
      required: true,
      hint: 'Debe estar registrada. Escribe para ver sugerencias.',
    }),
    celda_id: createField({
      label: 'Celda (opcional)',
      control: celda,
      hint: 'Si el vehículo está dentro y no eliges, se usa su celda.',
    }),
    descripcion: createField({
      label: 'Descripción',
      control: descripcion,
      required: true,
      full: true,
      hint: 'La fecha, la hora y el código los pone el sistema.',
    }),
  };

  let temporizador = null;
  async function sugerir() {
    const texto = normalizarPlaca(placa.value);
    vehiculo.replaceChildren();
    if (texto.length < 2) return sugerencias.replaceChildren();
    try {
      const { data } = await listarVehiculos({ placa: texto, limite: 8 });
      sugerencias.replaceChildren(
        ...data.map((v) =>
          el('option', {
            attrs: {
              value: v.placa,
              label: `${v.marca ?? ''} ${v.modelo ?? ''} · ${v.color ?? ''}`,
            },
          })
        )
      );
      if (texto.length >= 5 && data.some((v) => v.placa === texto)) await mostrarVehiculo(texto);
    } catch {
      /* el autocompletar es una ayuda */
    }
  }
  async function mostrarVehiculo(texto) {
    try {
      const v = await obtenerVehiculoPorPlaca(texto);
      vehiculo.replaceChildren(
        el('p', {
          className: 'field-hint',
          text: `${v.marca} ${v.modelo} · ${v.color} · ${v.propietario ? `Propietario: ${v.propietario.nombre_completo} (se le notificará)` : 'Visitante, sin propietario'}`,
        })
      );
    } catch {
      vehiculo.replaceChildren();
    }
  }
  placa.addEventListener('input', () => {
    placa.value = normalizarPlaca(placa.value);
    clearTimeout(temporizador);
    temporizador = setTimeout(sugerir, 250);
  });

  const alerta = createAlert();
  const guardar = createButton({ label: 'Registrar incidencia', type: 'submit', icon: 'i-alert' });
  const formulario = el('form', { className: 'stack', attrs: { novalidate: true } }, [
    alerta,
    el('div', { className: 'form-grid' }, [
      campos.tipo_incidencia_id,
      el('div', { className: 'field' }, [campos.placa, vehiculo, sugerencias]),
      campos.celda_id,
      campos.descripcion,
    ]),
    el('div', {}, [guardar]),
  ]);
  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarErrores(campos, alerta);
    let ok = true;
    if (!tipo.value) ok = marcarError(campos.tipo_incidencia_id, 'Elige el tipo.');
    if (normalizarPlaca(placa.value).length < 5)
      ok = marcarError(campos.placa, 'Escribe la placa.');
    if (descripcion.value.trim().length < 10)
      ok = marcarError(campos.descripcion, 'Describe lo ocurrido (mínimo 10 caracteres).');
    if (!ok) return;
    setButtonLoading(guardar, true, 'Registrando…');
    try {
      const nueva = await registrarIncidencia({
        tipo_incidencia_id: Number(tipo.value),
        placa: normalizarPlaca(placa.value),
        celda_id: celda.value ? Number(celda.value) : null,
        descripcion: descripcion.value.trim(),
      });
      showToast(
        `Incidencia ${nueva.codigo} registrada${nueva.vehiculo.propietario ? ' y notificada al propietario' : ''}.`,
        'success'
      );
      formulario.reset();
      vehiculo.replaceChildren();
      estado.filtros.pagina = 1;
      await recargar();
    } catch (error) {
      mostrarErrorApi(error, campos, alerta);
    } finally {
      setButtonLoading(guardar, false);
    }
  });
  return createPanel({ title: 'Registrar incidencia', children: [formulario] });
}

// ---------------------------------------------------------------------------
// Tipos (admin)
// ---------------------------------------------------------------------------
function abrirTipo(t, origen) {
  const nombre = createInput({ maxLength: 60, value: t?.nombre ?? '' });
  const descripcion = createInput({ maxLength: 255, value: t?.descripcion ?? '' });
  const campos = {
    nombre: createField({ label: 'Nombre', control: nombre, required: true, full: true }),
    descripcion: createField({ label: 'Descripción', control: descripcion, full: true }),
  };
  const alerta = createAlert();
  const formulario = el(
    'form',
    { className: 'stack', attrs: { id: 'form-tipo', novalidate: true } },
    [alerta, campos.nombre, campos.descripcion]
  );
  const guardar = createButton({
    label: t ? 'Guardar' : 'Crear tipo',
    type: 'submit',
    icon: 'i-check',
  });
  guardar.setAttribute('form', 'form-tipo');
  const modal = createModal({
    title: t ? `Editar ${t.nombre}` : 'Nuevo tipo de incidencia',
    size: 'sm',
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
    if (nombre.value.trim().length < 3) return marcarError(campos.nombre, 'Mínimo 3 caracteres.');
    setButtonLoading(guardar, true, 'Guardando…');
    try {
      const datos = { nombre: nombre.value.trim(), descripcion: descripcion.value.trim() || null };
      if (t) await actualizarTipoIncidencia(t.id, datos);
      else await crearTipoIncidencia(datos);
      showToast(`Tipo "${datos.nombre}" guardado.`, 'success');
      closeModal(modal);
      await recargarTipos();
    } catch (error) {
      setButtonLoading(guardar, false);
      mostrarErrorApi(error, campos, alerta);
    }
  });
  openModal(modal, origen);
}

async function alternarTipo(t, origen) {
  const ok = await confirmar({
    titulo: t.activo ? 'Desactivar tipo' : 'Activar tipo',
    mensaje: t.activo
      ? `"${t.nombre}" no se podrá elegir en incidencias nuevas. Las ${t.usos} registradas no cambian.`
      : `"${t.nombre}" volverá a estar disponible.`,
    textoConfirmar: t.activo ? 'Desactivar' : 'Activar',
    origen,
  });
  if (!ok) return;
  try {
    await cambiarActivoTipoIncidencia(t.id, !t.activo);
    await recargarTipos();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function pintarTipos() {
  if (!puede('incidencias.gestionar_tipos')) return;
  zonas.tipos.replaceChildren(
    createPanel({
      title: 'Tipos de incidencia',
      actions: [
        createButton({
          label: 'Nuevo tipo',
          size: 'sm',
          onClick: (e) => abrirTipo(null, e.currentTarget),
        }),
      ],
      children: [
        createDataTable({
          caption: 'Tipos de incidencia',
          minWidth: 420,
          rows: estado.tipos,
          columns: [
            {
              key: 'nombre',
              label: 'Tipo',
              render: (t) =>
                el('span', {}, [
                  el('strong', { text: t.nombre }),
                  el('span', { className: 'cell-sub', text: t.descripcion ?? '' }),
                ]),
            },
            { key: 'usos', label: 'Usos', align: 'right', render: (t) => String(t.usos) },
            {
              key: 'estado',
              label: 'Estado',
              render: (t) =>
                createStatusChip({
                  text: t.activo ? 'Activo' : 'Inactivo',
                  variant: t.activo ? 'free' : 'neutral',
                }),
            },
            {
              key: 'acciones',
              label: 'Acciones',
              align: 'right',
              render: (t) =>
                el('div', { className: 'row-actions' }, [
                  createButton({
                    label: 'Editar',
                    variant: 'ghost',
                    size: 'sm',
                    onClick: (e) => abrirTipo(t, e.currentTarget),
                  }),
                  createButton({
                    label: t.activo ? 'Desactivar' : 'Activar',
                    variant: 'dark',
                    size: 'sm',
                    onClick: (e) => alternarTipo(t, e.currentTarget),
                  }),
                ]),
            },
          ],
        }),
      ],
    })
  );
}

async function recargarTipos() {
  estado.tipos = await listarTiposIncidencia();
  pintarTipos();
}

// ---------------------------------------------------------------------------
// Listado
// ---------------------------------------------------------------------------
function pintarTabla() {
  const { data, meta } = estado.resultado;
  zonas.tabla.replaceChildren(
    createDataTable({
      caption: 'Incidencias registradas',
      minWidth: 960,
      rows: data,
      loading: estado.cargando,
      empty: { title: 'Sin incidencias', text: 'No hay incidencias con esos filtros.' },
      columns: [
        {
          key: 'codigo',
          label: 'Código',
          render: (i) =>
            el('span', {}, [
              el('strong', { className: 'cell-nowrap', text: i.codigo }),
              el('span', {
                className: 'cell-sub cell-nowrap',
                text: formatearFechaHora(i.fecha_hora),
              }),
            ]),
        },
        {
          key: 'tipo',
          label: 'Tipo',
          render: (i) => createStatusChip({ text: i.tipo.nombre, variant: 'occupied' }),
        },
        {
          key: 'vehiculo',
          label: 'Vehículo',
          render: (i) =>
            el('span', {}, [
              createPlate({ placa: i.vehiculo.placa }),
              el('span', {
                className: 'cell-sub',
                text: i.vehiculo.propietario?.nombre_completo ?? 'Visitante',
              }),
            ]),
        },
        { key: 'celda', label: 'Celda', render: (i) => i.celda?.codigo ?? '—' },
        {
          key: 'descripcion',
          label: 'Descripción',
          render: (i) => el('span', { className: 'cell-clamp', text: i.descripcion }),
        },
        { key: 'registro', label: 'Registró', render: (i) => i.registrada_por.nombre_completo },
        {
          key: 'ver',
          label: 'Detalle',
          align: 'right',
          render: (i) =>
            createButton({
              label: 'Ver',
              variant: 'ghost',
              size: 'sm',
              icon: 'i-eye',
              ariaLabel: `Ver incidencia ${i.codigo}`,
              onClick: (e) => abrirDetalle(i.id, e.currentTarget),
            }),
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
  pintarTabla();
  try {
    estado.resultado = await listarIncidencias(estado.filtros);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    estado.cargando = false;
    pintarTabla();
  }
}

function filtros() {
  const aplicar = (clave) => (valor) => {
    estado.filtros[clave] = valor;
    estado.filtros.pagina = 1;
    recargar();
  };
  const fecha = (clave) => {
    const input = createInput({ type: 'date' });
    input.addEventListener('change', () => aplicar(clave)(input.value));
    return input;
  };
  return el('div', { className: 'filters' }, [
    createField({
      label: 'Tipo',
      control: createSelect({
        options: [
          { value: '', label: 'Todos' },
          ...estado.tipos.map((t) => ({ value: String(t.id), label: t.nombre })),
        ],
        onChange: (e) => aplicar('tipo_id')(e.target.value),
      }),
    }),
    createSearchBox({
      label: 'Placa',
      placeholder: 'Ej. MNP908',
      transform: normalizarPlaca,
      onSearch: aplicar('placa'),
    }),
    createField({ label: 'Desde', control: fecha('desde') }),
    createField({ label: 'Hasta', control: fecha('hasta') }),
  ]);
}

async function iniciar() {
  const app = await montarApp({
    paginaId: 'incidencias',
    cabecera: () => ({
      titulo: 'Incidencias',
      subtitulo: 'rayones, choques, atropellamientos y golpes dentro del parqueadero',
    }),
  });
  if (!app) return;
  estado.sesion = app.sesion;
  let pisos = [];
  let celdas = [];
  try {
    [estado.tipos, pisos, celdas] = await Promise.all([
      listarTiposIncidencia(),
      listarPisos(),
      listarCeldas(),
    ]);
  } catch (error) {
    showToast(error.message, 'error');
  }
  const superior = puede('incidencias.registrar') ? [panelRegistro(pisos, celdas)] : [];
  if (puede('incidencias.gestionar_tipos')) superior.push(zonas.tipos);
  app.main.append(
    el('div', { className: 'stack' }, [
      superior.length > 1 ? el('div', { className: 'page-grid' }, superior) : (superior[0] ?? null),
      createPanel({ title: 'Incidencias registradas', children: [filtros(), zonas.tabla] }),
    ])
  );
  pintarTipos();
  await recargar();
  // Enlace desde una notificación: /app/incidencias.html?id=N
  const id = Number(new URLSearchParams(location.search).get('id'));
  if (id) abrirDetalle(id);
}

iniciar();
