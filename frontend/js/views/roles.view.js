// Página · Configuración › Roles (HU-01..HU-05): listado, búsqueda, nuevo/editar y cambio de estado.
import {
  listarRoles,
  obtenerRol,
  crearRol,
  actualizarRol,
  cambiarEstadoRol,
  listarPermisos,
  nombreModulo,
} from '../services/roles.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { conectarBusqueda } from '../components/moleculas/buscador.js';
import { clonar } from '../utils/plantillas.js';
import { ponerChipActivo } from '../components/atomos/chip-estado.js';
import { botonCargando } from '../components/atomos/boton.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { abrirDialogo, cerrarDialogo, confirmar } from '../components/organismos/modal.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, parametro } from '../utils/dom.js';
import { texto, plural } from '../utils/formato.js';

const marco = montarMarco({ permiso: 'roles.ver', alSalir: cerrarSesion });

const estado = { page: 1, q: '', estado: '', catalogo: null, editando: null };
const puede = {
  crear: tienePermiso('roles.crear'),
  editar: tienePermiso('roles.editar'),
  cambiarEstado: tienePermiso('roles.cambiar_estado'),
};

// ---------------------------------------------------------------- listado (HU-01, HU-03)
const tabla = conectarTabla($('tabla-roles'), {
  plantilla: 'tpl-rol',
  idDe: (rol) => rol.idRol,
  onPagina: (pagina) => cargar(pagina),
  rellenar(fila, rol) {
    fila.querySelector('.js-nombre').textContent = rol.nombre;
    fila.querySelector('.js-base').classList.toggle('hidden', !rol.esBase);
    fila.querySelector('.js-descripcion').textContent = texto(rol.descripcion);
    fila.querySelector('.js-usuarios').textContent =
      `${plural(rol.usuariosAsignados, 'usuario')} · ${rol.usuariosActivos} activos`;
    ponerChipActivo(fila.querySelector('.js-estado'), rol.estado);
    fila.querySelector('.js-ver').href = `/rol-detalle.html?id=${rol.idRol}`;
    fila.querySelector('.js-ver').setAttribute('aria-label', `Ver el rol ${rol.nombre}`);

    const editar = fila.querySelector('.js-editar');
    editar.classList.toggle('hidden', !puede.editar);
    editar.setAttribute('aria-label', `Editar el rol ${rol.nombre}`);
    editar.addEventListener('click', () => abrirEdicion(rol.idRol, editar));

    const accion = fila.querySelector('.js-estado-accion');
    // Los roles base no se inactivan (RF-ROL-03): no se ofrece la acción.
    accion.classList.toggle('hidden', !puede.cambiarEstado || (rol.esBase && rol.estado === 'activo'));
    accion.querySelector('span').textContent = rol.estado === 'activo' ? 'Inactivar' : 'Activar';
    accion.addEventListener('click', () => alternarEstado(rol, accion));
  },
});

async function cargar(page = estado.page) {
  estado.page = page;
  tabla.cargando(true);
  try {
    const { data, meta } = await listarRoles({ page, q: estado.q, estado: estado.estado });
    tabla.pintar(data, meta);
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
    tabla.pintar([]);
  } finally {
    tabla.cargando(false);
  }
}

conectarBusqueda($('filtro-texto'), (q) => {
  estado.q = q;
  cargar(1);
});
$('filtro-estado').addEventListener('change', (e) => {
  estado.estado = e.target.value;
  cargar(1);
});

// ---------------------------------------------------------------- cambio de estado (HU-05)
async function alternarEstado(rol, origen) {
  const nuevo = rol.estado === 'activo' ? 'inactivo' : 'activo';
  const acepta = await confirmar({
    titulo: nuevo === 'inactivo' ? 'Inactivar rol' : 'Activar rol',
    mensaje:
      nuevo === 'inactivo'
        ? `El rol «${rol.nombre}» dejará de ofrecerse al crear o editar usuarios.`
        : `El rol «${rol.nombre}» volverá a ofrecerse al crear o editar usuarios.`,
    textoConfirmar: nuevo === 'inactivo' ? 'Inactivar' : 'Activar',
    origen,
  });
  if (!acepta) return;
  try {
    await cambiarEstadoRol(rol.idRol, nuevo);
    mostrarAviso('Estado actualizado', 'success');
    cargar();
  } catch (error) {
    if (error.status !== 401 && error.status !== 403) mostrarAviso(error.message, 'error');
  }
}

// ---------------------------------------------------------------- nuevo / editar (HU-02, HU-04)
const dialogo = $('dialogo-rol');
const formulario = $('form-rol');
const campoNombre = $('rol-nombre');
const campoDescripcion = $('rol-descripcion');
const permisosFieldset = $('rol-permisos');
const alertaRol = $('rol-alerta');
const guardar = $('rol-guardar');

async function asegurarCatalogo() {
  if (!estado.catalogo) estado.catalogo = await listarPermisos();
  const contenedor = $('rol-permisos-grupos');
  if (contenedor.childElementCount) return;
  contenedor.replaceChildren(
    ...estado.catalogo.map((grupo) => {
      const nodo = clonar('tpl-grupo-permisos');
      nodo.querySelector('.js-modulo').textContent = nombreModulo(grupo);
      nodo.querySelector('ul').append(
        ...grupo.permisos.map((permiso) => {
          const item = clonar('tpl-permiso-casilla');
          const casilla = item.querySelector('.js-casilla');
          casilla.value = String(permiso.idPermiso);
          casilla.dataset.id = String(permiso.idPermiso);
          item.querySelector('.js-texto').textContent = `${permiso.accion.replace('_', ' ')} — ${permiso.codigo}`;
          return item;
        })
      );
      return nodo;
    })
  );
}

const casillas = () => [...permisosFieldset.querySelectorAll('.js-casilla')];

function marcarPermisosError(mensaje) {
  $('rol-permisos-error').textContent = mensaje || '';
  permisosFieldset.toggleAttribute('aria-invalid', Boolean(mensaje));
}

async function abrirFormulario({ rol = null, origen }) {
  try {
    await asegurarCatalogo();
  } catch (error) {
    mostrarAviso(error.message, 'error');
    return;
  }
  estado.editando = rol;
  limpiarErrores(formulario);
  marcarPermisosError('');
  mostrarAlerta(alertaRol, '');
  $('rol-titulo').textContent = rol ? `Editar rol · ${rol.nombre}` : 'Nuevo rol';
  campoNombre.value = rol?.nombre ?? '';
  campoNombre.disabled = Boolean(rol?.esBase);
  campoDescripcion.value = rol?.descripcion ?? '';
  const actuales = new Set((rol?.permisos ?? []).flatMap((g) => g.permisos.map((p) => p.idPermiso)));
  casillas().forEach((c) => (c.checked = actuales.has(Number(c.value))));
  abrirDialogo(dialogo, { origen, foco: rol?.esBase ? campoDescripcion : campoNombre });
}

async function abrirEdicion(id, origen) {
  try {
    abrirFormulario({ rol: await obtenerRol(id), origen });
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
}

function validarFormulario() {
  const nombre = campoNombre.value.trim();
  let valido = marcarCampo(
    campoNombre,
    nombre.length < 3 || nombre.length > 40 ? 'El nombre debe tener entre 3 y 40 caracteres.' : ''
  );
  valido = marcarCampo(
    campoDescripcion,
    campoDescripcion.value.trim().length > 150 ? 'La descripción admite máximo 150 caracteres.' : ''
  ) && valido;
  const marcados = casillas().filter((c) => c.checked);
  // HU-02 E3: sin permisos el formulario no se envía.
  marcarPermisosError(marcados.length ? '' : 'Seleccione al menos un permiso');
  if (!valido) (formulario.querySelector('[aria-invalid="true"]') ?? campoNombre).focus();
  else if (!marcados.length) marcados[0]?.focus() ?? casillas()[0]?.focus();
  return valido && marcados.length > 0;
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formulario);
  mostrarAlerta(alertaRol, '');
  if (!validarFormulario()) return;
  const datos = {
    nombre: campoNombre.value.trim(),
    descripcion: campoDescripcion.value.trim() || null,
    permisos: casillas().filter((c) => c.checked).map((c) => Number(c.value)),
  };
  botonCargando(guardar, true, 'Guardando…');
  try {
    if (estado.editando) {
      await actualizarRol(estado.editando.idRol, datos);
      mostrarAviso('Rol actualizado', 'success');
    } else {
      await crearRol(datos);
      mostrarAviso('Rol creado', 'success');
    }
    cerrarDialogo(dialogo);
    cargar(estado.editando ? estado.page : 1);
  } catch (error) {
    if (error.code === 'ROL_DUPLICADO') {
      marcarCampo(campoNombre, error.message);
      campoNombre.focus();
    } else if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, { nombre: 'rol-nombre', descripcion: 'rol-descripcion' });
      const dePermisos = (error.details ?? []).find((d) => d.campo === 'permisos');
      if (dePermisos) marcarPermisosError(dePermisos.mensaje);
      if (sinCampo.length && !dePermisos) mostrarAlerta(alertaRol, sinCampo.join(' '), 'error');
    } else if (error.status !== 401 && error.status !== 403) {
      mostrarAlerta(alertaRol, error.message, 'error');
    }
  } finally {
    botonCargando(guardar, false);
  }
});

// ---------------------------------------------------------------- arranque
if (marco?.permitido) {
  $('accion-nuevo').classList.toggle('hidden', !puede.crear);
  $('accion-nuevo').addEventListener('click', (e) => abrirFormulario({ origen: e.currentTarget }));
  cargar(1);
  // Desde el detalle: roles.html?editar=<id>
  const editar = Number(parametro('editar'));
  if (editar && puede.editar) abrirEdicion(editar, $('accion-nuevo'));
}
