// Descuentos — REQ-DES-1: descripción + porcentaje 0–100; uno por factura.
const { AppError, errores } = require('../../utils/errores');
const repo = require('./descuentos.repository');

const aPublico = (d) => ({
  id: d.id,
  nombre: d.nombre,
  descripcion: d.descripcion,
  porcentaje: Number(d.porcentaje),
  activo: Boolean(d.activo),
});

async function listar({ soloActivos }) {
  return (await repo.listar({ soloActivos })).map(aPublico);
}

/** Descuento utilizable al cobrar (existe y está activo). */
async function obtenerActivo(id, conexion) {
  const d = await repo.buscarPorId(id, conexion);
  if (!d || !d.activo) {
    throw errores.validacion([
      { campo: 'descuento_id', mensaje: 'El descuento no existe o está inactivo.' },
    ]);
  }
  return aPublico(d);
}

async function validarNombre(nombre, excluirId) {
  if (await repo.existeNombre(nombre, excluirId)) {
    throw new AppError(409, 'NOMBRE_DUPLICADO', `Ya existe un descuento llamado "${nombre}".`, [
      { campo: 'nombre', mensaje: 'Este nombre ya existe.' },
    ]);
  }
}

async function crear(datos) {
  await validarNombre(datos.nombre);
  return aPublico(await repo.buscarPorId(await repo.insertar(datos)));
}

async function actualizar(id, datos) {
  if (!(await repo.buscarPorId(id))) throw errores.noEncontrado('El descuento no existe.');
  await validarNombre(datos.nombre, id);
  await repo.actualizar(id, datos);
  return aPublico(await repo.buscarPorId(id));
}

async function cambiarActivo(id, activo) {
  if (!(await repo.buscarPorId(id))) throw errores.noEncontrado('El descuento no existe.');
  await repo.actualizarActivo(id, activo);
  return aPublico(await repo.buscarPorId(id));
}

module.exports = { listar, obtenerActivo, crear, actualizar, cambiarActivo };
