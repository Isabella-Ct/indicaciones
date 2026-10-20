import { el } from '../../../utils/dom.js';
import { createButton } from '../../atoms/button/button.js';
import { createStatusChip } from '../../atoms/status-chip/status-chip.js';
import { formatearFechaHora } from '../../../utils/formato.js';

const TIPOS = {
  incidencia: 'Incidencia',
  pico_placa: 'Pico y placa',
  perfil_actualizado: 'Datos actualizados',
  membresia_por_vencer: 'Mensualidad',
  reserva_expirada: 'Reserva',
  manual: 'Mensaje',
};

/**
 * Notificación de la bandeja: tipo, título, mensaje, fecha, remitente y acciones.
 * @param {{
 *   notificacion: { id: number, titulo: string, mensaje: string, tipo: string, enlace?: string|null,
 *                   leida: boolean, fecha: string, enviada_por?: { nombre: string }|null },
 *   onLeer?: (n: object) => void,
 * }} props
 * @returns {HTMLLIElement}
 */
export function createNotificationItem({ notificacion: n, onLeer }) {
  const acciones = [];
  if (n.enlace) {
    acciones.push(createButton({ label: 'Abrir', variant: 'ghost', size: 'sm', href: n.enlace }));
  }
  if (!n.leida && onLeer) {
    acciones.push(
      createButton({
        label: 'Marcar leída',
        variant: 'dark',
        size: 'sm',
        icon: 'i-check',
        ariaLabel: `Marcar como leída: ${n.titulo}`,
        onClick: () => onLeer(n),
      })
    );
  }
  return el(
    'li',
    { className: n.leida ? 'notice' : 'notice is-unread', attrs: { 'data-id': n.id } },
    [
      el('div', { className: 'notice-meta' }, [
        createStatusChip({
          text: n.leida ? (TIPOS[n.tipo] ?? n.tipo) : `Nueva · ${TIPOS[n.tipo] ?? n.tipo}`,
          variant: n.leida ? 'neutral' : 'reserved',
        }),
        el('span', {
          text: `${formatearFechaHora(n.fecha)}${n.enviada_por ? ` · de ${n.enviada_por.nombre}` : ' · sistema'}`,
        }),
      ]),
      el('strong', { className: 'notice-title', text: n.titulo }),
      el('p', { className: 'notice-text', text: n.mensaje }),
      acciones.length ? el('div', { className: 'row-actions notice-actions' }, acciones) : null,
    ]
  );
}
