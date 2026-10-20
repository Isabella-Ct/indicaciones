import { el } from '../../../utils/dom.js';

const CAMPOS = [
  ['numero', 'N.º'],
  ['placa', 'Placa'],
  ['espacio', 'Espacio'],
  ['entrada', 'Entrada'],
  ['tarifa', 'Tarifa'],
  ['cliente', 'Cliente'],
  ['puerta', 'Puerta'],
];

/**
 * Ticket de ingreso (maqueta, sección 8). Sirve como vista previa en vivo
 * (updateTicket mientras se llena el formulario) y como ticket emitido.
 * @param {{
 *   datos?: { numero?: string, placa?: string, espacio?: string, entrada?: string, tarifa?: string, cliente?: string, puerta?: string },
 *   nota?: string,
 *   emitido?: boolean,
 * }} props
 * @returns {HTMLElement}
 */
export function createTicket({ datos = {}, nota = '', emitido = false } = {}) {
  const lista = el(
    'dl',
    {},
    CAMPOS.map(([clave, termino]) =>
      el('div', { className: clave === 'numero' ? 'ticket-numero' : '' }, [
        el('dt', { text: termino }),
        el('dd', { attrs: { 'data-id': clave } }),
      ])
    )
  );
  const ticket = el(
    'aside',
    {
      className: emitido ? 'ticket ticket--emitido' : 'ticket',
      attrs: { 'aria-label': 'Ticket de ingreso' },
    },
    [
      el('div', { className: 'ticket-head' }, [el('span', { text: 'TICKET DE INGRESO' })]),
      lista,
      el('div', { className: 'barcode', attrs: { 'aria-hidden': 'true' } }),
      el('p', { className: 'ticket-note', text: nota }),
    ]
  );
  updateTicket(ticket, datos);
  return ticket;
}

/** Actualiza los valores del ticket (vista previa en vivo, reto 7). */
export function updateTicket(ticket, datos) {
  for (const [clave] of CAMPOS) {
    if (!(clave in datos)) continue;
    const celda = ticket.querySelector(`dd[data-id="${clave}"]`);
    celda.textContent = datos[clave] || '—';
  }
}
