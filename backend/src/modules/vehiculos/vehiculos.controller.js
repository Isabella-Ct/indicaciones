const vehiculosService = require('./vehiculos.service');

async function listar(req, res) {
  res.json(await vehiculosService.listar(req.validado.query));
}

async function obtener(req, res) {
  res.json({ data: await vehiculosService.obtener(req.validado.params.id) });
}

async function obtenerPorPlaca(req, res) {
  res.json({ data: await vehiculosService.obtenerPorPlaca(req.validado.params.placa) });
}

async function historial(req, res) {
  res.json({ data: await vehiculosService.historial(req.validado.params.id) });
}

async function crear(req, res) {
  res.status(201).json({ data: await vehiculosService.crear(req.body, req.usuario) });
}

async function actualizar(req, res) {
  res.json({ data: await vehiculosService.actualizar(req.validado.params.id, req.body) });
}

async function cambiarPropietario(req, res) {
  const vehiculo = await vehiculosService.cambiarPropietario(
    req.validado.params.id,
    req.body,
    req.usuario
  );
  res.json({ data: vehiculo });
}

module.exports = {
  listar,
  obtener,
  obtenerPorPlaca,
  historial,
  crear,
  actualizar,
  cambiarPropietario,
};
