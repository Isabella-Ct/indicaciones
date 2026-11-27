/**
 * Organismo · tabla semanal de pico y placa (HU-29): 7 filas (lunes a domingo) × 2 columnas (carros y motos).
 * Las filas están escritas en la página (`<tr data-id="<día>">` con celdas .js-carro y .js-moto); cada
 * restricción se copia del <template id="tpl-restriccion">. No llama a la API: la página le pasa los datos
 * y recibe las acciones.
 */
import { clonar } from '../../utils/plantillas.js';
import { ponerDigitos } from '../atomos/digitos.js';
import { ponerChipActivo } from '../atomos/chip-estado.js';

const POSICION = { ultimo: 'Último dígito', primero: 'Primer dígito' };
const fecha = (iso) => (iso ? iso.split('-').reverse().join('/') : null);

/**
 * @param {HTMLTableElement} raiz
 * @param {{ onEditar?: (r: object, origen: HTMLElement) => void, onEliminar?: (r: object, origen: HTMLElement) => void,
 *           puedeEditar?: boolean, puedeEliminar?: boolean }} opciones
 */
export function conectarTablaSemanal(raiz, { onEditar, onEliminar, puedeEditar = false, puedeEliminar = false }) {
  function item(r) {
    const nodo = clonar('tpl-restriccion');
    nodo.dataset.id = String(r.idRestriccion);
    nodo.classList.toggle('is-inactive', r.estado !== 'activo');
    ponerDigitos(nodo.querySelector('.js-digitos'), r.digitos);
    nodo.querySelector('.js-franja').textContent = `${r.horaInicio} a ${r.horaFin} · ${POSICION[r.posicionDigito]}`;
    nodo.querySelector('.js-vigencia').textContent = r.vigenteHasta
      ? `Vigente del ${fecha(r.vigenteDesde)} al ${fecha(r.vigenteHasta)}`
      : `Vigente desde el ${fecha(r.vigenteDesde)}`;
    ponerChipActivo(nodo.querySelector('.js-estado'), r.estado);
    const editar = nodo.querySelector('.js-editar');
    editar.classList.toggle('hidden', !puedeEditar);
    editar.setAttribute('aria-label', `Editar la restricción del ${r.nombreDia} para ${r.tipoVehiculo}s`);
    editar.addEventListener('click', () => onEditar?.(r, editar));
    const eliminar = nodo.querySelector('.js-eliminar');
    eliminar.classList.toggle('hidden', !puedeEliminar || r.estado !== 'activo');
    eliminar.setAttribute('aria-label', `Eliminar la restricción del ${r.nombreDia} para ${r.tipoVehiculo}s`);
    eliminar.addEventListener('click', () => onEliminar?.(r, eliminar));
    return nodo;
  }

  return {
    /** @param {object[]} restricciones */
    pintar(restricciones) {
      for (const fila of raiz.querySelectorAll('tbody tr')) {
        const dia = Number(fila.dataset.id);
        for (const tipo of ['carro', 'moto']) {
          const celda = fila.querySelector(`.js-${tipo}`);
          const delDia = restricciones.filter((r) => r.diaSemana === dia && r.tipoVehiculo === tipo);
          if (delDia.length) celda.replaceChildren(...delDia.map(item));
          else celda.replaceChildren(clonar('tpl-sin-restriccion'));
        }
      }
    },
  };
}
