import { el } from '../../../utils/dom.js';

/**
 * Pestañas de niveles (.level-tabs / .level-tab.is-active), role="tablist".
 * Flechas izquierda/derecha, Inicio y Fin cambian de pestaña.
 * @param {{
 *   niveles: Array<{ id: number, nombre: string }>,
 *   activoId: number,
 *   idPanel: (id: number) => string,   // id del tabpanel que controla cada pestaña
 *   onChange: (id: number) => void,
 *   label?: string,                    // nombre accesible del tablist
 * }} props
 * @returns {HTMLDivElement}
 */
export function createLevelTabs({ niveles, activoId, idPanel, onChange, label = 'Niveles' }) {
  const pestanas = niveles.map((nivel) => {
    const activa = nivel.id === activoId;
    return el('button', {
      className: activa ? 'level-tab is-active' : 'level-tab',
      text: nivel.nombre,
      attrs: {
        type: 'button',
        role: 'tab',
        id: `tab-${idPanel(nivel.id)}`,
        'aria-selected': String(activa),
        'aria-controls': idPanel(nivel.id),
        tabindex: activa ? '0' : '-1',
      },
      on: { click: () => onChange(nivel.id) },
    });
  });

  const lista = el(
    'div',
    { className: 'level-tabs', attrs: { role: 'tablist', 'aria-label': label } },
    pestanas
  );
  lista.addEventListener('keydown', (e) => {
    const actual = pestanas.indexOf(document.activeElement);
    if (actual < 0) return;
    const destino = {
      ArrowRight: (actual + 1) % pestanas.length,
      ArrowLeft: (actual - 1 + pestanas.length) % pestanas.length,
      Home: 0,
      End: pestanas.length - 1,
    }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    onChange(niveles[destino].id, { enfocar: true });
  });
  return lista;
}
