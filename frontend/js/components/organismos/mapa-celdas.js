/**
 * Organismo · organism-parking-map: mapa de un piso con sus celdas agrupadas por área (RF-CLD-15,
 * RF-CLD-16). Las áreas se dibujan de a dos, una a cada lado del carril, como en la maqueta.
 * Todo el marcado está en la página; aquí se copian las celdas desde sus <template> y se conecta
 * la selección. No llama a la API: la página le pasa las celdas y recibe la elegida.
 *
 * Dentro de la raíz: .js-titulo, .js-conteo, .js-lote (organism-parking-map-lot) y .js-vacio.
 * Plantillas: tpl-mapa-bloque (fila superior, carril y fila inferior), tpl-celda-carro, tpl-celda-moto.
 */
import { clonar } from '../../utils/plantillas.js';
import { ESTADOS_CELDA } from '../atomos/chip-estado.js';

const ETIQUETA = { disponible: 'LIBRE', ocupada: 'OCUPADA', reservada: 'RESERVADA', inhabilitada: 'INHABILITADA' };
const MODIFICADOR = { disponible: 'free', ocupada: 'occupied', reservada: 'reserved', inhabilitada: 'out' };

/** Agrupa por área conservando el orden de código ('' → «Sin área»). */
function porArea(celdas) {
  const grupos = new Map();
  for (const celda of celdas) {
    const area = celda.area || 'Sin área';
    if (!grupos.has(area)) grupos.set(area, []);
    grupos.get(area).push(celda);
  }
  return [...grupos.entries()];
}

/** Molécula · molecule-space: una celda del mapa. */
function dibujarCelda(celda, seleccionada) {
  const boton = clonar(celda.tipoVehiculo === 'moto' ? 'tpl-celda-moto' : 'tpl-celda-carro');
  boton.dataset.id = String(celda.idCelda);
  boton.classList.add(`molecule-space--${MODIFICADOR[celda.estado] ?? 'out'}`);
  if (celda.tipoVehiculo === 'moto') boton.classList.add('molecule-space--moto');
  boton.classList.toggle('is-selected', seleccionada);
  boton.setAttribute('aria-pressed', String(seleccionada));

  boton.querySelector('.molecule-space-code').textContent = celda.codigo;
  const placa = celda.ocupante?.placa;
  const ocupada = celda.estado === 'ocupada';
  boton.querySelector('.molecule-space-car').classList.toggle('hidden', !ocupada);
  const nodoPlaca = boton.querySelector('.molecule-space-plate');
  nodoPlaca.textContent = placa ?? '';
  nodoPlaca.classList.toggle('hidden', !placa);
  const etiqueta = boton.querySelector('.molecule-space-tag');
  etiqueta.textContent = ETIQUETA[celda.estado] ?? '';
  etiqueta.classList.toggle('hidden', ocupada && Boolean(placa));

  const estado = (ESTADOS_CELDA[celda.estado]?.texto ?? celda.estado).toLowerCase();
  boton.setAttribute('aria-label', `Celda ${celda.codigo}, ${celda.tipoVehiculo}, ${estado}${placa ? `, placa ${placa}` : ''}`);
  return boton;
}

/**
 * @param {HTMLElement} raiz
 * @param {{ onSeleccionar?: (idCelda: number | null) => void }} opciones
 */
export function conectarMapa(raiz, { onSeleccionar } = {}) {
  const lote = raiz.querySelector('.js-lote');
  const vacio = raiz.querySelector('.js-vacio');
  let seleccion = null;

  function marcarSeleccion() {
    for (const boton of lote.querySelectorAll('.molecule-space')) {
      const es = Number(boton.dataset.id) === seleccion;
      boton.classList.toggle('is-selected', es);
      boton.setAttribute('aria-pressed', String(es));
    }
  }

  lote.addEventListener('click', (e) => {
    const boton = e.target.closest('.molecule-space');
    if (!boton) return;
    seleccion = Number(boton.dataset.id);
    marcarSeleccion();
    onSeleccionar?.(seleccion);
  });

  return {
    /**
     * @param {object[]} celdas celdas del piso (idCelda, codigo, tipoVehiculo, area, estado, ocupante)
     * @param {{ titulo: string, conteo: string }} encabezado
     */
    pintar(celdas, { titulo, conteo }) {
      raiz.querySelector('.js-titulo').textContent = titulo;
      raiz.querySelector('.js-conteo').textContent = conteo;
      const areas = porArea(celdas);
      const bloques = [];
      for (let i = 0; i < areas.length; i += 2) {
        const bloque = clonar('tpl-mapa-bloque');
        const [superior, inferior] = bloque.querySelectorAll('.organism-parking-map-row');
        const [arriba, abajo] = [areas[i], areas[i + 1]];
        superior.append(...arriba[1].map((c) => dibujarCelda(c, c.idCelda === seleccion)));
        if (abajo) inferior.append(...abajo[1].map((c) => dibujarCelda(c, c.idCelda === seleccion)));
        const columnas = String(Math.max(arriba[1].length, abajo?.[1].length ?? 0));
        superior.style.setProperty('--cols', columnas);
        inferior.style.setProperty('--cols', columnas);
        bloque.querySelector('.js-carril-arriba').textContent = `Área ${arriba[0]}`;
        bloque.querySelector('.js-carril-abajo').textContent = abajo ? `Área ${abajo[0]}` : '';
        bloques.push(bloque);
      }
      lote.replaceChildren(...bloques);
      lote.classList.toggle('hidden', celdas.length === 0);
      vacio?.classList.toggle('hidden', celdas.length > 0);
      if (seleccion !== null && !celdas.some((c) => c.idCelda === seleccion)) {
        seleccion = null;
        onSeleccionar?.(null);
      }
    },
    /** Quita la selección (p. ej. al cerrar el detalle). */
    limpiar() {
      seleccion = null;
      marcarSeleccion();
    },
    seleccionada: () => seleccion,
  };
}
