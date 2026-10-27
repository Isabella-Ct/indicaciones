/**
 * Patrones de validación de formularios compartidos por las páginas (el servidor
 * valida siempre con zod; esto solo avisa antes de enviar).
 */
export const PATRON_CELULAR = /^3\d{9}$/;
export const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
