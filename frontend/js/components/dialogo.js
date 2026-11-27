/**
 * Diálogos con <dialog> nativo (constitución §V): showModal deja inerte el resto de la página,
 * Esc cierra, y el foco vuelve al botón que lo abrió (RNF-USA-04).
 */
const retornos = new WeakMap();
const preparados = new WeakSet();

function preparar(dialogo) {
  if (preparados.has(dialogo)) return;
  preparados.add(dialogo);
  dialogo
    .querySelectorAll('[data-cerrar]')
    .forEach((boton) => boton.addEventListener('click', () => cerrarDialogo(dialogo)));
  // Clic sobre el fondo (fuera de la caja) cierra.
  dialogo.addEventListener('click', (e) => {
    if (e.target === dialogo) cerrarDialogo(dialogo);
  });
  dialogo.addEventListener('close', () => {
    retornos.get(dialogo)?.focus?.();
    retornos.delete(dialogo);
  });
}

/** @param {HTMLDialogElement} dialogo */
export function abrirDialogo(dialogo, { origen = document.activeElement, foco } = {}) {
  preparar(dialogo);
  retornos.set(dialogo, origen);
  dialogo.showModal();
  foco?.focus();
}

/** @param {HTMLDialogElement} dialogo */
export function cerrarDialogo(dialogo, valor = '') {
  if (dialogo.open) dialogo.close(valor);
}

/**
 * Confirmación (SRS §3.1: antes de anular, inactivar o eliminar). Usa el <dialog id="dialogo-confirmar">
 * de la página. Resuelve true si se acepta.
 */
export function confirmar({ titulo, mensaje, textoConfirmar = 'Confirmar', origen }) {
  const dialogo = document.getElementById('dialogo-confirmar');
  const aceptar = document.getElementById('confirmar-aceptar');
  document.getElementById('confirmar-titulo').textContent = titulo;
  document.getElementById('confirmar-mensaje').textContent = mensaje;
  aceptar.querySelector('span').textContent = textoConfirmar;
  return new Promise((resolver) => {
    const alAceptar = () => cerrarDialogo(dialogo, 'si');
    aceptar.addEventListener('click', alAceptar, { once: true });
    dialogo.addEventListener(
      'close',
      () => {
        aceptar.removeEventListener('click', alAceptar);
        resolver(dialogo.returnValue === 'si');
      },
      { once: true }
    );
    abrirDialogo(dialogo, { origen, foco: aceptar });
  });
}
