// Átomo · atom-plate con los dígitos restringidos de pico y placa: [6, 9] → «6 · 9».

/** Pone los dígitos y una lectura clara para lectores de pantalla («dígitos 6 y 9»). */
export function ponerDigitos(nodo, digitos) {
  nodo.textContent = digitos.join(' · ');
  const lista = digitos.length > 1 ? `${digitos.slice(0, -1).join(', ')} y ${digitos[digitos.length - 1]}` : String(digitos[0]);
  nodo.setAttribute('aria-label', `${digitos.length > 1 ? 'dígitos' : 'dígito'} ${lista}`);
}
