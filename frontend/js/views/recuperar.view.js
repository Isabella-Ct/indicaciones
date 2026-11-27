// Página · Recuperar contraseña (HU-15 E1/E2 · RF-ACC-10/11): el mensaje es el mismo exista o no el documento.
import { recuperarContrasena } from '../services/auth.service.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { botonCargando } from '../components/atomos/boton.js';
import { $ } from '../utils/dom.js';

const formulario = $('form-recuperar');
const alerta = $('recuperar-alerta');
const boton = $('recuperar-boton');
const tipo = $('recuperar-tipo-documento');
const documento = $('recuperar-numero-documento');

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores(formulario);
  mostrarAlerta(alerta, '');
  const doc = documento.value.trim();
  if (!marcarCampo(documento, doc.length >= 3 && doc.length <= 20 ? '' : 'Ingrese su número de documento.')) {
    documento.focus();
    return;
  }
  botonCargando(boton, true, 'Enviando…');
  try {
    const { mensaje } = await recuperarContrasena({ tipoDocumento: tipo.value, numeroDocumento: doc });
    mostrarAlerta(alerta, `${mensaje} El enlace vence en 30 minutos.`, 'success');
    formulario.reset();
  } catch (error) {
    if (error.code === 'VALIDACION') pintarErroresApi(error, { numeroDocumento: 'recuperar-numero-documento' });
    else mostrarAlerta(alerta, error.message, 'error');
  } finally {
    botonCargando(boton, false);
  }
});
