// Dinero en pesos colombianos (COP). En BD: DECIMAL(12,2); en textos: "$ 12.500" sin decimales.
const formato = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

function formatearCOP(valor) {
  return `$ ${formato.format(Math.round(Number(valor) || 0))}`;
}

/** Redondeo al múltiplo más cercano (por defecto la centena: 16.956 → 17.000). */
function redondear(valor, multiplo = 100) {
  const m = Number(multiplo) > 0 ? Number(multiplo) : 1;
  return Math.round(valor / m) * m;
}

module.exports = { formatearCOP, redondear };
