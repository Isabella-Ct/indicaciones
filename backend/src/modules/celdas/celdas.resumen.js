// Cálculo del resumen de ocupación a partir de las celdas activas (función pura).
const ESTADOS = ['disponible', 'ocupada', 'reservada', 'fuera_servicio'];

const contadores = () => ({ total: 0, disponible: 0, ocupada: 0, reservada: 0, fuera_servicio: 0 });

function sumar(acumulado, estado) {
  acumulado.total += 1;
  acumulado[estado] += 1;
}

/**
 * @param {Array<{ estado: string, tipo: string, area: string, piso_id: number, piso_nombre: string, piso_orden: number }>} filas
 */
function construirResumen(filas) {
  const general = contadores();
  const porTipo = { carro: contadores(), moto: contadores() };
  const porPiso = new Map();
  const porArea = new Map();

  for (const f of filas) {
    if (!ESTADOS.includes(f.estado)) continue;
    sumar(general, f.estado);
    sumar(porTipo[f.tipo], f.estado);
    if (!porPiso.has(f.piso_id)) {
      porPiso.set(f.piso_id, {
        id: f.piso_id,
        nombre: f.piso_nombre,
        orden: f.piso_orden,
        ...contadores(),
      });
    }
    sumar(porPiso.get(f.piso_id), f.estado);
    if (!porArea.has(f.area)) porArea.set(f.area, { area: f.area, ...contadores() });
    sumar(porArea.get(f.area), f.estado);
  }

  const habilitadas = general.total - general.fuera_servicio;
  return {
    total: general.total,
    habilitadas,
    por_estado: {
      disponible: general.disponible,
      ocupada: general.ocupada,
      reservada: general.reservada,
      fuera_servicio: general.fuera_servicio,
    },
    // Ocupación = ocupadas / habilitadas (las fuera de servicio no cuentan).
    ocupacion_pct: habilitadas ? Math.round((general.ocupada / habilitadas) * 100) : 0,
    por_tipo: porTipo,
    por_piso: [...porPiso.values()].sort((a, b) => a.orden - b.orden),
    por_area: [...porArea.values()].sort((a, b) => a.area.localeCompare(b.area)),
    actualizado_en: new Date().toISOString(),
  };
}

/** Versión pública: solo disponibles y habilitadas por tipo, sin celdas ni personas. */
function aDisponibilidadPublica(resumen) {
  const porTipo = (t) => ({
    disponibles: resumen.por_tipo[t].disponible,
    habilitadas: resumen.por_tipo[t].total - resumen.por_tipo[t].fuera_servicio,
  });
  return { carro: porTipo('carro'), moto: porTipo('moto'), actualizado_en: resumen.actualizado_en };
}

module.exports = { construirResumen, aDisponibilidadPublica };
