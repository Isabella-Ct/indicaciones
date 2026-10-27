/**
 * Pestañas escritas en el HTML (role="tablist" con botones .molecule-level-tab y
 * data-id). Marca la activa (is-active, aria-selected, tabindex) y maneja clic y teclado.
 */

/**
 * @param {HTMLElement} lista  contenedor role="tablist"
 * @param {{ onChange: (id: string) => void, vertical?: boolean }} opciones
 */
export function conectarPestanas(lista, { onChange, vertical = false }) {
  const pestanas = () => [...lista.querySelectorAll('.molecule-level-tab')];

  function activar(id, { enfocar = false } = {}) {
    const todas = pestanas();
    const panelActivo = todas.find((t) => t.dataset.id === id)?.getAttribute('aria-controls');
    for (const tab of todas) {
      const activa = tab.dataset.id === id;
      tab.classList.toggle('is-active', activa);
      tab.setAttribute('aria-selected', String(activa));
      tab.tabIndex = activa ? 0 : -1;
      // Varias pestañas pueden compartir un panel: solo se oculta si no es el de la activa.
      const panelId = tab.getAttribute('aria-controls');
      document.getElementById(panelId)?.classList.toggle('hidden', panelId !== panelActivo);
      if (activa && enfocar) tab.focus();
    }
  }

  lista.addEventListener('click', (e) => {
    const tab = e.target.closest('.molecule-level-tab');
    if (!tab) return;
    activar(tab.dataset.id);
    onChange(tab.dataset.id);
  });
  lista.addEventListener('keydown', (e) => {
    const todas = pestanas();
    const actual = todas.indexOf(document.activeElement);
    if (actual < 0) return;
    const destino = {
      [vertical ? 'ArrowDown' : 'ArrowRight']: (actual + 1) % todas.length,
      [vertical ? 'ArrowUp' : 'ArrowLeft']: (actual - 1 + todas.length) % todas.length,
      Home: 0,
      End: todas.length - 1,
    }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    const id = todas[destino].dataset.id;
    activar(id, { enfocar: true });
    onChange(id);
  });

  return { activar };
}
