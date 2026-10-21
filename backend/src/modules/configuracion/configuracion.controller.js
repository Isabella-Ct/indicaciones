const configuracionService = require('./configuracion.service');

async function listar(_req, res) {
  res.json({ data: await configuracionService.listar() });
}

async function actualizar(req, res) {
  res.json({
    data: await configuracionService.actualizar(
      req.validado.params.clave,
      req.body.valor,
      req.usuario
    ),
  });
}

module.exports = { listar, actualizar };
