const tarifasService = require('./tarifas.service');

async function listar(req, res) {
  const { historial, tipo_vehiculo } = req.validado.query;
  const verHistorial = historial === '1' && req.usuario.permisos.includes('tarifas.gestionar');
  res.json({
    data: {
      vigentes: await tarifasService.vigentes(),
      historial: verHistorial ? await tarifasService.historial(tipo_vehiculo) : undefined,
    },
  });
}

async function crear(req, res) {
  res.status(201).json({ data: await tarifasService.crear(req.body, req.usuario) });
}

async function simular(req, res) {
  res.json({ data: await tarifasService.simular(req.body) });
}

/** Público: solo las tarifas vigentes. */
async function vigentesPublicas(_req, res) {
  const { carro, moto } = await tarifasService.vigentes();
  const limpiar = (t) =>
    t && {
      tipo_vehiculo: t.tipo_vehiculo,
      valor_fraccion: t.valor_fraccion,
      minutos_fraccion: t.minutos_fraccion,
      minutos_gracia: t.minutos_gracia,
      valor_dia_maximo: t.valor_dia_maximo,
      descripcion: t.descripcion,
    };
  res.json({ data: { carro: limpiar(carro), moto: limpiar(moto) } });
}

module.exports = { listar, crear, simular, vigentesPublicas };
