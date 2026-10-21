import { el } from '../../../utils/dom.js';
import { createKpi } from '../../molecules/kpi/kpi.js';
import { createLiveStatus, setLiveStatus } from '../../molecules/live-status/live-status.js';
import { formatearHora } from '../../../utils/formato.js';

/**
 * Disponibilidad en vivo de la página pública (REQ-WEB-1): cupos libres por tipo en
 * tarjetas kpi con meter, más el indicador "en vivo". Solo totales (sin celdas ni placas).
 * La página lo actualiza con setAvailability / setAvailabilityStatus.
 * @returns {HTMLElement}
 */
export function createAvailabilityWidget() {
  const tarjetas = el('div', { className: 'kpis kpis--2 availability-cards' });
  const indicador = createLiveStatus();
  const hora = el('p', { className: 'availability-time', attrs: { 'aria-live': 'polite' } });
  const widget = el('div', { className: 'availability' }, [
    el('div', { className: 'availability-head' }, [indicador, hora]),
    tarjetas,
  ]);
  widget._partes = { tarjetas, indicador, hora };
  return widget;
}

const tarjeta = (titulo, t, main) => {
  const libres = t?.disponibles ?? 0;
  const total = t?.habilitadas ?? 0;
  return createKpi({
    label: titulo,
    value: libres,
    unit: libres === 1 ? 'libre' : 'libres',
    main,
    meter: total ? (libres / total) * 100 : 0,
    note: total ? `de ${total} celdas habilitadas` : 'Sin celdas habilitadas',
  });
};

/** @param {HTMLElement} widget @param {{ carro: object, moto: object, actualizado_en: string }} datos */
export function setAvailability(widget, datos) {
  const { tarjetas, hora } = widget._partes;
  tarjetas.replaceChildren(
    tarjeta('Cupos para carro', datos.carro, true),
    tarjeta('Cupos para moto', datos.moto, false)
  );
  hora.textContent = datos.actualizado_en ? `Actualizado a las ${formatearHora(datos.actualizado_en)}` : '';
}

/** 'conectando' | 'en-vivo' | 'reconectando' */
export function setAvailabilityStatus(widget, estado) {
  setLiveStatus(widget._partes.indicador, estado);
}
