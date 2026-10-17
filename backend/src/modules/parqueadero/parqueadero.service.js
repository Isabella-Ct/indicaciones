const { errores } = require('../../utils/errores');
const repo = require('./parqueadero.repository');

/** Datos de la sede: alimentan el subtítulo de la marca ("Parqueadero ABC · Medellín") y el turno. */
async function obtenerSede() {
  const sede = await repo.obtenerPrincipal();
  if (!sede) throw errores.noEncontrado('No hay una sede de parqueadero configurada.');
  const puertas = await repo.listarPuertasActivas(sede.id);
  return { ...sede, puertas };
}

module.exports = { obtenerSede };
