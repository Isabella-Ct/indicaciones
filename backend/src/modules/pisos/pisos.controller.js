const pisosService = require('./pisos.service');

async function listar(_req, res) {
  res.json({ data: await pisosService.listar() });
}

module.exports = { listar };
