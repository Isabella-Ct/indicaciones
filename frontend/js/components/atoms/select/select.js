import { el } from '../../../utils/dom.js';

/**
 * Lista desplegable (.select).
 * @param {{
 *   id?: string, name?: string, required?: boolean, disabled?: boolean, value?: string,
 *   placeholder?: string,  // primera opción vacía
 *   options?: Array<{ value: string, label: string, disabled?: boolean }>,
 *   groups?: Array<{ label: string, options: Array<{ value: string, label: string }> }>,
 *   onChange?: (e: Event) => void,
 * }} props
 * @returns {HTMLSelectElement}
 */
export function createSelect({
  id,
  name,
  required = false,
  disabled = false,
  value,
  placeholder,
  options = [],
  groups = [],
  onChange,
} = {}) {
  const opcion = (o) =>
    el('option', { text: o.label, attrs: { value: o.value, disabled: o.disabled ?? false } });

  const select = el('select', { className: 'select', attrs: { id, name, required, disabled } }, [
    placeholder !== undefined ? el('option', { text: placeholder, attrs: { value: '' } }) : null,
    ...options.map(opcion),
    ...groups.map((g) => el('optgroup', { attrs: { label: g.label } }, g.options.map(opcion))),
  ]);
  if (value !== undefined) select.value = value;
  if (onChange) select.addEventListener('change', onChange);
  return select;
}
