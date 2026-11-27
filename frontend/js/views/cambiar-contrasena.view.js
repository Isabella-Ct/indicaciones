// Página · Cambiar contraseña (HU-12 E4/E5 · RF-ACC-04): obligatoria con contraseña temporal y disponible
// desde el menú de usuario. Al cambiarla, la sesión sigue y se va a la primera pantalla permitida.
import { cambiarContrasena, cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarContrasena, errorContrasena } from '../components/moleculas/contrasena.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { botonCargando } from '../components/atomos/boton.js';
import { paginaInicial } from '../config/config.js';
import { leerSesion } from '../utils/sesion.js';
import { $, mostrar } from '../utils/dom.js';

const marco = montarMarco({ alSalir: cerrarSesion });

const formulario = $('form-cambio');
const alerta = $('cambio-alerta');
const guardar = $('cambio-guardar');
const actual = $('cambio-actual');
const nueva = $('cambio-nueva');
const confirmacion = $('cambio-confirmacion');

conectarContrasena([actual, nueva, confirmacion], {
  casillaMostrar: $('cambio-mostrar'),
  ayuda: $('cambio-nueva-hint'),
  nueva,
});

function validar() {
  const resultados = [
    marcarCampo(actual, actual.value ? '' : 'Ingrese su contraseña actual.'),
    marcarCampo(nueva, errorContrasena(nueva.value)),
    marcarCampo(confirmacion, confirmacion.value === nueva.value ? '' : 'La confirmación no coincide.'),
  ];
  const valido = resultados.every(Boolean);
  if (!valido) formulario.querySelector('[aria-invalid="true"]')?.focus();
  return valido;
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  if (!validar()) return;
  botonCargando(guardar, true, 'Guardando…');
  try {
    await cambiarContrasena({
      contrasenaActual: actual.value,
      contrasenaNueva: nueva.value,
      confirmacion: confirmacion.value,
    });
    mostrarAviso('Contraseña actualizada', 'success');
    location.assign(paginaInicial(leerSesion().permisos));
  } catch (error) {
    if (error.code === 'CONTRASENA_ACTUAL_INCORRECTA') marcarCampo(actual, error.message);
    else if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, {
        contrasenaActual: 'cambio-actual',
        contrasenaNueva: 'cambio-nueva',
        confirmacion: 'cambio-confirmacion',
      });
      if (sinCampo.length) mostrarAlerta(alerta, sinCampo.join(' '), 'error');
    } else if (error.status !== 401) mostrarAlerta(alerta, error.message, 'error');
    botonCargando(guardar, false);
  }
});

if (marco) mostrar($('cambio-obligatorio'), Boolean(marco.sesion.usuario.debeCambiarContrasena));
