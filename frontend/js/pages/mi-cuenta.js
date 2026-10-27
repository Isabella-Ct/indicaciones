/**
 * Mi cuenta (todos los roles) — REQ-USR-4: editar mis nombres, correo, celular y
 * foto (notifica a los administradores) y cambiar mi contraseña. Los clientes
 * ven además "Mis vehículos"; todos, sus últimas notificaciones. Estadías, facturas, membresías,
 * reservas e incidencias del cliente están en Mis movimientos (Fase 7).
 * HTML en app/mi-cuenta.html.
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
import { conectarTabla, texto } from './comun/tablas.js';
import { conectarFoto } from './comun/foto.js';
import { PATRON_CELULAR, PATRON_CORREO } from './comun/formularios.js';
import {
  obtenerMiPerfil,
  actualizarMiPerfil,
  listarMisVehiculos,
} from '../services/usuarios.service.js';
import { cambiarContrasena } from '../services/auth.service.js';
import { misNotificaciones } from '../services/notificaciones.service.js';
import { guardarAviso } from '../utils/almacen.js';
import { formatearFechaHora } from '../utils/formato.js';
import { formatearPlaca } from '../utils/placa.js';
import { etiquetaRol, tienePermiso } from '../utils/sesion.js';

const $ = (id) => document.getElementById(id);
const TIPOS = {
  incidencia: 'Incidencia',
  pico_placa: 'Pico y placa',
  perfil_actualizado: 'Datos actualizados',
  membresia_por_vencer: 'Mensualidad',
  reserva_expirada: 'Reserva',
  manual: 'Mensaje',
};

// ---------------------------------------------------------------- mis datos
const NOMBRES = [
  'primer_nombre',
  'segundo_nombre',
  'primer_apellido',
  'segundo_apellido',
  'correo',
  'celular',
];
const foto = conectarFoto('mi-foto');

function prepararDatos(perfil, sesion) {
  $('dato-codigo').textContent = String(perfil.id).padStart(5, '0');
  $('dato-documento').textContent = `${perfil.tipo_documento} ${perfil.numero_documento}`;
  $('dato-rol').textContent = etiquetaRol(perfil.rol);
  $('dato-estado').textContent = perfil.estado === 'activo' ? 'Activo' : 'Inactivo';
  $('datos-nota').textContent =
    sesion.rol === 'administrador'
      ? 'El documento y el rol se cambian desde Usuarios.'
      : 'El documento, el rol y el estado solo los cambia el administrador. Al guardar, se le notificará el cambio.';
  for (const nombre of NOMBRES) $(nombre).value = perfil[nombre] ?? '';
  foto.reiniciar({ fotoUrl: perfil.foto_url, nombre: perfil.nombre_completo });

  const formulario = $('form-datos');
  const alerta = $('datos-alerta');
  const guardar = $('datos-guardar');

  function validar() {
    let ok = true;
    for (const nombre of ['primer_nombre', 'primer_apellido', 'correo', 'celular']) {
      if (!$(nombre).value.trim()) ok = marcarCampo($(nombre), 'Este campo es obligatorio.');
    }
    const correo = $('correo').value.trim();
    if (correo && !PATRON_CORREO.test(correo))
      ok = marcarCampo($('correo'), 'Escribe un correo válido.');
    const celular = $('celular').value.trim();
    if (celular && !PATRON_CELULAR.test(celular))
      ok = marcarCampo($('celular'), 'Celular de 10 dígitos que empieza por 3.');
    return ok;
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mostrarAlerta(alerta, '');
    NOMBRES.forEach((n) => marcarCampo($(n), ''));
    if (!validar()) {
      formulario.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    botonCargando(guardar, true, 'Guardando…');
    try {
      const { meta } = await actualizarMiPerfil(new FormData(formulario));
      if (meta.campos_cambiados.length === 0) {
        botonCargando(guardar, false);
        mostrarAlerta(alerta, 'No hiciste cambios.', 'info');
        return;
      }
      // Se recarga para que el header muestre el nombre y la foto nuevos.
      guardarAviso(
        sesion.rol === 'administrador'
          ? 'Tus datos se actualizaron.'
          : 'Tus datos se actualizaron y se notificó al administrador.',
        'success'
      );
      location.reload();
    } catch (error) {
      botonCargando(guardar, false);
      for (const d of error.detalles ?? []) if ($(d.campo)) marcarCampo($(d.campo), d.mensaje);
      mostrarAlerta(alerta, error.message);
    }
  });
}

// ---------------------------------------------------------------- contraseña
function prepararContrasena() {
  const formulario = $('form-contrasena');
  const actual = $('contrasena-actual');
  const nueva = $('contrasena-nueva');
  const confirmacion = $('contrasena-confirmacion');
  const alerta = $('contrasena-alerta');
  const guardar = $('contrasena-guardar');
  const campos = { contrasena_actual: actual, contrasena_nueva: nueva, confirmacion };

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mostrarAlerta(alerta, '');
    Object.values(campos).forEach((c) => marcarCampo(c, ''));
    let ok = true;
    if (!actual.value) ok = marcarCampo(actual, 'Escribe tu contraseña actual.');
    if (nueva.value.length < 8) ok = marcarCampo(nueva, 'Mínimo 8 caracteres.');
    if (confirmacion.value !== nueva.value)
      ok = marcarCampo(confirmacion, 'Las contraseñas no coinciden.');
    if (!ok) return formulario.querySelector('[aria-invalid="true"]')?.focus();

    botonCargando(guardar, true, 'Guardando…');
    try {
      await cambiarContrasena({ contrasena_actual: actual.value, contrasena_nueva: nueva.value });
      formulario.reset();
      mostrarAlerta(alerta, 'Tu contraseña se cambió correctamente.', 'success');
      mostrarAviso('Contraseña actualizada.', 'success');
    } catch (error) {
      for (const d of error.detalles ?? [])
        if (campos[d.campo]) marcarCampo(campos[d.campo], d.mensaje);
      mostrarAlerta(alerta, error.message);
    } finally {
      botonCargando(guardar, false);
    }
  });
}

// ---------------------------------------------------------------- vehículos y avisos
async function cargarVehiculos() {
  $('bloque-vehiculos').classList.remove('hidden');
  const tabla = conectarTabla($('tabla-vehiculos'), {
    plantilla: 'tpl-vehiculo',
    rellenar: (fila, v) => {
      const [placa, tipo, marca, color] = fila.cells;
      placa.firstElementChild.textContent = formatearPlaca(v.placa);
      tipo.textContent = v.tipo === 'moto' ? 'Moto' : 'Carro';
      marca.textContent = texto(`${v.marca ?? ''} ${v.modelo ?? ''}`.trim());
      color.textContent = texto(v.color);
    },
  });
  try {
    tabla.pintar(await listarMisVehiculos());
  } catch (error) {
    tabla.pintar([]);
    mostrarAviso(error.message, 'error');
  }
}

/** Últimas notificaciones (la bandeja completa está en Notificaciones). */
async function cargarAvisos() {
  let datos = { data: [], meta: { no_leidas: 0 } };
  try {
    datos = await misNotificaciones({ limite: 5 });
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }
  $('avisos-lista').replaceChildren(
    ...datos.data.map((n) => {
      const item = clonar('tpl-aviso-cuenta');
      item.classList.toggle('is-unread', !n.leida);
      const [chip, meta] = item.querySelector('.molecule-notification-item-meta').children;
      const tipo = TIPOS[n.tipo] ?? n.tipo;
      ponerChip(chip, n.leida ? tipo : `Nueva · ${tipo}`, n.leida ? 'neutral' : 'reserved');
      meta.textContent = `${formatearFechaHora(n.fecha)}${n.enviada_por ? ` · de ${n.enviada_por.nombre}` : ' · sistema'}`;
      item.querySelector('.molecule-notification-item-title').textContent = n.titulo;
      item.querySelector('.molecule-notification-item-text').textContent = n.mensaje;
      return item;
    })
  );
  $('avisos-lista').classList.toggle('hidden', datos.data.length === 0);
  $('avisos-vacia').classList.toggle('hidden', datos.data.length > 0);
  $('avisos-resumen').textContent = datos.meta.no_leidas
    ? `Tienes ${datos.meta.no_leidas} sin leer.`
    : 'Estás al día.';
}

async function iniciar() {
  const app = await montarMarco({ paginaId: 'mi-cuenta', abiertaATodos: true });
  if (!app) return;
  const { sesion } = app;
  $('pagina-subtitulo').textContent =
    `// ${etiquetaRol(sesion.rol)} · ${sesion.tipo_documento} ${sesion.numero_documento}`;
  prepararContrasena();
  try {
    prepararDatos(await obtenerMiPerfil(), sesion);
  } catch (error) {
    mostrarAviso(error.message, 'error');
  }
  if (tienePermiso(sesion, 'portal.ver')) await cargarVehiculos();
  await cargarAvisos();
}

iniciar();
