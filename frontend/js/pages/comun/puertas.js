/**
 * Gestionar puertas (administrador): crear, editar nombre y tipo (entrada / salida / mixta)
 * y activar o desactivar. Siempre queda al menos una activa (lo valida el servidor).
 * `onCambio` recibe las puertas activas para actualizar los selectores de la página.
 */
import { el } from '../../utils/dom.js';
import { confirmar } from './confirmar.js';
import { limpiarErrores, mostrarErrorApi, marcarError } from './formularios.js';
import { createField } from '../../components/molecules/field/field.js';
import { createAlert } from '../../components/molecules/alert/alert.js';
import { showToast } from '../../components/molecules/toast/toast.js';
import { createDataTable } from '../../components/organisms/data-table/data-table.js';
import { createModal, openModal, closeModal } from '../../components/organisms/modal/modal.js';
import { createButton, setButtonLoading } from '../../components/atoms/button/button.js';
import { createInput } from '../../components/atoms/input/input.js';
import { createSelect } from '../../components/atoms/select/select.js';
import { createStatusChip } from '../../components/atoms/status-chip/status-chip.js';
import {
  listarPuertas,
  crearPuerta,
  actualizarPuerta,
  cambiarActivaPuerta,
} from '../../services/puertas.service.js';

const TIPOS = [
  { value: 'mixta', label: 'Mixta (entrada y salida)' },
  { value: 'entrada', label: 'Solo entrada' },
  { value: 'salida', label: 'Solo salida' },
];
const etiquetaTipo = (t) => TIPOS.find((x) => x.value === t)?.label ?? t;

/** @param {{ origen?: HTMLElement, onCambio?: (activas: object[]) => void }} opciones */
export async function abrirGestionPuertas({ origen, onCambio } = {}) {
  let puertas = [];
  let editando = null;

  const nombre = createInput({ name: 'nombre', maxLength: 40, placeholder: 'Ej. Oriental' });
  const tipo = createSelect({ name: 'tipo', options: TIPOS, value: 'mixta' });
  const campos = {
    nombre: createField({ label: 'Nombre', control: nombre, required: true }),
    tipo: createField({ label: 'Tipo', control: tipo, required: true }),
  };
  const alerta = createAlert();
  const guardar = createButton({ label: 'Agregar puerta', type: 'submit', icon: 'i-check' });
  const cancelarEdicion = createButton({ label: 'Cancelar edición', variant: 'ghost' });
  cancelarEdicion.classList.add('hidden');
  const tabla = el('div');

  function modoEdicion(p) {
    editando = p;
    nombre.value = p?.nombre ?? '';
    tipo.value = p?.tipo ?? 'mixta';
    guardar.querySelector('span').textContent = p ? 'Guardar cambios' : 'Agregar puerta';
    cancelarEdicion.classList.toggle('hidden', !p);
    limpiarErrores(campos, alerta);
    nombre.focus();
  }
  cancelarEdicion.addEventListener('click', () => modoEdicion(null));

  async function recargar() {
    puertas = await listarPuertas({ todas: true });
    onCambio?.(puertas.filter((p) => p.activa));
    tabla.replaceChildren(
      createDataTable({
        caption: 'Puertas de acceso',
        minWidth: 480,
        rows: puertas,
        columns: [
          { key: 'nombre', label: 'Puerta', render: (p) => el('strong', { text: p.nombre }) },
          { key: 'tipo', label: 'Tipo', render: (p) => etiquetaTipo(p.tipo) },
          {
            key: 'activa',
            label: 'Estado',
            render: (p) =>
              createStatusChip({
                text: p.activa ? 'Activa' : 'Inactiva',
                variant: p.activa ? 'free' : 'neutral',
              }),
          },
          {
            key: 'acciones',
            label: 'Acciones',
            align: 'right',
            render: (p) =>
              el('div', { className: 'row-actions' }, [
                createButton({
                  label: 'Editar',
                  variant: 'ghost',
                  size: 'sm',
                  ariaLabel: `Editar la puerta ${p.nombre}`,
                  onClick: () => modoEdicion(p),
                }),
                createButton({
                  label: p.activa ? 'Desactivar' : 'Activar',
                  variant: 'dark',
                  size: 'sm',
                  ariaLabel: `${p.activa ? 'Desactivar' : 'Activar'} la puerta ${p.nombre}`,
                  onClick: (e) => alternar(p, e.currentTarget),
                }),
              ]),
          },
        ],
      })
    );
  }

  async function alternar(p, boton) {
    if (p.activa) {
      const ok = await confirmar({
        titulo: `Desactivar la puerta ${p.nombre}`,
        mensaje: 'Dejará de aparecer al registrar entradas y salidas. Su historial se conserva.',
        textoConfirmar: 'Desactivar',
        origen: boton,
      });
      if (!ok) return;
    }
    try {
      await cambiarActivaPuerta(p.id, !p.activa);
      showToast(`Puerta ${p.nombre} ${p.activa ? 'desactivada' : 'activada'}.`, 'success');
      await recargar();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  const formulario = el('form', { className: 'form-grid', attrs: { novalidate: true } }, [
    el('div', { className: 'field--full' }, [alerta]),
    campos.nombre,
    campos.tipo,
    el('div', { className: 'field--full row-actions' }, [cancelarEdicion, guardar]),
  ]);
  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarErrores(campos, alerta);
    const datos = { nombre: nombre.value.trim(), tipo: tipo.value };
    if (datos.nombre.length < 2)
      return marcarError(campos.nombre, 'Escribe el nombre de la puerta.');
    setButtonLoading(guardar, true, 'Guardando…');
    try {
      if (editando) await actualizarPuerta(editando.id, datos);
      else await crearPuerta(datos);
      showToast(`Puerta ${datos.nombre} ${editando ? 'actualizada' : 'creada'}.`, 'success');
      modoEdicion(null);
      await recargar();
    } catch (error) {
      mostrarErrorApi(error, campos, alerta);
    } finally {
      setButtonLoading(guardar, false);
    }
  });

  const modal = createModal({
    title: 'Puertas de acceso',
    subtitle: 'por dónde entran y salen los vehículos',
    body: [formulario, tabla],
    footer: [createButton({ label: 'Cerrar', variant: 'ghost', onClick: () => closeModal(modal) })],
    onClose: () => modal.remove(),
  });
  try {
    await recargar();
  } catch (error) {
    showToast(error.message, 'error');
    return;
  }
  openModal(modal, origen);
}
