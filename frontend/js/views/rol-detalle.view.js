// Configuración › Roles › Detalle (HU-03 E3/E4 · RF-ROL-08).
import { obtenerRol, nombreModulo } from '../services/roles.service.js';
import { montarMarco } from '../components/navbar.js';
import { conectarTabla } from '../components/tabla-paginada.js';
import { clonar, ponerChip } from '../components/plantilla.js';
import { mostrarAviso } from '../components/toast.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, parametro, mostrar } from '../utils/dom.js';
import { texto, plural } from '../utils/formato.js';

const marco = montarMarco({ permiso: 'roles.ver' });

const tablaUsuarios = conectarTabla($('tabla-usuarios-rol'), {
  plantilla: 'tpl-usuario-rol',
  idDe: (u) => u.idUsuario,
  rellenar(fila, usuario) {
    fila.querySelector('.js-codigo').textContent = String(usuario.idUsuario);
    fila.querySelector('.js-nombre').textContent = usuario.nombreCompleto;
    ponerChip(
      fila.querySelector('.js-estado'),
      usuario.estado === 'activo' ? 'Activo' : 'Inactivo',
      usuario.estado === 'activo' ? 'free' : 'out'
    );
  },
});

function pintar(rol) {
  document.title = `PARKO · Rol ${rol.nombre}`;
  $('detalle-nombre').textContent = rol.nombre;
  $('detalle-descripcion').textContent = texto(rol.descripcion);
  $('detalle-tipo').textContent = rol.esBase ? 'Rol base del sistema' : 'Rol personalizado';
  ponerChip(
    $('detalle-estado'),
    rol.estado === 'activo' ? 'Activo' : 'Inactivo',
    rol.estado === 'activo' ? 'free' : 'out'
  );
  $('detalle-usuarios').textContent =
    `${plural(rol.usuariosAsignados, 'asignado')} · ${plural(rol.usuariosActivos, 'activo')}`;

  $('detalle-permisos').replaceChildren(
    ...rol.permisos.map((grupo) => {
      const nodo = clonar('tpl-grupo-detalle');
      nodo.querySelector('.js-modulo').textContent = nombreModulo(grupo);
      nodo.querySelector('ul').append(
        ...grupo.permisos.map((permiso) => {
          const item = clonar('tpl-permiso-detalle');
          item.querySelector('.js-codigo').textContent = permiso.codigo;
          item.querySelector('.js-descripcion').textContent = permiso.descripcion;
          return item;
        })
      );
      return nodo;
    })
  );
  tablaUsuarios.pintar(rol.usuarios);

  const editar = $('detalle-editar');
  editar.href = `/roles.html?editar=${rol.idRol}`;
  mostrar(editar, tienePermiso('roles.editar'));
  mostrar($('detalle-contenido'));
}

async function iniciar() {
  const id = Number(parametro('id'));
  if (!Number.isInteger(id) || id < 1) {
    mostrar($('detalle-no-encontrado'));
    return;
  }
  try {
    pintar(await obtenerRol(id));
  } catch (error) {
    if (error.status === 404 || error.status === 422) mostrar($('detalle-no-encontrado'));
    else if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
}

if (marco?.permitido) iniciar();
