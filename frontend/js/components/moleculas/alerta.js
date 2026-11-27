// Molécula · molecule-alert: alerta fija de la página o del formulario (ícono + texto).

/** Muestra u oculta la alerta (.molecule-alert con un <p>) y cambia su tono. */
export function mostrarAlerta(alerta, mensaje, variante = 'error') {
  alerta.querySelector('p').textContent = mensaje || '';
  alerta.classList.remove('molecule-alert--error', 'molecule-alert--success', 'molecule-alert--info');
  alerta.classList.add(`molecule-alert--${variante}`);
  const icono = { error: 'i-alert', success: 'i-check', info: 'i-info' }[variante];
  alerta.querySelector('use')?.setAttribute('href', `/assets/icons.svg#${icono}`);
  alerta.classList.toggle('hidden', !mensaje);
}
