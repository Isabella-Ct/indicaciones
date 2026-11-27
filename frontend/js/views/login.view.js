// Página · Pantalla de inicio de sesión (HU-12, HU-13 — versión mínima de la spec 001).
import { iniciarSesion } from '../services/auth.service.js';
import { paginaInicial } from '../config/config.js';
import { leerSesion } from '../utils/sesion.js';
import { $, parametro } from '../utils/dom.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { botonCargando } from '../components/atomos/boton.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';

const formulario = $('login-form');
const alerta = $('login-alerta');
const tipo = $('tipo-documento');
const documento = $('numero-documento');
const contrasena = $('contrasena');
const boton = $('login-boton');

/** Solo rutas internas del mismo sitio (evita redirecciones abiertas). */
function destino(permisos) {
  const volver = parametro('volver');
  if (volver && volver.startsWith('/') && !volver.startsWith('//')) return volver;
  return paginaInicial(permisos);
}

const sesion = leerSesion();
if (sesion) location.replace(destino(sesion.permisos));
if (parametro('vencida')) mostrarAlerta(alerta, 'Su sesión venció. Inicie sesión de nuevo.', 'info');

$('mostrar-contrasena').addEventListener('change', (e) => {
  contrasena.type = e.target.checked ? 'text' : 'password';
});

function validar() {
  const doc = documento.value.trim();
  let valido = marcarCampo(
    documento,
    doc.length < 3 || doc.length > 20 ? 'Ingrese un documento de 3 a 20 caracteres.' : ''
  );
  valido = marcarCampo(contrasena, contrasena.value ? '' : 'Ingrese la contraseña.') && valido;
  return valido;
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  if (!validar()) return;
  botonCargando(boton, true, 'Ingresando…');
  try {
    const datos = await iniciarSesion({
      tipoDocumento: tipo.value,
      numeroDocumento: documento.value.trim(),
      contrasena: contrasena.value,
    });
    location.assign(destino(datos.permisos));
  } catch (error) {
    const sinCampo = pintarErroresApi(error, {
      tipoDocumento: 'tipo-documento',
      numeroDocumento: 'numero-documento',
      contrasena: 'contrasena',
    });
    if (!error.details?.length || sinCampo.length) mostrarAlerta(alerta, error.message, 'error');
    contrasena.value = '';
    botonCargando(boton, false);
  }
});
