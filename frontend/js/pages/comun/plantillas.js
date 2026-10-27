/**
 * Plantillas HTML (<template>) escritas en cada página. Para las listas que vienen de la
 * BD (celdas, filas, opciones) el marcado vive en el HTML: aquí solo se copia y se
 * rellena con textContent.
 */

/** Copia el primer elemento de la plantilla `id`. */
export function clonar(id) {
  return document.getElementById(id).content.firstElementChild.cloneNode(true);
}

/** Copia la pieza SVG de una plantilla escrita como <template><svg>pieza</svg></template>. */
export function clonarSvg(id) {
  return document.getElementById(id).content.firstElementChild.firstElementChild.cloneNode(true);
}

/** Llena un <select> con opciones (y grupos) copiados de las plantillas de la página. */
export function llenarSelect(select, { opciones = [], grupos = [] } = {}) {
  const opcion = ({ value, label, disabled = false }) => {
    const nodo = clonar('tpl-opcion');
    nodo.value = value;
    nodo.textContent = label;
    nodo.disabled = disabled;
    return nodo;
  };
  select.replaceChildren(
    ...opciones.map(opcion),
    ...grupos.map((g) => {
      const grupo = clonar('tpl-grupo');
      grupo.label = g.label;
      grupo.append(...g.options.map(opcion));
      return grupo;
    })
  );
}

/** Chip de estado (atom-status-chip): texto + variante free|occupied|reserved|out|neutral. */
export function ponerChip(chip, texto, variante = 'neutral') {
  chip.className =
    variante === 'neutral' ? 'atom-status-chip' : `atom-status-chip atom-status-chip--${variante}`;
  chip.textContent = texto;
}

/** Texto de un campo de error (<p id="<control>-error">) + aria-invalid del control. */
export function marcarCampo(control, mensaje) {
  const destino = document.getElementById(`${control.id}-error`);
  if (destino) destino.textContent = mensaje || '';
  if (mensaje) control.setAttribute('aria-invalid', 'true');
  else control.removeAttribute('aria-invalid');
  return !mensaje;
}

/** Alerta estática (.molecule-alert con <p> dentro): muestra/oculta y cambia el tono. */
export function mostrarAlerta(alerta, mensaje, variante = 'error') {
  alerta.querySelector('p').textContent = mensaje || '';
  alerta.classList.remove(
    'molecule-alert--error',
    'molecule-alert--success',
    'molecule-alert--info',
    'molecule-alert--large'
  );
  alerta.classList.add(`molecule-alert--${variante}`);
  const icono = { error: 'i-alert', success: 'i-check', info: 'i-info' }[variante];
  alerta.querySelector('use')?.setAttribute('href', `/assets/icons.svg#${icono}`);
  alerta.classList.toggle('hidden', !mensaje);
}

/**
 * Descarga un CSV con el enlace oculto #descarga de la página. Usa BOM y ";" para que
 * Excel en español lo abra con tildes y columnas correctas.
 * @param {string[]} encabezado
 * @param {Array<Array<unknown>>} filas
 * @param {string} nombre  nombre del archivo
 */
export function descargarCsv(encabezado, filas, nombre) {
  const campo = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lineas = [encabezado, ...filas].map((fila) => fila.map(campo).join(';'));
  const url = URL.createObjectURL(
    new Blob([String.fromCharCode(0xfeff), lineas.join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    })
  );
  const enlace = document.getElementById('descarga');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const textosOriginales = new WeakMap();

/** Botón en espera: deshabilitado y con otro texto en su <span>. */
export function botonCargando(boton, cargando, texto) {
  const span = boton.querySelector('span');
  if (cargando) {
    if (!textosOriginales.has(boton)) textosOriginales.set(boton, span.textContent);
    if (texto) span.textContent = texto;
  } else if (textosOriginales.has(boton)) {
    span.textContent = textosOriginales.get(boton);
    textosOriginales.delete(boton);
  }
  boton.disabled = cargando;
  boton.toggleAttribute('aria-busy', cargando);
}
