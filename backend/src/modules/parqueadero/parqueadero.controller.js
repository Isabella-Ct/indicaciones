const parqueaderoService = require('./parqueadero.service');

async function obtener(_req, res) {
  res.json({ data: await parqueaderoService.obtenerSede() });
}

module.exports = { obtener };
