// Dinero en pesos colombianos (COP). En BD: DECIMAL(12,2); en textos: "$ 12.500" sin decimales.
const formato = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

function formatearCOP(valor) {
  return `$ ${formato.format(Math.round(Number(valor) || 0))}`;
}

/** Redondeo a la centena más cercana (16.956 → 17.000). */
function redondearCentena(valor) {
  return Math.round(valor / 100) * 100;
}

module.exports = { formatearCOP, redondearCentena };
