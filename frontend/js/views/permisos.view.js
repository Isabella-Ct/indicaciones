// Página · Configuración › Permisos (HU-06 · RF-ROL-15): catálogo de solo lectura agrupado por módulo.
import { listarPermisos, nombreModulo } from '../services/roles.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { clonar } from '../utils/plantillas.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { $ } from '../utils/dom.js';

const ACCIONES = {
  ver: 'Consultar',
  crear: 'Registrar',
  editar: 'Actualizar',
  cambiar_estado: 'Cambiar estado',
  anular: 'Anular',
  exportar: 'Exportar',
};

const marco = montarMarco({ permiso: 'roles.ver' });

async function iniciar() {
  const cargando = $('catalogo-cargando');
  try {
    const grupos = await listarPermisos();
    $('catalogo').replaceChildren(
      ...grupos.map((grupo) => {
        const nodo = clonar('tpl-modulo');
        nodo.querySelector('.js-modulo').textContent = nombreModulo(grupo);
        nodo.querySelector('.js-caption').textContent = `Permisos de ${nombreModulo(grupo)}`;
        nodo.querySelector('tbody').append(
          ...grupo.permisos.map((permiso) => {
            const fila = clonar('tpl-fila-permiso');
            fila.querySelector('.js-codigo').textContent = permiso.codigo;
            fila.querySelector('.js-accion').textContent = ACCIONES[permiso.accion] ?? permiso.accion;
            fila.querySelector('.js-descripcion').textContent = permiso.descripcion;
            return fila;
          })
        );
        return nodo;
      })
    );
    cargando.classList.add('hidden');
  } catch (error) {
    cargando.textContent = 'No se pudo cargar el catálogo.';
    if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
}

if (marco?.permitido) iniciar();
