/**
 * Catálogo de componentes (SOLO DESARROLLO): muestra las clases Atomic Design (atom-*,
 * molecule-*, organism-*) con sus variantes para compararlas con docs/diseno-parko/.
 * Todo el marcado está en app/_catalogo.html; aquí solo los eventos de demostración.
 */
import { montarMarcoPublico } from './comun/marco-publico.js';
import { abrirModal, mostrarAviso } from './comun/dialogos.js';
import { botonCargando } from './comun/plantillas.js';
import { conectarPestanas } from './comun/pestanas.js';
import { iniciarCuentaRegresiva } from './comun/cuenta-regresiva.js';

const $ = (id) => document.getElementById(id);

for (const [id, v] of [
  ['demo-medidor', 64],
  ['demo-medidor-naranja', 67],
]) {
  $(id).firstElementChild.style.setProperty('--v', String(v));
}
$('demo-kpi').textContent = '64';
$('demo-kpi-nota').textContent = '28 de 44 espacios habilitados';
$('demo-kpi-2').textContent = '16';
$('demo-kpi-2-nota').textContent = 'S1: 9 · S2: 7';

$('demo-cargando').addEventListener('click', (e) => {
  const boton = e.currentTarget;
  botonCargando(boton, true, 'Guardando…');
  setTimeout(() => botonCargando(boton, false), 1500);
});
$('demo-aviso').addEventListener('click', () =>
  mostrarAviso('Ingreso registrado: MNP 908 → A-04.', 'success')
);
$('demo-modal-abrir').addEventListener('click', (e) =>
  abrirModal($('demo-modal'), { origen: e.currentTarget })
);
conectarPestanas($('demo-pestanas'), { onChange: () => {} });
iniciarCuentaRegresiva($('demo-cuenta'), {
  hasta: new Date(Date.now() + 30 * 60 * 1000),
  etiqueta: 'Para llegar a A-04',
});
$('demo-fila').style.setProperty('--cols', '4');

montarMarcoPublico();
