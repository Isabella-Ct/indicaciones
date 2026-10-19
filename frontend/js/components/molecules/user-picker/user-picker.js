import { el, idUnico } from '../../../utils/dom.js';
import { createInput } from '../../atoms/input/input.js';
import { createButton } from '../../atoms/button/button.js';
import { createAvatar } from '../../atoms/avatar/avatar.js';

/**
 * Buscador de usuario por número de documento. El componente no llama a la API:
 * la página le pasa `buscar(documento)` (que usa un service) y recibe el elegido en onChange.
 * El id elegido viaja en un <input type="hidden" name={name}>.
 * @param {{
 *   label: string,
 *   name?: string,
 *   value?: { id: number, nombre_completo: string, tipo_documento: string, numero_documento: string } | null,
 *   hint?: string,
 *   buscar: (documento: string) => Promise<Array<{ id: number, nombre_completo: string, tipo_documento: string, numero_documento: string }>>,
 *   onChange?: (usuario: object|null) => void,
 * }} props
 * @returns {HTMLDivElement}
 */
export function createUserPicker({
  label,
  name = 'usuario_id',
  value = null,
  hint,
  buscar,
  onChange,
}) {
  const idInput = idUnico('picker');
  const oculto = el('input', { attrs: { type: 'hidden', name, value: value?.id ?? '' } });
  const documento = createInput({
    id: idInput,
    inputMode: 'numeric',
    placeholder: 'Número de documento',
    autocomplete: 'off',
    maxLength: 20,
  });
  const botonBuscar = createButton({
    label: 'Buscar',
    variant: 'dark',
    size: 'sm',
    type: 'button',
  });
  const resultados = el('ul', {
    className: 'user-picker-results',
    attrs: { 'aria-label': 'Resultados' },
  });
  const estado = el('p', { className: 'field-hint', attrs: { 'aria-live': 'polite' } });
  const busqueda = el('div', { className: 'user-picker-search' }, [documento, botonBuscar]);
  const elegido = el('div', { className: 'user-picker-selected' });
  const mensaje = el('p', { className: 'field-error', attrs: { 'aria-live': 'polite' } });

  const contenedor = el('div', { className: 'field field--full user-picker' }, [
    el('label', { text: label, attrs: { for: idInput } }),
    oculto,
    busqueda,
    resultados,
    elegido,
    hint ? el('p', { className: 'field-hint', text: hint }) : null,
    estado,
    mensaje,
  ]);

  function seleccionar(usuario) {
    oculto.value = usuario ? String(usuario.id) : '';
    resultados.replaceChildren();
    estado.textContent = '';
    mensaje.textContent = '';
    busqueda.classList.toggle('hidden', Boolean(usuario));
    elegido.classList.toggle('hidden', !usuario);
    elegido.replaceChildren();
    if (usuario) {
      elegido.append(
        createAvatar({ nombre: usuario.nombre_completo }),
        el('div', {}, [
          el('strong', { text: usuario.nombre_completo }),
          el('small', { text: `${usuario.tipo_documento} ${usuario.numero_documento}` }),
        ]),
        createButton({
          label: 'Cambiar',
          variant: 'ghost',
          size: 'sm',
          onClick: () => {
            seleccionar(null);
            documento.focus();
          },
        })
      );
    }
    onChange?.(usuario);
  }

  async function ejecutarBusqueda() {
    const texto = documento.value.trim();
    resultados.replaceChildren();
    if (texto.length < 3) {
      estado.textContent = 'Escribe al menos 3 dígitos del documento.';
      return;
    }
    estado.textContent = 'Buscando…';
    try {
      const encontrados = await buscar(texto);
      estado.textContent = encontrados.length
        ? `${encontrados.length} resultado(s). Elige uno.`
        : 'No hay clientes activos con ese documento.';
      for (const usuario of encontrados) {
        resultados.append(
          el('li', {}, [
            el(
              'button',
              {
                className: 'user-picker-option',
                attrs: { type: 'button' },
                on: { click: () => seleccionar(usuario) },
              },
              [
                el('strong', { text: usuario.nombre_completo }),
                el('span', { text: `${usuario.tipo_documento} ${usuario.numero_documento}` }),
              ]
            ),
          ])
        );
      }
    } catch (error) {
      estado.textContent = error.message;
    }
  }

  botonBuscar.addEventListener('click', ejecutarBusqueda);
  documento.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      ejecutarBusqueda();
    }
  });

  seleccionar(value);
  return contenedor;
}

/** Muestra (o limpia) el error del picker. */
export function setUserPickerError(picker, mensaje) {
  picker.querySelector('.field-error').textContent = mensaje || '';
}
