const { errores } = require('../../utils/errores');
const repo = require('./parqueadero.repository');

/** Datos de la sede: alimentan el subtítulo de la marca ("Parqueadero ABC · Medellín") y el turno. */
async function obtenerSede() {
  const sede = await repo.obtenerPrincipal();
  if (!sede) throw errores.noEncontrado('No hay una sede de parqueadero configurada.');
  const puertas = await repo.listarPuertasActivas(sede.id);
  const { latitud, longitud, ...datos } = sede;
  // Ubicación para el mapa de la página pública (null si no está configurada).
  const ubicacion =
    latitud !== null && longitud !== null ? { lat: Number(latitud), lon: Number(longitud) } : null;
  return { ...datos, ubicacion, puertas };
}

module.exports = { obtenerSede };
