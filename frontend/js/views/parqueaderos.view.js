// Página · Configuración › Parqueaderos (HU-17, HU-18): listado, búsqueda, nuevo, editar,
// inactivar y reactivar.
import {
  listarParqueaderos,
  obtenerParqueadero,
  crearParqueadero,
  actualizarParqueadero,
  inactivarParqueadero,
} from '../services/parqueaderos.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { conectarBusqueda } from '../components/moleculas/buscador.js';
import { ponerChipActivo } from '../components/atomos/chip-estado.js';
import { botonCargando } from '../components/atomos/boton.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { abrirDialogo, cerrarDialogo, confirmar } from '../components/organismos/modal.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, parametro } from '../utils/dom.js';
import { plural } from '../utils/formato.js';

const marco = montarMarco({ permiso: 'parqueaderos.ver', alSalir: cerrarSesion });

const estado = { page: 1, q: '', estado: '', editando: null };
const puede = {
  crear: tienePermiso('parqueaderos.crear'),
  editar: tienePermiso('parqueaderos.editar'),
  cambiarEstado: tienePermiso('parqueaderos.cambiar_estado'),
};

// ---------------------------------------------------------------- listado (HU-17 E4)
const tabla = conectarTabla($('tabla-parqueaderos'), {
  plantilla: 'tpl-parqueadero',
  idDe: (p) => p.idParqueadero,
  onPagina: (pagina) => cargar(pagina),
  rellenar(fila, p) {
    fila.querySelector('.js-nombre').textContent = p.nombre;
    fila.querySelector('.js-direccion').textContent = p.direccion;
    fila.querySelector('.js-pisos').textContent = String(p.pisos);
    fila.querySelector('.js-celdas').textContent = plural(p.celdas.total, 'celda');
    fila.querySelector('.js-celdas-detalle').textContent = `${p.celdas.carro} carros · ${p.celdas.moto} motos`;
    fila.querySelector('.js-horario').textContent = p.horario;
    ponerChipActivo(fila.querySelector('.js-estado'), p.estado);

    const ver = fila.querySelector('.js-ver');
    ver.href = `/parqueadero-detalle.html?id=${p.idParqueadero}`;
    ver.setAttribute('aria-label', `Ver el parqueadero ${p.nombre}`);

    const editar = fila.querySelector('.js-editar');
    editar.classList.toggle('hidden', !puede.editar);
    editar.setAttribute('aria-label', `Editar el parqueadero ${p.nombre}`);
    editar.addEventListener('click', () => abrirEdicion(p.idParqueadero, editar));

    const accion = fila.querySelector('.js-estado-accion');
    accion.classList.toggle('hidden', !puede.cambiarEstado);
    accion.querySelector('span').textContent = p.estado === 'activo' ? 'Inactivar' : 'Reactivar';
    accion.addEventListener('click', () => alternarEstado(p, accion));
  },
});

async function cargar(page = estado.page) {
  estado.page = page;
  tabla.cargando(true);
  try {
    const { data, meta } = await listarParqueaderos({ page, q: estado.q, estado: estado.estado });
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

// ---------------------------------------------------------------- inactivar / reactivar (HU-18 E2, E3)
async function alternarEstado(p, origen) {
  const inactivar = p.estado === 'activo';
  const acepta = await confirmar({
    titulo: inactivar ? 'Inactivar parqueadero' : 'Reactivar parqueadero',
    mensaje: inactivar
      ? `«${p.nombre}» dejará de recibir vehículos y sus celdas quedarán fuera de servicio.`
      : `«${p.nombre}» volverá a recibir vehículos y sus celdas volverán a estar disponibles.`,
    textoConfirmar: inactivar ? 'Inactivar' : 'Reactivar',
    origen,
  });
  if (!acepta) return;
  try {
    if (inactivar) await inactivarParqueadero(p.idParqueadero);
    else {
      await actualizarParqueadero(p.idParqueadero, {
        nombre: p.nombre,
        direccion: p.direccion,
        pisos: p.pisos,
        horario: p.horario,
        estado: 'activo',
      });
    }
    mostrarAviso(inactivar ? 'Parqueadero inactivado' : 'Parqueadero reactivado', 'success');
    cargar();
  } catch (error) {
    // PARQUEADERO_CON_VEHICULOS: «Hay N vehículos dentro del parqueadero.»
    if (error.status !== 401 && error.status !== 403) mostrarAviso(error.message, 'error');
  }
}

// ---------------------------------------------------------------- nuevo / editar (HU-17, HU-18 E1)
const dialogo = $('dialogo-parqueadero');
const formulario = $('form-parqueadero');
const campos = {
  nombre: $('parqueadero-nombre'),
  direccion: $('parqueadero-direccion'),
  pisos: $('parqueadero-pisos'),
  horario: $('parqueadero-horario'),
};
const alerta = $('parqueadero-alerta');
const guardar = $('parqueadero-guardar');

function abrirFormulario({ parqueadero = null, origen }) {
  estado.editando = parqueadero;
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  $('dialogo-parqueadero-titulo').textContent = parqueadero ? `Editar · ${parqueadero.nombre}` : 'Nuevo parqueadero';
  campos.nombre.value = parqueadero?.nombre ?? '';
  campos.direccion.value = parqueadero?.direccion ?? '';
  campos.pisos.value = parqueadero ? String(parqueadero.pisos) : '1';
  campos.horario.value = parqueadero?.horario ?? '';
  abrirDialogo(dialogo, { origen, foco: campos.nombre });
}

async function abrirEdicion(id, origen) {
  try {
    abrirFormulario({ parqueadero: await obtenerParqueadero(id), origen });
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
}

function validar() {
  const nombre = campos.nombre.value.trim();
  const pisos = Number(campos.pisos.value);
  let valido = marcarCampo(campos.nombre, nombre.length < 3 ? 'El nombre debe tener al menos 3 caracteres.' : '');
  valido = marcarCampo(campos.direccion, campos.direccion.value.trim().length < 5 ? 'Ingrese la dirección.' : '') && valido;
  valido =
    marcarCampo(campos.pisos, !Number.isInteger(pisos) || pisos < 1 || pisos > 20 ? 'Los pisos van de 1 a 20.' : '') && valido;
  if (!valido) formulario.querySelector('[aria-invalid="true"]')?.focus();
  return valido;
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  if (!validar()) return;
  const datos = {
    nombre: campos.nombre.value.trim(),
    direccion: campos.direccion.value.trim(),
    pisos: Number(campos.pisos.value),
    horario: campos.horario.value.trim() || undefined,
  };
  botonCargando(guardar, true, 'Guardando…');
  try {
    if (estado.editando) {
      await actualizarParqueadero(estado.editando.idParqueadero, datos);
      mostrarAviso('Parqueadero actualizado', 'success');
    } else {
      await crearParqueadero(datos);
      mostrarAviso('Parqueadero creado', 'success');
    }
    cerrarDialogo(dialogo);
    cargar(estado.editando ? estado.page : 1);
  } catch (error) {
    if (error.code === 'PARQUEADERO_DUPLICADO') {
      marcarCampo(campos.nombre, error.message);
      campos.nombre.focus();
    } else if (error.code === 'PISOS_CON_CELDAS') {
      marcarCampo(campos.pisos, error.message);
      campos.pisos.focus();
    } else if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, {
        nombre: 'parqueadero-nombre',
        direccion: 'parqueadero-direccion',
        pisos: 'parqueadero-pisos',
        horario: 'parqueadero-horario',
      });
      if (sinCampo.length) mostrarAlerta(alerta, sinCampo.join(' '), 'error');
    } else if (error.status !== 401 && error.status !== 403) {
      mostrarAlerta(alerta, error.message, 'error');
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
  const editar = Number(parametro('editar'));
  if (editar && puede.editar) abrirEdicion(editar, $('accion-nuevo'));
}
