import { el, idUnico } from '../../../utils/dom.js';
import { createModal, openModal, closeModal } from '../modal/modal.js';
import { createCharge } from '../../molecules/charge/charge.js';
import { createDataList } from '../../molecules/data-list/data-list.js';
import { createField } from '../../molecules/field/field.js';
import { createTiles } from '../../molecules/tiles/tiles.js';
import { createAlert, setAlert } from '../../molecules/alert/alert.js';
import { createButton, setButtonLoading } from '../../atoms/button/button.js';
import { createSelect } from '../../atoms/select/select.js';
import { createPlate } from '../../atoms/plate/plate.js';
import { createLabelCaps } from '../../atoms/label-caps/label-caps.js';
import { formatearCOP, formatearFechaHora } from '../../../utils/formato.js';
import { formatearPlaca } from '../../../utils/placa.js';

const METODOS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
];

/**
 * Modal "Registrar salida y cobrar" (REQ-TAR-2, REQ-FAC-1). Muestra la liquidación
 * oficial del servidor; el descuento se recalcula en vivo; el total final lo vuelve a
 * calcular el servidor al pagar. No llama a la API: la página le pasa las funciones.
 * @param {{
 *   liquidacion: object,                     // POST /estadias/salida
 *   puertas: Array<{ id: number, nombre: string, tipo: string }>,
 *   puertaId?: number,
 *   recalcular: (descuentoId: number|null) => Promise<object>,     // POST /:id/liquidar
 *   pagar: (datos: { puerta_id: number, metodo_pago: string, descuento_id?: number }) => Promise<{ estadia: object, factura: object }>,
 *   onImprimir?: (factura: object) => void,
 *   onPagado?: (resultado: object) => void,
 * }} props
 * @returns {HTMLDivElement}
 */
export function createChargeModal(props) {
  const { liquidacion, recalcular, pagar } = props;
  const { estadia } = liquidacion;
  let actual = liquidacion;
  let metodo = 'efectivo';
  const idForm = idUnico('cobro');

  const descuento = createSelect({
    options: [
      { value: '', label: 'Sin descuento' },
      ...liquidacion.descuentos.map((d) => ({
        value: String(d.id),
        label: `${d.nombre} · ${d.porcentaje} %`,
      })),
    ],
    disabled: Boolean(liquidacion.membresia) || liquidacion.descuentos.length === 0,
  });
  const puertas = props.puertas.filter((p) => p.tipo !== 'entrada');
  const puerta = createSelect({
    options: puertas.map((p) => ({ value: String(p.id), label: p.nombre })),
    value: String(puertas.find((p) => p.id === props.puertaId)?.id ?? puertas[0]?.id ?? ''),
  });
  const metodos = createTiles({
    name: idUnico('metodo'),
    label: 'Método de pago',
    options: METODOS,
    value: metodo,
    columns: 3,
    onChange: (v) => (metodo = v),
  });

  const pasos = el('ol', {
    className: 'charge-steps',
    attrs: { 'aria-label': 'Detalle del cálculo' },
  });
  const resumen = el('div', { className: 'charge-summary', attrs: { 'aria-live': 'polite' } });
  const alerta = createAlert();
  const cobrar = createButton({ label: 'Cobrar', type: 'submit', icon: 'i-check' });
  cobrar.setAttribute('form', idForm);

  function pintar() {
    const { cobro } = actual;
    pasos.replaceChildren(
      ...cobro.detalle.filter((d) => d.paso !== 'total').map((d) => el('li', { text: d.texto }))
    );
    resumen.replaceChildren(
      createCharge({
        etiqueta: 'Total a pagar',
        total: cobro.total,
        porcentajeTope: cobro.membresia || cobro.porcentajeDescuento ? null : cobro.porcentajeTope,
        nota: cobro.membresia ? cobro.nota : null,
      }),
      createDataList({
        items: [
          { term: 'Subtotal', value: formatearCOP(cobro.membresia ? 0 : cobro.subtotal) },
          {
            term: 'Descuento',
            value: cobro.valorDescuento ? `− ${formatearCOP(cobro.valorDescuento)}` : '—',
          },
        ],
      })
    );
    cobrar.querySelector('span').textContent = `Cobrar ${formatearCOP(cobro.total)}`;
  }

  const formulario = el('form', { className: 'stack', attrs: { id: idForm, novalidate: true } }, [
    alerta,
    el('div', { className: 'vehicle-line' }, [
      createPlate({ placa: estadia.vehiculo.placa, large: true }),
      el('p', {
        text: [
          `${estadia.vehiculo.marca ?? ''} ${estadia.vehiculo.modelo ?? ''}`.trim(),
          estadia.vehiculo.color,
        ]
          .filter(Boolean)
          .join(' · '),
      }),
    ]),
    createDataList({
      items: [
        { term: 'Entrada', value: formatearFechaHora(liquidacion.fecha_hora_entrada) },
        { term: 'Salida (estimada)', value: formatearFechaHora(liquidacion.fecha_hora_salida) },
        { term: 'Tiempo dentro', value: liquidacion.tiempo },
        {
          term: 'Cliente',
          value: liquidacion.membresia
            ? `Mensualidad · ${liquidacion.membresia.titular}`
            : 'Visitante',
        },
        { term: 'Tarifa', value: liquidacion.tarifa.descripcion },
        { term: 'Ticket', value: estadia.codigo_ticket },
      ],
    }),
    el('div', {}, [createLabelCaps({ text: 'Detalle del cálculo' }), pasos]),
    el('div', { className: 'form-grid' }, [
      createField({
        label: 'Descuento',
        control: descuento,
        hint: liquidacion.membresia
          ? 'Las mensualidades no pagan: no aplica descuento.'
          : 'Uno por factura.',
      }),
      createField({ label: 'Puerta de salida', control: puerta, required: true }),
      metodos,
    ]),
  ]);

  const modal = createModal({
    title: 'Registrar salida y cobrar',
    subtitle: `ticket ${estadia.codigo_ticket} · celda ${estadia.celda.codigo}`,
    body: [formulario, el('aside', { className: 'charge-aside' }, [resumen])],
    footer: [
      createButton({ label: 'Cancelar', variant: 'ghost', onClick: () => closeModal(modal) }),
      cobrar,
    ],
    onClose: () => modal.remove(),
  });
  modal.querySelector('.modal-body').classList.add('modal-body--split');

  descuento.addEventListener('change', async () => {
    setAlert(alerta, '');
    cobrar.disabled = true;
    try {
      actual = {
        ...actual,
        ...(await recalcular(descuento.value ? Number(descuento.value) : null)),
      };
      pintar();
    } catch (error) {
      setAlert(alerta, error.message, 'error');
    } finally {
      cobrar.disabled = false;
    }
  });

  function mostrarExito({ factura, estadia: cerrada }) {
    const imprimir = createButton({
      label: 'Imprimir factura',
      icon: 'i-print',
      variant: 'dark',
      onClick: () => props.onImprimir?.(factura),
    });
    modal.querySelector('.modal-body').replaceChildren(
      el('div', { className: 'entry-success' }, [
        createAlert({
          message: `Pago registrado: ${formatearPlaca(cerrada.vehiculo.placa)} salió de la celda ${cerrada.celda.codigo}.`,
          variant: 'success',
        }),
        el('p', { className: 'entry-success-ticket', text: factura.numero }),
        createDataList({
          items: [
            { term: 'Total cobrado', value: formatearCOP(factura.total) },
            {
              term: 'Método',
              value:
                METODOS.find((m) => m.value === factura.metodo_pago)?.label ?? factura.metodo_pago,
            },
            { term: 'Tiempo', value: cerrada.tiempo },
            { term: 'Salida', value: formatearFechaHora(cerrada.fecha_hora_salida) },
          ],
        }),
      ]),
      el('aside', { className: 'charge-aside' }, [
        createCharge({
          etiqueta: 'Total cobrado',
          total: factura.total,
          nota: factura.descuento ? `Incluye descuento ${factura.descuento.nombre}` : '',
        }),
      ])
    );
    modal
      .querySelector('.modal-foot')
      .replaceChildren(
        createButton({ label: 'Cerrar', variant: 'ghost', onClick: () => closeModal(modal) }),
        imprimir
      );
    imprimir.focus();
  }

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    setAlert(alerta, '');
    setButtonLoading(cobrar, true, 'Cobrando…');
    try {
      const resultado = await pagar({
        puerta_id: Number(puerta.value),
        metodo_pago: metodo,
        descuento_id: descuento.value ? Number(descuento.value) : undefined,
      });
      mostrarExito(resultado);
      props.onPagado?.(resultado);
    } catch (error) {
      setButtonLoading(cobrar, false);
      setAlert(alerta, error.message, 'error');
    }
  });

  pintar();
  return modal;
}

export function abrirChargeModal(modal, origen) {
  openModal(modal, origen);
}
