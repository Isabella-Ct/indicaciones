// Publica los cambios de celdas a los streams SSE. Lo llaman el módulo celdas y,
// en fases siguientes, entradas, salidas, membresías y reservas:
//   await publicarCambioCelda(celdaId)
// Emite 'celda-actualizada' (fila completa: cada stream la filtra según el rol)
// y 'resumen-actualizado' (totales).
const { publicar } = require('./emisor');
const repo = require('../modules/celdas/celdas.repository');
const { construirResumen } = require('../modules/celdas/celdas.resumen');

async function publicarCambioCelda(...celdaIds) {
  try {
    for (const id of celdaIds) {
      const fila = await repo.buscarDetalle(id);
      if (fila) publicar('celda-actualizada', fila);
    }
    publicar('resumen-actualizado', construirResumen(await repo.filasResumen()));
  } catch (err) {
    // Un fallo al notificar no debe deshacer la operación ya confirmada.
    console.error('No se pudo publicar el cambio de celda:', err.message);
  }
}

module.exports = { publicarCambioCelda };
