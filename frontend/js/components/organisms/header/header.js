import { el } from '../../../utils/dom.js';
import { createBrand } from '../../molecules/brand/brand.js';
import { createShift } from '../../molecules/shift/shift.js';
import { createUserMenu } from '../../molecules/user-menu/user-menu.js';

/**
 * Encabezado de la app (.header): marca PARKO + sede, fecha/hora/turno y menú de usuario.
 * La franja de peligro la pone el template (debajo del navbar).
 * @param {{
 *   sede: string,                     // "Parqueadero ABC · Medellín" (desde la BD)
 *   inicioHref?: string,
 *   turno?: string,                   // "Norte · L. Gómez"
 *   turnoLabel?: string,
 *   usuario?: { nombre: string, rol: string, fotoUrl?: string|null },
 *   menuItems?: Array<{ label: string, icon?: string, href?: string, onClick?: () => void }>,
 *   extra?: HTMLElement[],            // p. ej. la campana de notificaciones (Fase 5)
 * }} props
 * @returns {HTMLElement}
 */
export function createHeader({
  sede,
  inicioHref,
  turno,
  turnoLabel,
  usuario,
  menuItems = [],
  extra = [],
}) {
  return el('header', { className: 'header' }, [
    el('div', { className: 'header-inner' }, [
      createBrand({ sede, href: inicioHref }),
      createShift({ turno, turnoLabel }),
      ...extra,
      usuario ? createUserMenu({ ...usuario, items: menuItems }) : null,
    ]),
  ]);
}
