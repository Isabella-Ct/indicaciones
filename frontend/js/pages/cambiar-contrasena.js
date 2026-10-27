/**
 * Cambio de contraseña. Obligatorio en el primer acceso (debe_cambiar_contrasena)
 * y disponible desde el menú de usuario. HTML en app/cambiar-contrasena.html.
 */
import { obtenerSesion, cambiarContrasena, cerrarSesion } from '../services/auth.service.js';
import { montarMarcoPublico } from './comun/marco-publico.js';
import { marcarCampo, mostrarAlerta, botonCargando } from './comun/plantillas.js';
import { guardarAviso } from '../utils/almacen.js';
import { RUTA_INICIO, RUTA_LOGIN } from '../utils/sesion.js';

const MINIMO = 8;
const $ = (id) => document.getElementById(id);
const formulario = $('form-contrasena');
const actual = $('contrasena-actual');
const nueva = $('contrasena-nueva');
const confirmacion = $('contrasena-confirmacion');
const alerta = $('contrasena-alerta');
const guardar = $('contrasena-guardar');
const campos = { contrasena_actual: actual, contrasena_nueva: nueva, confirmacion };

function validar() {
  let valido = true;
  if (!actual.value) valido = marcarCampo(actual, 'Escribe tu contraseña actual.');
  if (nueva.value.length < MINIMO) {
    valido = marcarCampo(nueva, `Debe tener al menos ${MINIMO} caracteres.`);
  } else if (nueva.value === actual.value) {
    valido = marcarCampo(nueva, 'Debe ser distinta de la actual.');
  }
  if (confirmacion.value !== nueva.value) {
    valido = marcarCampo(confirmacion, 'Las contraseñas no coinciden.');
  }
  return valido;
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mostrarAlerta(alerta, '');
  Object.values(campos).forEach((c) => marcarCampo(c, ''));
  if (!validar()) {
    formulario.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  botonCargando(guardar, true, 'Guardando…');
  try {
    await cambiarContrasena({ contrasena_actual: actual.value, contrasena_nueva: nueva.value });
    guardarAviso('Tu contraseña se actualizó correctamente.', 'success');
    location.assign(RUTA_INICIO);
  } catch (error) {
    botonCargando(guardar, false);
    for (const detalle of error.detalles ?? []) {
      if (campos[detalle.campo]) marcarCampo(campos[detalle.campo], detalle.mensaje);
    }
    mostrarAlerta(alerta, error.message);
  }
});

$('contrasena-salir').addEventListener('click', async () => {
  await cerrarSesion().catch(() => {});
  location.assign(RUTA_LOGIN);
});

async function iniciar() {
  montarMarcoPublico();
  const sesion = await obtenerSesion();
  const obligatorio = sesion.debe_cambiar_contrasena;
  $('auth-titulo').textContent = obligatorio ? 'Crea tu contraseña' : 'Cambiar contraseña';
  $('auth-subtitulo').textContent = obligatorio
    ? `// Hola, ${sesion.nombres}: tu contraseña es temporal; crea una nueva para continuar`
    : `// ${sesion.nombre_completo} · ${sesion.tipo_documento} ${sesion.numero_documento}`;
  $('contrasena-actual-etiqueta').firstChild.textContent = obligatorio
    ? 'Contraseña temporal'
    : 'Contraseña actual';
  $('contrasena-salir').classList.toggle('hidden', !obligatorio);
  $('contrasena-volver').classList.toggle('hidden', obligatorio);
  actual.focus();
}

iniciar();
