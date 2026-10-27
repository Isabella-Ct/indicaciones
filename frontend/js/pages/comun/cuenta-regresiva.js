/**
 * Cuenta regresiva (molecule-countdown) sobre marcado existente: la caja tiene
 * .molecule-countdown-label, .molecule-countdown-value y un <span class="visually-hidden">
 * con aria-live. Devuelve una función que la detiene.
 */
const mmss = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function iniciarCuentaRegresiva(caja, { hasta, etiqueta = 'Tiempo para llegar', onFin }) {
  const fin = new Date(hasta).getTime();
  const valor = caja.querySelector('.molecule-countdown-value');
  const anuncio = caja.querySelector('.visually-hidden');
  caja.querySelector('.molecule-countdown-label').textContent = etiqueta;
  let ultimoMinuto = null;

  function pintar() {
    const restantes = Math.max(0, Math.round((fin - Date.now()) / 1000));
    valor.textContent = mmss(restantes);
    caja.classList.toggle('molecule-countdown--urgent', restantes > 0 && restantes <= 5 * 60);
    caja.classList.toggle('molecule-countdown--done', restantes === 0);
    const minuto = Math.ceil(restantes / 60);
    if (minuto !== ultimoMinuto) {
      ultimoMinuto = minuto;
      anuncio.textContent = restantes
        ? `${etiqueta}: ${minuto} minuto${minuto === 1 ? '' : 's'}`
        : 'Tiempo agotado';
    }
    return restantes;
  }

  pintar();
  const temporizador = setInterval(() => {
    // La página quitó la caja: no seguir contando.
    if (!caja.isConnected) return clearInterval(temporizador);
    if (pintar() === 0) {
      clearInterval(temporizador);
      onFin?.();
    }
  }, 1000);
  return () => clearInterval(temporizador);
}
