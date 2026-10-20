// Columnas de facturas compartidas por Facturación (personal) y Mi cuenta (cliente).
import { el } from '../../utils/dom.js';
import { createButton } from '../../components/atoms/button/button.js';
import { createPlate } from '../../components/atoms/plate/plate.js';
import { createStatusChip } from '../../components/atoms/status-chip/status-chip.js';
import { formatearCOP, formatearFechaHora, METODOS_PAGO } from '../../utils/formato.js';
import { urlFacturaPdf } from '../../services/facturacion.service.js';

export function columnasFacturas({ conCliente = true } = {}) {
  return [
    {
      key: 'numero',
      label: 'Factura',
      render: (f) =>
        el('span', {}, [
          el('strong', { className: 'cell-nowrap', text: f.numero }),
          el('span', {
            className: 'cell-sub cell-nowrap',
            text: formatearFechaHora(f.fecha_pago),
          }),
        ]),
    },
    {
      key: 'concepto',
      label: 'Concepto',
      render: (f) =>
        createStatusChip({
          text: f.concepto === 'membresia' ? 'Mensualidad' : 'Parqueo',
          variant: f.concepto === 'membresia' ? 'reserved' : 'neutral',
        }),
    },
    {
      key: 'vehiculo',
      label: 'Vehículo',
      render: (f) =>
        el('span', {}, [
          f.placa ? createPlate({ placa: f.placa }) : '—',
          f.estadia
            ? el('span', { className: 'cell-sub cell-nowrap', text: f.estadia.tiempo })
            : null,
        ]),
    },
    conCliente && {
      key: 'cliente',
      label: 'Cliente',
      render: (f) =>
        f.cliente
          ? el('span', {}, [
              el('span', { text: f.cliente.nombre_completo }),
              el('span', {
                className: 'cell-sub cell-nowrap',
                text: `${f.cliente.tipo_documento} ${f.cliente.numero_documento}`,
              }),
            ])
          : 'Visitante',
    },
    { key: 'metodo', label: 'Método', render: (f) => METODOS_PAGO[f.metodo_pago] ?? f.metodo_pago },
    {
      key: 'descuento',
      label: 'Descuento',
      render: (f) =>
        f.descuento
          ? `${f.descuento.nombre} · −${formatearCOP(f.valor_descuento)}`
          : f.observacion || '—',
    },
    {
      key: 'total',
      label: 'Total',
      align: 'right',
      render: (f) => el('strong', { className: 'cell-nowrap', text: formatearCOP(f.total) }),
    },
    {
      key: 'pdf',
      label: 'PDF',
      align: 'right',
      render: (f) => {
        const enlace = createButton({
          label: 'PDF',
          variant: 'ghost',
          size: 'sm',
          icon: 'i-print',
          ariaLabel: `Factura ${f.numero} en PDF`,
          href: urlFacturaPdf(f.id),
        });
        enlace.setAttribute('target', '_blank');
        enlace.setAttribute('rel', 'noopener');
        return enlace;
      },
    },
  ].filter(Boolean);
}
