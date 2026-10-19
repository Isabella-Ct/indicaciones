// Puertas de acceso (REQ-INEX-1/2 las usan en entradas y salidas). CRUD de administrador.
const { AppError, errores } = require('../../utils/errores');
const repo = require('./puertas.repository');

const aPublico = (p) => ({ id: p.id, nombre: p.nombre, tipo: p.tipo, activa: Boolean(p.activa) });

async function listar({ incluir_inactivas }, solicitante) {
  const incluirInactivas =
    incluir_inactivas === '1' && solicitante.permisos.includes('puertas.gestionar');
  return (await repo.listar({ incluirInactivas })).map(aPublico);
}

async function obtenerExistente(id) {
  const puerta = await repo.buscarPorId(id);
  if (!puerta) throw errores.noEncontrado('La puerta no existe.');
  return puerta;
}

async function validarNombre(parqueaderoId, nombre, excluirId) {
  if (await repo.existeNombre(parqueaderoId, nombre, excluirId)) {
    throw new AppError(409, 'NOMBRE_DUPLICADO', `Ya existe una puerta llamada ${nombre}.`, [
      { campo: 'nombre', mensaje: 'Este nombre ya existe.' },
    ]);
  }
}

async function crear({ nombre, tipo }) {
  const parqueadero_id = await repo.parqueaderoPrincipalId();
  await validarNombre(parqueadero_id, nombre);
  const id = await repo.insertar({ parqueadero_id, nombre, tipo });
  return aPublico(await repo.buscarPorId(id));
}

async function actualizar(id, { nombre, tipo }) {
  const actual = await obtenerExistente(id);
  await validarNombre(actual.parqueadero_id, nombre, id);
  await repo.actualizar(id, { nombre, tipo });
  return aPublico(await repo.buscarPorId(id));
}

async function cambiarActiva(id, activa) {
  const actual = await obtenerExistente(id);
  if (!activa && actual.activa && (await repo.contarActivas()) <= 1) {
    throw new AppError(409, 'ULTIMA_PUERTA', 'Debe quedar al menos una puerta activa.');
  }
  await repo.actualizarActiva(id, activa);
  return aPublico(await repo.buscarPorId(id));
}

module.exports = { listar, crear, actualizar, cambiarActiva };
