import { el } from '../../../utils/dom.js';

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/**
 * Cuenta regresiva (mm:ss) hasta un momento, p. ej. el vencimiento de una reserva.
 * Se detiene sola al llegar a cero o al salir del documento. El lector de pantalla
 * solo anuncia el minuto (aria-live con texto por minuto), no cada segundo.
 * @param {{ hasta: string|Date, etiqueta?: string, onFin?: () => void }} props
 * @returns {HTMLDivElement}
 */
export function createCountdown({ hasta, etiqueta = 'Tiempo para llegar', onFin }) {
  const fin = new Date(hasta).getTime();
  const valor = el('span', { className: 'countdown-value', attrs: { 'aria-hidden': 'true' } });
  const anuncio = el('span', { className: 'visually-hidden', attrs: { 'aria-live': 'polite' } });
  const caja = el('div', { className: 'countdown' }, [
    el('span', { className: 'countdown-label', text: etiqueta }),
    valor,
    anuncio,
  ]);
  let ultimoMinuto = null;
  function pintar() {
    const restantes = Math.max(0, Math.round((fin - Date.now()) / 1000));
    valor.textContent = mmss(restantes);
    caja.classList.toggle('countdown--urgent', restantes > 0 && restantes <= 5 * 60);
    caja.classList.toggle('countdown--done', restantes === 0);
    const minuto = Math.ceil(restantes / 60);
    if (minuto !== ultimoMinuto) {
      ultimoMinuto = minuto;
      anuncio.textContent = restantes ? `${etiqueta}: ${minuto} minuto${minuto === 1 ? '' : 's'}` : 'Tiempo agotado';
    }
    return restantes;
  }
  pintar();
  let visto = false; // se montó al menos una vez
  const temporizador = setInterval(() => {
    if (caja.isConnected) visto = true;
    else if (visto) return clearInterval(temporizador); // la página lo quitó: no seguir contando
    if (pintar() === 0) {
      clearInterval(temporizador);
      onFin?.();
    }
  }, 1000);
  return caja;
}
