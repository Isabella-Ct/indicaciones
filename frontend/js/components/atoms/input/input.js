import { el } from '../../../utils/dom.js';

/**
 * Campo de texto (.input). Con `plate: true` usa .input--plate (placa amarilla grande).
 * @param {{
 *   id?: string, name?: string, type?: string, value?: string, placeholder?: string,
 *   required?: boolean, disabled?: boolean, readOnly?: boolean, autocomplete?: string,
 *   inputMode?: string, maxLength?: number, minLength?: number, plate?: boolean,
 *   onInput?: (e: InputEvent) => void,
 * }} props
 * @returns {HTMLInputElement}
 */
export function createInput({
  id,
  name,
  type = 'text',
  value,
  placeholder,
  required = false,
  disabled = false,
  readOnly = false,
  autocomplete,
  inputMode,
  maxLength,
  minLength,
  plate = false,
  onInput,
} = {}) {
  const input = el('input', {
    className: plate ? 'input input--plate' : 'input',
    attrs: {
      id,
      name,
      type,
      placeholder,
      required,
      disabled,
      readonly: readOnly,
      autocomplete: autocomplete ?? (plate ? 'off' : null),
      inputmode: inputMode,
      maxlength: maxLength,
      minlength: minLength,
      spellcheck: plate ? 'false' : null,
      autocapitalize: plate ? 'characters' : null,
    },
  });
  if (value !== undefined && value !== null) input.value = String(value);
  if (onInput) input.addEventListener('input', onInput);
  return input;
}
