// Cálculo del cobro — REQ-TAR-2. Función PURA (sin BD), los 5 pasos de CLAUDE.md §7:
//  1. minutos ≤ minutos_gracia → $0.
//  2. fracciones = ceil(minutos / minutos_fraccion) × valor_fraccion.
//  3. Cada bloque de 24 h se topa en valor_dia_maximo ("tope del día").
//  4. Membresía activa → total $0 (la factura se registra igual, en $0).
//  5. Descuento (uno por factura) → total = subtotal × (1 − %/100), redondeado a la centena.
// La usan el cobro de salida, el simulador de tarifas y la semilla de datos.
const { formatearCOP, redondear } = require('../../utils/dinero');

const MINUTOS_DIA = 24 * 60;

/** Cargo de un tramo de minutos dentro de un mismo bloque de 24 h (pasos 2 y 3). */
function cargoTramo(minutos, t) {
  const fracciones = Math.ceil(minutos / t.minutos_fraccion);
  const bruto = fracciones * t.valor_fraccion;
  return {
    fracciones,
    bruto,
    cargo: Math.min(bruto, t.valor_dia_maximo),
    topado: bruto > t.valor_dia_maximo,
  };
}

function textoTramo(minutos, { fracciones, bruto }, t) {
  return t.minutos_fraccion === 1
    ? `${minutos} min × ${formatearCOP(t.valor_fraccion)} = ${formatearCOP(bruto)}`
    : `${minutos} min → ${fracciones} fracción(es) de ${t.minutos_fraccion} min × ${formatearCOP(t.valor_fraccion)} = ${formatearCOP(bruto)}`;
}

/**
 * @param {{
 *   minutos: number,
 *   tarifa: { valor_fraccion: number, minutos_fraccion: number, minutos_gracia: number, valor_dia_maximo: number },
 *   membresiaActiva?: { titular?: string } | null,
 *   descuento?: { id?: number, nombre: string, porcentaje: number } | null,
 *   redondeo?: number,   // múltiplo del total con descuento (configuracion.facturacion_redondeo)
 * }} entrada
 * @returns {{
 *   minutos: number, fracciones: number, subtotal: number, valorDescuento: number, total: number,
 *   porcentajeDescuento: number, porcentajeTope: number, membresia: boolean, nota: string,
 *   detalle: Array<{ paso: string, texto: string, valor: number }>,
 * }}
 */
function calcularCobro({
  minutos,
  tarifa,
  membresiaActiva = null,
  descuento = null,
  redondeo = 100,
}) {
  const t = {
    valor_fraccion: Number(tarifa.valor_fraccion),
    minutos_fraccion: Number(tarifa.minutos_fraccion) || 1,
    minutos_gracia: Number(tarifa.minutos_gracia) || 0,
    valor_dia_maximo: Number(tarifa.valor_dia_maximo),
  };
  const m = Math.max(0, Math.floor(Number(minutos) || 0));
  const detalle = [];
  let subtotal = 0;
  let fracciones = 0;
  let porcentajeTope = 0;
  let nota;

  // Paso 1: gracia
  if (m <= t.minutos_gracia) {
    const texto = t.minutos_gracia
      ? `${m} min dentro de los ${t.minutos_gracia} min de gracia`
      : `${m} min: no hay tiempo que cobrar`;
    detalle.push({ paso: 'gracia', texto, valor: 0 });
    nota = texto;
  } else {
    // Pasos 2 y 3: fracciones con tope por cada bloque de 24 h
    const dias = Math.floor(m / MINUTOS_DIA);
    const resto = m % MINUTOS_DIA;
    fracciones = Math.ceil(m / t.minutos_fraccion);
    if (dias > 0) {
      const valor = dias * t.valor_dia_maximo;
      subtotal += valor;
      detalle.push({
        paso: 'tope',
        texto: `${dias} bloque(s) de 24 h al tope del día: ${dias} × ${formatearCOP(t.valor_dia_maximo)} = ${formatearCOP(valor)}`,
        valor,
      });
      porcentajeTope = 100;
    }
    if (resto > 0) {
      const tramo = cargoTramo(resto, t);
      subtotal += tramo.cargo;
      const texto = textoTramo(resto, tramo, t);
      detalle.push({
        paso: tramo.topado ? 'tope' : 'fracciones',
        texto: tramo.topado ? `${texto} → tope del día ${formatearCOP(t.valor_dia_maximo)}` : texto,
        valor: tramo.cargo,
      });
      porcentajeTope = t.valor_dia_maximo
        ? Math.round((tramo.cargo / t.valor_dia_maximo) * 100)
        : 0;
    }
    nota = detalle.map((d) => d.texto).join(' + ');
  }

  // Paso 4: membresía activa → $0
  if (membresiaActiva) {
    const texto = `Mensualidad activa${membresiaActiva.titular ? ` · ${membresiaActiva.titular}` : ''}: no paga (tarifa normal ${formatearCOP(subtotal)})`;
    detalle.push({ paso: 'membresia', texto, valor: -subtotal });
    return {
      minutos: m,
      fracciones,
      subtotal: 0,
      valorDescuento: 0,
      total: 0,
      porcentajeDescuento: 0,
      porcentajeTope: 0,
      membresia: true,
      nota: `Mensualidad activa${membresiaActiva.titular ? ` · ${membresiaActiva.titular}` : ''}`,
      detalle: [...detalle, { paso: 'total', texto: 'Total a pagar: $ 0', valor: 0 }],
    };
  }

  // Paso 5: descuento, redondeado (por defecto a la centena)
  let total = subtotal;
  const porcentaje = descuento ? Math.min(100, Math.max(0, Number(descuento.porcentaje))) : 0;
  if (descuento) {
    total = redondear(subtotal * (1 - porcentaje / 100), redondeo);
    detalle.push({
      paso: 'descuento',
      texto: `Descuento ${descuento.nombre} (${porcentaje} %): −${formatearCOP(subtotal - total)} (redondeado ${Number(redondeo) === 100 ? 'a la centena' : `a múltiplos de ${formatearCOP(redondeo)}`})`,
      valor: total - subtotal,
    });
  }
  detalle.push({ paso: 'total', texto: `Total a pagar: ${formatearCOP(total)}`, valor: total });

  return {
    minutos: m,
    fracciones,
    subtotal,
    valorDescuento: subtotal - total,
    total,
    porcentajeDescuento: porcentaje,
    porcentajeTope,
    membresia: false,
    nota,
    detalle,
  };
}

module.exports = { calcularCobro };
