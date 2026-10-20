/**
 * Pico y placa — REQ-CAR-4: tabla de restricciones por día (admin y operador).
 * Las reglas de hoy se resaltan; la entrada se rechaza con la hora del servidor.
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
import { showToast } from '../components/molecules/toast/toast.js';
import { createDataTable } from '../components/organisms/data-table/data-table.js';
import { createModal, openModal, closeModal } from '../components/organisms/modal/modal.js';
import { createButton, setButtonLoading } from '../components/atoms/button/button.js';
import { createInput } from '../components/atoms/input/input.js';
import { createSelect } from '../components/atoms/select/select.js';
import { createStatusChip } from '../components/atoms/status-chip/status-chip.js';
import { createIcon } from '../components/atoms/icon/icon.js';
import {
  listarReglas,
  reglasDeHoy,
  crearRegla,
  actualizarRegla,
  cambiarActivaRegla,
} from '../services/pico-placa.service.js';
import { tienePermiso } from '../utils/sesion.js';

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const estado = {
  sesion: null,
  reglas: [],
  hoy: null,
  filtros: { tipo_vehiculo: '', dia_semana: '' },
};
const contenedorHoy = el('div');
const contenedorTabla = el('div');
const puede = (codigo) => tienePermiso(estado.sesion, codigo);

function resumenHoy() {
  const { hoy } = estado;
  if (!hoy) return;
  const digitos = (tipo) =>
    hoy.reglas
      .filter((r) => r.tipo_vehiculo === tipo)
      .map((r) => `${r.digito} (${r.hora_inicio}–${r.hora_fin})`)
      .join(' · ') || 'Sin restricción';
  contenedorHoy.replaceChildren(
    createPanel({
      title: `Hoy, ${hoy.dia_nombre}`,
      children: [
        createDataList({
          items: [
            { term: 'Carros · último dígito', value: digitos('carro') },
            { term: 'Motos · primer dígito', value: digitos('moto') },
          ],
        }),
      ],
    })
  );
}

function abrirFormulario(regla, origen) {
  const editando = Boolean(regla);
  let tipo = regla?.tipo_vehiculo ?? 'carro';
  const control = {
    dia_semana: createSelect({
      options: DIAS.slice(1).map((d, i) => ({ value: String(i + 1), label: d })),
      value: String(regla?.dia_semana ?? 1),
    }),
    digito: createSelect({
      options: Array.from({ length: 10 }, (_, i) => ({ value: String(i), label: String(i) })),
      value: String(regla?.digito ?? 0),
    }),
    hora_inicio: createInput({ type: 'time', value: regla?.hora_inicio ?? '05:00' }),
    hora_fin: createInput({ type: 'time', value: regla?.hora_fin ?? '20:00' }),
  };
  const campos = {
    dia_semana: createField({ label: 'Día', control: control.dia_semana, required: true }),
    digito: createField({
      label: 'Dígito',
      control: control.digito,
      required: true,
      hint: 'Carros: último dígito. Motos: primer dígito.',
    }),
    hora_inicio: createField({ label: 'Desde', control: control.hora_inicio, required: true }),
    hora_fin: createField({ label: 'Hasta', control: control.hora_fin, required: true }),
  };
  const alerta = createAlert();
  const formulario = el(
    'form',
    { className: 'stack', attrs: { id: 'form-regla', novalidate: true } },
    [
      alerta,
      createTiles({
        name: 'tipo-regla',
        label: 'Tipo de vehículo',
        value: tipo,
        columns: 2,
        options: [
          { value: 'carro', label: 'Carro', icon: 'i-car' },
          { value: 'moto', label: 'Moto', icon: 'i-moto' },
        ],
        onChange: (v) => (tipo = v),
      }),
      el('div', { className: 'form-grid' }, Object.values(campos)),
    ]
  );
  const guardar = createButton({
    label: editando ? 'Guardar cambios' : 'Crear regla',
    type: 'submit',
    icon: 'i-check',
  });
  guardar.setAttribute('form', 'form-regla');
  const modal = createModal({
    title: editando ? 'Editar regla' : 'Nueva regla de pico y placa',
    subtitle: 'la hora de fin no se incluye (ej. hasta 20:00)',
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
    if (control.hora_fin.value <= control.hora_inicio.value) {
      marcarError(campos.hora_fin, 'Debe ser posterior a la hora de inicio.');
      return;
    }
    const datos = {
      tipo_vehiculo: tipo,
      dia_semana: Number(control.dia_semana.value),
      digito: Number(control.digito.value),
      hora_inicio: control.hora_inicio.value,
      hora_fin: control.hora_fin.value,
    };
    setButtonLoading(guardar, true, 'Guardando…');
    try {
      const guardada = editando ? await actualizarRegla(regla.id, datos) : await crearRegla(datos);
      showToast(
        `Regla ${editando ? 'actualizada' : 'creada'}: ${guardada.descripcion}.`,
        'success'
      );
      closeModal(modal);
      await recargar();
    } catch (error) {
      setButtonLoading(guardar, false);
      mostrarErrorApi(error, campos, alerta);
    }
  });
  openModal(modal, origen);
}

async function alternar(regla, origen) {
  const ok = await confirmar({
    titulo: regla.activa ? 'Desactivar regla' : 'Activar regla',
    mensaje: `${DIAS[regla.dia_semana]}: ${regla.descripcion}.`,
    textoConfirmar: regla.activa ? 'Desactivar' : 'Activar',
    origen,
  });
  if (!ok) return;
  try {
    await cambiarActivaRegla(regla.id, !regla.activa);
    showToast(`Regla ${regla.activa ? 'desactivada' : 'activada'}.`, 'success');
    await recargar();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function pintarTabla() {
  const hoy = estado.hoy?.dia_semana;
  contenedorTabla.replaceChildren(
    createDataTable({
      caption: 'Reglas de pico y placa',
      minWidth: 640,
      rows: estado.reglas,
      rowClass: (r) => (r.dia_semana === hoy && r.activa ? 'is-highlighted' : ''),
      empty: { title: 'Sin reglas', text: 'No hay reglas con esos filtros.' },
      columns: [
        {
          key: 'dia',
          label: 'Día',
          render: (r) =>
            r.dia_semana === hoy ? `${DIAS[r.dia_semana]} · hoy` : DIAS[r.dia_semana],
        },
        {
          key: 'tipo',
          label: 'Tipo',
          render: (r) =>
            el('span', { className: 'cell-person' }, [
              createIcon({ name: r.tipo_vehiculo === 'moto' ? 'i-moto' : 'i-car' }),
              r.tipo_vehiculo === 'moto' ? 'Moto · primer dígito' : 'Carro · último dígito',
            ]),
        },
        {
          key: 'digito',
          label: 'Dígito',
          render: (r) => el('strong', { className: 'cell-digit', text: String(r.digito) }),
        },
        { key: 'horario', label: 'Horario', render: (r) => `${r.hora_inicio}–${r.hora_fin}` },
        {
          key: 'estado',
          label: 'Estado',
          render: (r) =>
            createStatusChip({
              text: r.activa ? 'Activa' : 'Inactiva',
              variant: r.activa ? 'free' : 'neutral',
            }),
        },
        {
          key: 'acciones',
          label: 'Acciones',
          align: 'right',
          render: (r) =>
            puede('pico_placa.gestionar')
              ? el('div', { className: 'row-actions' }, [
                  createButton({
                    label: 'Editar',
                    variant: 'ghost',
                    size: 'sm',
                    onClick: (e) => abrirFormulario(r, e.currentTarget),
                  }),
                  createButton({
                    label: r.activa ? 'Desactivar' : 'Activar',
                    variant: 'dark',
                    size: 'sm',
                    onClick: (e) => alternar(r, e.currentTarget),
                  }),
                ])
              : '',
        },
      ],
    })
  );
}

async function recargar() {
  try {
    const filtros = Object.fromEntries(Object.entries(estado.filtros).filter(([, v]) => v));
    [estado.reglas, estado.hoy] = await Promise.all([listarReglas(filtros), reglasDeHoy()]);
    resumenHoy();
    pintarTabla();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function filtros() {
  const cambiar = (clave) => (e) => {
    estado.filtros[clave] = e.target.value;
    recargar();
  };
  return el('div', { className: 'filters' }, [
    createField({
      label: 'Tipo',
      control: createSelect({
        options: [
          { value: '', label: 'Todos' },
          { value: 'carro', label: 'Carros' },
          { value: 'moto', label: 'Motos' },
        ],
        onChange: cambiar('tipo_vehiculo'),
      }),
    }),
    createField({
      label: 'Día',
      control: createSelect({
        options: [
          { value: '', label: 'Todos' },
          ...DIAS.slice(1).map((d, i) => ({ value: String(i + 1), label: d })),
        ],
        onChange: cambiar('dia_semana'),
      }),
    }),
  ]);
}

async function iniciar() {
  const app = await montarApp({
    paginaId: 'pico-placa',
    cabecera: (sesion) => ({
      titulo: 'Pico y placa',
      subtitulo: 'restricciones de Medellín por día · se aplican al registrar la entrada',
      acciones: tienePermiso(sesion, 'pico_placa.gestionar')
        ? [
            createButton({
              label: 'Nueva regla',
              icon: 'i-alert',
              onClick: (e) => abrirFormulario(null, e.currentTarget),
            }),
          ]
        : [],
    }),
  });
  if (!app) return;
  estado.sesion = app.sesion;
  app.main.append(
    el('div', { className: 'stack' }, [
      contenedorHoy,
      createPanel({ title: 'Reglas', children: [filtros(), contenedorTabla] }),
    ])
  );
  await recargar();
}

iniciar();
