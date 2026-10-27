/**
 * Página de inicio de sesión — REQ-USR-7, REQ-USR-8 [AJUSTADO]:
 * tipo + número de documento + contraseña para todos los roles.
 * El HTML ya está escrito en login.html; aquí solo se manejan eventos y se
 * rellenan textos de elementos existentes.
 */
import { iniciarSesion, obtenerSesion } from '../services/auth.service.js';
import { obtenerSede, subtituloSede } from '../services/parqueadero.service.js';
import { RUTA_INICIO, RUTA_CAMBIAR_CONTRASENA, rutaSiguienteSegura } from '../utils/sesion.js';

const formulario = document.getElementById('login-form');
const tipo = document.getElementById('tipo-documento');
const numero = document.getElementById('numero-documento');
const contrasena = document.getElementById('contrasena');
const mostrar = document.getElementById('mostrar-contrasena');
const alerta = document.getElementById('login-alerta');
const alertaTexto = document.getElementById('login-alerta-texto');
const boton = document.getElementById('login-boton');
const botonTexto = document.getElementById('login-boton-texto');

const campos = { tipo_documento: tipo, numero_documento: numero, contrasena };

function destino(sesion) {
  if (sesion.debe_cambiar_contrasena) return RUTA_CAMBIAR_CONTRASENA;
  const siguiente = new URLSearchParams(location.search).get('siguiente');
  return rutaSiguienteSegura(siguiente) ?? RUTA_INICIO;
}

function marcarError(control, mensaje) {
  document.getElementById(`${control.id}-error`).textContent = mensaje || '';
  if (mensaje) control.setAttribute('aria-invalid', 'true');
  else control.removeAttribute('aria-invalid');
}

function mostrarAlerta(mensaje) {
  alertaTexto.textContent = mensaje || '';
  alerta.classList.toggle('hidden', !mensaje);
}

function limpiarErrores() {
  mostrarAlerta('');
  Object.values(campos).forEach((control) => marcarError(control, ''));
}

function validar() {
  let valido = true;
  const valor = numero.value.trim();
  if (!valor) {
    marcarError(numero, 'Escribe tu número de documento.');
    valido = false;
  } else if (!/^[A-Za-z0-9]+$/.test(valor)) {
    marcarError(numero, 'Solo letras y números, sin puntos ni espacios.');
    valido = false;
  }
  if (!contrasena.value) {
    marcarError(contrasena, 'Escribe tu contraseña.');
    valido = false;
  }
  return valido;
}

function cargando(activo) {
  boton.disabled = activo;
  boton.toggleAttribute('aria-busy', activo);
  botonTexto.textContent = activo ? 'Ingresando…' : 'Ingresar';
}

mostrar.addEventListener('change', () => {
  contrasena.type = mostrar.checked ? 'text' : 'password';
});

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limpiarErrores();
  if (!validar()) {
    formulario.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  cargando(true);
  try {
    const sesion = await iniciarSesion({
      tipo_documento: tipo.value,
      numero_documento: numero.value.trim(),
      contrasena: contrasena.value,
    });
    location.assign(destino(sesion));
  } catch (error) {
    cargando(false);
    contrasena.value = '';
    if (error.codigo === 'VALIDACION') {
      for (const detalle of error.detalles) {
        if (campos[detalle.campo]) marcarError(campos[detalle.campo], detalle.mensaje);
      }
    }
    mostrarAlerta(error.message);
    contrasena.focus();
  }
});

// Si ya hay sesión, no tiene sentido mostrar el formulario.
obtenerSesion({ redirigir401: false })
  .then((sesion) => location.replace(destino(sesion)))
  .catch(() => {
    /* sin sesión: se queda en el formulario */
  });

// Sede (marca y pie) desde la BD.
obtenerSede()
  .then((sede) => {
    if (!sede) return;
    document.getElementById('login-sede').textContent = subtituloSede(sede);
    const direccion = document.getElementById('login-direccion');
    direccion.textContent = `${sede.direccion}, ${sede.ciudad} · ${sede.horario}`;
    direccion.classList.remove('hidden');
  })
  .catch(() => {
    /* sin sede: la marca queda sin subtítulo */
  });
