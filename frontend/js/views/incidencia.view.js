// Página · Incidencias › Detalle (HU-57 E2, HU-58): datos, evidencia (pedida con la sesión y mostrada como imagen),
// historial de seguimiento, nueva nota y cierre con solución. Una incidencia cerrada no admite cambios.
import { obtenerIncidencia, descargarEvidencia, agregarSeguimiento, cerrarIncidencia } from '../services/incidencias.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { confirmar } from '../components/organismos/modal.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerChipIncidencia } from '../components/atomos/chip-estado.js';
import { ponerPlaca } from '../components/atomos/placa.js';
import { botonCargando } from '../components/atomos/boton.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, mostrar, parametro } from '../utils/dom.js';
import { formatearFechaHora } from '../utils/formato.js';

const marco = montarMarco({ permiso: 'incidencias.ver', alSalir: cerrarSesion });

const id = Number(parametro('id'));
const puedeEditar = tienePermiso('incidencias.editar');
/** Estado de la página: la URL de la evidencia para liberarla. */
const estado = { urlEvidencia: null };

const tabla = conectarTabla($('tabla-seguimiento'), {
  plantilla: 'tpl-seguimiento',
  idDe: (s) => s.idSeguimiento,
  rellenar(fila, s) {
    fila.querySelector('.js-fecha').textContent = formatearFechaHora(s.fecha);
    fila.querySelector('.js-usuario').textContent = s.usuario.nombre;
    fila.querySelector('.js-nota').textContent = s.nota;
  },
});

async function pintarEvidencia(i) {
  const img = $('detalle-evidencia');
  const blob = i.tieneEvidencia ? await descargarEvidencia(i.idIncidencia) : null;
  if (estado.urlEvidencia) URL.revokeObjectURL(estado.urlEvidencia);
  estado.urlEvidencia = blob ? URL.createObjectURL(blob) : null;
  if (estado.urlEvidencia) img.src = estado.urlEvidencia;
  mostrar(img, Boolean(estado.urlEvidencia));
  $('detalle-sin-evidencia').textContent = i.tieneEvidencia && !blob ? 'No se pudo cargar la evidencia.' : 'Sin evidencia.';
  mostrar($('detalle-sin-evidencia'), !estado.urlEvidencia);
}

function pintar(i) {
  document.title = `PARKO · Incidencia ${i.codigo}`;
  $('detalle-codigo').textContent = `Incidencia ${i.codigo}`;
  ponerChipIncidencia($('detalle-estado'), i.estado);
  $('detalle-tipo').textContent = i.tipoNombre;
  $('detalle-fecha').textContent = formatearFechaHora(i.fechaHoraEvento);
  ponerPlaca($('detalle-placa'), i.vehiculo.placa);
  $('detalle-celda').textContent = i.celda?.codigo ?? '—';
  $('detalle-operador').textContent = i.operador.nombre;
  $('detalle-descripcion').textContent = i.descripcion;
  tabla.pintar(i.seguimientos);
  const cerrada = i.estado === 'cerrada';
  mostrar($('form-nota'), puedeEditar && !cerrada);
  mostrar($('form-cierre'), puedeEditar && !cerrada);
  mostrar($('detalle-cierre'), cerrada);
  mostrar($('detalle-sin-cierre'), !cerrada && !puedeEditar);
  if (cerrada) {
    $('detalle-solucion').textContent = i.solucion;
    $('detalle-fecha-cierre').textContent = formatearFechaHora(i.fechaCierre);
  }
  mostrar($('detalle-contenido'));
}

async function cargar() {
  try {
    const i = await obtenerIncidencia(id);
    pintar(i);
    await pintarEvidencia(i);
  } catch (error) {
    if (error.status === 404 || error.status === 422) mostrar($('detalle-no-encontrada'));
    else if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
}

/** Envía un formulario de texto (nota o cierre) y repinta el detalle. */
async function enviar({ formulario, control, alerta, boton, min, etiqueta, accion, mapa, exito }) {
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  const valor = control.value.trim();
  if (!marcarCampo(control, valor.length < min || valor.length > 500 ? `${etiqueta} debe tener entre ${min} y 500 caracteres.` : '')) return control.focus();
  botonCargando(boton, true, 'Guardando…');
  try {
    const i = await accion(valor);
    control.value = '';
    mostrarAviso(exito, 'success');
    pintar(i);
  } catch (error) {
    if (error.status === 401) return;
    if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, mapa);
      if (sinCampo.length) mostrarAlerta(alerta, sinCampo.join(' '), 'error');
    } else {
      // INCIDENCIA_CERRADA…
      mostrarAlerta(alerta, error.message, 'error');
      if (error.code === 'INCIDENCIA_CERRADA') cargar();
    }
  } finally {
    botonCargando(boton, false);
  }
}

// ---------------------------------------------------------------- seguimiento (HU-58 E1)
$('form-nota').addEventListener('submit', (e) => {
  e.preventDefault();
  enviar({
    formulario: $('form-nota'),
    control: $('nota-texto'),
    alerta: $('nota-alerta'),
    boton: $('nota-guardar'),
    min: 5,
    etiqueta: 'La nota',
    accion: (nota) => agregarSeguimiento(id, nota),
    mapa: { nota: 'nota-texto' },
    exito: 'Nota de seguimiento agregada',
  });
});

// ---------------------------------------------------------------- cierre (HU-58 E2, E3)
$('form-cierre').addEventListener('submit', async (e) => {
  e.preventDefault();
  const acepta = await confirmar({
    titulo: 'Cerrar la incidencia',
    mensaje: 'Después del cierre la incidencia ya no admite notas ni cambios.',
    textoConfirmar: 'Cerrar incidencia',
    origen: $('cierre-guardar'),
  });
  if (!acepta) return;
  enviar({
    formulario: $('form-cierre'),
    control: $('cierre-solucion'),
    alerta: $('cierre-alerta'),
    boton: $('cierre-guardar'),
    min: 10,
    etiqueta: 'La solución',
    accion: (solucion) => cerrarIncidencia(id, solucion),
    mapa: { solucion: 'cierre-solucion' },
    exito: 'Incidencia cerrada',
  });
});

if (marco?.permitido) {
  if (Number.isInteger(id) && id > 0) cargar();
  else mostrar($('detalle-no-encontrada'));
}
