/**
 * Ítems del navbar. Cada uno exige un permiso (tabla permisos); el navbar solo
 * muestra los que el rol en sesión tiene (CLAUDE.md §5.1).
 * Las pantallas se crean en las fases siguientes.
 */
import { tienePermiso } from './sesion.js';

export const ITEMS_NAVEGACION = [
  { id: 'inicio', etiqueta: 'Inicio', href: '/app/inicio.html', permiso: null },
  { id: 'celdas', etiqueta: 'Celdas', href: '/app/celdas.html', permiso: 'celdas.ver' },
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
  { id: 'facturas', etiqueta: 'Facturas', href: '/app/facturas.html', permiso: 'facturas.ver' },
  { id: 'tarifas', etiqueta: 'Tarifas', href: '/app/tarifas.html', permiso: 'tarifas.ver' },
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
  { id: 'reportes', etiqueta: 'Reportes', href: '/app/reportes.html', permiso: 'reportes.ver' },
  // Portal del cliente
  {
    id: 'mis-vehiculos',
    etiqueta: 'Mis vehículos',
    href: '/app/mis-vehiculos.html',
    permiso: 'portal.ver',
  },
  {
    id: 'mis-reservas',
    etiqueta: 'Mis reservas',
    href: '/app/mis-reservas.html',
    permiso: 'portal.ver',
  },
  {
    id: 'mis-facturas',
    etiqueta: 'Mis facturas',
    href: '/app/mis-facturas.html',
    permiso: 'portal.ver',
  },
];

/** Ítems visibles para la sesión. */
export function itemsPermitidos(sesion) {
  return ITEMS_NAVEGACION.filter((item) => !item.permiso || tienePermiso(sesion, item.permiso));
}
