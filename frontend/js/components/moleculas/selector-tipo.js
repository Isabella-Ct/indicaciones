/**
 * Molécula · molecule-tiles: mosaicos Carro / Moto hechos con radios nativos dentro de un fieldset
 * (el navegador ya da el grupo y las flechas del teclado). Aquí solo se lee, se pone el valor y se
 * avisa el cambio; la página decide qué hacer (p. ej. cambiar la pista del formato de la placa).
 */

/**
 * @param {HTMLFieldSetElement} grupo fieldset con los <input type="radio">
 * @param {{ onCambio?: (tipo: string) => void }} [opciones]
 */
export function conectarSelectorTipo(grupo, { onCambio } = {}) {
  const radios = () => [...grupo.querySelectorAll('input[type="radio"]')];
  grupo.addEventListener('change', () => onCambio?.(valor()));
  const valor = () => radios().find((r) => r.checked)?.value ?? 'carro';
  return {
    valor,
    poner(tipo) {
      radios().forEach((r) => (r.checked = r.value === tipo));
      onCambio?.(valor());
    },
    deshabilitar(si) {
      radios().forEach((r) => (r.disabled = si));
    },
    primero: () => radios().find((r) => r.checked) ?? radios()[0],
  };
}
