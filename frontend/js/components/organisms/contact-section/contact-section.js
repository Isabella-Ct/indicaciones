import { el } from '../../../utils/dom.js';
import { createDataList } from '../../molecules/data-list/data-list.js';
import { createButton } from '../../atoms/button/button.js';

/**
 * Ubicación y contacto: datos de la sede (de la BD) y mapa embebido de OpenStreetMap
 * (iframe, sin API key; carga diferida).
 * @param {{
 *   sede: { nombre: string, direccion: string, ciudad: string, telefono?: string, horario?: string } | null,
 *   mapa: { lat: number, lon: number, zoom?: number } | null,   // sin ubicación: no hay mapa
 *   acciones?: HTMLElement[],
 * }} props
 * @returns {HTMLElement}
 */
export function createContactSection({ sede, mapa, acciones = [] }) {
  const direccion = sede ? `${sede.direccion}, ${sede.ciudad}` : '—';
  const info = (extra) =>
    el('div', { className: 'contact-info' }, [
      createDataList({
        items: [
          { term: 'Dirección', value: direccion },
          { term: 'Horario', value: sede?.horario ?? 'Abierto 24 horas' },
          { term: 'Teléfono', value: sede?.telefono ?? '—' },
          { term: 'Vehículos', value: 'Carros y motos' },
        ],
      }),
      el('div', { className: 'contact-actions' }, [...acciones, ...extra]),
    ]);
  if (!mapa) return el('div', { className: 'contact' }, [info([])]);

  const d = 0.004;
  const bbox = [mapa.lon - d, mapa.lat - d * 0.75, mapa.lon + d, mapa.lat + d * 0.75]
    .map((n) => n.toFixed(5))
    .join('%2C');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${mapa.lat}%2C${mapa.lon}`;
  const grande = `https://www.openstreetmap.org/?mlat=${mapa.lat}&mlon=${mapa.lon}#map=${mapa.zoom ?? 17}/${mapa.lat}/${mapa.lon}`;
  const enlaceMapa = createButton({
    label: 'Abrir el mapa',
    variant: 'ghost',
    size: 'sm',
    href: grande,
  });
  enlaceMapa.setAttribute('target', '_blank');
  enlaceMapa.setAttribute('rel', 'noopener');

  return el('div', { className: 'contact' }, [
    info([enlaceMapa]),
    el('div', { className: 'contact-map' }, [
      el('iframe', {
        attrs: {
          src,
          title: `Mapa de la ubicación: ${direccion}`,
          loading: 'lazy',
          referrerpolicy: 'no-referrer-when-downgrade',
        },
      }),
    ]),
  ]);
}
