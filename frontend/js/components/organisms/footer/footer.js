import { el } from '../../../utils/dom.js';
import { createHazardStrip } from '../../atoms/hazard-strip/hazard-strip.js';

/**
 * Pie de página (.footer) con los datos de la sede (desde la BD). En la página pública
 * lleva la franja de peligro arriba y enlaces.
 * @param {{
 *   sede?: { nombre: string, direccion: string, ciudad: string, horario?: string } | null,
 *   franja?: boolean,
 *   enlaces?: Array<{ texto: string, href: string }>,
 * }} props
 * @returns {HTMLElement}
 */
export function createFooter({ sede, franja = false, enlaces = [] } = {}) {
  const anio = new Date().getFullYear();
  return el('footer', { className: 'footer' }, [
    franja ? createHazardStrip() : null,
    el('div', { className: 'footer-inner' }, [
      el('p', { className: 'footer-brand', text: 'PARKO' }),
      sede
        ? el('p', {
            text: [sede.nombre, `${sede.direccion}, ${sede.ciudad}`, sede.horario]
              .filter(Boolean)
              .join(' · '),
          })
        : null,
      enlaces.length
        ? el(
            'nav',
            { className: 'footer-links', attrs: { 'aria-label': 'Enlaces del pie de página' } },
            enlaces.map((e) => el('a', { text: e.texto, attrs: { href: e.href } }))
          )
        : null,
      el('p', { text: `© ${anio} PARKO · Sistema de gestión de parqueaderos` }),
    ]),
  ]);
}
