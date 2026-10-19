/**
 * Vehículos — REQ-CAR-1 (crear: admin/operador), REQ-CAR-2 (editar: admin),
 * REQ-USR-6 (asignar propietario a un vehículo sin dueño: admin/operador),
 * REQ-CAR-3 (cambiar propietario: admin). Wireframe 02 corregido.
 */
import { el } from '../utils/dom.js';
import { montarApp } from './comun/montar-app.js';
import { limpiarErrores, mostrarErrorApi, marcarError } from './comun/formularios.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createField } from '../components/molecules/field/field.js';
import { createTiles } from '../components/molecules/tiles/tiles.js';
import { createCheck } from '../components/molecules/check/check.js';
import { createAlert } from '../components/molecules/alert/alert.js';
import { createSearchBox } from '../components/molecules/search-box/search-box.js';
import {
  createUserPicker,
  setUserPickerError,
} from '../components/molecules/user-picker/user-picker.js';
import { createDataList } from '../components/molecules/data-list/data-list.js';
import { showToast } from '../components/molecules/toast/toast.js';
import { createDataTable } from '../components/organisms/data-table/data-table.js';
import { createModal, openModal, closeModal } from '../components/organisms/modal/modal.js';
import { createButton, setButtonLoading } from '../components/atoms/button/button.js';
import { createInput } from '../components/atoms/input/input.js';
import { createSelect } from '../components/atoms/select/select.js';
import { createTextarea } from '../components/atoms/textarea/textarea.js';
import { createPlate } from '../components/atoms/plate/plate.js';
import { createIcon } from '../components/atoms/icon/icon.js';
import { createStatusChip } from '../components/atoms/status-chip/status-chip.js';
import {
  listarVehiculos,
  crearVehiculo,
  actualizarVehiculo,
  cambiarPropietario,
  historialPropietarios,
} from '../services/vehiculos.service.js';
import { buscarClientes } from '../services/usuarios.service.js';
import { normalizarPlaca, esPlacaValida } from '../utils/placa.js';
import { formatearFechaHora } from '../utils/formato.js';
import { tienePermiso } from '../utils/sesion.js';

const estado = {
  sesion: null,
  filtros: {
    placa: '',
    tipo: '',
    propietario: '',
    q: '',
    pagina: 1,
    limite: 20,
    orden: 'placa',
    dir: 'asc',
  },
  resultado: { data: [], meta: null },
  cargando: false,
  enfocarOrden: false,
};

const puede = (codigo) => tienePermiso(estado.sesion, codigo);
const TIPOS = [
  { value: 'carro', label: 'Carro', icon: 'i-car' },
  { value: 'moto', label: 'Moto', icon: 'i-moto' },
];
const MENSAJE_PLACA = {
  carro: 'Carro: 3 letras y 3 números (ej. ABC123).',
  moto: 'Moto: 3 letras, 2 números y una letra opcional (ej. ABC12D).',
};
const describirPersona = (p) => `${p.nombre_completo} · ${p.tipo_documento} ${p.numero_documento}`;

function modalBase({ titulo, subtitulo, formulario, idFormulario, textoGuardar }) {
  const guardar = createButton({ label: textoGuardar, type: 'submit', icon: 'i-check' });
  guardar.setAttribute('form', idFormulario);
  const modal = createModal({
    title: titulo,
    subtitle: subtitulo,
    body: [formulario],
    footer: [
      createButton({ label: 'Cancelar', variant: 'ghost', onClick: () => closeModal(modal) }),
      guardar,
    ],
    onClose: () => modal.remove(),
  });
  return { modal, guardar };
}

// ---------------------------------------------------------------------------
// Registrar (admin/operador) y editar (admin)
// ---------------------------------------------------------------------------
function abrirFormulario(vehiculo, origen) {
  const editando = Boolean(vehiculo);
  let tipo = vehiculo?.tipo ?? 'carro';

  const placa = createInput({
    name: 'placa',
    plate: true,
    placeholder: 'ABC 123',
    maxLength: 8,
    value: vehiculo?.placa,
    onInput: (e) => (e.target.value = normalizarPlaca(e.target.value)),
  });
  const marca = createInput({
    name: 'marca',
    maxLength: 40,
    value: vehiculo?.marca,
    placeholder: 'Ej. Mazda',
  });
  const modelo = createInput({
    name: 'modelo',
    maxLength: 40,
    value: vehiculo?.modelo,
    placeholder: 'Ej. CX-30',
  });
  const color = createInput({
    name: 'color',
    maxLength: 30,
    value: vehiculo?.color,
    placeholder: 'Ej. Gris',
  });
  const campos = {
    placa: createField({
      label: 'Placa',
      control: placa,
      required: true,
      full: true,
      hint: MENSAJE_PLACA[tipo],
    }),
    tipo: createTiles({
      name: 'tipo',
      label: 'Tipo de vehículo',
      options: TIPOS,
      value: tipo,
      onChange: (v) => {
        tipo = v;
        campos.placa.querySelector('.field-hint').textContent = MENSAJE_PLACA[v];
      },
    }),
    marca: createField({ label: 'Marca', control: marca, required: true }),
    modelo: createField({ label: 'Modelo', control: modelo, required: true }),
    color: createField({ label: 'Color', control: color, required: true }),
  };
  let activo = null;
  if (editando) {
    activo = createCheck({ label: 'Vehículo activo', name: 'activo', checked: vehiculo.activo });
    campos.activo = el('div', { className: 'field field--full' }, [activo]);
  } else {
    campos.usuario_id = createUserPicker({
      label: 'Propietario (opcional)',
      hint: 'Busca al cliente por documento. Déjalo vacío si es el vehículo de un visitante.',
      buscar: buscarClientes,
    });
  }

  const alerta = createAlert();
  const formulario = el('form', { attrs: { novalidate: true, id: 'form-vehiculo' } }, [
    alerta,
    el('div', { className: 'form-grid' }, Object.values(campos)),
  ]);
  const { modal, guardar } = modalBase({
    titulo: editando ? 'Editar vehículo' : 'Registrar vehículo',
    subtitulo: editando
      ? `placa ${vehiculo.placa}`
      : 'placa, tipo, marca, modelo, color y propietario',
    formulario,
    idFormulario: 'form-vehiculo',
    textoGuardar: editando ? 'Guardar cambios' : 'Registrar vehículo',
  });

  function validar() {
    let ok = true;
    if (!placa.value) ok = marcarError(campos.placa, 'La placa es obligatoria.');
    else if (!esPlacaValida(placa.value, tipo)) ok = marcarError(campos.placa, MENSAJE_PLACA[tipo]);
    for (const [nombre, control] of Object.entries({ marca, modelo, color })) {
      if (!control.value.trim()) ok = marcarError(campos[nombre], 'Este campo es obligatorio.');
    }
    return ok;
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limpiarErrores(campos, alerta);
    if (campos.usuario_id) setUserPickerError(campos.usuario_id, '');
    if (!validar()) {
      formulario.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    const datos = {
      placa: placa.value,
      tipo,
      marca: marca.value.trim(),
      modelo: modelo.value.trim(),
      color: color.value.trim(),
    };
    setButtonLoading(guardar, true, 'Guardando…');
    try {
      if (editando) {
        await actualizarVehiculo(vehiculo.id, {
          ...datos,
          activo: activo.querySelector('input').checked,
        });
        showToast(`Vehículo ${datos.placa} actualizado.`, 'success');
      } else {
        const propietario = formulario.querySelector('input[name="usuario_id"]').value;
        await crearVehiculo({ ...datos, usuario_id: propietario ? Number(propietario) : null });
        showToast(`Vehículo ${datos.placa} registrado.`, 'success');
      }
      closeModal(modal);
      await recargar();
    } catch (error) {
      setButtonLoading(guardar, false);
      if (campos.usuario_id) {
        const detalle = error.detalles?.find((d) => d.campo === 'usuario_id');
        if (detalle) setUserPickerError(campos.usuario_id, detalle.mensaje);
      }
      mostrarErrorApi(error, campos, alerta);
    }
  });

  openModal(modal, origen);
}

// ---------------------------------------------------------------------------
// Asignar (sin dueño: admin/operador) o cambiar propietario (con dueño: admin)
// ---------------------------------------------------------------------------
function abrirPropietario(vehiculo, origen) {
  const tieneDueno = Boolean(vehiculo.propietario);
  const picker = createUserPicker({
    label: tieneDueno ? 'Nuevo propietario' : 'Propietario',
    buscar: buscarClientes,
  });
  const motivo = createTextarea({
    name: 'motivo',
    maxLength: 255,
    placeholder: 'Ej. venta del vehículo',
  });
  const campos = {
    usuario_id: picker,
    motivo: createField({ label: 'Motivo (opcional)', control: motivo, full: true }),
  };
  const alerta = createAlert();

  const formulario = el('form', { attrs: { novalidate: true, id: 'form-propietario' } }, [
    alerta,
    el('div', { className: 'form-grid' }, [
      el('div', { className: 'field field--full' }, [
        createDataList({
          items: [
            { term: 'Vehículo', value: createPlate({ placa: vehiculo.placa }) },
            {
              term: 'Propietario actual',
              value: tieneDueno ? describirPersona(vehiculo.propietario) : 'Sin propietario',
            },
          ],
        }),
      ]),
      picker,
      campos.motivo,
    ]),
  ]);
  const { modal, guardar } = modalBase({
    titulo: tieneDueno ? 'Cambiar propietario' : 'Asignar propietario',
    subtitulo: tieneDueno
      ? 'el cambio queda en el historial del vehículo'
      : 'solo clientes activos',
    formulario,
    idFormulario: 'form-propietario',
    textoGuardar: tieneDueno ? 'Cambiar propietario' : 'Asignar',
  });

  async function enviar(usuarioId, boton) {
    limpiarErrores(campos, alerta);
    setButtonLoading(boton, true, 'Guardando…');
    try {
      const actualizado = await cambiarPropietario(vehiculo.id, {
        usuario_id: usuarioId,
        motivo: motivo.value,
      });
      showToast(
        actualizado.propietario
          ? `${vehiculo.placa} ahora pertenece a ${actualizado.propietario.nombre_completo}.`
          : `${vehiculo.placa} quedó sin propietario.`,
        'success'
      );
      closeModal(modal);
      await recargar();
    } catch (error) {
      setButtonLoading(boton, false);
      mostrarErrorApi(error, campos, alerta);
    }
  }

  // El administrador también puede dejar el vehículo sin propietario.
  if (tieneDueno && puede('vehiculos.reasignar')) {
    const quitar = createButton({
      label: 'Dejar sin propietario',
      variant: 'dark',
      onClick: () => enviar(null, quitar),
    });
    guardar.before(quitar);
  }

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const id = formulario.querySelector('input[name="usuario_id"]').value;
    if (!id) {
      setUserPickerError(picker, 'Busca y elige un cliente.');
      picker.querySelector('input:not([type="hidden"])')?.focus();
      return;
    }
    enviar(Number(id), guardar);
  });

  openModal(modal, origen);
}

// ---------------------------------------------------------------------------
// Historial de propietarios
// ---------------------------------------------------------------------------
async function abrirHistorial(vehiculo, origen) {
  const cuerpo = el('div', {}, [el('p', { text: 'Cargando…' })]);
  const modal = createModal({
    title: 'Historial de propietarios',
    subtitle: `placa ${vehiculo.placa}`,
    body: [cuerpo],
    footer: [createButton({ label: 'Cerrar', variant: 'ghost', onClick: () => closeModal(modal) })],
    onClose: () => modal.remove(),
  });
  openModal(modal, origen);
  try {
    const filas = await historialPropietarios(vehiculo.id);
    cuerpo.replaceChildren(
      createDataTable({
        caption: `Historial de propietarios de ${vehiculo.placa}`,
        minWidth: 640,
        rows: filas,
        empty: {
          title: 'Sin cambios',
          text: 'Este vehículo nunca ha tenido propietario registrado.',
        },
        columns: [
          { key: 'fecha', label: 'Fecha', render: (h) => formatearFechaHora(h.fecha) },
          {
            key: 'anterior',
            label: 'De',
            render: (h) => (h.anterior ? h.anterior.nombre_completo : 'Sin propietario'),
          },
          {
            key: 'nuevo',
            label: 'A',
            render: (h) => (h.nuevo ? h.nuevo.nombre_completo : 'Sin propietario'),
          },
          { key: 'cambiado_por', label: 'Registró' },
          { key: 'motivo', label: 'Motivo' },
        ],
      })
    );
  } catch (error) {
    cuerpo.replaceChildren(el('p', { text: error.message }));
  }
}

// ---------------------------------------------------------------------------
// Listado
// ---------------------------------------------------------------------------
const contenedorTabla = el('div');

function columnas() {
  return [
    {
      key: 'placa',
      label: 'Placa',
      sortable: true,
      render: (v) => createPlate({ placa: v.placa }),
    },
    {
      key: 'tipo',
      label: 'Tipo',
      sortable: true,
      render: (v) =>
        el('span', { className: 'cell-person' }, [
          createIcon({ name: v.tipo === 'moto' ? 'i-moto' : 'i-car' }),
          v.tipo === 'moto' ? 'Moto' : 'Carro',
        ]),
    },
    {
      key: 'marca',
      label: 'Marca y modelo',
      sortable: true,
      render: (v) => `${v.marca ?? ''} ${v.modelo ?? ''}`.trim(),
    },
    { key: 'color', label: 'Color' },
    {
      key: 'propietario',
      label: 'Propietario',
      sortable: true,
      render: (v) =>
        v.propietario
          ? el('span', {}, [
              v.propietario.nombre_completo,
              el('span', {
                className: 'cell-sub',
                text: `${v.propietario.tipo_documento} ${v.propietario.numero_documento}`,
              }),
            ])
          : el('span', { className: 'cell-muted', text: 'Sin propietario' }),
    },
    {
      key: 'activo',
      label: 'Estado',
      render: (v) =>
        createStatusChip({
          text: v.activo ? 'Activo' : 'Inactivo',
          variant: v.activo ? 'free' : 'neutral',
        }),
    },
    {
      key: 'acciones',
      label: 'Acciones',
      align: 'right',
      render: (v) => {
        const acciones = [];
        if (puede('vehiculos.editar')) {
          acciones.push(
            createButton({
              label: 'Editar',
              variant: 'ghost',
              size: 'sm',
              ariaLabel: `Editar ${v.placa}`,
              onClick: (e) => abrirFormulario(v, e.currentTarget),
            })
          );
        }
        if (!v.propietario && puede('vehiculos.crear')) {
          acciones.push(
            createButton({
              label: 'Asignar dueño',
              variant: 'dark',
              size: 'sm',
              ariaLabel: `Asignar propietario a ${v.placa}`,
              onClick: (e) => abrirPropietario(v, e.currentTarget),
            })
          );
        } else if (v.propietario && puede('vehiculos.reasignar')) {
          acciones.push(
            createButton({
              label: 'Cambiar dueño',
              variant: 'dark',
              size: 'sm',
              ariaLabel: `Cambiar propietario de ${v.placa}`,
              onClick: (e) => abrirPropietario(v, e.currentTarget),
            })
          );
        }
        acciones.push(
          createButton({
            label: 'Historial',
            variant: 'ghost',
            size: 'sm',
            ariaLabel: `Historial de ${v.placa}`,
            onClick: (e) => abrirHistorial(v, e.currentTarget),
          })
        );
        return el('div', { className: 'row-actions' }, acciones);
      },
    },
  ];
}

function pintarTabla() {
  const { data, meta } = estado.resultado;
  const tabla = createDataTable({
    caption: 'Vehículos registrados',
    columns: columnas(),
    rows: data,
    loading: estado.cargando,
    minWidth: 960,
    sort: { key: estado.filtros.orden, dir: estado.filtros.dir },
    onSort: (key) => {
      const f = estado.filtros;
      f.dir = f.orden === key && f.dir === 'asc' ? 'desc' : 'asc';
      f.orden = key;
      f.pagina = 1;
      estado.enfocarOrden = true;
      recargar();
    },
    empty: { title: 'Sin vehículos', text: 'Ningún vehículo coincide con los filtros.' },
    pagination: meta && {
      pagina: meta.pagina,
      totalPaginas: meta.total_paginas,
      total: meta.total,
      onChange: (pagina) => {
        estado.filtros.pagina = pagina;
        recargar();
      },
    },
  });
  contenedorTabla.replaceChildren(tabla);
  if (estado.enfocarOrden) {
    tabla
      .querySelector('th[aria-sort="ascending"] button, th[aria-sort="descending"] button')
      ?.focus();
    estado.enfocarOrden = false;
  }
}

async function recargar() {
  estado.cargando = true;
  pintarTabla();
  try {
    estado.resultado = await listarVehiculos(estado.filtros);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    estado.cargando = false;
    pintarTabla();
  }
}

function filtros() {
  const buscarPor = (clave) => (texto) => {
    estado.filtros[clave] = texto;
    estado.filtros.pagina = 1;
    recargar();
  };
  const cambiar = (clave) => (e) => buscarPor(clave)(e.target.value);
  return el('div', { className: 'filters' }, [
    createSearchBox({
      label: 'Placa',
      placeholder: 'Ej. MNP908',
      transform: normalizarPlaca,
      onSearch: buscarPor('placa'),
    }),
    createField({
      label: 'Tipo',
      control: createSelect({
        options: [
          { value: '', label: 'Todos' },
          ...TIPOS.map(({ value, label }) => ({ value, label })),
        ],
        onChange: cambiar('tipo'),
      }),
    }),
    createField({
      label: 'Propietario',
      control: createSelect({
        options: [
          { value: '', label: 'Todos' },
          { value: 'con', label: 'Con propietario' },
          { value: 'sin', label: 'Sin propietario (visitantes)' },
        ],
        onChange: cambiar('propietario'),
      }),
    }),
    createSearchBox({
      label: 'Cliente',
      placeholder: 'Documento o nombre',
      onSearch: buscarPor('q'),
    }),
  ]);
}

async function iniciar() {
  const app = await montarApp({
    paginaId: 'vehiculos',
    cabecera: (sesion) => ({
      titulo: 'Vehículos',
      subtitulo: 'registro de vehículos y de sus propietarios',
      acciones: tienePermiso(sesion, 'vehiculos.crear')
        ? [
            createButton({
              label: 'Registrar vehículo',
              icon: 'i-car',
              onClick: (e) => abrirFormulario(null, e.currentTarget),
            }),
          ]
        : [],
    }),
  });
  if (!app) return;
  estado.sesion = app.sesion;
  app.main.append(
    createPanel({ title: 'Vehículos registrados', children: [filtros(), contenedorTabla] })
  );
  await recargar();
}

iniciar();
