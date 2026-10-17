/**
 * Helpers para crear nodos sin innerHTML (todo el texto pasa por textContent).
 */

/**
 * Crea un elemento HTML.
 * @param {string} tag
 * @param {{ className?: string, text?: string, attrs?: Record<string, string|number|boolean|null|undefined>, on?: Record<string, EventListener> }} [opciones]
 * @param {Array<Node|string|null|undefined|false>} [hijos]
 * @returns {HTMLElement}
 */
export function el(tag, opciones = {}, hijos = []) {
  const nodo = document.createElement(tag);
  const { className, text, attrs, on } = opciones;
  if (className) nodo.className = className;
  if (text !== undefined && text !== null) nodo.textContent = String(text);
  if (attrs) aplicarAtributos(nodo, attrs);
  if (on) for (const [evento, fn] of Object.entries(on)) nodo.addEventListener(evento, fn);
  agregarHijos(nodo, hijos);
  return nodo;
}

/** Crea un elemento SVG (namespace correcto). */
export function svgEl(tag, attrs = {}) {
  const nodo = document.createElementNS('http://www.w3.org/2000/svg', tag);
  aplicarAtributos(nodo, attrs);
  return nodo;
}

/** Atributos: `false`/`null`/`undefined` no se ponen; `true` pone el atributo vacío. */
export function aplicarAtributos(nodo, attrs) {
  for (const [nombre, valor] of Object.entries(attrs)) {
    if (valor === false || valor === null || valor === undefined) continue;
    nodo.setAttribute(nombre, valor === true ? '' : String(valor));
  }
}

export function agregarHijos(nodo, hijos) {
  for (const hijo of [].concat(hijos)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    const esTexto = typeof hijo === 'string' || typeof hijo === 'number';
    nodo.append(esTexto ? document.createTextNode(String(hijo)) : hijo);
  }
}

/** Vacía un nodo. */
export function vaciar(nodo) {
  while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
}

let contadorIds = 0;
/** id único para asociar label/control o aria-*. */
export function idUnico(prefijo = 'pk') {
  contadorIds += 1;
  return `${prefijo}-${contadorIds}`;
}
