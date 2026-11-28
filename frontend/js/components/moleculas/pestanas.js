/**
 * Molécula · molecule-level-tabs: pestañas (pisos del mapa) con role="tablist", aria-selected y
 * flechas del teclado (RNF-USA-04). Las pestañas se copian del <template> que indica la página;
 * no llama a la API.
 */
import { clonar } from '../../utils/plantillas.js';

/**
 * @param {HTMLElement} lista elemento con role="tablist"
 * @param {{ plantilla: string, onCambio: (valor: string) => void }} opciones
 */
export function conectarPestanas(lista, { plantilla, onCambio }) {
  let activo = null;
  const pestanas = () => [...lista.querySelectorAll('[role="tab"]')];

  function marcar(valor, { enfocar = false, avisar = true } = {}) {
    activo = valor;
    for (const pestana of pestanas()) {
      const es = pestana.dataset.id === valor;
      pestana.classList.toggle('is-active', es);
      pestana.setAttribute('aria-selected', String(es));
      pestana.tabIndex = es ? 0 : -1;
      if (es && enfocar) pestana.focus();
    }
    if (avisar) onCambio(valor);
  }

  lista.addEventListener('click', (e) => {
    const pestana = e.target.closest('[role="tab"]');
    if (pestana) marcar(pestana.dataset.id);
  });
  lista.addEventListener('keydown', (e) => {
    const todas = pestanas();
    const i = todas.findIndex((p) => p.dataset.id === activo);
    const destino = {
      ArrowRight: todas[(i + 1) % todas.length],
      ArrowLeft: todas[(i - 1 + todas.length) % todas.length],
      Home: todas[0],
      End: todas[todas.length - 1],
    }[e.key];
    if (!destino) return;
    e.preventDefault();
    marcar(destino.dataset.id, { enfocar: true });
  });

  return {
    /**
     * Escribe las pestañas y deja activa `seleccion` (o la primera). No dispara onCambio.
     * @param {Array<{ valor: string, texto: string }>} opciones
     */
    pintar(opciones, seleccion) {
      lista.replaceChildren(
        ...opciones.map(({ valor, texto }) => {
          const pestana = clonar(plantilla);
          pestana.dataset.id = valor;
          pestana.textContent = texto;
          return pestana;
        })
      );
      const elegida = opciones.some((o) => o.valor === seleccion) ? seleccion : opciones[0]?.valor ?? null;
      marcar(elegida, { avisar: false });
      return elegida;
    },
    activo: () => activo,
  };
}
