import { el } from '../../../utils/dom.js';
import { createIcon } from '../../atoms/icon/icon.js';
import { formatearCOP } from '../../../utils/formato.js';

/** "por minuto" / "cada 15 minutos" */
const fraccion = (t) => (t.minutos_fraccion === 1 ? 'por minuto' : `cada ${t.minutos_fraccion} minutos`);

/**
 * Tarifas vigentes en lenguaje simple (REQ-WEB-1): valor por fracción, tope diario,
 * gracia y mensualidades. Los valores vienen de la API (no hay precios en el código).
 * @param {{
 *   tarifas: { carro: object|null, moto: object|null },
 *   mensualidades?: { carro: { mensual: number, anual: number }, moto: { mensual: number, anual: number } },
 * }} props
 * @returns {HTMLElement}
 */
export function createPricingTable({ tarifas, mensualidades }) {
  const tarjeta = (tipo, titulo) => {
    const t = tarifas[tipo];
    const m = mensualidades?.[tipo];
    return el('article', { className: 'price-card' }, [
      el('h3', { className: 'price-title' }, [
        createIcon({ name: tipo === 'moto' ? 'i-moto' : 'i-car' }),
        titulo,
      ]),
      t
        ? el('p', { className: 'price-main' }, [
            el('strong', { text: formatearCOP(t.valor_fraccion) }),
            el('span', { text: ` ${fraccion(t)}` }),
          ])
        : el('p', { className: 'price-main', text: 'Consulta en la caseta' }),
      t
        ? el('ul', { className: 'price-list' }, [
            el('li', { text: `Nunca pagas más de ${formatearCOP(t.valor_dia_maximo)} por cada 24 horas.` }),
            el('li', {
              text: t.minutos_gracia
                ? `Los primeros ${t.minutos_gracia} minutos no se cobran.`
                : 'Pagas solo el tiempo que estuviste.',
            }),
            el('li', { text: 'Efectivo, tarjeta o transferencia.' }),
          ])
        : null,
      m?.mensual
        ? el('div', { className: 'price-plans' }, [
            el('p', {}, [el('span', { text: 'Mensualidad' }), el('strong', { text: formatearCOP(m.mensual) })]),
            m.anual
              ? el('p', {}, [el('span', { text: 'Anualidad' }), el('strong', { text: formatearCOP(m.anual) })])
              : null,
          ])
        : null,
    ]);
  };
  return el('div', { className: 'pricing-table' }, [
    tarjeta('carro', 'Carros'),
    tarjeta('moto', 'Motos'),
  ]);
}
