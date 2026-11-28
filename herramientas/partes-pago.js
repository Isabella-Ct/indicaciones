// Herramienta de desarrollo: marcado del organismo «datos del pago» (spec 010) que va en la suscripción, la
// renovación y el panel del cliente. Lo conecta organismos/formulario-pago.js con el mismo `prefijo`.
// `soloElectronico`: sin efectivo (el Cliente paga desde su panel con tarjeta, transferencia o QR).
const requerido = '<span class="molecule-field-required" aria-hidden="true"> *</span>';
const error = (id) => `<p class="molecule-field-error" id="${id}-error" aria-live="polite"></p>`;

function camposPago(prefijo, { soloElectronico = false } = {}) {
  const metodos = [
    ...(soloElectronico ? [] : [['efectivo', 'Efectivo']]),
    ['tarjeta', 'Tarjeta'],
    ['transferencia', 'Transferencia'],
    ['qr', 'QR'],
  ];
  return `<div class="molecule-field">
            <label for="${prefijo}-metodo">Método de pago${requerido}</label>
            <select class="atom-select" id="${prefijo}-metodo" required aria-describedby="${prefijo}-metodo-error">
              ${metodos.map(([v, t]) => `<option value="${v}">${t}</option>`).join('\n              ')}
            </select>
            ${error(`${prefijo}-metodo`)}
          </div>
          <div class="molecule-field${soloElectronico ? ' hidden' : ''}" id="${prefijo}-recibido-campo">
            <label for="${prefijo}-recibido">Valor recibido ($)${requerido}</label>
            <input class="atom-input" id="${prefijo}-recibido" type="number" min="0" step="any" inputmode="decimal" aria-describedby="${prefijo}-cambio ${prefijo}-recibido-error" />
            <p class="molecule-field-hint" id="${prefijo}-cambio" aria-live="polite"></p>
            ${error(`${prefijo}-recibido`)}
          </div>
          <div class="molecule-field${soloElectronico ? '' : ' hidden'}" id="${prefijo}-referencia-campo">
            <label for="${prefijo}-referencia">Referencia o autorización${requerido}</label>
            <input class="atom-input" id="${prefijo}-referencia" type="text" maxlength="40" autocomplete="off" aria-describedby="${prefijo}-referencia-error" />
            ${error(`${prefijo}-referencia`)}
          </div>`;
}

module.exports = { camposPago };
