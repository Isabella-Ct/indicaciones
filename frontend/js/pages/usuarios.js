/**
 * Usuarios — REQ-USR-2 (crear: admin y operador), REQ-USR-3 (estado: admin),
 * REQ-USR-5 (editar y restablecer la contraseña: admin). El operador solo ve el formulario de registro.
 */
import { el } from '../utils/dom.js';
import { montarApp } from './comun/montar-app.js';
import { confirmar } from './comun/confirmar.js';
import {
  limpiarErrores,
  mostrarErrorApi,
  marcarError,
  PATRON_CELULAR,
  PATRON_CORREO,
} from './comun/formularios.js';
import { createPanel } from '../components/molecules/panel/panel.js';
import { createField } from '../components/molecules/field/field.js';
import { createAlert } from '../components/molecules/alert/alert.js';
import { createSearchBox } from '../components/molecules/search-box/search-box.js';
import { createPhotoInput } from '../components/molecules/photo-input/photo-input.js';
import { createDataList } from '../components/molecules/data-list/data-list.js';
import { showToast } from '../components/molecules/toast/toast.js';
import { createDataTable } from '../components/organisms/data-table/data-table.js';
import { createModal, openModal, closeModal } from '../components/organisms/modal/modal.js';
import { createButton, setButtonLoading } from '../components/atoms/button/button.js';
import { createInput } from '../components/atoms/input/input.js';
import { createSelect } from '../components/atoms/select/select.js';
import { createStatusChip } from '../components/atoms/status-chip/status-chip.js';
import { createAvatar } from '../components/atoms/avatar/avatar.js';
import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
  restablecerContrasenaUsuario,
} from '../services/usuarios.service.js';
import { listarRoles } from '../services/roles.service.js';
import { TIPOS_DOCUMENTO, etiquetaRol, tienePermiso } from '../utils/sesion.js';

const estado = {
  sesion: null,
  roles: [],
  filtros: { q: '', rol: '', estado: '', pagina: 1, limite: 20, orden: 'id', dir: 'asc' },
  resultado: { data: [], meta: null },
  cargando: false,
  enfocarOrden: false,
};

const puede = (codigo) => tienePermiso(estado.sesion, codigo);
const codigoUsuario = (id) => String(id).padStart(5, '0');

// ---------------------------------------------------------------------------
// Formulario crear / editar (modal)
// ---------------------------------------------------------------------------
function generarContrasena() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  const aleatorio = new Uint32Array(8);
  window.crypto.getRandomValues(aleatorio);
  const parte = [...aleatorio.slice(0, 6)].map((n) => letras[n % letras.length]).join('');
  return `Parko-${parte}-${(aleatorio[6] % 90) + 10}`;
}

function abrirFormulario(usuario, origen) {
  const editando = Boolean(usuario);
  const rolesDisponibles = estado.roles.filter(
    (r) => r.nombre !== 'administrador' || puede('usuarios.crear_administrador')
  );

  const control = {
    tipo_documento: createSelect({
      name: 'tipo_documento',
      options: TIPOS_DOCUMENTO,
      value: usuario?.tipo_documento ?? 'CC',
    }),
    numero_documento: createInput({
      name: 'numero_documento',
      value: usuario?.numero_documento,
      maxLength: 20,
      autocomplete: 'off',
    }),
    primer_nombre: createInput({
      name: 'primer_nombre',
      value: usuario?.primer_nombre,
      maxLength: 60,
    }),
    segundo_nombre: createInput({
      name: 'segundo_nombre',
      value: usuario?.segundo_nombre,
      maxLength: 60,
    }),
    primer_apellido: createInput({
      name: 'primer_apellido',
      value: usuario?.primer_apellido,
      maxLength: 60,
    }),
    segundo_apellido: createInput({
      name: 'segundo_apellido',
      value: usuario?.segundo_apellido,
      maxLength: 60,
    }),
    correo: createInput({
      name: 'correo',
      type: 'email',
      value: usuario?.correo,
      maxLength: 120,
      autocomplete: 'off',
    }),
    celular: createInput({
      name: 'celular',
      type: 'tel',
      inputMode: 'numeric',
      value: usuario?.celular,
      maxLength: 10,
      placeholder: '3001234567',
    }),
    rol_id: createSelect({
      name: 'rol_id',
      placeholder: 'Selecciona un rol…',
      options: rolesDisponibles.map((r) => ({ value: String(r.id), label: etiquetaRol(r.nombre) })),
      value: usuario
        ? String(usuario.rol_id)
        : String(rolesDisponibles.find((r) => r.nombre === 'usuario')?.id ?? ''),
    }),
    contrasena_temporal: editando
      ? null
      : createInput({
          name: 'contrasena_temporal',
          value: generarContrasena(),
          maxLength: 72,
          autocomplete: 'off',
        }),
  };

  const campos = {
    tipo_documento: createField({
      label: 'Tipo de documento',
      control: control.tipo_documento,
      required: true,
    }),
    numero_documento: createField({
      label: 'Número de documento',
      control: control.numero_documento,
      required: true,
    }),
    primer_nombre: createField({
      label: 'Primer nombre',
      control: control.primer_nombre,
      required: true,
    }),
    segundo_nombre: createField({ label: 'Segundo nombre', control: control.segundo_nombre }),
    primer_apellido: createField({
      label: 'Primer apellido',
      control: control.primer_apellido,
      required: true,
    }),
    segundo_apellido: createField({ label: 'Segundo apellido', control: control.segundo_apellido }),
    correo: createField({ label: 'Correo electrónico', control: control.correo, required: true }),
    celular: createField({
      label: 'Celular',
      control: control.celular,
      required: true,
      hint: '10 dígitos, empieza por 3.',
    }),
    rol_id: createField({
      label: 'Tipo de usuario',
      control: control.rol_id,
      required: true,
      hint: puede('usuarios.crear_administrador')
        ? null
        : 'Los operadores no pueden crear administradores.',
    }),
  };
  if (!editando) {
    campos.contrasena_temporal = createField({
      label: 'Contraseña temporal',
      control: control.contrasena_temporal,
      required: true,
      full: true,
      hint: 'Entrégasela al usuario: deberá cambiarla en su primer inicio de sesión.',
    });
    campos.contrasena_temporal.append(
      el('div', {}, [
        createButton({
          label: 'Generar otra',
          variant: 'ghost',
          size: 'sm',
          onClick: () => (control.contrasena_temporal.value = generarContrasena()),
        }),
      ])
    );
  }
  const foto = createPhotoInput({
    label: 'Fotografía (opcional)',
    fotoUrl: usuario?.foto_url,
    nombre: usuario?.nombre_completo,
  });
  campos.foto = foto;

  const alerta = createAlert();
  const guardar = createButton({
    label: editando ? 'Guardar cambios' : 'Crear usuario',
    type: 'submit',
    icon: 'i-check',
  });
  const formulario = el('form', { attrs: { novalidate: true, id: 'form-usuario' } }, [
    alerta,
    el('div', { className: 'form-grid' }, [...Object.values(campos)]),
  ]);

  const modal = createModal({
    title: editando ? `Editar usuario ${codigoUsuario(usuario.id)}` : 'Crear usuario',
    subtitle: editando ? usuario.nombre_completo : 'el sistema asigna el código automáticamente',
    body: [formulario],
    footer: [
      createButton({ label: 'Cancelar', variant: 'ghost', onClick: () => closeModal(modal) }),
      guardar,
    ],
    onClose: () => modal.remove(),
  });
  guardar.setAttribute('form', 'form-usuario');

  function validar() {
    let ok = true;
    for (const nombre of [
      'numero_documento',
      'primer_nombre',
      'primer_apellido',
      'correo',
      'celular',
    ]) {
      if (!control[nombre].value.trim())
        ok = marcarError(campos[nombre], 'Este campo es obligatorio.');
    }
    if (
      control.numero_documento.value.trim() &&
      !/^[A-Za-z0-9]+$/.test(control.numero_documento.value.trim())
    ) {
      ok = marcarError(campos.numero_documento, 'Solo letras y números, sin puntos ni espacios.');
    }
    if (control.correo.value.trim() && !PATRON_CORREO.test(control.correo.value.trim())) {
      ok = marcarError(campos.correo, 'Escribe un correo válido.');
    }
    if (control.celular.value.trim() && !PATRON_CELULAR.test(control.celular.value.trim())) {
      ok = marcarError(campos.celular, 'Celular de 10 dígitos que empieza por 3.');
    }
    if (!control.rol_id.value) ok = marcarError(campos.rol_id, 'Selecciona el tipo de usuario.');
    if (!editando && control.contrasena_temporal.value.length < 8) {
      ok = marcarError(campos.contrasena_temporal, 'Mínimo 8 caracteres.');
    }
    return ok;
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limpiarErrores(campos, alerta);
    if (!validar()) {
      formulario.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setButtonLoading(guardar, true, 'Guardando…');
    try {
      const datos = new FormData(formulario);
      const guardado = editando
        ? await actualizarUsuario(usuario.id, datos)
        : await crearUsuario(datos);
      closeModal(modal);
      if (editando) {
        showToast(`Usuario ${codigoUsuario(guardado.id)} actualizado.`, 'success');
      } else {
        showToast(`Usuario creado con el código ${codigoUsuario(guardado.id)}.`, 'success');
        estado.ultimoCreado = guardado;
      }
      await recargar();
    } catch (error) {
      setButtonLoading(guardar, false);
      mostrarErrorApi(error, campos, alerta);
    }
  });

  openModal(modal, origen);
}

// ---------------------------------------------------------------------------
// Activar / inactivar (solo admin)
// ---------------------------------------------------------------------------
async function alternarEstado(usuario, origen) {
  const nuevo = usuario.estado === 'activo' ? 'inactivo' : 'activo';
  const ok = await confirmar({
    titulo: nuevo === 'inactivo' ? 'Inactivar usuario' : 'Activar usuario',
    mensaje:
      nuevo === 'inactivo'
        ? `${usuario.nombre_completo} no podrá iniciar sesión hasta que lo actives de nuevo.`
        : `${usuario.nombre_completo} podrá volver a iniciar sesión.`,
    textoConfirmar: nuevo === 'inactivo' ? 'Inactivar' : 'Activar',
    origen,
  });
  if (!ok) return;
  try {
    await cambiarEstadoUsuario(usuario.id, nuevo);
    showToast(`${usuario.nombre_completo} quedó ${nuevo}.`, 'success');
    await recargar();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// Restablecer contraseña (solo admin): para quien la olvidó; no hay recuperación por correo
// ---------------------------------------------------------------------------
function abrirRestablecer(usuario, origen) {
  const input = createInput({
    name: 'contrasena_temporal',
    value: generarContrasena(),
    maxLength: 72,
    autocomplete: 'off',
  });
  const campo = createField({
    label: 'Contraseña temporal',
    control: input,
    required: true,
    hint: 'Entrégasela al usuario: deberá cambiarla en su próximo inicio de sesión.',
  });
  const alerta = createAlert();
  const guardar = createButton({ label: 'Restablecer', type: 'submit', icon: 'i-key' });
  const formulario = el('form', { attrs: { novalidate: true, id: 'form-restablecer' } }, [
    el('p', {
      text: `${usuario.nombre_completo} (${usuario.tipo_documento} ${usuario.numero_documento}) entrará con esta contraseña y el sistema le pedirá crear una nueva.`,
    }),
    alerta,
    campo,
    el('div', {}, [
      createButton({
        label: 'Generar otra',
        variant: 'ghost',
        size: 'sm',
        onClick: () => (input.value = generarContrasena()),
      }),
    ]),
  ]);
  const modal = createModal({
    title: 'Restablecer contraseña',
    size: 'sm',
    body: [formulario],
    footer: [
      createButton({ label: 'Cancelar', variant: 'ghost', onClick: () => closeModal(modal) }),
      guardar,
    ],
    onClose: () => modal.remove(),
  });
  guardar.setAttribute('form', 'form-restablecer');
  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarErrores({ contrasena_temporal: campo }, alerta);
    if (input.value.length < 8) {
      marcarError(campo, 'Mínimo 8 caracteres.');
      return;
    }
    setButtonLoading(guardar, true, 'Guardando…');
    try {
      await restablecerContrasenaUsuario(usuario.id, input.value);
      closeModal(modal);
      showToast(
        `Contraseña temporal asignada a ${usuario.nombre_completo}. Entrégasela en persona.`,
        'success'
      );
    } catch (error) {
      mostrarErrorApi(error, { contrasena_temporal: campo }, alerta);
    } finally {
      setButtonLoading(guardar, false);
    }
  });
  openModal(modal, origen);
}

// ---------------------------------------------------------------------------
// Listado (solo admin)
// ---------------------------------------------------------------------------
const contenedorTabla = el('div');

function columnas() {
  return [
    { key: 'id', label: 'Código', sortable: true, render: (u) => codigoUsuario(u.id) },
    {
      key: 'documento',
      label: 'Documento',
      sortable: true,
      render: (u) =>
        el('span', { className: 'cell-nowrap', text: `${u.tipo_documento} ${u.numero_documento}` }),
    },
    {
      key: 'nombre',
      label: 'Nombre',
      sortable: true,
      render: (u) =>
        el('span', { className: 'cell-person' }, [
          createAvatar({ nombre: u.nombre_completo, fotoUrl: u.foto_url }),
          u.nombre_completo,
        ]),
    },
    {
      key: 'contacto',
      label: 'Contacto',
      render: (u) =>
        el('span', {}, [u.correo, el('span', { className: 'cell-sub', text: u.celular })]),
    },
    {
      key: 'rol',
      label: 'Rol',
      sortable: true,
      render: (u) => createStatusChip({ text: etiquetaRol(u.rol) }),
    },
    {
      key: 'estado',
      label: 'Estado',
      sortable: true,
      render: (u) =>
        createStatusChip({
          text: u.estado === 'activo' ? 'Activo' : 'Inactivo',
          variant: u.estado === 'activo' ? 'free' : 'neutral',
        }),
    },
    {
      key: 'acciones',
      label: 'Acciones',
      align: 'right',
      render: (u) => {
        const acciones = [];
        if (puede('usuarios.editar')) {
          acciones.push(
            createButton({
              label: 'Editar',
              variant: 'ghost',
              size: 'sm',
              ariaLabel: `Editar a ${u.nombre_completo}`,
              onClick: (e) => abrirFormulario(u, e.currentTarget),
            })
          );
        }
        if (puede('usuarios.editar') && u.id !== estado.sesion.id) {
          acciones.push(
            createButton({
              label: 'Contraseña',
              variant: 'ghost',
              size: 'sm',
              icon: 'i-key',
              ariaLabel: `Restablecer la contraseña de ${u.nombre_completo}`,
              onClick: (e) => abrirRestablecer(u, e.currentTarget),
            })
          );
        }
        if (puede('usuarios.cambiar_estado') && u.id !== estado.sesion.id) {
          acciones.push(
            createButton({
              label: u.estado === 'activo' ? 'Inactivar' : 'Activar',
              variant: 'dark',
              size: 'sm',
              ariaLabel: `${u.estado === 'activo' ? 'Inactivar' : 'Activar'} a ${u.nombre_completo}`,
              onClick: (e) => alternarEstado(u, e.currentTarget),
            })
          );
        }
        return el('div', { className: 'row-actions' }, acciones);
      },
    },
  ];
}

function pintarTabla() {
  const { data, meta } = estado.resultado;
  const tabla = createDataTable({
    caption: 'Usuarios registrados',
    columns: columnas(),
    rows: data,
    loading: estado.cargando,
    minWidth: 980,
    sort: { key: estado.filtros.orden, dir: estado.filtros.dir },
    onSort: (key) => {
      const f = estado.filtros;
      f.dir = f.orden === key && f.dir === 'asc' ? 'desc' : 'asc';
      f.orden = key;
      f.pagina = 1;
      estado.enfocarOrden = true;
      recargar();
    },
    empty: { title: 'Sin usuarios', text: 'Ningún usuario coincide con los filtros.' },
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
  if (!puede('usuarios.ver')) return pintarRegistroOperador();
  estado.cargando = true;
  pintarTabla();
  try {
    estado.resultado = await listarUsuarios(estado.filtros);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    estado.cargando = false;
    pintarTabla();
  }
}

function filtrosAdmin() {
  const cambiar = (clave) => (e) => {
    estado.filtros[clave] = e.target.value;
    estado.filtros.pagina = 1;
    recargar();
  };
  return el('div', { className: 'filters' }, [
    createSearchBox({
      label: 'Buscar',
      placeholder: 'Documento, nombre o correo',
      onSearch: (texto) => {
        estado.filtros.q = texto;
        estado.filtros.pagina = 1;
        recargar();
      },
    }),
    createField({
      label: 'Rol',
      control: createSelect({
        options: [
          { value: '', label: 'Todos' },
          { value: 'administrador', label: 'Administrador' },
          { value: 'operador', label: 'Operador' },
          { value: 'usuario', label: 'Cliente' },
        ],
        onChange: cambiar('rol'),
      }),
    }),
    createField({
      label: 'Estado',
      control: createSelect({
        options: [
          { value: '', label: 'Todos' },
          { value: 'activo', label: 'Activos' },
          { value: 'inactivo', label: 'Inactivos' },
        ],
        onChange: cambiar('estado'),
      }),
    }),
  ]);
}

// ---------------------------------------------------------------------------
// Vista del operador: solo registro (sin listado, decisión Fase 1)
// ---------------------------------------------------------------------------
function pintarRegistroOperador() {
  const ultimo = estado.ultimoCreado;
  contenedorTabla.replaceChildren(
    ultimo
      ? el('div', { className: 'stack' }, [
          el('p', { className: 'label-caps', text: 'Último usuario registrado' }),
          createDataList({
            items: [
              { term: 'Código', value: codigoUsuario(ultimo.id) },
              { term: 'Documento', value: `${ultimo.tipo_documento} ${ultimo.numero_documento}` },
              { term: 'Nombre', value: ultimo.nombre_completo },
              { term: 'Tipo de usuario', value: etiquetaRol(ultimo.rol) },
            ],
          }),
        ])
      : el('p', {
          text: 'Registra clientes y operadores. El listado completo y la edición de usuarios están a cargo del administrador.',
        })
  );
}

// ---------------------------------------------------------------------------
async function iniciar() {
  const app = await montarApp({
    paginaId: 'usuarios',
    cabecera: (sesion) => ({
      titulo: 'Usuarios',
      subtitulo: tienePermiso(sesion, 'usuarios.ver')
        ? 'registro, edición y estado de los usuarios del sistema'
        : 'registro de nuevos usuarios',
      acciones: [
        createButton({
          label: 'Crear usuario',
          icon: 'i-user',
          onClick: (e) => abrirFormulario(null, e.currentTarget),
        }),
      ],
    }),
  });
  if (!app) return;
  estado.sesion = app.sesion;

  try {
    estado.roles = await listarRoles();
  } catch (error) {
    showToast(error.message, 'error');
  }

  const esAdmin = puede('usuarios.ver');
  app.main.append(
    createPanel({
      title: esAdmin ? 'Usuarios registrados' : 'Registro de usuarios',
      children: esAdmin ? [filtrosAdmin(), contenedorTabla] : [contenedorTabla],
    })
  );
  await recargar();

  // Enlace desde una notificación: /app/usuarios.html?id=7 abre su edición.
  const id = Number(new URLSearchParams(location.search).get('id'));
  if (id && puede('usuarios.editar')) {
    try {
      abrirFormulario(await obtenerUsuario(id));
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
}

iniciar();
