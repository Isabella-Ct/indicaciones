import { el, idUnico } from '../../../utils/dom.js';
import { createInput } from '../../atoms/input/input.js';

/**
 * Caja de búsqueda con etiqueta. Llama a onSearch al escribir (con espera) o con Enter.
 * @param {{
 *   label: string,
 *   placeholder?: string,
 *   value?: string,
 *   espera?: number,          // ms de debounce
 *   transform?: (texto: string) => string,   // ej. normalizar placa mientras se escribe
 *   onSearch: (texto: string) => void,
 * }} props
 * @returns {HTMLDivElement}
 */
export function createSearchBox({
  label,
  placeholder,
  value = '',
  espera = 350,
  transform,
  onSearch,
}) {
  const id = idUnico('buscar');
  const input = createInput({ id, type: 'search', placeholder, value, autocomplete: 'off' });
  let temporizador;

  input.addEventListener('input', () => {
    if (transform) input.value = transform(input.value);
    clearTimeout(temporizador);
    temporizador = setTimeout(() => onSearch(input.value.trim()), espera);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(temporizador);
      onSearch(input.value.trim());
    }
  });

  return el('div', { className: 'search-box', attrs: { role: 'search' } }, [
    el('label', { className: 'search-box-label', text: label, attrs: { for: id } }),
    input,
  ]);
}
