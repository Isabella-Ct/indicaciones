// Placas colombianas (CLAUDE.md §4): MAYÚSCULAS, sin espacios ni guiones.
const PATRONES = {
  carro: /^[A-Z]{3}\d{3}$/,
  moto: /^[A-Z]{3}\d{2}[A-Z]?$/,
};

/** " abc-123 " → "ABC123" */
function normalizarPlaca(texto) {
  return String(texto ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function esPlacaValida(placa, tipo) {
  const patron = PATRONES[tipo];
  return Boolean(patron && patron.test(placa));
}

function mensajePlacaInvalida(tipo) {
  return tipo === 'moto'
    ? 'Placa de moto inválida: 3 letras, 2 números y una letra opcional (ej. ABC12D).'
    : 'Placa de carro inválida: 3 letras y 3 números (ej. ABC123).';
}

module.exports = { PATRONES, normalizarPlaca, esPlacaValida, mensajePlacaInvalida };
