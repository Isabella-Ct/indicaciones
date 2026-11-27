// Átomo · atom-plate: placa amarilla con el formato visual «ABC 123» (el dato sigue siendo ABC123).
import { formatearPlaca } from '../../utils/placa.js';

/** Pone la placa en el nodo .atom-plate y su lectura para lectores de pantalla. */
export function ponerPlaca(nodo, placa) {
  nodo.textContent = formatearPlaca(placa);
  if (placa) nodo.setAttribute('aria-label', `Placa ${placa.split('').join(' ')}`);
  else nodo.removeAttribute('aria-label');
}
