const service = require('./incidencias.service');

async function listarTipos(req, res) {
  // Quien no gestiona tipos (operador) solo ve los activos.
  const gestiona = req.usuario.permisos.includes('incidencias.gestionar_tipos');
  const soloActivos = !gestiona || req.validado.query.activos === '1';
  res.json({ data: await service.listarTipos({ soloActivos }) });
}

async function crearTipo(req, res) {
  res.status(201).json({ data: await service.crearTipo(req.body) });
}

async function actualizarTipo(req, res) {
  res.json({ data: await service.actualizarTipo(req.validado.params.id, req.body) });
}

async function cambiarActivoTipo(req, res) {
  res.json({ data: await service.cambiarActivoTipo(req.validado.params.id, req.body.activo) });
}

async function crear(req, res) {
  res.status(201).json({ data: await service.crear(req.body, req.usuario) });
}

async function listar(req, res) {
  res.json(await service.listar(req.validado.query));
}

async function obtener(req, res) {
  res.json({ data: await service.obtener(req.validado.params.id) });
}

async function mias(req, res) {
  res.json(await service.deCliente(req.usuario.id, req.validado.query));
}

module.exports = {
  listarTipos,
  crearTipo,
  actualizarTipo,
  cambiarActivoTipo,
  crear,
  listar,
  obtener,
  mias,
};
