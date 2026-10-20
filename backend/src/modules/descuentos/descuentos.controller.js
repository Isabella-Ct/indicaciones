const descuentosService = require('./descuentos.service');

async function listar(req, res) {
  // El operador (sin descuentos.gestionar) solo necesita los activos para cobrar.
  const soloActivos =
    req.validado.query.activos === '1' || !req.usuario.permisos.includes('descuentos.gestionar');
  res.json({ data: await descuentosService.listar({ soloActivos }) });
}

async function crear(req, res) {
  res.status(201).json({ data: await descuentosService.crear(req.body) });
}

async function actualizar(req, res) {
  res.json({ data: await descuentosService.actualizar(req.validado.params.id, req.body) });
}

async function cambiarActivo(req, res) {
  res.json({
    data: await descuentosService.cambiarActivo(req.validado.params.id, req.body.activo),
  });
}

module.exports = { listar, crear, actualizar, cambiarActivo };
