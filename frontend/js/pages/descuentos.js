/**
 * Descuentos (wireframe 09 con estilo PARKO) — REQ-DES-1: descripción + porcentaje 0–100.
 * El administrador los gestiona; el operador los consulta (solo activos, los que ofrece al
 * cobrar). Se aplica uno por factura. Borrado lógico (activo).
 */
import { el } from '../utils/dom.js';
import { montarApp } from './comun/montar-app.js';
import { confirmar } from './comun/confirmar.js';
import { limpiarErrores, mostrarErrorApi, marcarError } from './comun/formularios.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createField } from '../components/molecules/field/field.js';
import { createAlert } from '../components/molecules/alert/alert.js';
import { showToast } from '../components/molecules/toast/toast.js';
import { createDataTable } from '../components/organisms/data-table/data-table.js';
import { createModal, openModal, closeModal } from '../components/organisms/modal/modal.js';
import { createButton, setButtonLoading } from '../components/atoms/button/button.js';
import { createInput } from '../components/atoms/input/input.js';
import { createTextarea } from '../components/atoms/textarea/textarea.js';
import { createStatusChip } from '../components/atoms/status-chip/status-chip.js';
import { tienePermiso } from '../utils/sesion.js';
import {
  listarDescuentos,
  crearDescuento,
  actualizarDescuento,
  cambiarActivoDescuento,
} from '../services/facturacion.service.js';

const estado = { sesion: null, descuentos: [] };
const gestiona = () => tienePermiso(estado.sesion, 'descuentos.gestionar');
const contenedorTabla = el('div');

function abrirFormulario(descuento, origen) {
  const editando = Boolean(descuento);
  const control = {
    nombre: createInput({
      maxLength: 60,
      value: descuento?.nombre ?? '',
      placeholder: 'Ej. Cliente frecuente',
    }),
    porcentaje: createInput({
      type: 'number',
      inputMode: 'decimal',
      value: descuento ? String(descuento.porcentaje) : '',
      placeholder: 'Ej. 10',
    }),
    descripcion: createTextarea({
      maxLength: 255,
      value: descuento?.descripcion ?? '',
      placeholder: 'Cuándo se aplica',
    }),
  };
  control.porcentaje.min = '0';
  control.porcentaje.max = '100';
  control.porcentaje.step = '0.01';
  const campos = {
    nombre: createField({ label: 'Nombre', control: control.nombre, required: true }),
    porcentaje: createField({
      label: 'Porcentaje',
      control: control.porcentaje,
      required: true,
      hint: 'De 0 a 100. El total se redondea a la centena.',
    }),
    descripcion: createField({ label: 'Descripción', control: control.descripcion, full: true }),
  };
  const alerta = createAlert();
  const formulario = el(
    'form',
    { className: 'stack', attrs: { id: 'form-descuento', novalidate: true } },
    [alerta, el('div', { className: 'form-grid' }, Object.values(campos))]
  );
  const guardar = createButton({
    label: editando ? 'Guardar cambios' : 'Crear descuento',
    type: 'submit',
    icon: 'i-check',
  });
  guardar.setAttribute('form', 'form-descuento');
  const modal = createModal({
    title: editando ? `Editar ${descuento.nombre}` : 'Nuevo descuento',
    subtitle: 'se aplica uno por factura al cobrar',
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
    const porcentaje = Number(control.porcentaje.value);
    let ok = true;
    if (!control.nombre.value.trim()) ok = marcarError(campos.nombre, 'Escribe el nombre.');
    if (control.porcentaje.value === '' || !(porcentaje >= 0 && porcentaje <= 100))
      ok = marcarError(campos.porcentaje, 'El porcentaje va de 0 a 100.');
    if (!ok) return;
    const datos = {
      nombre: control.nombre.value.trim(),
      porcentaje,
      descripcion: control.descripcion.value.trim() || null,
    };
    setButtonLoading(guardar, true, 'Guardando…');
    try {
      const guardado = editando
        ? await actualizarDescuento(descuento.id, datos)
        : await crearDescuento(datos);
      showToast(
        `Descuento "${guardado.nombre}" ${editando ? 'actualizado' : 'creado'}.`,
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

async function alternar(d, origen) {
  const ok = await confirmar({
    titulo: d.activo ? 'Desactivar descuento' : 'Activar descuento',
    mensaje: d.activo
      ? `"${d.nombre}" dejará de ofrecerse al cobrar. Las facturas anteriores no cambian.`
      : `"${d.nombre}" volverá a ofrecerse al cobrar.`,
    textoConfirmar: d.activo ? 'Desactivar' : 'Activar',
    origen,
  });
  if (!ok) return;
  try {
    await cambiarActivoDescuento(d.id, !d.activo);
    showToast(`Descuento ${d.activo ? 'desactivado' : 'activado'}.`, 'success');
    await recargar();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function pintar() {
  contenedorTabla.replaceChildren(
    createDataTable({
      caption: 'Descuentos',
      minWidth: 640,
      rows: estado.descuentos,
      empty: {
        title: 'Sin descuentos',
        text: gestiona() ? 'Crea el primero con "Nuevo descuento".' : 'No hay descuentos activos.',
      },
      columns: [
        { key: 'nombre', label: 'Nombre', render: (d) => el('strong', { text: d.nombre }) },
        { key: 'descripcion', label: 'Descripción', render: (d) => d.descripcion || '—' },
        {
          key: 'porcentaje',
          label: 'Porcentaje',
          align: 'right',
          render: (d) => el('strong', { className: 'cell-nowrap', text: `${d.porcentaje} %` }),
        },
        {
          key: 'estado',
          label: 'Estado',
          render: (d) =>
            createStatusChip({
              text: d.activo ? 'Activo' : 'Inactivo',
              variant: d.activo ? 'free' : 'neutral',
            }),
        },
        gestiona() && {
          key: 'acciones',
          label: 'Acciones',
          align: 'right',
          render: (d) =>
            el('div', { className: 'row-actions' }, [
              createButton({
                label: 'Editar',
                variant: 'ghost',
                size: 'sm',
                onClick: (e) => abrirFormulario(d, e.currentTarget),
              }),
              createButton({
                label: d.activo ? 'Desactivar' : 'Activar',
                variant: 'dark',
                size: 'sm',
                onClick: (e) => alternar(d, e.currentTarget),
              }),
            ]),
        },
      ].filter(Boolean),
    })
  );
}

async function recargar() {
  try {
    estado.descuentos = await listarDescuentos();
    pintar();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function iniciar() {
  const app = await montarApp({
    paginaId: 'descuentos',
    cabecera: (sesion) => ({
      titulo: 'Descuentos',
      subtitulo: tienePermiso(sesion, 'descuentos.gestionar')
        ? 'porcentaje sobre el valor del parqueo · uno por factura'
        : 'descuentos activos que puedes aplicar al cobrar · solo consulta',
      acciones: tienePermiso(sesion, 'descuentos.gestionar')
        ? [
            createButton({
              label: 'Nuevo descuento',
              icon: 'i-check',
              onClick: (e) => abrirFormulario(null, e.currentTarget),
            }),
          ]
        : [],
    }),
  });
  if (!app) return;
  estado.sesion = app.sesion;
  app.main.append(createPanel({ title: 'Descuentos', children: [contenedorTabla] }));
  await recargar();
}

iniciar();
