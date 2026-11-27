// Disponibilidad en tiempo real (HU-24 · RF-CLD-22, RF-CLD-23): pública y sin datos personales.
const repositorio = require('./disponibilidad.repository');
const { aIsoBogota } = require('../../utils/fechas');

const tipo = (disponibles, total) => ({
  disponibles: Number(disponibles),
  total: Number(total),
  // RF-CLD-23: «Lleno» cuando no queda ninguna celda disponible de ese tipo.
  lleno: Number(total) > 0 && Number(disponibles) === 0,
});

async function consultar({ parqueadero } = {}) {
  const filas = await repositorio.porParqueadero({ idParqueadero: parqueadero });
  return {
    actualizadoEn: aIsoBogota(new Date()),
    parqueaderos: filas.map((f) => ({
      idParqueadero: f.id_parqueadero,
      nombre: f.nombre,
      direccion: f.direccion,
      horario: f.horario,
      tipos: { carro: tipo(f.carro_disponibles, f.carro_total), moto: tipo(f.moto_disponibles, f.moto_total) },
    })),
  };
}

module.exports = { consultar };
