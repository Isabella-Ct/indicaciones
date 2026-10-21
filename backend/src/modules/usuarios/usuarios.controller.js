const usuariosService = require('./usuarios.service');
const vehiculosService = require('../vehiculos/vehiculos.service');

async function listar(req, res) {
  res.json(await usuariosService.listar(req.validado.query));
}

async function buscar(req, res) {
  res.json({ data: await usuariosService.buscarClientes(req.validado.query.documento) });
}

async function obtener(req, res) {
  res.json({ data: await usuariosService.obtener(req.validado.params.id, req.usuario) });
}

async function crear(req, res) {
  const usuario = await usuariosService.crear(req.body, req.imagen, req.usuario);
  res.status(201).json({ data: usuario });
}

async function actualizar(req, res) {
  const usuario = await usuariosService.actualizar(
    req.validado.params.id,
    req.body,
    req.imagen,
    req.usuario
  );
  res.json({ data: usuario });
}

async function restablecerContrasena(req, res) {
  const usuario = await usuariosService.restablecerContrasena(
    req.validado.params.id,
    req.body.contrasena_temporal,
    req.usuario
  );
  res.json({ data: usuario });
}

async function cambiarEstado(req, res) {
  const usuario = await usuariosService.cambiarEstado(
    req.validado.params.id,
    req.body.estado,
    req.usuario
  );
  res.json({ data: usuario });
}

async function miPerfil(req, res) {
  res.json({ data: await usuariosService.obtenerMiPerfil(req.usuario.id) });
}

async function actualizarMiPerfil(req, res) {
  const { usuario, cambiados } = await usuariosService.actualizarMiPerfil(
    req.usuario.id,
    req.body,
    req.imagen
  );
  res.json({ data: usuario, meta: { campos_cambiados: cambiados } });
}

async function misVehiculos(req, res) {
  res.json({ data: await vehiculosService.listarDeUsuario(req.usuario.id) });
}

module.exports = {
  listar,
  buscar,
  obtener,
  crear,
  actualizar,
  cambiarEstado,
  restablecerContrasena,
  miPerfil,
  actualizarMiPerfil,
  misVehiculos,
};
