// Fila de factura compartida por Facturación (personal) y Mis movimientos (cliente).
// El marcado está en la plantilla #tpl-factura de cada página; aquí solo se rellena.
import { formatearCOP, formatearFechaHora, METODOS_PAGO } from '../../utils/formato.js';
import { formatearPlaca } from '../../utils/placa.js';
import { urlFacturaPdf } from '../../services/facturacion.service.js';

export function rellenarFactura(fila, f, { conCliente = true } = {}) {
  const celdas = [...fila.cells];
  const [numero, concepto, vehiculo] = celdas;
  const [cliente, metodo, descuento, total, pdf] = conCliente
    ? celdas.slice(3)
    : [null, ...celdas.slice(3)];

  numero.querySelector('strong').textContent = f.numero;
  numero.querySelector('.organism-data-table-cell-sub').textContent = formatearFechaHora(
    f.fecha_pago
  );

  const chip = concepto.firstElementChild;
  const membresia = f.concepto === 'membresia';
  chip.textContent = membresia ? 'Mensualidad' : 'Parqueo';
  chip.classList.toggle('atom-status-chip--reserved', membresia);

  const [placa, sinPlaca, tiempo] = vehiculo.firstElementChild.children;
  placa.textContent = f.placa ? formatearPlaca(f.placa) : '';
  placa.classList.toggle('hidden', !f.placa);
  sinPlaca.classList.toggle('hidden', Boolean(f.placa));
  tiempo.textContent = f.estadia?.tiempo ?? '';
  tiempo.classList.toggle('hidden', !f.estadia);

  if (cliente) {
    const [nombre, documento] = cliente.firstElementChild.children;
    nombre.textContent = f.cliente ? f.cliente.nombre_completo : 'Visitante';
    documento.textContent = f.cliente
      ? `${f.cliente.tipo_documento} ${f.cliente.numero_documento}`
      : '';
  }
  metodo.textContent = METODOS_PAGO[f.metodo_pago] ?? f.metodo_pago;
  descuento.textContent = f.descuento
    ? `${f.descuento.nombre} · −${formatearCOP(f.valor_descuento)}`
    : f.observacion || '—';
  total.querySelector('strong').textContent = formatearCOP(f.total);
  const enlace = pdf.firstElementChild;
  enlace.href = urlFacturaPdf(f.id);
  enlace.setAttribute('aria-label', `Factura ${f.numero} en PDF`);
}
