import { el } from '../../../utils/dom.js';

/**
 * Área de texto (.textarea).
 * @param {{ id?: string, name?: string, value?: string, placeholder?: string, required?: boolean, maxLength?: number, rows?: number }} props
 * @returns {HTMLTextAreaElement}
 */
export function createTextarea({
  id,
  name,
  value,
  placeholder,
  required = false,
  maxLength,
  rows,
} = {}) {
  const area = el('textarea', {
    className: 'textarea',
    attrs: { id, name, placeholder, required, maxlength: maxLength, rows },
  });
  if (value) area.value = value;
  return area;
}
