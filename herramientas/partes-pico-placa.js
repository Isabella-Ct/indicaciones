// Herramienta de desarrollo: marcado del aviso «Pico y placa hoy» (spec 006, HU-30), que va en las pantallas
// de la caseta y del cliente. Lo rellena moleculas/aviso-pico-placa.js; queda oculto hasta tener datos.
function avisoPicoPlaca(icono) {
  return `<section class="molecule-alert molecule-alert--info molecule-pico-placa hidden" id="pico-placa-hoy" aria-labelledby="pico-placa-titulo" aria-live="polite">
          ${icono('i-calendar')}
          <div class="molecule-pico-placa-body">
            <p class="atom-label-caps" id="pico-placa-titulo">Pico y placa hoy · <span class="js-dia"></span></p>
            <p class="hidden js-sin">Sin restricción hoy</p>
            <dl class="molecule-pico-placa-list js-lista">
              <div class="js-carro"><dt>Carros</dt><dd><span class="atom-plate js-digitos"></span><span class="js-franja"></span></dd></div>
              <div class="js-moto"><dt>Motos</dt><dd><span class="atom-plate js-digitos"></span><span class="js-franja"></span></dd></div>
            </dl>
          </div>
        </section>`;
}

module.exports = { avisoPicoPlaca };
