const saludService = require('./salud.service');

async function obtener(_req, res) {
  res.json({ data: await saludService.verificar() });
}

module.exports = { obtener };
