import { el } from '../../../utils/dom.js';
import { createIcon } from '../../atoms/icon/icon.js';
import { formatearPlaca } from '../../../utils/placa.js';

const ESTADO = {
  disponible: { modificador: 'space--free', texto: 'libre' },
  ocupada: { modificador: 'space--occupied', texto: 'ocupado' },
  reservada: { modificador: 'space--reserved', texto: 'reservado' },
  fuera_servicio: { modificador: 'space--out', texto: 'fuera de servicio' },
};

/** Placa a mostrar en la celda (solo personal): ocupante o titular de la reserva. */
function placaVisible(celda) {
  if (celda.estado === 'ocupada') return celda.ocupante?.placa ?? null;
  if (celda.estado === 'reservada') return celda.mensualidad?.placa ?? celda.reserva?.placa ?? null;
  return null;
}

/**
 * Espacio del mapa (.space) como en la maqueta: código, coche/moto visto desde arriba
 * si está ocupado, placa (.space-plate) y etiqueta LIBRE / MENSUAL / RESERVADA / FUERA DE SERVICIO.
 * Las placas solo vienen de la API para el personal; si no llegan, no se dibujan.
 * @param {{ celda: object, seleccionada?: boolean, onSelect?: (celda: object) => void }} props
 * @returns {HTMLButtonElement}
 */
export function createSpace({ celda, seleccionada = false, onSelect }) {
  const estado = ESTADO[celda.estado];
  const clases = ['space', estado.modificador];
  if (celda.es_accesible) clases.push('space--accessible');
  if (celda.tipo === 'moto') clases.push('space--moto');
  if (seleccionada) clases.push('is-selected');

  const placa = placaVisible(celda);
  const hijos = [el('span', { className: 'space-code', text: celda.codigo })];
  if (celda.estado === 'disponible')
    hijos.push(el('span', { className: 'space-tag', text: 'LIBRE' }));
  if (celda.estado === 'reservada') {
    const etiqueta = celda.reserva_origen === 'mensualidad' ? 'MENSUAL' : 'RESERVADA';
    hijos.push(el('span', { className: 'space-tag', text: etiqueta }));
  }
  if (celda.estado === 'fuera_servicio') {
    hijos.push(el('span', { className: 'space-tag' }, ['FUERA DE', el('br'), 'SERVICIO']));
  }
  if (celda.estado === 'ocupada') {
    const moto = celda.tipo === 'moto';
    hijos.push(
      createIcon({
        name: moto ? 'moto-top' : 'car-top',
        className: 'space-car',
        viewBox: moto ? '0 0 14 34' : '0 0 26 46',
      })
    );
  }
  if (placa) hijos.push(el('span', { className: 'space-plate', text: formatearPlaca(placa) }));

  const etiquetaAccesible = [
    `Espacio ${celda.codigo}, ${estado.texto}`,
    celda.es_accesible ? 'accesible' : null,
    placa ? `placa ${formatearPlaca(placa)}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const boton = el(
    'button',
    {
      className: clases.join(' '),
      attrs: {
        type: 'button',
        'data-id': celda.id,
        'aria-label': etiquetaAccesible,
        'aria-pressed': String(seleccionada),
      },
    },
    hijos
  );
  if (onSelect) boton.addEventListener('click', () => onSelect(celda));
  return boton;
}
