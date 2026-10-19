const repo = require('./pisos.repository');

/** Pisos con los tramos del carril (texto separado por "|") para dibujar el mapa. */
async function listar() {
  return (await repo.listar()).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    orden: p.orden,
    carril: p.texto_carril
      .split('|')
      .map((tramo) => tramo.trim())
      .filter(Boolean),
    total_celdas: Number(p.total_celdas ?? 0),
    celdas_carro: Number(p.celdas_carro ?? 0),
    celdas_moto: Number(p.celdas_moto ?? 0),
  }));
}

module.exports = { listar };
