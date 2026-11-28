// Página · Facturación › Comprobante (HU-41, HU-42): vista de 80 mm, PDF, envío al correo del cliente,
// factura a nombre de un tercero y anulación (solo el Administrador).
import { obtenerFactura, emitirFactura, descargarPdf, anularFactura } from '../services/facturas.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { ponerComprobante } from '../components/organismos/comprobante.js';
import { abrirDialogo, cerrarDialogo } from '../components/organismos/modal.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { botonCargando } from '../components/atomos/boton.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, parametro, mostrar } from '../utils/dom.js';

const marco = montarMarco({ permiso: 'facturas.ver', alSalir: cerrarSesion });

const id = Number(parametro('id'));
const puede = { emitir: tienePermiso('facturas.crear'), anular: tienePermiso('facturas.anular') };
let factura = null;

async function cargar() {
  try {
    factura = await obtenerFactura(id);
    document.title = `PARKO · Factura ${factura.numero}`;
    ponerComprobante($('factura'), factura);
    const emitida = factura.estado === 'emitida';
    mostrar($('factura-hoja'));
    mostrar($('factura-imprimir'));
    mostrar($('factura-pdf'));
    mostrar($('factura-enviar'), puede.emitir && emitida && Boolean(factura.cliente));
    // RF-FAC-11: el titular solo cambia antes de enviar el comprobante.
    mostrar($('factura-tercero'), puede.emitir && emitida && !factura.enviada);
    mostrar($('factura-anular'), puede.anular && emitida);
  } catch (error) {
    if (error.status === 404 || error.status === 422) mostrar($('factura-no-encontrada'));
    else if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
}

$('factura-imprimir').addEventListener('click', () => window.print());

$('factura-pdf').addEventListener('click', async (e) => {
  const boton = e.currentTarget;
  botonCargando(boton, true, 'Descargando…');
  const pdf = await descargarPdf(id);
  botonCargando(boton, false);
  if (!pdf) return mostrarAviso('No se pudo descargar el PDF.', 'error');
  const enlace = URL.createObjectURL(pdf);
  window.open(enlace, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(enlace), 60000);
});

$('factura-enviar').addEventListener('click', async (e) => {
  const boton = e.currentTarget;
  botonCargando(boton, true, 'Enviando…');
  try {
    const { enviadaA } = await emitirFactura(id);
    mostrarAviso(enviadaA ? `Factura enviada a ${enviadaA}` : 'El cliente no tiene correo registrado.', enviadaA ? 'success' : 'info');
    cargar();
  } catch (error) {
    if (error.status !== 401 && error.status !== 403) mostrarAviso(error.message, 'error');
  } finally {
    botonCargando(boton, false);
  }
});

// ---------------------------------------------------------------- tercero (RF-FAC-11)
const dialogoTercero = $('dialogo-tercero');
$('factura-tercero').addEventListener('click', (e) => {
  limpiarErrores($('form-tercero'));
  mostrarAlerta($('tercero-alerta'), '');
  $('tercero-documento').value = factura.tercero?.documento ?? '';
  $('tercero-nombre').value = factura.tercero?.nombre ?? '';
  abrirDialogo(dialogoTercero, { origen: e.currentTarget, foco: $('tercero-documento') });
});

$('form-tercero').addEventListener('submit', async (e) => {
  e.preventDefault();
  const documento = $('tercero-documento').value.trim();
  const nombre = $('tercero-nombre').value.trim();
  let valido = marcarCampo($('tercero-documento'), documento.length < 5 || documento.length > 20 ? 'El documento debe tener entre 5 y 20 caracteres.' : '');
  valido = marcarCampo($('tercero-nombre'), nombre.length < 3 || nombre.length > 100 ? 'La razón social debe tener entre 3 y 100 caracteres.' : '') && valido;
  if (!valido) return;
  const boton = $('tercero-guardar');
  botonCargando(boton, true, 'Emitiendo…');
  try {
    await emitirFactura(id, { documento, nombre });
    mostrarAviso('Factura emitida a nombre del tercero', 'success');
    cerrarDialogo(dialogoTercero);
    cargar();
  } catch (error) {
    if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, { tercero: 'tercero-documento' });
      if (sinCampo.length) mostrarAlerta($('tercero-alerta'), sinCampo.join(' '), 'error');
    } else if (error.status !== 401) mostrarAlerta($('tercero-alerta'), error.message, 'error');
  } finally {
    botonCargando(boton, false);
  }
});

// ---------------------------------------------------------------- anular (HU-42)
const dialogoAnular = $('dialogo-anular');
$('factura-anular').addEventListener('click', (e) => {
  limpiarErrores($('form-anular'));
  mostrarAlerta($('anular-alerta'), '');
  $('anular-motivo').value = '';
  abrirDialogo(dialogoAnular, { origen: e.currentTarget, foco: $('anular-motivo') });
});

$('form-anular').addEventListener('submit', async (e) => {
  e.preventDefault();
  const motivo = $('anular-motivo').value.trim();
  if (!marcarCampo($('anular-motivo'), motivo.length < 10 || motivo.length > 200 ? 'El motivo debe tener entre 10 y 200 caracteres.' : '')) return;
  const boton = $('anular-guardar');
  botonCargando(boton, true, 'Anulando…');
  try {
    await anularFactura(id, motivo);
    mostrarAviso(`Factura ${factura.numero} anulada`, 'success');
    cerrarDialogo(dialogoAnular);
    cargar();
  } catch (error) {
    if (error.status !== 401 && error.status !== 403) mostrarAlerta($('anular-alerta'), error.message, 'error');
  } finally {
    botonCargando(boton, false);
  }
});

if (marco?.permitido) {
  if (Number.isInteger(id) && id > 0) cargar();
  else mostrar($('factura-no-encontrada'));
}
