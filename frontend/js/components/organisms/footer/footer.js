import { el } from '../../../utils/dom.js';

/**
 * Pie de página (.footer) con los datos de la sede (desde la BD).
 * @param {{ sede?: { nombre: string, direccion: string, ciudad: string, horario?: string } | null }} props
 * @returns {HTMLElement}
 */
export function createFooter({ sede } = {}) {
  const anio = new Date().getFullYear();
  return el('footer', { className: 'footer' }, [
    el('div', { className: 'footer-inner' }, [
      el('p', { className: 'footer-brand', text: 'PARKO' }),
      sede
        ? el('p', {
            text: [sede.nombre, `${sede.direccion}, ${sede.ciudad}`, sede.horario]
              .filter(Boolean)
              .join(' · '),
          })
        : null,
      el('p', { text: `© ${anio} PARKO · Sistema de gestión de parqueaderos` }),
    ]),
  ]);
}
