/**
 * Molécula · molecule-field (contraseña): casilla «Mostrar contraseña» y ayuda en línea con las reglas
 * de la contraseña nueva (8–64 caracteres, al menos una letra y un número; spec 003 research R-03).
 * No llama a la API. Marcado: el <input type="password">, una casilla y un <p class="molecule-field-hint">.
 */

/** Reglas de la contraseña nueva; devuelve el mensaje del primer incumplimiento o ''. */
export function errorContrasena(texto) {
  if (texto.length < 8 || texto.length > 64) return 'Use entre 8 y 64 caracteres.';
  if (!/\p{L}/u.test(texto)) return 'Incluya al menos una letra.';
  if (!/\d/.test(texto)) return 'Incluya al menos un número.';
  return '';
}

/**
 * @param {HTMLInputElement[]} campos los campos de contraseña que alterna la casilla
 * @param {{ casillaMostrar?: HTMLInputElement, ayuda?: HTMLElement, nueva?: HTMLInputElement }} opciones
 *   `ayuda` muestra en vivo si `nueva` cumple las reglas.
 */
export function conectarContrasena(campos, { casillaMostrar, ayuda, nueva } = {}) {
  casillaMostrar?.addEventListener('change', () => {
    for (const campo of campos) campo.type = casillaMostrar.checked ? 'text' : 'password';
  });
  if (ayuda && nueva) {
    const textoBase = ayuda.textContent;
    nueva.addEventListener('input', () => {
      const error = nueva.value ? errorContrasena(nueva.value) : '';
      ayuda.textContent = nueva.value && !error ? 'La contraseña cumple las reglas.' : error || textoBase;
    });
  }
}
