// Evaluación de pico y placa — función pura (sin BD), testeada aparte. REQ-INEX-4.
// Carros: último dígito de la placa. Motos: primer dígito numérico.
const { enBogota } = require('../../utils/fechas');

/** Dígito que decide la restricción, o null si la placa no tiene dígitos. */
function digitoDeRestriccion(placa, tipo) {
  const digitos = String(placa ?? '').replace(/\D/g, '');
  if (!digitos) return null;
  return Number(tipo === 'moto' ? digitos[0] : digitos[digitos.length - 1]);
}

const aSegundos = (hora) => {
  const [h, m, s = '0'] = String(hora).split(':');
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
};

/**
 * @param {string} placa normalizada (ABC123 / ABC12D)
 * @param {'carro'|'moto'} tipo
 * @param {Date} fechaHora momento a evaluar (la hora del servidor)
 * @param {Array<{ id: number, tipo_vehiculo: string, dia_semana: number, digito: number, hora_inicio: string, hora_fin: string, activa: boolean|number }>} reglas
 * @returns {{ restringido: boolean, regla: object|null, digito: number|null, diaSemana: number }}
 */
function evaluarRestriccion(placa, tipo, fechaHora, reglas) {
  const { diaSemana, hora } = enBogota(fechaHora);
  const digito = digitoDeRestriccion(placa, tipo);
  const ahora = aSegundos(hora);
  const regla =
    digito === null
      ? null
      : (reglas.find(
          (r) =>
            Boolean(r.activa) &&
            r.tipo_vehiculo === tipo &&
            Number(r.dia_semana) === diaSemana &&
            Number(r.digito) === digito &&
            aSegundos(r.hora_inicio) <= ahora &&
            ahora < aSegundos(r.hora_fin)
        ) ?? null);
  return { restringido: Boolean(regla), regla, digito, diaSemana };
}

/** Texto para mostrar: "carros con placa terminada en 5 (05:00–20:00)". */
function describirRegla(regla) {
  const criterio =
    regla.tipo_vehiculo === 'moto' ? 'motos con primer dígito' : 'carros con placa terminada en';
  return `${criterio} ${regla.digito} (${String(regla.hora_inicio).slice(0, 5)}–${String(regla.hora_fin).slice(0, 5)})`;
}

module.exports = { evaluarRestriccion, digitoDeRestriccion, describirRegla };
