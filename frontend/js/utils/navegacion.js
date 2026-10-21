/**
 * Ítems del navbar. Cada uno exige un permiso (tabla permisos); el navbar solo
 * muestra los que el rol en sesión tiene (CLAUDE.md §5.1).
 * "excluir": el ítem se oculta si la sesión tiene ese permiso (p. ej. el mapa del personal
 * para el cliente, que lo ve en Disponibilidad).
 */
import { tienePermiso } from './sesion.js';

export const ITEMS_NAVEGACION = [
  { id: 'inicio', etiqueta: 'Inicio', href: '/app/inicio.html', permiso: null },
  // El cliente ve el mapa en Disponibilidad (portal), con reservas.
  {
    id: 'celdas',
    etiqueta: 'Celdas',
    href: '/app/celdas.html',
    permiso: 'celdas.ver',
    excluir: 'portal.ver',
  },
  // La operación (ingreso/salida) se hace en Celdas; aquí, el historial de movimientos.
  {
    id: 'historial',
    etiqueta: 'Movimientos',
    href: '/app/historial.html',
    permiso: 'movimientos.ver',
  },
  { id: 'usuarios', etiqueta: 'Usuarios', href: '/app/usuarios.html', permiso: 'usuarios.crear' },
  { id: 'vehiculos', etiqueta: 'Vehículos', href: '/app/vehiculos.html', permiso: 'vehiculos.ver' },
  {
    id: 'pico-placa',
    etiqueta: 'Pico y placa',
    href: '/app/pico-placa.html',
    permiso: 'pico_placa.ver',
  },
  { id: 'facturas', etiqueta: 'Facturas', href: '/app/facturacion.html', permiso: 'facturas.ver' },
  { id: 'tarifas', etiqueta: 'Tarifas', href: '/app/tarifas.html', permiso: 'tarifas.ver' },
  {
    id: 'descuentos',
    etiqueta: 'Descuentos',
    href: '/app/descuentos.html',
    permiso: 'descuentos.gestionar',
  },
  {
    id: 'membresias',
    etiqueta: 'Membresías',
    href: '/app/membresias.html',
    permiso: 'membresias.ver',
  },
  { id: 'reservas', etiqueta: 'Reservas', href: '/app/reservas.html', permiso: 'reservas.ver' },
  {
    id: 'incidencias',
    etiqueta: 'Incidencias',
    href: '/app/incidencias.html',
    permiso: 'incidencias.ver',
  },
  {
    id: 'notificaciones',
    etiqueta: 'Notificaciones',
    href: '/app/notificaciones.html',
    permiso: 'notificaciones.enviar',
  },
  { id: 'reportes', etiqueta: 'Reportes', href: '/app/reportes.html', permiso: 'reportes.ver' },
  // Portal del cliente (Fase 7): inicio, disponibilidad con reservas, movimientos y cuenta
  {
    id: 'disponibilidad',
    etiqueta: 'Disponibilidad',
    href: '/app/disponibilidad.html',
    permiso: 'portal.ver',
  },
  {
    id: 'mis-movimientos',
    etiqueta: 'Mis movimientos',
    href: '/app/mis-movimientos.html',
    permiso: 'portal.ver',
  },
  { id: 'mi-cuenta', etiqueta: 'Mi cuenta', href: '/app/mi-cuenta.html', permiso: 'portal.ver' },
];

/** Ítems visibles para la sesión. */
export function itemsPermitidos(sesion) {
  return ITEMS_NAVEGACION.filter(
    (item) =>
      (!item.permiso || tienePermiso(sesion, item.permiso)) &&
      !(item.excluir && tienePermiso(sesion, item.excluir))
  );
}
