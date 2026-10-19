import { el } from '../../../utils/dom.js';

const ITEMS = [
  ['lg-free', 'Libre'],
  ['lg-occupied', 'Ocupado'],
  ['lg-reserved', 'Reservado (mensualidad)'],
  ['lg-accessible', 'Accesible'],
  ['lg-out', 'Fuera de servicio'],
];

/** Leyenda del mapa (.map-legend), igual a la maqueta. */
export function createMapLegend() {
  return el(
    'div',
    { className: 'map-legend' },
    ITEMS.map(([clase, texto]) =>
      el('span', {}, [el('i', { className: clase, attrs: { 'aria-hidden': 'true' } }), texto])
    )
  );
}
