import { el } from '../../../utils/dom.js';

/**
 * Casilla con su texto (.check).
 * @param {{ label: string, name?: string, id?: string, checked?: boolean, onChange?: (marcado: boolean) => void }} props
 * @returns {HTMLLabelElement}
 */
export function createCheck({ label, name, id, checked = false, onChange }) {
  const casilla = el('input', { attrs: { type: 'checkbox', name, id, checked } });
  if (onChange) casilla.addEventListener('change', () => onChange(casilla.checked));
  return el('label', { className: 'check' }, [casilla, label]);
}
