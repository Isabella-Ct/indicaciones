// Datos públicos (sin sesión) — REQ-WEB-1. Solo totales y reglas: nunca celdas, placas ni personas.
const celdasService = require('../celdas/celdas.service');
const picoPlacaService = require('../pico-placa/pico-placa.service');
const membresiasRepo = require('../membresias/membresias.repository');
const { aDisponibilidadPublica } = require('../celdas/celdas.resumen');

async function disponibilidad() {
  return aDisponibilidadPublica(await celdasService.resumen());
}

/** Pico y placa de hoy: solo el día y, por tipo, los dígitos y el horario. */
async function picoPlacaHoy() {
  const { fecha, dia_nombre: diaNombre, reglas } = await picoPlacaService.deHoy();
  const porTipo = (tipo) => {
    const delTipo = reglas.filter((r) => r.tipo_vehiculo === tipo);
    return {
      criterio: tipo === 'moto' ? 'primer dígito de la placa' : 'último dígito de la placa',
      digitos: [...new Set(delTipo.map((r) => r.digito))].sort((a, b) => a - b),
      horarios: [
        ...new Set(delTipo.map((r) => `${r.hora_inicio.slice(0, 5)}–${r.hora_fin.slice(0, 5)}`)),
      ],
    };
  };
  return { fecha, dia_nombre: diaNombre, carro: porTipo('carro'), moto: porTipo('moto') };
}

/** Valores de mensualidad y anualidad por tipo (de configuracion). */
async function mensualidades() {
  const valor = async (clave) => Number(await membresiasRepo.valorConfiguracion(clave)) || null;
  const [mc, ac, mm, am] = await Promise.all([
    valor('membresia_valor_mensual_carro'),
    valor('membresia_valor_anual_carro'),
    valor('membresia_valor_mensual_moto'),
    valor('membresia_valor_anual_moto'),
  ]);
  return { carro: { mensual: mc, anual: ac }, moto: { mensual: mm, anual: am } };
}

module.exports = { disponibilidad, picoPlacaHoy, mensualidades };
