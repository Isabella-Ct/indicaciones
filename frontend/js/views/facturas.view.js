// Página · Facturación (HU-43): facturas con filtros por texto, fechas, método y estado, y el total filtrado
// (solo las emitidas). El detalle y la anulación están en el comprobante.
import { listarFacturas } from '../services/facturas.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { conectarBusqueda } from '../components/moleculas/buscador.js';
import { ponerPrecio } from '../components/moleculas/precio.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerChipFactura } from '../components/atomos/chip-estado.js';
import { ponerPlaca } from '../components/atomos/placa.js';
import { $ } from '../utils/dom.js';
import { formatearCOP, formatearFechaHora, texto } from '../utils/formato.js';

const marco = montarMarco({ permiso: 'facturas.ver', alSalir: cerrarSesion });

const METODO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', qr: 'QR' };
const filtros = { page: 1, q: '', desde: '', hasta: '', metodo: '', estado: '' };

const tabla = conectarTabla($('tabla-facturas'), {
  plantilla: 'tpl-factura',
  idDe: (f) => f.idFactura,
  onPagina: (pagina) => cargar(pagina),
  rellenar(fila, f) {
    fila.querySelector('.js-numero').textContent = f.numero;
    fila.querySelector('.js-fecha').textContent = formatearFechaHora(f.fechaEmision);
    ponerPlaca(fila.querySelector('.js-placa'), f.movimiento?.placa);
    fila.querySelector('.js-cliente').textContent = f.tercero?.nombre ?? f.cliente?.nombre ?? 'Consumidor final';
    fila.querySelector('.js-metodo').textContent = texto(METODO[f.pago?.metodo]);
    ponerPrecio(fila.querySelector('.js-total'), f.total);
    ponerChipFactura(fila.querySelector('.js-estado'), f.estado);
    const ver = fila.querySelector('.js-ver');
    ver.href = `/factura.html?id=${f.idFactura}`;
    ver.setAttribute('aria-label', `Ver la factura ${f.numero}`);
  },
});

async function cargar(page = filtros.page) {
  filtros.page = page;
  tabla.cargando(true);
  try {
    const { data, meta } = await listarFacturas({ ...filtros, page });
    tabla.pintar(data, meta);
    $('facturas-suma').textContent = formatearCOP(meta.sumaTotal);
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
    tabla.pintar([]);
  } finally {
    tabla.cargando(false);
  }
}

conectarBusqueda($('filtro-texto'), (q) => {
  filtros.q = q;
  cargar(1);
});
for (const [id, clave] of [
  ['filtro-desde', 'desde'],
  ['filtro-hasta', 'hasta'],
  ['filtro-metodo', 'metodo'],
  ['filtro-estado', 'estado'],
]) {
  $(id).addEventListener('change', (e) => {
    filtros[clave] = e.target.value;
    cargar(1);
  });
}

if (marco?.permitido) cargar(1);
