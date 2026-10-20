import { el } from '../../../utils/dom.js';
import { createEmptyState } from '../../molecules/empty-state/empty-state.js';
import { createDataList } from '../../molecules/data-list/data-list.js';
import { createLabelCaps } from '../../atoms/label-caps/label-caps.js';
import { createStatusChip, ESTADOS_CELDA } from '../../atoms/status-chip/status-chip.js';
import { createPlate } from '../../atoms/plate/plate.js';
import { createCharge } from '../../molecules/charge/charge.js';
import { formatearCOP } from '../../../utils/formato.js';
import { formatearHora, formatearFechaHora, formatearFechaCorta } from '../../../utils/formato.js';

/** "2 h 37 min" a partir de los minutos. */
export function formatearDuracion(minutos) {
  if (minutos < 60) return `${minutos} min`;
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  const resto = minutos % 60;
  return [dias ? `${dias} d` : null, `${horas} h`, `${resto} min`].filter(Boolean).join(' ');
}

function bloque(hijos) {
  return el('div', { className: 'detail-block' }, hijos);
}

function horaEntrada(fecha, ahora) {
  const mismoDia = formatearFechaCorta(fecha) === formatearFechaCorta(ahora);
  return mismoDia ? formatearHora(fecha) : formatearFechaHora(fecha);
}

/** Bloques según el estado (reto 5: mensaje distinto para libre / reservado / fuera de servicio). */
function bloquesSegunEstado(celda, verOcupantes, ahora, liquidacion) {
  if (celda.estado === 'disponible') {
    return [
      bloque([
        el('p', {
          className: 'detail-message',
          text: 'Espacio libre: puede asignarse en el próximo ingreso.',
        }),
      ]),
    ];
  }
  if (celda.estado === 'fuera_servicio') {
    return [
      bloque([
        createLabelCaps({ text: 'Motivo' }),
        el('p', { className: 'detail-message', text: celda.nota || 'Sin nota registrada.' }),
      ]),
    ];
  }
  if (celda.estado === 'reservada') {
    const origen =
      celda.reserva_origen === 'mensualidad' ? 'mensualidad con celda fija' : 'reserva';
    const bloques = [
      bloque([el('p', { className: 'detail-message', text: `Reservado para una ${origen}.` })]),
    ];
    const datos = celda.mensualidad ?? celda.reserva;
    if (verOcupantes && datos) {
      bloques.push(
        bloque([
          createDataList({
            items: [
              { term: 'Placa', value: createPlate({ placa: datos.placa }) },
              celda.mensualidad
                ? { term: 'Titular', value: celda.mensualidad.titular }
                : { term: 'Vence', value: formatearFechaHora(celda.reserva.expira) },
            ],
          }),
        ])
      );
    }
    return bloques;
  }

  // ocupada
  if (!verOcupantes)
    return [bloque([el('p', { className: 'detail-message', text: 'Espacio ocupado.' })])];
  const { ocupante, estadia } = celda;
  const bloques = [];
  if (ocupante) {
    bloques.push(
      bloque([
        createLabelCaps({ text: 'Vehículo', tag: 'p' }),
        el('div', { className: 'vehicle-line' }, [
          createPlate({ placa: ocupante.placa, large: true }),
          el('p', {
            text: [`${ocupante.marca ?? ''} ${ocupante.modelo ?? ''}`.trim(), ocupante.color]
              .filter(Boolean)
              .join(' · '),
          }),
        ]),
      ])
    );
  }
  const minutos = estadia
    ? Math.max(0, Math.floor((ahora - new Date(estadia.fecha_hora_entrada)) / 60000))
    : null;
  bloques.push(
    bloque([
      createDataList({
        items: [
          {
            term: 'Cliente',
            value: estadia?.tipo_cliente === 'mensualidad' ? 'Mensualidad' : 'Visitante',
          },
          { term: 'Titular', value: ocupante?.propietario ?? 'Sin propietario' },
          { term: 'Ticket', value: estadia?.codigo_ticket ?? 'Sin estadía' },
          {
            term: 'Hora de entrada',
            value: estadia ? horaEntrada(estadia.fecha_hora_entrada, ahora) : '—',
          },
          { term: 'Tiempo dentro', value: minutos === null ? '—' : formatearDuracion(minutos) },
          ...(liquidacion
            ? [
                {
                  term: 'Tarifa',
                  value: `${formatearCOP(liquidacion.tarifa.valor_fraccion)} / ${liquidacion.tarifa.unidad}`,
                },
                { term: 'Tope del día', value: formatearCOP(liquidacion.tarifa.valor_dia_maximo) },
              ]
            : []),
        ],
      }),
    ])
  );
  // Bloque de cobro (reto 4): calculado por el servidor y refrescado cada minuto.
  if (estadia && liquidacion) {
    const { cobro } = liquidacion;
    bloques.push(
      bloque([
        createCharge({
          total: cobro.total,
          porcentajeTope: cobro.membresia ? null : cobro.porcentajeTope,
          nota: cobro.nota,
        }),
      ])
    );
  } else {
    bloques.push(
      bloque([
        el('p', {
          className: 'detail-message',
          text: estadia
            ? 'Calculando el valor a pagar…'
            : 'Ocupación registrada manualmente, sin ticket de ingreso.',
        }),
      ])
    );
  }
  return bloques;
}

/**
 * Detalle del espacio (maqueta, sección 6). Sin celda: empty-state "Selecciona un espacio".
 * @param {{
 *   celda?: object|null,
 *   verOcupantes?: boolean,     // placas, titular y ticket (solo personal)
 *   acciones?: HTMLElement[],   // botones según el rol (los arma la página)
 *   ahora?: Date,
 *   liquidacion?: { tarifa: object, cobro: object } | null,  // POST /estadias/:id/liquidar
 * }} props
 * @returns {HTMLElement}
 */
export function createSpaceDetail({
  celda = null,
  verOcupantes = false,
  acciones = [],
  ahora = new Date(),
  liquidacion = null,
}) {
  if (!celda) {
    return createEmptyState({
      title: 'Selecciona un espacio',
      text: 'Toca cualquier celda del mapa para ver su estado, el vehículo y el tiempo dentro.',
    });
  }
  const estado = ESTADOS_CELDA[celda.estado];
  return el(
    'article',
    {
      className: 'panel space-detail',
      attrs: { 'aria-label': `Detalle del espacio ${celda.codigo}` },
    },
    [
      el('div', { className: 'space-hero' }, [
        el('div', {}, [
          createLabelCaps({
            text: `${celda.piso.nombre} · ${celda.tipo === 'moto' ? 'Moto' : 'Carro'}${celda.es_accesible ? ' · Accesible' : ''}`,
          }),
          el('p', { className: 'big-code', text: celda.codigo }),
        ]),
        createStatusChip(estado),
      ]),
      ...bloquesSegunEstado(celda, verOcupantes, ahora, liquidacion),
      acciones.length ? el('div', { className: 'detail-actions' }, acciones) : null,
    ]
  );
}
