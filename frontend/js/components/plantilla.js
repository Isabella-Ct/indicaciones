/**
 * Lo que se repite según los datos (filas, opciones, grupos) se escribe una vez en un
 * <template> de la página y aquí se copia y se rellena con textContent (constitución §V).
 */

/** Copia el primer elemento de la plantilla `id`. */
export function clonar(id) {
  return document.getElementById(id).content.firstElementChild.cloneNode(true);
}

/** Chip de estado (atom-status-chip): free | occupied | reserved | out | neutral. */
export function ponerChip(chip, textoChip, variante = 'neutral') {
  chip.className =
    variante === 'neutral' ? 'atom-status-chip' : `atom-status-chip atom-status-chip--${variante}`;
  chip.textContent = textoChip;
}

/** Alerta fija (.molecule-alert con <p>): muestra u oculta y cambia el tono. */
export function mostrarAlerta(alerta, mensaje, variante = 'error') {
  alerta.querySelector('p').textContent = mensaje || '';
  alerta.classList.remove('molecule-alert--error', 'molecule-alert--success', 'molecule-alert--info');
  alerta.classList.add(`molecule-alert--${variante}`);
  const icono = { error: 'i-alert', success: 'i-check', info: 'i-info' }[variante];
  alerta.querySelector('use')?.setAttribute('href', `/assets/icons.svg#${icono}`);
  alerta.classList.toggle('hidden', !mensaje);
}

const textosOriginales = new WeakMap();

/** Botón en espera: deshabilitado, aria-busy y otro texto en su <span>. */
export function botonCargando(boton, cargando, textoEspera) {
  const span = boton.querySelector('span');
  if (cargando) {
    if (!textosOriginales.has(boton)) textosOriginales.set(boton, span.textContent);
    if (textoEspera) span.textContent = textoEspera;
  } else if (textosOriginales.has(boton)) {
    span.textContent = textosOriginales.get(boton);
    textosOriginales.delete(boton);
  }
  boton.disabled = cargando;
  boton.toggleAttribute('aria-busy', cargando);
}
