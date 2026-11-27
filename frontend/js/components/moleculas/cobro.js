/**
 * Molécula · molecule-charge (maqueta, sección 6): «Valor a pagar» de una liquidación con la explicación del
 * cálculo, la tarifa y la barra del tope diario (RF-FAC-03). El marcado está en la página; aquí solo se ponen
 * los textos. No llama a la API.
 */
import { formatearCOP, formatearDuracion } from '../../utils/formato.js';

/**
 * @param {HTMLElement} raiz contenedor con .js-total, .js-explicacion, .js-tarifa, .js-tiempo, .js-tope y .atom-meter > span
 * @param {object} liquidacion respuesta de GET /movimientos/:id/liquidacion
 */
export function ponerCobro(raiz, liquidacion) {
  const l = liquidacion;
  raiz.querySelector('.js-total').textContent = l.total === 0 ? 'Sin cobro' : formatearCOP(l.total);
  raiz.querySelector('.js-explicacion').textContent = l.explicacion;
  raiz.querySelector('.js-tiempo').textContent = formatearDuracion(l.minutos);
  raiz.querySelector('.js-tarifa').textContent = l.tarifa ? `${l.tarifa.nombre} · ${formatearCOP(l.tarifa.valorPrimeraHora)} la primera hora` : '—';
  const tope = l.tarifa?.topeDiario;
  // Barra `meter--orange` de la maqueta: qué tanto del tope de un día se ha cobrado (llena desde el primer día completo).
  const porcentaje = tope ? Math.min(100, Math.round((l.valorBruto / tope) * 100)) : 0;
  const textoTope = l.dias > 0 ? `Tope aplicado (${formatearCOP(tope)} por cada 24 h)` : `${porcentaje} % del tope (${formatearCOP(tope)} por día)`;
  raiz.querySelector('.js-tope').textContent = tope ? textoTope : 'Sin tope diario';
  raiz.querySelector('.atom-meter > span').style.setProperty('--v', String(porcentaje));
}
