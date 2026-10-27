/**
 * Pico y placa — REQ-CAR-4: tabla de restricciones por día (admin y operador).
 * Las reglas de hoy se resaltan; la entrada se rechaza con la hora del servidor.
 * HTML en app/pico-placa.html.
 */
import { montarMarco } from './comun/marco-app.js';
import { abrirModal, cerrarModal, confirmar, mostrarAviso } from './comun/dialogos.js';
import { ponerChip, marcarCampo, mostrarAlerta, botonCargando } from './comun/plantillas.js';
import { conectarTabla } from './comun/tablas.js';
import {
  listarReglas,
  reglasDeHoy,
  crearRegla,
  actualizarRegla,
  cambiarActivaRegla,
} from '../services/pico-placa.service.js';
import { tienePermiso } from '../utils/sesion.js';

const $ = (id) => document.getElementById(id);
const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const estado = {
  sesion: null,
  hoy: null,
  editando: null,
  filtros: { tipo_vehiculo: '', dia_semana: '' },
};
const gestiona = () => tienePermiso(estado.sesion, 'pico_placa.gestionar');
const control = {
  dia_semana: $('regla-dia'),
  digito: $('regla-digito'),
  hora_inicio: $('regla-inicio'),
  hora_fin: $('regla-fin'),
};
const alerta = $('regla-alerta');
const guardar = $('regla-guardar');
const formulario = $('form-regla');

const tabla = conectarTabla($('tabla-reglas'), {
  plantilla: 'tpl-regla',
  rellenar: (fila, r) => {
    const hoy = estado.hoy?.dia_semana;
    const [dia, tipo, digito, horario, chip, acciones] = fila.cells;
    fila.classList.toggle('is-highlighted', r.dia_semana === hoy && r.activa);
    dia.textContent = r.dia_semana === hoy ? `${DIAS[r.dia_semana]} · hoy` : DIAS[r.dia_semana];
    const moto = r.tipo_vehiculo === 'moto';
    tipo
      .querySelector('use')
      .setAttribute('href', `/assets/icons.svg#${moto ? 'i-moto' : 'i-car'}`);
    tipo.querySelector('span > span').textContent = moto
      ? 'Moto · primer dígito'
      : 'Carro · último dígito';
    digito.firstElementChild.textContent = String(r.digito);
    horario.textContent = `${r.hora_inicio}–${r.hora_fin}`;
    ponerChip(
      chip.firstElementChild,
      r.activa ? 'Activa' : 'Inactiva',
      r.activa ? 'free' : 'neutral'
    );
    const botones = acciones.firstElementChild;
    botones.classList.toggle('hidden', !gestiona());
    const [editar, alternar] = botones.children;
    alternar.querySelector('span').textContent = r.activa ? 'Desactivar' : 'Activar';
    editar.addEventListener('click', () => abrirFormulario(r, editar));
    alternar.addEventListener('click', () => alternarActiva(r, alternar));
  },
});

function digitosDe(tipo) {
  return (
    estado.hoy.reglas
      .filter((r) => r.tipo_vehiculo === tipo)
      .map((r) => `${r.digito} (${r.hora_inicio}–${r.hora_fin})`)
      .join(' · ') || 'Sin restricción'
  );
}

function abrirFormulario(regla, origen) {
  estado.editando = regla;
  $('modal-regla-titulo').textContent = regla ? 'Editar regla' : 'Nueva regla de pico y placa';
  guardar.querySelector('span').textContent = regla ? 'Guardar cambios' : 'Crear regla';
  formulario.querySelector(`input[value="${regla?.tipo_vehiculo ?? 'carro'}"]`).checked = true;
  control.dia_semana.value = String(regla?.dia_semana ?? 1);
  control.digito.value = String(regla?.digito ?? 0);
  control.hora_inicio.value = regla?.hora_inicio ?? '05:00';
  control.hora_fin.value = regla?.hora_fin ?? '20:00';
  Object.values(control).forEach((c) => marcarCampo(c, ''));
  mostrarAlerta(alerta, '');
  abrirModal($('modal-regla'), { origen });
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrarAlerta(alerta, '');
  Object.values(control).forEach((c) => marcarCampo(c, ''));
  if (control.hora_fin.value <= control.hora_inicio.value) {
    marcarCampo(control.hora_fin, 'Debe ser posterior a la hora de inicio.');
    return;
  }
  const datos = {
    tipo_vehiculo: formulario.querySelector('input[name="tipo-regla"]:checked').value,
    dia_semana: Number(control.dia_semana.value),
    digito: Number(control.digito.value),
    hora_inicio: control.hora_inicio.value,
    hora_fin: control.hora_fin.value,
  };
  const editando = estado.editando;
  botonCargando(guardar, true, 'Guardando…');
  try {
    const guardada = editando ? await actualizarRegla(editando.id, datos) : await crearRegla(datos);
    mostrarAviso(
      `Regla ${editando ? 'actualizada' : 'creada'}: ${guardada.descripcion}.`,
      'success'
    );
    cerrarModal($('modal-regla'));
    await recargar();
  } catch (error) {
    for (const d of error.detalles ?? [])
      if (control[d.campo]) marcarCampo(control[d.campo], d.mensaje);
    mostrarAlerta(alerta, error.message);
  } finally {
    botonCargando(guardar, false);
  }
});

async function alternarActiva(regla, origen) {
  const ok = await confirmar({
    titulo: regla.activa ? 'Desactivar regla' : 'Activar regla',
    mensaje: `${DIAS[regla.dia_semana]}: ${regla.descripcion}.`,
    textoConfirmar: regla.activa ? 'Desactivar' : 'Activar',
    origen,
  });
  if (!ok) return;
  try {
    await cambiarActivaRegla(regla.id, !regla.activa);
    mostrarAviso(`Regla ${regla.activa ? 'desactivada' : 'activada'}.`, 'success');
    await recargar();
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }
}

async function recargar() {
  try {
    const filtros = Object.fromEntries(Object.entries(estado.filtros).filter(([, v]) => v));
    const [reglas, hoy] = await Promise.all([listarReglas(filtros), reglasDeHoy()]);
    estado.hoy = hoy;
    $('panel-hoy-titulo').textContent = `Hoy, ${hoy.dia_nombre}`;
    $('hoy-carro').textContent = digitosDe('carro');
    $('hoy-moto').textContent = digitosDe('moto');
    $('panel-hoy').classList.remove('hidden');
    tabla.pintar(reglas);
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }
}

async function iniciar() {
  const app = await montarMarco({ paginaId: 'pico-placa' });
  if (!app) return;
  estado.sesion = app.sesion;
  if (gestiona()) {
    $('pagina-acciones').classList.remove('hidden');
    $('accion-nueva').classList.remove('hidden');
    $('accion-nueva').addEventListener('click', (e) => abrirFormulario(null, e.currentTarget));
  }
  $('filtro-tipo').addEventListener('change', (e) => {
    estado.filtros.tipo_vehiculo = e.target.value;
    recargar();
  });
  $('filtro-dia').addEventListener('change', (e) => {
    estado.filtros.dia_semana = e.target.value;
    recargar();
  });
  await recargar();
}

iniciar();
