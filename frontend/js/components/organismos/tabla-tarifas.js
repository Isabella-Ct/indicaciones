/**
 * Organismo · organism-pricing-table (spec 008, HU-38): una tarjeta por tipo de vehículo con las tarifas
 * vigentes y programadas de cada tipo de cliente. Las tarjetas y sus bloques se copian de los <template>
 * tpl-tarifa-tarjeta y tpl-tarifa-cliente de la página. No llama a la API.
 */
import { clonar } from '../../utils/plantillas.js';
import { ponerPrecio } from '../moleculas/precio.js';
import { formatearFecha } from '../../utils/formato.js';

const VEHICULO = { carro: 'Carros', moto: 'Motos' };
const ICONO = { carro: 'i-car', moto: 'i-moto' };
const CLIENTE = { ocasional: 'Visitante (ocasional)', registrado: 'Cliente registrado' };

function bloque(t) {
  const nodo = clonar('tpl-tarifa-cliente');
  nodo.querySelector('.js-cliente').textContent =
    t.situacion === 'programada' ? `${CLIENTE[t.tipoCliente]} · desde el ${formatearFecha(t.vigenteDesde)}` : CLIENTE[t.tipoCliente];
  ponerPrecio(nodo.querySelector('.js-primera'), t.valorPrimeraHora);
  ponerPrecio(nodo.querySelector('.js-fraccion'), t.valorFraccion, `cada ${t.minutosFraccion} min después de la primera hora`);
  ponerPrecio(nodo.querySelector('.js-tope'), t.topeDiario, t.topeDiario === null ? '' : 'por cada 24 horas');
  nodo.querySelector('.js-gracia').textContent = t.minutosGracia ? `${t.minutosGracia} min sin costo` : 'Sin tiempo de gracia';
  return nodo;
}

/** @param {HTMLElement} raiz contenedor .organism-pricing-table */
export function conectarTablaTarifas(raiz) {
  return {
    /** @param {object[]} tarifas vigentes y programadas (GET /tarifas?vigentes=true) */
    pintar(tarifas) {
      raiz.replaceChildren(
        ...['carro', 'moto'].map((tipo) => {
          const tarjeta = clonar('tpl-tarifa-tarjeta');
          tarjeta.querySelector('.js-tipo').textContent = VEHICULO[tipo];
          tarjeta.querySelector('use').setAttribute('href', `/assets/icons.svg#${ICONO[tipo]}`);
          const del = tarifas.filter((t) => t.tipoVehiculo === tipo);
          const lista = tarjeta.querySelector('.js-bloques');
          if (del.length) lista.append(...del.map(bloque));
          else lista.append(clonar('tpl-tarifa-vacia'));
          return tarjeta;
        })
      );
    },
  };
}
