import { el } from '../../../utils/dom.js';
import { createPanel } from '../../molecules/panel/panel.js';
import { createEmptyState } from '../../molecules/empty-state/empty-state.js';
import { formatearHora, formatearCOP, formatearFechaCorta } from '../../../utils/formato.js';

/** "19:21" si es de hoy; "18 OCT 19:49" si es de otro día. */
function cuando(fecha) {
  const hoy = formatearFechaCorta(new Date());
  const dia = formatearFechaCorta(fecha);
  return dia === hoy ? formatearHora(fecha) : `${dia.slice(0, 6)} ${formatearHora(fecha)}`;
}
import { formatearPlaca } from '../../../utils/placa.js';

/**
 * Bitácora "Últimos movimientos" (maqueta, sección 7: .log, .move--in/--out).
 * @param {{ movimientos: Array<{ movimiento: 'entrada'|'salida', fecha: string, placa: string, celda: string, valor: number|null }> }} props
 * @returns {HTMLElement}
 */
export function createMovementLog({ movimientos }) {
  const cuerpo = movimientos.length
    ? el('div', { className: 'movement-log-scroll' }, [
        el('table', { className: 'log' }, [
          el('caption', { className: 'visually-hidden', text: 'Últimos movimientos' }),
          el('thead', {}, [
            el('tr', {}, [
              el('th', { text: 'Hora', attrs: { scope: 'col' } }),
              el('th', { text: 'Placa', attrs: { scope: 'col' } }),
              el('th', { text: 'Espacio', attrs: { scope: 'col' } }),
              el('th', { text: 'Movimiento', attrs: { scope: 'col' } }),
              el('th', { className: 'right', text: 'Valor', attrs: { scope: 'col' } }),
            ]),
          ]),
          el(
            'tbody',
            {},
            movimientos.map((m) =>
              el('tr', {}, [
                el('td', { className: 'cell-nowrap', text: cuando(m.fecha) }),
                el('td', { text: formatearPlaca(m.placa) }),
                el('td', { text: m.celda }),
                el('td', {}, [
                  el('span', {
                    className: m.movimiento === 'entrada' ? 'move move--in' : 'move move--out',
                    text: m.movimiento === 'entrada' ? 'Entrada' : 'Salida',
                  }),
                ]),
                el('td', {
                  className: 'right',
                  text: m.valor === null || m.valor === undefined ? '—' : formatearCOP(m.valor),
                }),
              ])
            )
          ),
        ]),
      ])
    : createEmptyState({
        title: 'Sin movimientos',
        text: 'Aquí aparecerán las entradas y salidas en vivo.',
      });

  const panel = createPanel({ title: 'Últimos movimientos', children: [cuerpo] });
  panel.querySelector('.panel-body').classList.add('panel-body--log');
  return panel;
}
