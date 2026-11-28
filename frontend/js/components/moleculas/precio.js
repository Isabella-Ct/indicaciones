// Molécula · precio: valor en pesos colombianos con su leyenda («$ 4.000», «$ 1.000 cada 15 min»).
import { formatearCOP } from '../../utils/formato.js';

/** Pone el valor en COP (sin decimales) y, si se da, la leyenda que lo acompaña. */
export function ponerPrecio(nodo, valor, leyenda = '') {
  nodo.textContent = valor === null || valor === undefined ? 'Sin tope' : `${formatearCOP(valor)}${leyenda ? ` ${leyenda}` : ''}`;
}
