// Tarifas — REQ-TAR-1. Una tarifa nueva desactiva la anterior del mismo tipo; las
// facturas guardan su tarifa_id y el cálculo, así que no cambian.
const { enTransaccion } = require('../../config/db');
const { errores } = require('../../utils/errores');
const { formatearCOP } = require('../../utils/dinero');
const repo = require('./tarifas.repository');
const { calcularCobro } = require('./tarifas.calculo');

function aPublico(t) {
  if (!t) return null;
  const unidad = t.minutos_fraccion === 1 ? 'min' : `${t.minutos_fraccion} min`;
  return {
    id: t.id,
    tipo_vehiculo: t.tipo_vehiculo,
    valor_fraccion: Number(t.valor_fraccion),
    minutos_fraccion: t.minutos_fraccion,
    minutos_gracia: t.minutos_gracia,
    valor_dia_maximo: Number(t.valor_dia_maximo),
    vigente_desde: t.vigente_desde,
    activa: Boolean(t.activa),
    creado_por: t.creado_por || null,
    unidad,
    descripcion: `${formatearCOP(t.valor_fraccion)}/${unidad} · tope ${formatearCOP(t.valor_dia_maximo)} por día${
      t.minutos_gracia ? ` · ${t.minutos_gracia} min de gracia` : ''
    }`,
  };
}

/** Tarifa vigente de un tipo (o error si no hay ninguna configurada). */
async function vigente(tipo, conexion) {
  const t = await repo.vigente(tipo, conexion);
  if (!t) throw errores.conflicto(`No hay una tarifa vigente para ${tipo}s.`, 'SIN_TARIFA');
  return aPublico(t);
}

async function vigentes() {
  const [carro, moto] = await Promise.all([repo.vigente('carro'), repo.vigente('moto')]);
  return { carro: aPublico(carro), moto: aPublico(moto) };
}

async function historial(tipo) {
  return (await repo.historial(tipo)).map(aPublico);
}

async function crear(datos, solicitante) {
  const id = await enTransaccion(async (conexion) => {
    await repo.desactivarTipo(datos.tipo_vehiculo, conexion);
    return repo.insertar({ ...datos, creado_por: solicitante.id }, conexion);
  });
  return aPublico(await repo.buscarPorId(id));
}

/** Simulador: "si un carro dura X minutos, paga $Y" (con la vigente o con valores propuestos). */
async function simular({ tipo_vehiculo, minutos, tarifa }) {
  const base = tarifa ?? (await vigente(tipo_vehiculo));
  return { tarifa: base, cobro: calcularCobro({ minutos, tarifa: base }) };
}

module.exports = { vigente, vigentes, historial, crear, simular, aPublico };
