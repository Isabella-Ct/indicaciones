/**
 * Molécula · aviso «Pico y placa hoy» (HU-30): dígitos restringidos por tipo de vehículo con su franja, o
 * «Sin restricción hoy». El marcado está en la página (#pico-placa-hoy); la página le pasa el resultado de
 * GET /restricciones-placa/hoy. No llama a la API.
 */
import { ponerDigitos } from '../atomos/digitos.js';

const POSICION = { ultimo: 'último dígito', primero: 'primer dígito' };

/**
 * @param {HTMLElement} raiz
 * @param {{ nombreDia: string, tipos: { carro: object|null, moto: object|null }, mensaje: string|null }} hoy
 */
export function ponerPicoPlaca(raiz, hoy) {
  raiz.querySelector('.js-dia').textContent = hoy.nombreDia;
  for (const tipo of ['carro', 'moto']) {
    const fila = raiz.querySelector(`.js-${tipo}`);
    const r = hoy.tipos[tipo];
    fila.classList.toggle('hidden', !r);
    if (r) {
      ponerDigitos(fila.querySelector('.js-digitos'), r.digitos);
      fila.querySelector('.js-franja').textContent = `${POSICION[r.posicionDigito]} · ${r.horaInicio} a ${r.horaFin}`;
    }
  }
  raiz.querySelector('.js-sin').classList.toggle('hidden', !hoy.mensaje);
  raiz.querySelector('.js-lista').classList.toggle('hidden', Boolean(hoy.mensaje));
  raiz.classList.remove('hidden');
}
