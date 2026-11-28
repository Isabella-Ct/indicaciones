// Página · Configuración › Parqueaderos › Detalle (HU-17 E5, HU-19): datos, celdas por piso y
// tipo, y puertas de acceso (agregar, editar e inactivar).
import { obtenerParqueadero, crearPuerta, actualizarPuerta } from '../services/parqueaderos.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { ponerChipActivo } from '../components/atomos/chip-estado.js';
import { botonCargando } from '../components/atomos/boton.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { abrirDialogo, cerrarDialogo } from '../components/organismos/modal.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, parametro, mostrar } from '../utils/dom.js';

const marco = montarMarco({ permiso: 'parqueaderos.ver', alSalir: cerrarSesion });

const USO_PUERTA = { mixta: 'Entrada y salida', entrada: 'Solo entrada', salida: 'Solo salida' };
const TIPO_VEHICULO = { carro: 'Carros', moto: 'Motos' };
const puedeEditar = tienePermiso('parqueaderos.editar');
const idParqueadero = Number(parametro('id'));
const estado = { parqueadero: null, editando: null };

const tablaResumen = conectarTabla($('tabla-resumen'), {
  plantilla: 'tpl-resumen',
  rellenar(fila, r) {
    fila.querySelector('.js-piso').textContent = `Piso ${r.piso}`;
    fila.querySelector('.js-tipo').textContent = TIPO_VEHICULO[r.tipoVehiculo] ?? r.tipoVehiculo;
    for (const clave of ['total', 'disponibles', 'ocupadas', 'reservadas', 'inhabilitadas']) {
      fila.querySelector(`.js-${clave}`).textContent = String(r[clave] ?? 0);
    }
  },
});

const tablaPuertas = conectarTabla($('tabla-puertas'), {
  plantilla: 'tpl-puerta',
  idDe: (p) => p.idPuerta,
  rellenar(fila, puerta) {
    fila.querySelector('.js-nombre').textContent = puerta.nombre;
    fila.querySelector('.js-tipo').textContent = USO_PUERTA[puerta.tipo] ?? puerta.tipo;
    ponerChipActivo(fila.querySelector('.js-estado'), puerta.estado);
    const editar = fila.querySelector('.js-editar');
    editar.classList.toggle('hidden', !puedeEditar);
    editar.setAttribute('aria-label', `Editar la puerta ${puerta.nombre}`);
    editar.addEventListener('click', () => abrirFormulario({ puerta, origen: editar }));
  },
});

async function cargar() {
  try {
    const p = await obtenerParqueadero(idParqueadero);
    estado.parqueadero = p;
    document.title = `PARKO · ${p.nombre}`;
    $('detalle-nombre').textContent = p.nombre;
    $('detalle-direccion').textContent = p.direccion;
    $('detalle-pisos').textContent = String(p.pisos);
    $('detalle-horario').textContent = p.horario;
    ponerChipActivo($('detalle-estado'), p.estado);
    $('detalle-celdas').href = `/celdas.html?parqueadero=${p.idParqueadero}`;
    mostrar($('detalle-celdas'), tienePermiso('celdas.ver'));
    // Un parqueadero inactivo no admite puertas nuevas (PARQUEADERO_INACTIVO).
    mostrar($('accion-nueva-puerta'), puedeEditar && p.estado === 'activo');
    tablaResumen.pintar(p.resumen ?? []);
    tablaPuertas.pintar(p.puertas ?? []);
    mostrar($('detalle-contenido'));
  } catch (error) {
    if (error.status === 404 || error.status === 422) mostrar($('detalle-no-encontrado'));
    else if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
}

// ---------------------------------------------------------------- nueva / editar puerta (HU-19)
const dialogo = $('dialogo-puerta');
const formulario = $('form-puerta');
const campoNombre = $('puerta-nombre');
const campoTipo = $('puerta-tipo');
const campoEstado = $('puerta-estado');
const alerta = $('puerta-alerta');
const guardar = $('puerta-guardar');

function abrirFormulario({ puerta = null, origen }) {
  estado.editando = puerta;
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  $('dialogo-puerta-titulo').textContent = puerta ? `Editar puerta · ${puerta.nombre}` : 'Nueva puerta';
  campoNombre.value = puerta?.nombre ?? '';
  campoTipo.value = puerta?.tipo ?? 'mixta';
  campoEstado.value = puerta?.estado ?? 'activo';
  mostrar($('puerta-estado-campo'), Boolean(puerta));
  abrirDialogo(dialogo, { origen, foco: campoNombre });
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  const nombre = campoNombre.value.trim();
  if (!marcarCampo(campoNombre, nombre.length < 2 ? 'Ingrese el nombre de la puerta.' : '')) {
    campoNombre.focus();
    return;
  }
  botonCargando(guardar, true, 'Guardando…');
  try {
    if (estado.editando) {
      await actualizarPuerta(estado.editando.idPuerta, { nombre, tipo: campoTipo.value, estado: campoEstado.value });
      mostrarAviso('Puerta actualizada', 'success');
    } else {
      await crearPuerta(idParqueadero, { nombre, tipo: campoTipo.value });
      mostrarAviso('Puerta agregada', 'success');
    }
    cerrarDialogo(dialogo);
    cargar();
  } catch (error) {
    if (error.code === 'PUERTA_DUPLICADA') {
      marcarCampo(campoNombre, error.message);
      campoNombre.focus();
    } else if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, { nombre: 'puerta-nombre', tipo: 'puerta-tipo', estado: 'puerta-estado' });
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
  $('accion-nueva-puerta').addEventListener('click', (e) => abrirFormulario({ origen: e.currentTarget }));
  if (idParqueadero > 0) cargar();
  else mostrar($('detalle-no-encontrado'));
}
