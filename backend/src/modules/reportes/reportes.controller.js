const service = require('./reportes.service');
const { aCsv, enviarCsv } = require('../../utils/csv');

/** Responde JSON { data, meta } o, con ?formato=csv, la descarga en CSV. */
const responder = (reporte) => async (req, res) => {
  const consulta = req.validado.query;
  const { data, meta, csv } = await service[reporte](consulta);
  if (consulta.formato === 'csv') {
    return enviarCsv(res, `reporte-${csv.nombre}`, aCsv(csv.columnas, csv.filas));
  }
  return res.json({ data, meta });
};

module.exports = {
  usuarios: responder('usuarios'),
  vehiculos: responder('vehiculos'),
  entradas: responder('entradas'),
  salidas: responder('salidas'),
  incidencias: responder('incidencias'),
  picoPlaca: responder('picoPlaca'),
  celdasOcupadas: responder('celdasOcupadas'),
  celdasMasUsadas: responder('celdasMasUsadas'),
  vehiculosFrecuentes: responder('vehiculosFrecuentes'),
  ocupacion: responder('ocupacion'),
  financiero: responder('financiero'),
};
