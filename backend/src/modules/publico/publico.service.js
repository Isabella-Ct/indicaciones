const celdasService = require('../celdas/celdas.service');
const { aDisponibilidadPublica } = require('../celdas/celdas.resumen');

async function disponibilidad() {
  return aDisponibilidadPublica(await celdasService.resumen());
}

module.exports = { disponibilidad };
