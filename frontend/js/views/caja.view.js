// Página · Facturación › Cierre de caja (HU-44): cuadre del turno abierto (totales por método, servicios y
// efectivo esperado), cierre con el efectivo contado y la diferencia, y cierres registrados.
import { turnoActual, cerrarCaja, listarCierres } from '../services/caja.service.js';
import { cerrarSesion } from '../services/auth.service.js';
import { montarMarco } from '../components/plantillas/marco-app.js';
import { conectarTabla } from '../components/organismos/tabla-datos.js';
import { confirmar } from '../components/organismos/modal.js';
import { ponerKpi } from '../components/moleculas/kpi.js';
import { ponerPrecio } from '../components/moleculas/precio.js';
import { mostrarAlerta } from '../components/moleculas/alerta.js';
import { marcarCampo, limpiarErrores, pintarErroresApi } from '../components/moleculas/campo.js';
import { mostrarAviso } from '../components/moleculas/aviso.js';
import { ponerChipFactura } from '../components/atomos/chip-estado.js';
import { ponerPlaca } from '../components/atomos/placa.js';
import { botonCargando } from '../components/atomos/boton.js';
import { tienePermiso } from '../utils/sesion.js';
import { $, mostrar } from '../utils/dom.js';
import { formatearCOP, formatearFechaHora } from '../utils/formato.js';

const marco = montarMarco({ permiso: 'caja.ver', alSalir: cerrarSesion });

const METODO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', qr: 'QR' };
const estado = { turno: null };

const tablaTurno = conectarTabla($('tabla-turno'), {
  plantilla: 'tpl-turno',
  idDe: (f) => f.idFactura,
  rellenar(fila, f) {
    const numero = fila.querySelector('.js-numero');
    numero.textContent = f.numero;
    numero.href = `/factura.html?id=${f.idFactura}`;
    ponerPlaca(fila.querySelector('.js-placa'), f.placa);
    fila.querySelector('.js-metodo').textContent = METODO[f.metodo] ?? f.metodo;
    ponerPrecio(fila.querySelector('.js-total'), f.total);
    ponerChipFactura(fila.querySelector('.js-estado'), f.estado);
  },
});

const tablaCierres = conectarTabla($('tabla-cierres'), {
  plantilla: 'tpl-cierre',
  idDe: (c) => c.idCierre,
  onPagina: (pagina) => cargarCierres(pagina),
  rellenar(fila, c) {
    fila.querySelector('.js-fin').textContent = formatearFechaHora(c.finTurno);
    fila.querySelector('.js-operador').textContent = c.operador.nombre;
    ponerPrecio(fila.querySelector('.js-esperado'), c.efectivoEsperado);
    ponerPrecio(fila.querySelector('.js-contado'), c.efectivoContado);
    const diferencia = fila.querySelector('.js-diferencia');
    diferencia.textContent = `${c.diferencia > 0 ? '+' : ''}${formatearCOP(c.diferencia)} ${c.diferencia < 0 ? '(faltante)' : c.diferencia > 0 ? '(sobrante)' : '(cuadrado)'}`;
    fila.querySelector('.js-facturas').textContent = c.facturas.map((f) => f.numero).join(', ') || '—';
  },
});

async function cargarTurno() {
  try {
    const t = await turnoActual();
    estado.turno = t;
    ponerKpi($('kpi-esperado'), { valor: formatearCOP(t.efectivoEsperado), nota: 'en efectivo, sin anuladas' });
    ponerKpi($('kpi-total'), { valor: formatearCOP(t.total), nota: t.inicio ? `desde ${formatearFechaHora(t.inicio)}` : 'turno sin pagos' });
    ponerKpi($('kpi-servicios'), { valor: String(t.servicios), nota: 'facturas emitidas' });
    ponerKpi($('kpi-otros'), {
      valor: formatearCOP(t.totalesPorMetodo.tarjeta + t.totalesPorMetodo.transferencia + t.totalesPorMetodo.qr),
      nota: `${formatearCOP(t.totalesPorMetodo.tarjeta)} · ${formatearCOP(t.totalesPorMetodo.transferencia)} · ${formatearCOP(t.totalesPorMetodo.qr)}`,
    });
    ponerKpi($('kpi-anuladas'), { valor: String(t.anuladas), nota: 'no suman en el cuadre' });
    tablaTurno.pintar(t.facturas);
    actualizarDiferencia();
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
  }
}

async function cargarCierres(page = 1) {
  tablaCierres.cargando(true);
  try {
    const { data, meta } = await listarCierres({ page });
    tablaCierres.pintar(data, meta);
  } catch (error) {
    if (error.status !== 401) mostrarAviso(error.message, 'error');
    tablaCierres.pintar([]);
  } finally {
    tablaCierres.cargando(false);
  }
}

// ---------------------------------------------------------------- cierre (RF-FAC-18)
const campoContado = $('cierre-contado');

function actualizarDiferencia() {
  const esperado = estado.turno?.efectivoEsperado ?? 0;
  if (campoContado.value === '') return ($('cierre-diferencia').textContent = `Efectivo esperado: ${formatearCOP(esperado)}`);
  const diferencia = Number(campoContado.value) - esperado;
  $('cierre-diferencia').textContent =
    diferencia === 0 ? 'Cuadrado: sin diferencia.' : diferencia > 0 ? `Sobrante: ${formatearCOP(diferencia)}` : `Faltante: ${formatearCOP(-diferencia)}`;
}

campoContado.addEventListener('input', actualizarDiferencia);

$('form-cierre').addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores($('form-cierre'));
  mostrarAlerta($('cierre-alerta'), '');
  const contado = Number(campoContado.value);
  if (!marcarCampo(campoContado, campoContado.value === '' || contado < 0 ? 'Ingrese el efectivo contado (0 o más).' : '')) return campoContado.focus();
  const acepta = await confirmar({
    titulo: 'Cerrar la caja',
    mensaje: `Se cerrará el turno con ${estado.turno?.servicios ?? 0} servicios y ${$('cierre-diferencia').textContent.toLowerCase()} Los pagos nuevos abrirán otro turno.`,
    textoConfirmar: 'Cerrar caja',
    origen: $('cierre-guardar'),
  });
  if (!acepta) return;
  const boton = $('cierre-guardar');
  botonCargando(boton, true, 'Cerrando…');
  try {
    const observaciones = $('cierre-observaciones').value.trim();
    const cierre = await cerrarCaja({ efectivoContado: contado, ...(observaciones ? { observaciones } : {}) });
    mostrarAviso(`Caja cerrada · diferencia ${formatearCOP(cierre.diferencia)}`, 'success');
    $('form-cierre').reset();
    cargarTurno();
    cargarCierres(1);
  } catch (error) {
    if (error.status === 401) return;
    if (error.code === 'VALIDACION') {
      const sinCampo = pintarErroresApi(error, { efectivoContado: 'cierre-contado', observaciones: 'cierre-observaciones' });
      if (sinCampo.length) mostrarAlerta($('cierre-alerta'), sinCampo.join(' '), 'error');
    } else mostrarAlerta($('cierre-alerta'), error.message, 'error');
  } finally {
    botonCargando(boton, false);
  }
});

if (marco?.permitido) {
  mostrar($('form-cierre'), tienePermiso('caja.crear'));
  cargarTurno();
  cargarCierres(1);
}
