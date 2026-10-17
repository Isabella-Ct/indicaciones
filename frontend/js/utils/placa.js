/**
 * Placas colombianas (CLAUDE.md §4): se guardan en MAYÚSCULAS sin espacios ni guiones.
 * Carro: ABC123 · Moto: ABC12 o ABC12D.
 */
export const PATRON_PLACA = {
  carro: /^[A-Z]{3}\d{3}$/,
  moto: /^[A-Z]{3}\d{2}[A-Z]?$/,
};

/** " abc-123 " → "ABC123" */
export function normalizarPlaca(texto) {
  return String(texto ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/** ¿La placa es válida para el tipo de vehículo? */
export function esPlacaValida(placa, tipo) {
  const patron = PATRON_PLACA[tipo];
  return Boolean(patron && patron.test(normalizarPlaca(placa)));
}

/** "JKL482" → "JKL 482" · "XKP45F" → "XKP 45F" (solo para mostrar). */
export function formatearPlaca(placa) {
  const p = normalizarPlaca(placa);
  return p.length > 3 ? `${p.slice(0, 3)} ${p.slice(3)}` : p;
}
