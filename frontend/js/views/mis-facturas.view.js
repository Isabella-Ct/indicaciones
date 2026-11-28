// Página · Panel del cliente › Mis facturas (HU-43 E2 · RF-FAC-16): solo las facturas de la sesión, con su PDF.
import { misFacturas, descargarPdf } from '../services/facturas.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { ponerPrecio } from '../components/moleculas/precio.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerChipFactura } from '../components/atomos/chip-estado.js';
import { ponerPlaca } from '../components/atomos/placa.js';
import { botonCargando } from '../components/atomos/boton.js';
import { $ } from '../utils/dom.js';
import { formatearFechaHora } from '../utils/formato.js';

const marco = montarMarco({ permiso: 'perfil.ver', alSalir: cerrarSesion });

async function abrirPdf(factura, boton) {
  botonCargando(boton, true, 'Descargando…');
  const pdf = await descargarPdf(factura.idFactura);
  botonCargando(boton, false);
  if (!pdf) return mostrarAviso('No se pudo descargar el PDF.', 'error');
  const enlace = URL.createObjectURL(pdf);
  window.open(enlace, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(enlace), 60000);
}

const tabla = conectarTabla($('tabla-mis-facturas'), {
  plantilla: 'tpl-mi-factura',
  idDe: (f) => f.idFactura,
  onPagina: (pagina) => cargar(pagina),
  rellenar(fila, f) {
    fila.querySelector('.js-numero').textContent = f.numero;
    fila.querySelector('.js-fecha').textContent = formatearFechaHora(f.fechaEmision);
    ponerPlaca(fila.querySelector('.js-placa'), f.movimiento?.placa);
    ponerPrecio(fila.querySelector('.js-total'), f.total);
    ponerChipFactura(fila.querySelector('.js-estado'), f.estado);
    const boton = fila.querySelector('.js-pdf');
    boton.setAttribute('aria-label', `Descargar la factura ${f.numero} en PDF`);
    boton.addEventListener('click', () => abrirPdf(f, boton));
  },
});

async function cargar(page = 1) {
  tabla.cargando(true);
  try {
    const { data, meta } = await misFacturas({ page });
    tabla.pintar(data, meta);
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
    tabla.pintar([]);
  } finally {
    tabla.cargando(false);
  }
}

if (marco?.permitido) cargar(1);
