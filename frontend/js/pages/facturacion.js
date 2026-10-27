/**
 * Facturación (wireframe 04 con estilo PARKO) — REQ-FAC-1/2: listado de facturas con
 * filtros, total del período y PDF. El operador solo ve las de hoy (lo fuerza el servidor).
 * HTML en app/facturacion.html.
 */
import { montarMarco } from './comun/marco-app.js';
import { mostrarAviso } from './comun/dialogos.js';
import { conectarTabla, conectarBusqueda, ponerKpi } from './comun/tablas.js';
import { rellenarFactura } from './comun/tabla-facturas.js';
import { listarFacturas } from '../services/facturacion.service.js';
import { normalizarPlaca } from '../utils/placa.js';
import { formatearCOP, formatearFecha, hoyBogota } from '../utils/formato.js';
import { tienePermiso } from '../utils/sesion.js';

const $ = (id) => document.getElementById(id);
const filtros = {
  desde: hoyBogota(),
  hasta: hoyBogota(),
  metodo_pago: '',
  concepto: '',
  placa: '',
  pagina: 1,
  limite: 20,
};

const tabla = conectarTabla($('tabla-facturas'), {
  plantilla: 'tpl-factura',
  rellenar: (fila, f) => rellenarFactura(fila, f),
  onPagina: (pagina) => {
    filtros.pagina = pagina;
    recargar();
  },
});

function periodo(meta) {
  if (!meta?.desde && !meta?.hasta) return 'todas las fechas';
  if (meta.desde === meta.hasta) return formatearFecha(meta.desde);
  return `${formatearFecha(meta.desde)} – ${formatearFecha(meta.hasta)}`;
}

async function recargar() {
  tabla.cargando(true);
  try {
    const { data, meta } = await listarFacturas(filtros);
    ponerKpi('kpi-total', { valor: formatearCOP(meta.suma_total), nota: periodo(meta) });
    ponerKpi('kpi-facturas', { valor: meta.total, nota: 'con los filtros aplicados' });
    ponerKpi('kpi-promedio', {
      valor: meta.total ? formatearCOP(meta.suma_total / meta.total) : '—',
      nota: 'total del período ÷ facturas',
    });
    tabla.pintar(data, { meta });
  } catch (error) {
    mostrarAviso(error.message, 'error');
  } finally {
    tabla.cargando(false);
  }
}

function aplicar(clave, valor) {
  filtros[clave] = valor;
  filtros.pagina = 1;
  recargar();
}

async function iniciar() {
  const app = await montarMarco({ paginaId: 'facturas' });
  if (!app) return;
  const admin = tienePermiso(app.sesion, 'reportes.ver');
  $('pagina-subtitulo').textContent = admin
    ? '// facturas de parqueo y mensualidades · total del período'
    : '// facturas de hoy · total del turno';

  // El operador solo consulta el día (el servidor ignora otras fechas).
  $('campo-desde').classList.toggle('hidden', !admin);
  $('campo-hasta').classList.toggle('hidden', !admin);
  $('filtro-desde').value = filtros.desde;
  $('filtro-hasta').value = filtros.hasta;
  $('filtro-desde').addEventListener('change', (e) => aplicar('desde', e.target.value));
  $('filtro-hasta').addEventListener('change', (e) => aplicar('hasta', e.target.value));
  $('filtro-metodo').addEventListener('change', (e) => aplicar('metodo_pago', e.target.value));
  $('filtro-concepto').addEventListener('change', (e) => aplicar('concepto', e.target.value));
  conectarBusqueda($('filtro-placa'), (valor) => aplicar('placa', valor), {
    transform: normalizarPlaca,
  });
  await recargar();
}

iniciar();
