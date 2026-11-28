// Átomo · atom-button: estado de espera de un botón (deshabilitado, aria-busy y texto de espera).
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
