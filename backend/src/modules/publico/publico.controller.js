const publicoService = require('./publico.service');
const { abrirStream } = require('../../realtime/sse');
const { aDisponibilidadPublica } = require('../celdas/celdas.resumen');

async function disponibilidad(_req, res) {
  res.json({ data: await publicoService.disponibilidad() });
}

/** Solo reenvía el resumen convertido a totales públicos (las celdas no salen). */
async function stream(req, res) {
  abrirStream(req, res, {
    inicial: [['disponibilidad', await publicoService.disponibilidad()]],
    eventos: { 'resumen-actualizado': aDisponibilidadPublica },
    renombrar: { 'resumen-actualizado': 'disponibilidad' },
  });
}

async function picoPlacaHoy(_req, res) {
  res.json({ data: await publicoService.picoPlacaHoy() });
}

module.exports = { disponibilidad, stream, picoPlacaHoy };
