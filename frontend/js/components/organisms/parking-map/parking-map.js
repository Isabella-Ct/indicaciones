import { el } from '../../../utils/dom.js';
import { createLevelTabs } from '../../molecules/level-tabs/level-tabs.js';
import { createMapLegend } from '../../molecules/map-legend/map-legend.js';
import { createSpace } from '../../molecules/space/space.js';

const idPanel = (pisoId) => `nivel-${pisoId}`;

function descripcionTipos(celdas) {
  const carros = celdas.some((c) => c.tipo === 'carro');
  const motos = celdas.some((c) => c.tipo === 'moto');
  if (carros && motos) return 'Carros y motos';
  return motos ? 'Motos' : 'Carros';
}

function fila(celdas, clase, props) {
  const contenedor = el(
    'div',
    { className: `row ${clase}` },
    celdas.map((celda) =>
      createSpace({
        celda,
        seleccionada: celda.id === props.seleccionadaId,
        onSelect: props.onSelectCelda,
      })
    )
  );
  // Columnas según las celdas de la fila (la maqueta usaba style="--cols:12").
  contenedor.style.setProperty('--cols', String(Math.max(celdas.length, 1)));
  return contenedor;
}

function nivel(piso, celdas, props) {
  const superiores = celdas
    .filter((c) => c.fila_mapa === 'superior')
    .sort((a, b) => a.posicion - b.posicion);
  const inferiores = celdas
    .filter((c) => c.fila_mapa === 'inferior')
    .sort((a, b) => a.posicion - b.posicion);
  const ocupadas = celdas.filter((c) => c.estado === 'ocupada').length;

  return el(
    'div',
    {
      className: piso.id === props.pisoActivoId ? 'level' : 'level hidden',
      attrs: {
        id: idPanel(piso.id),
        role: 'tabpanel',
        'aria-labelledby': `tab-${idPanel(piso.id)}`,
      },
    },
    [
      el('p', { className: 'level-title' }, [
        `${piso.nombre} · ${descripcionTipos(celdas)} `,
        el('span', { text: `${ocupadas} ocupados de ${celdas.length}` }),
      ]),
      el('div', { className: 'lot' }, [
        superiores.length ? fila(superiores, 'row--top', props) : null,
        el(
          'div',
          { className: 'lane', attrs: { 'aria-hidden': 'true' } },
          piso.carril.map((tramo) => el('span', { text: tramo }))
        ),
        inferiores.length ? fila(inferiores, 'row--bottom', props) : null,
      ]),
    ]
  );
}

/**
 * Mapa del parqueadero (maqueta, sección 5): panel con pestañas por piso, leyenda
 * y, por piso, título "N ocupados de M" → lote (fila superior, carril, fila inferior).
 * Solo se ve el piso activo.
 * @param {{
 *   pisos: Array<{ id: number, nombre: string, carril: string[] }>,
 *   celdas: Array<object>,
 *   pisoActivoId: number,
 *   seleccionadaId?: number|null,
 *   onSelectPiso: (id: number, opciones?: { enfocar?: boolean }) => void,
 *   onSelectCelda?: (celda: object) => void,
 * }} props
 * @returns {HTMLElement}
 */
export function createParkingMap(props) {
  const { pisos, celdas, pisoActivoId, onSelectPiso } = props;
  return el(
    'section',
    { className: 'panel parking-map', attrs: { 'aria-labelledby': 'map-title' } },
    [
      el('div', { className: 'panel-head' }, [
        el('h2', { text: 'Mapa del parqueadero', attrs: { id: 'map-title' } }),
        createLevelTabs({
          niveles: pisos,
          activoId: pisoActivoId,
          idPanel,
          onChange: onSelectPiso,
        }),
      ]),
      createMapLegend(),
      ...pisos.map((piso) =>
        nivel(
          piso,
          celdas.filter((c) => c.piso.id === piso.id),
          props
        )
      ),
    ]
  );
}
