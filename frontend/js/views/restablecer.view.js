// Página · Restablecer contraseña (HU-15 E3/E4 · RF-ACC-12): usa el token del enlace del correo.
import { restablecerContrasena } from '../services/auth.service.js';
import { conectarContrasena, errorContrasena } from '../components/moleculas/contrasena.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { botonCargando } from '../components/atomos/boton.js';
import { $, parametro, mostrar } from '../utils/dom.js';

const formulario = $('form-restablecer');
const alerta = $('restablecer-alerta');
const boton = $('restablecer-boton');
const nueva = $('restablecer-nueva');
const confirmacion = $('restablecer-confirmacion');
const token = parametro('token') ?? '';

conectarContrasena([nueva, confirmacion], {
  casillaMostrar: $('restablecer-mostrar'),
  ayuda: $('restablecer-nueva-hint'),
  nueva,
});

function enlaceInvalido(mensaje = 'El enlace no es válido o expiró.') {
  mostrarAlerta(alerta, mensaje, 'error');
  mostrar($('restablecer-nuevo-enlace'));
  boton.disabled = true;
}

if (!/^[0-9a-f]{64}$/.test(token)) enlaceInvalido();

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formulario);
  const valido = [
    marcarCampo(nueva, errorContrasena(nueva.value)),
    marcarCampo(confirmacion, confirmacion.value === nueva.value ? '' : 'La confirmación no coincide.'),
  ].every(Boolean);
  if (!valido) return formulario.querySelector('[aria-invalid="true"]')?.focus();
  botonCargando(boton, true, 'Guardando…');
  try {
    await restablecerContrasena({ token, contrasenaNueva: nueva.value, confirmacion: confirmacion.value });
    location.assign('/login.html?restablecida=1');
  } catch (error) {
    botonCargando(boton, false);
    if (error.code === 'ENLACE_INVALIDO') return enlaceInvalido(error.message);
    if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, { contrasenaNueva: 'restablecer-nueva', confirmacion: 'restablecer-confirmacion' });
      if (sinCampo.length) return enlaceInvalido(sinCampo.join(' '));
      return null;
    }
    mostrarAlerta(alerta, error.message, 'error');
  }
  return null;
});
