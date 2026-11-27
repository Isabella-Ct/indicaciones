/**
 * Organismo · organism-ticket (maqueta, sección 8): ticket de ingreso con número, placa, tipo, celda,
 * puerta, entrada y parqueadero (RF-MOV-06). El marcado está en la página; aquí solo se ponen los textos.
 * Lo usan la pantalla de caseta (tras registrar la entrada) y la vista de impresión de 80 mm.
 */
import { ponerPlaca } from '../atomos/placa.js';
import { formatearFechaHora } from '../../utils/formato.js';

const TIPO = { carro: 'Carro', moto: 'Moto' };

/**
 * @param {HTMLElement} raiz .organism-ticket
 * @param {{ codigo: string, valido: boolean, extraviado: boolean, parqueadero: string, movimiento: object }} ticket
 */
export function ponerTicket(raiz, { codigo, valido, extraviado, parqueadero, movimiento: m }) {
  const poner = (clase, valor) => {
    raiz.querySelector(`.js-${clase}`).textContent = valor;
  };
  poner('codigo', codigo);
  ponerPlaca(raiz.querySelector('.js-placa'), m.vehiculo.placa);
  poner('tipo', TIPO[m.vehiculo.tipo] ?? m.vehiculo.tipo);
  poner('celda', `${m.celda.codigo} · piso ${m.celda.piso}`);
  poner('puerta', m.puertaEntrada.nombre);
  poner('entrada', formatearFechaHora(m.fechaHoraEntrada));
  poner('parqueadero', parqueadero);
  const nota = !valido ? 'Ticket anulado: no es válido.' : extraviado ? 'Ticket reportado como extraviado.' : 'Presente este ticket a la salida.';
  poner('nota', nota);
  raiz.classList.add('organism-ticket--issued');
}
