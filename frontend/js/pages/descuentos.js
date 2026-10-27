/**
 * Descuentos (wireframe 09 con estilo PARKO) — REQ-DES-1: descripción + porcentaje 0–100.
 * El administrador los gestiona; el operador los consulta (solo activos, los que ofrece al
 * cobrar). Se aplica uno por factura. Borrado lógico (activo). HTML en app/descuentos.html.
 */
import { montarMarco } from './comun/marco-app.js';
import { abrirModal, cerrarModal, confirmar, mostrarAviso } from './comun/dialogos.js';
import { marcarCampo, mostrarAlerta, botonCargando } from './comun/plantillas.js';
import { conectarTabla, texto } from './comun/tablas.js';
import { tienePermiso } from '../utils/sesion.js';
import {
  listarDescuentos,
  crearDescuento,
  actualizarDescuento,
  cambiarActivoDescuento,
} from '../services/facturacion.service.js';

const $ = (id) => document.getElementById(id);
const estado = { sesion: null, editando: null };
const gestiona = () => tienePermiso(estado.sesion, 'descuentos.gestionar');
const control = {
  nombre: $('descuento-nombre'),
  porcentaje: $('descuento-porcentaje'),
  descripcion: $('descuento-descripcion'),
};
const alerta = $('descuento-alerta');
const guardar = $('descuento-guardar');

const tabla = conectarTabla($('tabla-descuentos'), {
  plantilla: 'tpl-descuento',
  rellenar: (fila, d) => {
    const [nombre, descripcion, porcentaje, chipCelda, acciones] = fila.cells;
    nombre.firstElementChild.textContent = d.nombre;
    descripcion.textContent = texto(d.descripcion);
    porcentaje.firstElementChild.textContent = `${d.porcentaje} %`;
    const chip = chipCelda.firstElementChild;
    chip.textContent = d.activo ? 'Activo' : 'Inactivo';
    chip.classList.toggle('atom-status-chip--free', d.activo);
    acciones.classList.toggle('hidden', !gestiona());
    const [editar, alternar] = acciones.querySelectorAll('button');
    alternar.querySelector('span').textContent = d.activo ? 'Desactivar' : 'Activar';
    editar.addEventListener('click', () => abrirFormulario(d, editar));
    alternar.addEventListener('click', () => alternarActivo(d, alternar));
  },
});

function abrirFormulario(descuento, origen) {
  estado.editando = descuento;
  $('modal-descuento-titulo').textContent = descuento
    ? `Editar ${descuento.nombre}`
    : 'Nuevo descuento';
  guardar.querySelector('span').textContent = descuento ? 'Guardar cambios' : 'Crear descuento';
  control.nombre.value = descuento?.nombre ?? '';
  control.porcentaje.value = descuento ? String(descuento.porcentaje) : '';
  control.descripcion.value = descuento?.descripcion ?? '';
  Object.values(control).forEach((c) => marcarCampo(c, ''));
  mostrarAlerta(alerta, '');
  abrirModal($('modal-descuento'), { origen });
}

$('form-descuento').addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrarAlerta(alerta, '');
  Object.values(control).forEach((c) => marcarCampo(c, ''));
  const porcentaje = Number(control.porcentaje.value);
  let ok = true;
  if (!control.nombre.value.trim()) ok = marcarCampo(control.nombre, 'Escribe el nombre.');
  if (control.porcentaje.value === '' || !(porcentaje >= 0 && porcentaje <= 100))
    ok = marcarCampo(control.porcentaje, 'El porcentaje va de 0 a 100.');
  if (!ok) return;
  const datos = {
    nombre: control.nombre.value.trim(),
    porcentaje,
    descripcion: control.descripcion.value.trim() || null,
  };
  const editando = estado.editando;
  botonCargando(guardar, true, 'Guardando…');
  try {
    const guardado = editando
      ? await actualizarDescuento(editando.id, datos)
      : await crearDescuento(datos);
    mostrarAviso(
      `Descuento "${guardado.nombre}" ${editando ? 'actualizado' : 'creado'}.`,
      'success'
    );
    cerrarModal($('modal-descuento'));
    await recargar();
  } catch (error) {
    for (const d of error.detalles ?? [])
      if (control[d.campo]) marcarCampo(control[d.campo], d.mensaje);
    mostrarAlerta(alerta, error.message);
  } finally {
    botonCargando(guardar, false);
  }
});

async function alternarActivo(d, origen) {
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
    mostrarAviso(`Descuento ${d.activo ? 'desactivado' : 'activado'}.`, 'success');
    await recargar();
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }
}

async function recargar() {
  try {
    tabla.pintar(await listarDescuentos());
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }
}

async function iniciar() {
  const app = await montarMarco({ paginaId: 'descuentos' });
  if (!app) return;
  estado.sesion = app.sesion;
  if (gestiona()) {
    $('pagina-subtitulo').textContent =
      '// porcentaje sobre el valor del parqueo · uno por factura';
    $('pagina-acciones').classList.remove('hidden');
    $('accion-nuevo').classList.remove('hidden');
    $('accion-nuevo').addEventListener('click', (e) => abrirFormulario(null, e.currentTarget));
    $('tabla-descuentos').querySelector('.molecule-empty-state p').textContent =
      'Crea el primero con "Nuevo descuento".';
  }
  // La columna de acciones solo existe para quien gestiona.
  $('tabla-descuentos')
    .querySelector('thead th:last-child')
    .classList.toggle('hidden', !gestiona());
  await recargar();
}

iniciar();
