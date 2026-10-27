/**
 * Mapa de celdas por piso (organism-parking-map) escrito en el HTML: pestañas en
 * #mapa-pestanas y niveles en #mapa-niveles, copiados de las plantillas #tpl-pestana,
 * #tpl-nivel, #tpl-tramo y #tpl-celda. Lo usan Celdas (personal) y Disponibilidad (cliente).
 */
import { clonar } from './plantillas.js';
import { formatearPlaca } from '../../utils/placa.js';

const CLAVE_PISO = 'parko.piso';
const ESTADOS = {
  disponible: { espacio: 'free', lectura: 'libre' },
  ocupada: { espacio: 'occupied', lectura: 'ocupado' },
  reservada: { espacio: 'reserved', lectura: 'reservado' },
  fuera_servicio: { espacio: 'out', lectura: 'fuera de servicio' },
};
const idNivel = (pisoId) => `nivel-${pisoId}`;

function descripcionTipos(celdas) {
  const carros = celdas.some((c) => c.tipo === 'carro');
  const motos = celdas.some((c) => c.tipo === 'moto');
  if (carros && motos) return 'Carros y motos';
  return motos ? 'Motos' : 'Carros';
}

function placaVisible(celda) {
  if (celda.estado === 'ocupada') return celda.ocupante?.placa ?? null;
  if (celda.estado === 'reservada') return celda.mensualidad?.placa ?? celda.reserva?.placa ?? null;
  return null;
}

function etiquetaEspacio(celda) {
  if (celda.estado === 'disponible') return 'LIBRE';
  if (celda.estado === 'reservada')
    return celda.reserva_origen === 'mensualidad' ? 'MENSUAL' : 'RESERVADA';
  if (celda.estado === 'fuera_servicio') return 'FUERA DE\nSERVICIO';
  return '';
}

/** Piso guardado por el usuario (preferencia del navegador). */
export function pisoGuardado() {
  try {
    return Number(localStorage.getItem(CLAVE_PISO));
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   estado: { pisos: object[], celdas: Map<number, object>, pisoActivoId: number|null, seleccionadaId: number|null },
 *   resaltadas?: () => Set<number>,
 *   onSeleccionar: (id: number) => void,
 * }} opciones
 */
export function conectarMapa({ estado, resaltadas = () => new Set(), onSeleccionar }) {
  const pestanas = document.getElementById('mapa-pestanas');
  const niveles = document.getElementById('mapa-niveles');

  function pintarEspacio(celda, marcadas) {
    const info = ESTADOS[celda.estado];
    const seleccionada = celda.id === estado.seleccionadaId || marcadas.has(celda.id);
    const boton = clonar('tpl-celda');
    boton.classList.add(`molecule-space--${info.espacio}`);
    boton.classList.toggle('molecule-space--accessible', Boolean(celda.es_accesible));
    boton.classList.toggle('molecule-space--moto', celda.tipo === 'moto');
    boton.classList.toggle('is-selected', seleccionada);
    boton.dataset.id = String(celda.id);
    boton.setAttribute('aria-pressed', String(seleccionada));
    boton.querySelector('.molecule-space-code').textContent = celda.codigo;

    const etiqueta = etiquetaEspacio(celda);
    const tag = boton.querySelector('.molecule-space-tag');
    tag.textContent = etiqueta;
    tag.classList.toggle('hidden', !etiqueta);

    const carro = boton.querySelector('.molecule-space-car');
    carro.classList.toggle('hidden', celda.estado !== 'ocupada');
    if (celda.tipo === 'moto') {
      carro.setAttribute('viewBox', '0 0 14 34');
      carro.querySelector('use').setAttribute('href', '/assets/icons.svg#moto-top');
    }

    const placa = placaVisible(celda);
    const textoPlaca = placa ? formatearPlaca(placa) : '';
    const nodoPlaca = boton.querySelector('.molecule-space-plate');
    nodoPlaca.textContent = textoPlaca;
    nodoPlaca.classList.toggle('hidden', !placa);

    // El nombre accesible empieza por el texto visible y luego agrega estado y accesibilidad.
    const visible = [celda.codigo, etiqueta.replace('\n', ' '), textoPlaca]
      .filter(Boolean)
      .join(' ');
    boton.setAttribute(
      'aria-label',
      [
        visible,
        visible.toLowerCase().includes(info.lectura) ? null : info.lectura,
        celda.es_accesible ? 'celda accesible' : null,
      ]
        .filter(Boolean)
        .join(', ')
    );
    return boton;
  }

  function pintarFila(fila, celdas, marcadas) {
    fila.style.setProperty('--cols', String(Math.max(celdas.length, 1)));
    fila.replaceChildren(...celdas.map((c) => pintarEspacio(c, marcadas)));
  }

  function pintarNivel(piso, marcadas) {
    const celdas = [...estado.celdas.values()].filter((c) => c.piso.id === piso.id);
    const ordenar = (fila) =>
      celdas.filter((c) => c.fila_mapa === fila).sort((a, b) => a.posicion - b.posicion);
    const nivel = clonar('tpl-nivel');
    nivel.id = idNivel(piso.id);
    nivel.setAttribute('aria-labelledby', `tab-${idNivel(piso.id)}`);
    nivel.classList.toggle('hidden', piso.id !== estado.pisoActivoId);
    nivel.querySelector('.organism-parking-map-level-name').textContent =
      `${piso.nombre} · ${descripcionTipos(celdas)}`;
    nivel.querySelector('.organism-parking-map-level-count').textContent =
      `${celdas.filter((c) => c.estado === 'ocupada').length} ocupados de ${celdas.length}`;
    pintarFila(
      nivel.querySelector('.organism-parking-map-row--top'),
      ordenar('superior'),
      marcadas
    );
    pintarFila(
      nivel.querySelector('.organism-parking-map-row--bottom'),
      ordenar('inferior'),
      marcadas
    );
    nivel.querySelector('.organism-parking-map-lane').replaceChildren(
      ...piso.carril.map((tramo) => {
        const span = clonar('tpl-tramo');
        span.textContent = tramo;
        return span;
      })
    );
    return nivel;
  }

  function pintarPestanas() {
    pestanas.replaceChildren(
      ...estado.pisos.map((piso) => {
        const activa = piso.id === estado.pisoActivoId;
        const tab = clonar('tpl-pestana');
        tab.id = `tab-${idNivel(piso.id)}`;
        tab.dataset.id = String(piso.id);
        tab.textContent = piso.nombre;
        tab.classList.toggle('is-active', activa);
        tab.setAttribute('aria-selected', String(activa));
        tab.setAttribute('aria-controls', idNivel(piso.id));
        tab.tabIndex = activa ? 0 : -1;
        return tab;
      })
    );
  }

  function enfocarEspacio(id) {
    niveles.querySelector(`.molecule-space[data-id="${id}"]`)?.focus();
  }

  function pintar() {
    // Las actualizaciones en vivo no deben robar el foco del teclado.
    const enfocada = document.activeElement?.closest?.('.molecule-space, .molecule-level-tab');
    const espacioEnfocado = enfocada?.classList.contains('molecule-space')
      ? enfocada.dataset.id
      : null;
    const tabEnfocada = enfocada?.classList.contains('molecule-level-tab');
    const marcadas = resaltadas();
    pintarPestanas();
    niveles.replaceChildren(...estado.pisos.map((p) => pintarNivel(p, marcadas)));
    if (espacioEnfocado) enfocarEspacio(espacioEnfocado);
    else if (tabEnfocada) pestanas.querySelector('.is-active')?.focus();
  }

  function elegirPiso(id, { enfocar = false } = {}) {
    estado.pisoActivoId = id;
    try {
      localStorage.setItem(CLAVE_PISO, String(id));
    } catch {
      /* preferencia opcional */
    }
    pintar();
    if (enfocar) pestanas.querySelector('.is-active')?.focus();
  }

  pestanas.addEventListener('click', (e) => {
    const tab = e.target.closest('.molecule-level-tab');
    if (tab) elegirPiso(Number(tab.dataset.id));
  });
  pestanas.addEventListener('keydown', (e) => {
    const todas = [...pestanas.children];
    const actual = todas.indexOf(document.activeElement);
    if (actual < 0) return;
    const destino = {
      ArrowRight: (actual + 1) % todas.length,
      ArrowLeft: (actual - 1 + todas.length) % todas.length,
      Home: 0,
      End: todas.length - 1,
    }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    elegirPiso(estado.pisos[destino].id, { enfocar: true });
  });
  niveles.addEventListener('click', (e) => {
    const espacio = e.target.closest('.molecule-space');
    if (espacio) onSeleccionar(Number(espacio.dataset.id));
  });

  return { pintar, enfocarEspacio };
}
