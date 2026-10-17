const rolesService = require('./roles.service');

async function listar(_req, res) {
  res.json({ data: await rolesService.listar() });
}

module.exports = { listar };
