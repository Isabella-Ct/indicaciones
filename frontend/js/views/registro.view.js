// Página · Registro de cliente (HU-14 · RF-ACC-07..09): autorregistro con contraseña y autorización de
// tratamiento de datos (Ley 1581). Al terminar, lleva al inicio de sesión.
import { registrarme } from '../services/auth.service.js';
import { conectarContrasena, errorContrasena } from '../components/moleculas/contrasena.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { botonCargando } from '../components/atomos/boton.js';
import { $ } from '../utils/dom.js';

const formulario = $('form-registro');
const alerta = $('registro-alerta');
const boton = $('registro-boton');
const c = {
  tipo: $('registro-tipo-documento'),
  documento: $('registro-numero-documento'),
  nombre: $('registro-nombre'),
  correo: $('registro-correo'),
  celular: $('registro-celular'),
  contrasena: $('registro-contrasena'),
  confirmacion: $('registro-confirmacion'),
  autorizacion: $('registro-autorizacion'),
};

conectarContrasena([c.contrasena, c.confirmacion], {
  casillaMostrar: $('registro-mostrar'),
  ayuda: $('registro-contrasena-hint'),
  nueva: c.contrasena,
});

function validar() {
  const doc = c.documento.value.replace(/[\s.-]/g, '');
  const nombre = c.nombre.value.trim().replace(/\s+/g, ' ');
  const resultados = [
    marcarCampo(
      c.documento,
      (c.tipo.value === 'PAS' ? /^[A-Za-z0-9]{5,20}$/ : /^\d{5,20}$/).test(doc)
        ? ''
        : 'Ingrese de 5 a 20 dígitos (pasaporte: letras y dígitos).'
    ),
    marcarCampo(
      c.nombre,
      nombre.length >= 3 && nombre.length <= 100 && /^\p{L}[\p{L} '-]*$/u.test(nombre) ? '' : 'Ingrese un nombre de 3 a 100 letras.'
    ),
    marcarCampo(c.correo, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.correo.value.trim()) ? '' : 'Ingrese un correo válido.'),
    marcarCampo(c.celular, /^3\d{9}$/.test(c.celular.value.replace(/[\s-]/g, '')) ? '' : 'Ingrese 10 dígitos que empiecen por 3.'),
    marcarCampo(c.contrasena, errorContrasena(c.contrasena.value)),
    marcarCampo(c.confirmacion, c.confirmacion.value === c.contrasena.value ? '' : 'La confirmación no coincide.'),
    // HU-14 E3: sin autorización el formulario no se envía.
    marcarCampo(c.autorizacion, c.autorizacion.checked ? '' : 'Debe aceptar la autorización de tratamiento de datos.'),
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
  botonCargando(boton, true, 'Creando cuenta…');
  try {
    await registrarme({
      tipoDocumento: c.tipo.value,
      numeroDocumento: c.documento.value,
      nombreCompleto: c.nombre.value,
      correo: c.correo.value,
      celular: c.celular.value,
      contrasena: c.contrasena.value,
      confirmacion: c.confirmacion.value,
      aceptaTratamientoDatos: true,
    });
    location.assign('/login.html?registrado=1');
  } catch (error) {
    if (error.code === 'CUENTA_EXISTENTE') {
      marcarCampo(c.documento, error.message);
      mostrarAlerta(alerta, 'Si ya tiene cuenta, puede usar «¿Olvidó su contraseña?» en el inicio de sesión.', 'info');
    } else if (error.code === 'CORREO_DUPLICADO') marcarCampo(c.correo, error.message);
    else if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, {
        tipoDocumento: 'registro-tipo-documento',
        numeroDocumento: 'registro-numero-documento',
        nombreCompleto: 'registro-nombre',
        correo: 'registro-correo',
        celular: 'registro-celular',
        contrasena: 'registro-contrasena',
        confirmacion: 'registro-confirmacion',
        aceptaTratamientoDatos: 'registro-autorizacion',
      });
      if (sinCampo.length) mostrarAlerta(alerta, sinCampo.join(' '), 'error');
    } else mostrarAlerta(alerta, error.message, 'error');
    botonCargando(boton, false);
  }
});
