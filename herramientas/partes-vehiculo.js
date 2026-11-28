// Herramienta de desarrollo: marcado del formulario de vehículo, compartido por las páginas de las
// specs 002 (Agregar vehículo en el detalle del usuario) y 005. Lo conecta organismos/formulario-vehiculo.js.
const requerido = '<span class="molecule-field-required" aria-hidden="true"> *</span>';

const campoTexto = (id, etiqueta, { tipo = 'text', max, extra = '' } = {}) => `<div class="molecule-field">
            <label for="${id}">${etiqueta}${requerido}</label>
            <input class="atom-input" id="${id}" type="${tipo}"${max ? ` maxlength="${max}"` : ''} required ${extra} aria-describedby="${id}-error" />
            <p class="molecule-field-error" id="${id}-error" aria-live="polite"></p>
          </div>`;

/**
 * Campos placa, tipo, color, marca y modelo con ids `<prefijo>-…`. Con `resto: true` todo lo que no
 * es la placa queda en `<prefijo>-resto`, oculto, para mostrarlo solo si hay que registrar el vehículo.
 */
function camposVehiculo(prefijo, icono, { resto = false } = {}) {
  const abrir = resto ? `<div class="organism-form--grid molecule-field--full hidden" id="${prefijo}-resto">` : '';
  const cerrar = resto ? '</div>' : '';
  return `<div class="molecule-field molecule-field--full">
            <label for="${prefijo}-placa">Placa${requerido}</label>
            <input class="atom-input atom-input--plate" id="${prefijo}-placa" type="text" maxlength="9" required autocomplete="off" spellcheck="false" placeholder="ABC123" aria-describedby="${prefijo}-placa-hint ${prefijo}-placa-error" />
            <p class="molecule-field-hint" id="${prefijo}-placa-hint">Carro: 3 letras y 3 dígitos (ABC123).</p>
            <p class="molecule-field-error" id="${prefijo}-placa-error" aria-live="polite"></p>
          </div>
          ${abrir}
          <fieldset class="molecule-field molecule-field--full" id="${prefijo}-tipo">
            <legend>Tipo de vehículo${requerido}</legend>
            <div class="molecule-tiles molecule-tiles--2">
              <label class="molecule-tile"><input type="radio" name="${prefijo}-tipo" id="${prefijo}-tipo-carro" value="carro" checked aria-describedby="${prefijo}-tipo-carro-error" /><span>${icono('i-car')}Carro</span></label>
              <label class="molecule-tile"><input type="radio" name="${prefijo}-tipo" value="moto" /><span>${icono('i-moto')}Moto</span></label>
            </div>
            <p class="molecule-field-error" id="${prefijo}-tipo-carro-error" aria-live="polite"></p>
          </fieldset>
          ${campoTexto(`${prefijo}-color`, 'Color', { max: 30, extra: 'autocomplete="off"' })}
          ${campoTexto(`${prefijo}-marca`, 'Marca', { max: 40, extra: 'autocomplete="off"' })}
          ${campoTexto(`${prefijo}-modelo`, 'Modelo (año)', { tipo: 'number', extra: 'min="1950" step="1" inputmode="numeric"' })}
          ${cerrar}`;
}

module.exports = { camposVehiculo, campoTexto, requerido };
