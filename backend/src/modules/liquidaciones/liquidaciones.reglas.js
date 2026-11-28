// Cálculo puro de la liquidación (spec 009, research R-02; RN-20, RN-21). Sin BD ni HTTP: se prueba con
// pruebas unitarias. Valores en pesos colombianos.

const MINUTOS_DIA = 1440;
const MINUTOS_PRIMERA_HORA = 60;

/** 9000 → «$ 9.000» (sin decimales, separador de miles con punto). */
const pesos = (valor) => `$ ${Math.round(Number(valor) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

/** Fracciones iniciadas después de la primera hora. */
const fraccionesDe = (minutos, tarifa) => Math.ceil(Math.max(0, minutos - MINUTOS_PRIMERA_HORA) / tarifa.minutosFraccion);

/** Valor de un tramo de estadía sin tope: primera hora + cada fracción iniciada (0 si no hay minutos). */
const valorTramo = (minutos, tarifa) =>
  minutos <= 0 ? 0 : tarifa.valorPrimeraHora + fraccionesDe(minutos, tarifa) * tarifa.valorFraccion;

const conTope = (valor, tope) => (tope === null || tope === undefined ? valor : Math.min(valor, tope));

/** «$ 4.000 + 5 fracciones × $ 1.000 = $ 9.000» para un tramo. */
function explicarTramo(minutos, tarifa) {
  const fracciones = fraccionesDe(minutos, tarifa);
  if (!fracciones) return `${pesos(tarifa.valorPrimeraHora)} (primera hora)`;
  return `${pesos(tarifa.valorPrimeraHora)} + ${fracciones} ${fracciones === 1 ? 'fracción' : 'fracciones'} × ${pesos(tarifa.valorFraccion)}`;
}

/**
 * RN-20 y RN-21.
 * @param {{ minutos: number, tarifa: { valorPrimeraHora: number, minutosFraccion: number, valorFraccion: number,
 *           topeDiario: number|null, minutosGracia: number }, cubiertoPorMembresia?: boolean }} datos
 */
function calcular({ minutos, tarifa, cubiertoPorMembresia = false }) {
  const base = { minutos, fracciones: 0, dias: 0, topeAplicado: false, valorBruto: 0, valorDescuento: 0, cubiertoPorMembresia, total: 0 };
  if (cubiertoPorMembresia) return { ...base, explicacion: 'Cubierto por membresía' };
  if (minutos <= tarifa.minutosGracia) {
    return { ...base, explicacion: `Dentro del tiempo de gracia (${minutos} de ${tarifa.minutosGracia} min): sin cobro` };
  }
  const tope = tarifa.topeDiario;
  if (tope === null || tope === undefined) {
    const bruto = valorTramo(minutos, tarifa);
    return { ...base, fracciones: fraccionesDe(minutos, tarifa), valorBruto: bruto, total: bruto, explicacion: `${explicarTramo(minutos, tarifa)} = ${pesos(bruto)}` };
  }
  // Con tope: cada bloque completo de 24 h cuesta como máximo el tope; el resto se cobra aparte, también con tope.
  const dias = Math.floor(minutos / MINUTOS_DIA);
  const resto = minutos % MINUTOS_DIA;
  const valorDia = conTope(valorTramo(MINUTOS_DIA, tarifa), tope);
  const valorResto = conTope(valorTramo(resto, tarifa), tope);
  const bruto = dias * valorDia + valorResto;
  const topeEnResto = resto > 0 && valorTramo(resto, tarifa) > tope;
  const partes = [];
  if (dias) partes.push(`${dias} ${dias === 1 ? 'día' : 'días'} × ${pesos(valorDia)} (tope diario)`);
  if (resto) partes.push(topeEnResto ? `${pesos(tope)} (tope diario)` : explicarTramo(resto, tarifa));
  return {
    ...base,
    fracciones: fraccionesDe(resto, tarifa),
    dias,
    topeAplicado: dias > 0 || topeEnResto,
    valorBruto: bruto,
    total: bruto,
    explicacion: `${partes.join(' + ')} = ${pesos(bruto)}`,
  };
}

module.exports = { calcular, valorTramo, fraccionesDe, pesos, MINUTOS_DIA };
