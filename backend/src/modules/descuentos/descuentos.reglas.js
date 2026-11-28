// Reglas puras de descuentos (spec 011, research R-01): cuándo corresponde un descuento a una liquidación,
// cuánto descuenta, cuál se elige (RN-25: uno solo, el de mayor valor) y su situación respecto al reloj.
// Sin BD ni HTTP. Vigencia cerrada en ambos extremos: desde ≤ fecha ≤ hasta (R-03).

const ms = (fecha) => new Date(fecha).getTime();

/** ¿La vigencia contiene el instante? */
const vigenteEn = (d, fecha) => ms(d.vigenteDesde) <= ms(fecha) && ms(fecha) <= ms(d.vigenteHasta);

/**
 * RF-DES-03: activo, vigente en `fecha`, del tipo de cliente y de vehículo («todos» o igual) y con la estadía
 * de al menos sus minutos mínimos.
 * @param {{ estado: string, vigenteDesde: Date|string, vigenteHasta: Date|string, aplicaTipoCliente: string,
 *           aplicaTipoVehiculo: string, minutosMinimos: number|null }} d
 * @param {{ tipoVehiculo: string, tipoCliente: string, minutos: number, fecha: Date|string }} liquidacion
 */
function corresponde(d, { tipoVehiculo, tipoCliente, minutos, fecha }) {
  return (
    d.estado === 'activo' &&
    vigenteEn(d, fecha) &&
    (d.aplicaTipoCliente === 'todos' || d.aplicaTipoCliente === tipoCliente) &&
    (d.aplicaTipoVehiculo === 'todos' || d.aplicaTipoVehiculo === tipoVehiculo) &&
    (d.minutosMinimos === null || d.minutosMinimos === undefined || minutos >= d.minutosMinimos)
  );
}

/** Cuánto descuenta sobre `bruto`: porcentaje redondeado al peso; el fijo nunca pasa del bruto (total ≥ 0). */
function valorDe(d, bruto) {
  if (bruto <= 0) return 0;
  const valor = d.tipo === 'porcentaje' ? Math.round((bruto * d.valor) / 100) : d.valor;
  return Math.min(valor, bruto);
}

/**
 * RN-25: el que más descuenta sobre `bruto`; si empatan, el más antiguo (menor id). null si no hay o el bruto es 0.
 * @returns {{ descuento: object, valor: number } | null}
 */
function elegir(candidatos, bruto) {
  let mejor = null;
  for (const d of candidatos) {
    const valor = valorDe(d, bruto);
    if (valor <= 0) continue;
    if (!mejor || valor > mejor.valor || (valor === mejor.valor && d.idDescuento < mejor.descuento.idDescuento)) mejor = { descuento: d, valor };
  }
  return mejor;
}

/** vigente | programado | vencido | inactivo. */
function situacion(d, ahora) {
  if (d.estado !== 'activo') return 'inactivo';
  if (ms(d.vigenteDesde) > ms(ahora)) return 'programado';
  if (ms(d.vigenteHasta) < ms(ahora)) return 'vencido';
  return 'vigente';
}

/** «20 %» o «$ 2.000» (para la explicación del cálculo). */
const etiquetaValor = (d, pesos) => (d.tipo === 'porcentaje' ? `${d.valor} %` : pesos(d.valor));

module.exports = { corresponde, valorDe, elegir, situacion, vigenteEn, etiquetaValor };
