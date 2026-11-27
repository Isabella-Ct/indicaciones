// Molécula · molecule-search-box: buscador con espera (al dejar de escribir o al pulsar Enter).

/** @param {HTMLInputElement} input @param {(texto: string) => void} onBuscar */
export function conectarBusqueda(input, onBuscar, { espera = 350 } = {}) {
  let temporizador;
  input.addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => onBuscar(input.value.trim()), espera);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(temporizador);
      onBuscar(input.value.trim());
    }
  });
}
