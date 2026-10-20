const service = require('./dashboard.service');

async function obtener(req, res) {
  res.json({ data: await service.paraUsuario(req.usuario) });
}

module.exports = { obtener };
