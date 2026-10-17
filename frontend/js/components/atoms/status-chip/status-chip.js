import { el } from '../../../utils/dom.js';

/** Estado de celda (BD) → modificador y texto del chip. */
export const ESTADOS_CELDA = {
  disponible: { variant: 'free', text: 'Libre' },
  ocupada: { variant: 'occupied', text: 'Ocupado' },
  reservada: { variant: 'reserved', text: 'Reservado' },
  fuera_servicio: { variant: 'out', text: 'Fuera de servicio' },
};

/**
 * Chip de estado (.status-chip) con cuadro de color.
 * @param {{ text: string, variant?: 'free'|'occupied'|'reserved'|'out'|'neutral', id?: string }} props
 * @returns {HTMLSpanElement}
 */
export function createStatusChip({ text, variant = 'neutral', id } = {}) {
  const clase = variant === 'neutral' ? 'status-chip' : `status-chip status-chip--${variant}`;
  return el('span', { className: clase, text, attrs: { id } });
}
