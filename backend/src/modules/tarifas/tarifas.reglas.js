// Reglas puras de tarifas (spec 008, research R-02..R-07): vigencias que se cruzan (RN-18), situación de una
// tarifa respecto al reloj, tipo de cliente de un vehículo (para la spec 009) y campos que no se pueden
// cambiar en una tarifa ya usada en liquidaciones (RF-TAR-04).

const INFINITO = Number.POSITIVE_INFINITY;
const ms = (fecha) => (fecha === null || fecha === undefined ? INFINITO : new Date(fecha).getTime());

/** ¿Se cruzan dos vigencias semiabiertas [desde, hasta)? (hasta null = indefinida). */
const vigenciasSeCruzan = (a, b) => ms(a.vigenteDesde) < ms(b.vigenteHasta) && ms(b.vigenteDesde) < ms(a.vigenteHasta);

/** ¿La vigencia contiene el instante? */
const contiene = (t, instante) => ms(t.vigenteDesde) <= ms(instante) && ms(instante) < ms(t.vigenteHasta);

/** vigente | programada | vencida | inactiva. */
function situacion(t, ahora) {
  if (t.estado !== 'activo') return 'inactiva';
  if (ms(t.vigenteDesde) > ms(ahora)) return 'programada';
  if (ms(t.vigenteHasta) <= ms(ahora)) return 'vencida';
  return 'vigente';
}

/** RN-19 / spec 009: registrado si el vehículo tiene propietario; si no, ocasional. */
const tipoClienteDe = (vehiculo) => (vehiculo?.propietario || vehiculo?.idPropietario ? 'registrado' : 'ocasional');

const CAMPOS_PRECIO = ['tipoVehiculo', 'tipoCliente', 'valorPrimeraHora', 'minutosFraccion', 'valorFraccion', 'topeDiario', 'minutosGracia', 'vigenteDesde'];

const igual = (a, b) => (a instanceof Date || b instanceof Date ? ms(a) === ms(b) : a === b);

/** RF-TAR-04: campos (fuera de nombre y vigenteHasta) que cambian; en una tarifa usada deben ser ninguno. */
const cambiosNoPermitidosEnUsada = (actual, nueva) => CAMPOS_PRECIO.filter((campo) => !igual(actual[campo], nueva[campo]));

/** ('carro', 'ocasional') → 'carro ocasional'. */
const etiqueta = (tipoVehiculo, tipoCliente) => `${tipoVehiculo} ${tipoCliente}`;

module.exports = { vigenciasSeCruzan, contiene, situacion, tipoClienteDe, cambiosNoPermitidosEnUsada, etiqueta, CAMPOS_PRECIO };
