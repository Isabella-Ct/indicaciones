/**
 * Notificaciones (wireframe 08 corregido) — REQ-NOT-1: bandeja con pestañas Todas / No
 * leídas, marcar leída(s); el administrador envía mensajes a un usuario, a un rol o a todos.
 * Se refresca en vivo con el evento `parko:notificaciones` que emite la campana.
 */
import { el } from '../utils/dom.js';
import { montarApp } from './comun/montar-app.js';
import { limpiarErrores, mostrarErrorApi, marcarError } from './comun/formularios.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createField } from '../components/molecules/field/field.js';
import { createTiles } from '../components/molecules/tiles/tiles.js';
import { createAlert } from '../components/molecules/alert/alert.js';
import { createLevelTabs } from '../components/molecules/level-tabs/level-tabs.js';
import { createPagination } from '../components/molecules/pagination/pagination.js';
import { createEmptyState } from '../components/molecules/empty-state/empty-state.js';
import { createNotificationItem } from '../components/molecules/notification-item/notification-item.js';
import {
  createUserPicker,
  setUserPickerError,
} from '../components/molecules/user-picker/user-picker.js';
import { showToast } from '../components/molecules/toast/toast.js';
import { createButton, setButtonLoading } from '../components/atoms/button/button.js';
import { createInput } from '../components/atoms/input/input.js';
import { createSelect } from '../components/atoms/select/select.js';
import { createTextarea } from '../components/atoms/textarea/textarea.js';
import { createSpinner } from '../components/atoms/spinner/spinner.js';
import {
  misNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
  enviarNotificacion,
} from '../services/notificaciones.service.js';
import { listarUsuarios } from '../services/usuarios.service.js';
import { tienePermiso } from '../utils/sesion.js';

const PESTANAS = [
  { id: 1, nombre: 'Todas' },
  { id: 2, nombre: 'No leídas' },
];
const ID_PANEL = 'bandeja-lista';
const estado = { pestana: 1, pagina: 1, resultado: null };
const zonas = { tabs: el('div'), lista: el('div', { attrs: { role: 'tabpanel' } }) };
const leerTodas = createButton({
  label: 'Marcar todas leídas',
  variant: 'ghost',
  size: 'sm',
  icon: 'i-check',
  onClick: async () => {
    try {
      const { marcadas } = await marcarTodasLeidas();
      showToast(
        marcadas ? `${marcadas} notificación(es) marcadas como leídas.` : 'No había pendientes.',
        'success'
      );
      await recargar();
    } catch (error) {
      showToast(error.message, 'error');
    }
  },
});

function pintarTabs() {
  zonas.tabs.replaceChildren(
    createLevelTabs({
      niveles: PESTANAS,
      activoId: estado.pestana,
      idPanel: (id) => `${ID_PANEL}-${id}`,
      label: 'Filtrar notificaciones',
      onChange: (id) => {
        estado.pestana = id;
        estado.pagina = 1;
        pintarTabs();
        zonas.tabs.querySelector('.level-tab.is-active')?.focus();
        recargar();
      },
    })
  );
  // Un solo panel que cambia de pestaña: su id sigue a la pestaña activa.
  zonas.lista.id = `${ID_PANEL}-${estado.pestana}`;
  zonas.lista.setAttribute('aria-labelledby', `tab-${zonas.lista.id}`);
}

function pintarLista() {
  const { data, meta } = estado.resultado;
  leerTodas.disabled = meta.no_leidas === 0;
  PESTANAS[1].nombre = meta.no_leidas ? `No leídas (${meta.no_leidas})` : 'No leídas';
  pintarTabs();
  if (!data.length) {
    zonas.lista.replaceChildren(
      createEmptyState({
        title: estado.pestana === 2 ? 'Todo al día' : 'Sin notificaciones',
        text:
          estado.pestana === 2
            ? 'No tienes notificaciones sin leer.'
            : 'Aquí verás los avisos del sistema y los mensajes del administrador.',
      })
    );
    return;
  }
  zonas.lista.replaceChildren(
    el(
      'ul',
      { className: 'notice-list' },
      data.map((n) =>
        createNotificationItem({
          notificacion: n,
          onLeer: async (item) => {
            try {
              await marcarLeida(item.id);
              await recargar();
            } catch (error) {
              showToast(error.message, 'error');
            }
          },
        })
      )
    ),
    el('div', { className: 'notice-pagination' }, [
      createPagination({
        pagina: meta.pagina,
        totalPaginas: meta.total_paginas,
        total: meta.total,
        onChange: (pagina) => {
          estado.pagina = pagina;
          recargar();
        },
      }),
    ])
  );
}

async function recargar() {
  if (!estado.resultado) zonas.lista.replaceChildren(createSpinner({ label: 'Cargando…' }));
  try {
    estado.resultado = await misNotificaciones({
      pagina: estado.pagina,
      limite: 10,
      leida: estado.pestana === 2 ? '0' : undefined,
    });
    pintarLista();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// Envío manual (admin)
// ---------------------------------------------------------------------------
function panelEnvio() {
  let destino = 'usuario';
  let usuario = null;
  const picker = createUserPicker({
    label: 'Usuario',
    hint: 'Busca por número de documento (usuarios activos de cualquier rol).',
    vacio: 'No hay usuarios activos con ese documento.',
    buscar: async (documento) =>
      (await listarUsuarios({ q: documento, estado: 'activo', limite: 8 })).data,
    onChange: (u) => (usuario = u),
  });
  const rol = createSelect({
    options: [
      { value: 'usuario', label: 'Clientes' },
      { value: 'operador', label: 'Operadores' },
      { value: 'administrador', label: 'Administradores' },
    ],
  });
  const campoRol = createField({ label: 'Rol', control: rol, required: true, full: true });
  const titulo = createInput({ maxLength: 120, placeholder: 'Ej. Mantenimiento del Sótano 2' });
  const mensaje = createTextarea({ maxLength: 1000, rows: 5, placeholder: 'Escribe el mensaje' });
  const campos = {
    titulo: createField({ label: 'Título', control: titulo, required: true, full: true }),
    mensaje: createField({ label: 'Mensaje', control: mensaje, required: true, full: true }),
  };
  const alerta = createAlert();

  function mostrarDestino() {
    picker.classList.toggle('hidden', destino !== 'usuario');
    campoRol.classList.toggle('hidden', destino !== 'rol');
  }

  const enviar = createButton({ label: 'Enviar notificación', type: 'submit', icon: 'i-send' });
  const formulario = el('form', { className: 'stack', attrs: { novalidate: true } }, [
    alerta,
    createTiles({
      name: 'destino',
      label: 'Destinatario',
      value: destino,
      columns: 3,
      options: [
        { value: 'usuario', label: 'Un usuario' },
        { value: 'rol', label: 'Un rol' },
        { value: 'todos', label: 'Todos' },
      ],
      onChange: (v) => {
        destino = v;
        mostrarDestino();
      },
    }),
    picker,
    campoRol,
    campos.titulo,
    campos.mensaje,
    el('div', {}, [enviar]),
  ]);

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarErrores(campos, alerta);
    setUserPickerError(picker, '');
    let ok = true;
    if (destino === 'usuario' && !usuario) {
      setUserPickerError(picker, 'Elige el usuario.');
      ok = false;
    }
    if (titulo.value.trim().length < 3) ok = marcarError(campos.titulo, 'Mínimo 3 caracteres.');
    if (mensaje.value.trim().length < 3) ok = marcarError(campos.mensaje, 'Mínimo 3 caracteres.');
    if (!ok) return;
    setButtonLoading(enviar, true, 'Enviando…');
    try {
      const { enviadas } = await enviarNotificacion({
        destino,
        usuario_id: destino === 'usuario' ? usuario.id : undefined,
        rol: destino === 'rol' ? rol.value : undefined,
        titulo: titulo.value.trim(),
        mensaje: mensaje.value.trim(),
      });
      showToast(`Notificación enviada a ${enviadas} usuario(s).`, 'success');
      titulo.value = '';
      mensaje.value = '';
    } catch (error) {
      mostrarErrorApi(error, campos, alerta);
    } finally {
      setButtonLoading(enviar, false);
    }
  });

  mostrarDestino();
  return createPanel({ title: 'Enviar mensaje', children: [formulario] });
}

async function iniciar() {
  const app = await montarApp({
    paginaId: 'notificaciones',
    cabecera: () => ({
      titulo: 'Notificaciones',
      subtitulo: 'avisos del sistema y mensajes del administrador',
    }),
  });
  if (!app) return;
  const bandeja = createPanel({
    title: 'Bandeja',
    actions: [zonas.tabs],
    flush: true,
    children: [el('div', { className: 'notice-toolbar' }, [leerTodas]), zonas.lista],
  });
  if (tienePermiso(app.sesion, 'notificaciones.enviar')) {
    app.main.append(el('div', { className: 'page-grid' }, [bandeja, panelEnvio()]));
  } else {
    app.main.append(bandeja);
  }
  pintarTabs();
  // Llega una notificación o se leen en otra pestaña: la bandeja se refresca sola.
  document.addEventListener('parko:notificaciones', (e) => {
    if (e.detail.tipo !== 'conteo') recargar();
  });
  await recargar();
}

iniciar();
