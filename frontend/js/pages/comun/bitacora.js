/**
 * Bitácora de últimos movimientos (organism-movement-log) escrita en el HTML con prefijo
 * de ids: <id>, <id>-filas, <id>-tabla y <id>-vacia. Filas desde #tpl-movimiento.
 */
import { clonar } from './plantillas.js';
import { formatearHora, formatearCOP, formatearFechaCorta } from '../../utils/formato.js';
import { formatearPlaca } from '../../utils/placa.js';

function cuando(fecha) {
  const hoy = formatearFechaCorta(new Date());
  const dia = formatearFechaCorta(fecha);
  return dia === hoy ? formatearHora(fecha) : `${dia.slice(0, 6)} ${formatearHora(fecha)}`;
}

export function pintarBitacora(id, movimientos) {
  const $ = (sufijo = '') => document.getElementById(`${id}${sufijo}`);
  $('-filas').replaceChildren(
    ...movimientos.map((m) => {
      const fila = clonar('tpl-movimiento');
      const [hora, placa, celda, movimiento, valor] = fila.cells;
      hora.textContent = cuando(m.fecha);
      placa.textContent = formatearPlaca(m.placa);
      celda.textContent = m.celda;
      const entrada = m.movimiento === 'entrada';
      const etiqueta = movimiento.firstElementChild;
      etiqueta.classList.add(
        entrada ? 'organism-movement-log-move--in' : 'organism-movement-log-move--out'
      );
      etiqueta.textContent = entrada ? 'Entrada' : 'Salida';
      valor.textContent = m.valor === null || m.valor === undefined ? '—' : formatearCOP(m.valor);
      return fila;
    })
  );
  $('-tabla').classList.toggle('hidden', movimientos.length === 0);
  $('-vacia').classList.toggle('hidden', movimientos.length > 0);
  $().classList.remove('hidden');
}
