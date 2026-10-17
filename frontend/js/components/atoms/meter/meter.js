import { el } from '../../../utils/dom.js';

/**
 * Barra de progreso (.meter). El valor (0–100) va en la variable CSS --v.
 * @param {{ value: number, variant?: 'default'|'orange', label?: string }} props
 * @returns {HTMLDivElement}
 */
export function createMeter({ value = 0, variant = 'default', label } = {}) {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const relleno = el('span');
  relleno.style.setProperty('--v', String(v));
  return el(
    'div',
    {
      className: variant === 'orange' ? 'meter meter--orange' : 'meter',
      attrs: {
        role: 'meter',
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': v,
        'aria-label': label,
      },
    },
    [relleno]
  );
}

/** Actualiza el valor de un meter existente. */
export function setMeterValue(meter, value) {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  meter.setAttribute('aria-valuenow', String(v));
  meter.firstElementChild.style.setProperty('--v', String(v));
}
