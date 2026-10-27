/**
 * Notificaciones (wireframe 08 corregido) — REQ-NOT-1: bandeja con pestañas Todas / No
 * leídas, marcar leída(s); el administrador envía mensajes a un usuario, a un rol o a todos.
 * Se refresca en vivo con el evento `parko:notificaciones` que emite la campana.
 * HTML en app/notificaciones.html.
 */
import { montarMarco } from './comun/marco-app.js';
import { mostrarAviso } from './comun/dialogos.js';
import {
  clonar,
  ponerChip,
  marcarCampo,
  mostrarAlerta,
  botonCargando,
} from './comun/plantillas.js';
import { conectarPestanas } from './comun/pestanas.js';
import { conectarSelectorUsuario } from './comun/selector-usuario.js';
import {
  misNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
  enviarNotificacion,
} from '../services/notificaciones.service.js';
import { listarUsuarios } from '../services/usuarios.service.js';
import { formatearFechaHora } from '../utils/formato.js';
import { tienePermiso } from '../utils/sesion.js';

const $ = (id) => document.getElementById(id);
const TIPOS = {
  incidencia: 'Incidencia',
  pico_placa: 'Pico y placa',
  perfil_actualizado: 'Datos actualizados',
  membresia_por_vencer: 'Mensualidad',
  reserva_expirada: 'Reserva',
  manual: 'Mensaje',
};
const estado = { pestana: 'todas', pagina: 1, meta: null };

// ---------------------------------------------------------------- bandeja
function itemBandeja(n) {
  const item = clonar('tpl-aviso-bandeja');
  item.dataset.id = String(n.id);
  item.classList.toggle('is-unread', !n.leida);
  const [chip, meta] = item.querySelector('.molecule-notification-item-meta').children;
  const tipo = TIPOS[n.tipo] ?? n.tipo;
  ponerChip(chip, n.leida ? tipo : `Nueva · ${tipo}`, n.leida ? 'neutral' : 'reserved');
  meta.textContent = `${formatearFechaHora(n.fecha)}${n.enviada_por ? ` · de ${n.enviada_por.nombre}` : ' · sistema'}`;
  item.querySelector('.molecule-notification-item-title').textContent = n.titulo;
  item.querySelector('.molecule-notification-item-text').textContent = n.mensaje;
  const [abrir, leer] = item.querySelector('.molecule-notification-item-actions').children;
  if (n.enlace) {
    abrir.href = n.enlace;
    abrir.classList.remove('hidden');
  }
  if (!n.leida) {
    leer.classList.remove('hidden');
    leer.setAttribute('aria-label', `Marcar como leída: ${n.titulo}`);
    leer.addEventListener('click', async () => {
      try {
        await marcarLeida(n.id);
        await recargar();
      } catch (error) {
        mostrarAviso(error.message, 'error');
      }
    });
  }
  item
    .querySelector('.molecule-notification-item-actions')
    .classList.toggle('hidden', !n.enlace && n.leida);
  return item;
}

function pintar({ data, meta }) {
  estado.meta = meta;
  $('leer-todas').disabled = meta.no_leidas === 0;
  $('tab-bandeja-lista-no-leidas').textContent = meta.no_leidas
    ? `No leídas (${meta.no_leidas})`
    : 'No leídas';
  $('bandeja-items').replaceChildren(...data.map(itemBandeja));
  const vacia = data.length === 0;
  $('bandeja-items').classList.toggle('hidden', vacia);
  $('bandeja-vacia').classList.toggle('hidden', !vacia);
  const noLeidas = estado.pestana === 'no-leidas';
  $('bandeja-vacia').querySelector('strong').textContent = noLeidas
    ? 'Todo al día'
    : 'Sin notificaciones';
  $('bandeja-vacia').querySelector('p').textContent = noLeidas
    ? 'No tienes notificaciones sin leer.'
    : 'Aquí verás los avisos del sistema y los mensajes del administrador.';
  $('bandeja-paginacion').classList.toggle('hidden', vacia);
  const totalPaginas = Math.max(1, meta.total_paginas);
  $('bandeja-anterior').disabled = meta.pagina <= 1;
  $('bandeja-siguiente').disabled = meta.pagina >= totalPaginas;
  $('bandeja-estado').textContent =
    `Página ${meta.pagina} de ${totalPaginas} · ${meta.total === 1 ? '1 registro' : `${meta.total} registros`}`;
}

async function recargar() {
  try {
    pintar(
      await misNotificaciones({
        pagina: estado.pagina,
        limite: 10,
        leida: estado.pestana === 'no-leidas' ? '0' : undefined,
      })
    );
  } catch (error) {
    mostrarAviso(error.message, 'error');
  } finally {
    $('bandeja-cargando').classList.add('hidden');
  }
}

// Un solo panel para las dos pestañas: aria-controls de ambas apunta a la misma lista.
$('tab-bandeja-lista-no-leidas').setAttribute('aria-controls', 'bandeja-lista');
conectarPestanas($('pestanas'), {
  onChange: (id) => {
    estado.pestana = id;
    estado.pagina = 1;
    $('bandeja-lista').classList.remove('hidden');
    $('bandeja-lista').setAttribute(
      'aria-labelledby',
      `tab-${id === 'todas' ? 'bandeja-lista' : 'bandeja-lista-no-leidas'}`
    );
    recargar();
  },
});
$('bandeja-anterior').addEventListener('click', () => {
  estado.pagina -= 1;
  recargar();
});
$('bandeja-siguiente').addEventListener('click', () => {
  estado.pagina += 1;
  recargar();
});
$('leer-todas').addEventListener('click', async () => {
  try {
    const { marcadas } = await marcarTodasLeidas();
    mostrarAviso(
      marcadas ? `${marcadas} notificación(es) marcadas como leídas.` : 'No había pendientes.',
      'success'
    );
    await recargar();
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }
});

// ---------------------------------------------------------------- envío manual (admin)
function prepararEnvio() {
  const formulario = $('form-envio');
  const titulo = $('envio-titulo');
  const mensaje = $('envio-mensaje');
  const rol = $('envio-rol');
  const alerta = $('envio-alerta');
  const enviar = $('envio-enviar');
  const destino = () => formulario.querySelector('input[name="destino"]:checked').value;
  const selector = conectarSelectorUsuario('envio-usuario', {
    vacio: 'No hay usuarios activos con ese documento.',
    buscar: async (documento) =>
      (await listarUsuarios({ q: documento, estado: 'activo', limite: 8 })).data,
  });

  function mostrarDestino() {
    $('envio-usuario').classList.toggle('hidden', destino() !== 'usuario');
    $('campo-rol').classList.toggle('hidden', destino() !== 'rol');
  }
  formulario.addEventListener('change', (e) => {
    if (e.target.name === 'destino') mostrarDestino();
  });

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarAlerta(alerta, '');
    [titulo, mensaje, rol].forEach((c) => marcarCampo(c, ''));
    selector.error('');
    let ok = true;
    if (destino() === 'usuario' && !selector.valor()) {
      selector.error('Elige el usuario.');
      ok = false;
    }
    if (titulo.value.trim().length < 3) ok = marcarCampo(titulo, 'Mínimo 3 caracteres.');
    if (mensaje.value.trim().length < 3) ok = marcarCampo(mensaje, 'Mínimo 3 caracteres.');
    if (!ok) return;
    botonCargando(enviar, true, 'Enviando…');
    try {
      const { enviadas } = await enviarNotificacion({
        destino: destino(),
        usuario_id: destino() === 'usuario' ? selector.valor().id : undefined,
        rol: destino() === 'rol' ? rol.value : undefined,
        titulo: titulo.value.trim(),
        mensaje: mensaje.value.trim(),
      });
      mostrarAviso(`Notificación enviada a ${enviadas} usuario(s).`, 'success');
      titulo.value = '';
      mensaje.value = '';
    } catch (error) {
      const campos = { titulo, mensaje, rol };
      for (const d of error.detalles ?? [])
        if (campos[d.campo]) marcarCampo(campos[d.campo], d.mensaje);
      mostrarAlerta(alerta, error.message);
    } finally {
      botonCargando(enviar, false);
    }
  });
  mostrarDestino();
}

async function iniciar() {
  const app = await montarMarco({ paginaId: 'notificaciones', abiertaATodos: true });
  if (!app) return;
  if (tienePermiso(app.sesion, 'notificaciones.enviar')) {
    $('notificaciones-rejilla').classList.add('template-app-layout-grid');
    $('panel-envio').classList.remove('hidden');
    prepararEnvio();
  }
  // Llega una notificación o se leen en otra pestaña: la bandeja se refresca sola.
  document.addEventListener('parko:notificaciones', (e) => {
    if (e.detail.tipo !== 'conteo') recargar();
  });
  await recargar();
}

iniciar();
