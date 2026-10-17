import { el, idUnico } from '../../../utils/dom.js';
import { createIcon } from '../../atoms/icon/icon.js';

/**
 * Selector en mosaico (.tiles / .tile): radios con aspecto de baldosa.
 * Devuelve un .field con la etiqueta del grupo y el radiogroup.
 * @param {{
 *   name: string,
 *   label: string,
 *   options: Array<{ value: string, label: string, icon?: string }>,
 *   value?: string,
 *   columns?: number,
 *   full?: boolean,
 *   onChange?: (valor: string) => void,
 * }} props
 * @returns {HTMLDivElement}
 */
export function createTiles({ name, label, options, value, columns, full = true, onChange }) {
  const idEtiqueta = idUnico('tiles');
  const grupo = el('div', {
    className: 'tiles',
    attrs: { role: 'radiogroup', 'aria-labelledby': idEtiqueta },
  });
  grupo.style.setProperty('--cols', String(columns ?? options.length));

  for (const opcion of options) {
    const radio = el('input', {
      attrs: { type: 'radio', name, value: opcion.value, checked: opcion.value === value },
    });
    if (onChange) radio.addEventListener('change', () => onChange(opcion.value));
    grupo.append(
      el('label', { className: 'tile' }, [
        radio,
        el('span', {}, [opcion.icon ? createIcon({ name: opcion.icon }) : null, opcion.label]),
      ])
    );
  }

  return el('div', { className: full ? 'field field--full' : 'field' }, [
    el('span', { className: 'label', text: label, attrs: { id: idEtiqueta } }),
    grupo,
  ]);
}
