// Páginas de la spec 007 (Movimientos de la caseta y vista de impresión del ticket), con el mismo marco que
// las anteriores (se ejecuta junto con armar-paginas.js).
const { avisoPicoPlaca } = require('./partes-pico-placa.js');

module.exports = ({ pagina, tablaVacia, icono }) => {
  const requerido = '<span class="molecule-field-required" aria-hidden="true"> *</span>';
  const error = (id) => `<p class="molecule-field-error" id="${id}-error" aria-live="polite"></p>`;
  const alerta = (id) => `<div class="molecule-alert molecule-alert--error hidden" id="${id}" aria-live="assertive">
              ${icono('i-alert')}<p></p>
            </div>`;

  /** Organismo · organism-ticket (maqueta, sección 8); lo rellena organismos/ticket.js. */
  const ticket = (id) => `<aside class="organism-ticket" id="${id}" aria-labelledby="${id}-titulo">
              <div class="organism-ticket-head"><span id="${id}-titulo">TICKET DE INGRESO</span></div>
              <dl>
                <div class="organism-ticket-number"><dt>N.º</dt><dd class="js-codigo"></dd></div>
                <div><dt>Placa</dt><dd><span class="atom-plate js-placa"></span></dd></div>
                <div><dt>Tipo</dt><dd class="js-tipo"></dd></div>
                <div><dt>Celda</dt><dd class="js-celda"></dd></div>
                <div><dt>Puerta</dt><dd class="js-puerta"></dd></div>
                <div><dt>Entrada</dt><dd class="js-entrada"></dd></div>
                <div><dt>Parqueadero</dt><dd class="js-parqueadero"></dd></div>
              </dl>
              <div class="organism-ticket-barcode" aria-hidden="true"></div>
              <p class="organism-ticket-note js-nota"></p>
            </aside>`;

  // ---------------------------------------------------------------- movimientos.html (HU-31..HU-35)
  pagina({
    archivo: 'movimientos.html',
    titulo: 'Movimientos',
    vista: 'movimientos.view.js',
    activo: 'movimientos',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Movimientos</h1>
            <p id="movimientos-subtitulo">// Caseta · entradas, salidas y vehículos dentro (hora del servidor)</p>
          </div>
          <div class="molecule-page-head-actions">
            <div class="molecule-field hidden" id="sede-campo">
              <label for="sede">Parqueadero</label>
              <select class="atom-select" id="sede"></select>
            </div>
          </div>
        </div>

        ${avisoPicoPlaca(icono)}

        <div class="template-app-layout-workspace">
          <section class="molecule-panel" aria-labelledby="entrada-titulo">
            <div class="molecule-panel-head"><h2 id="entrada-titulo">Registrar entrada</h2></div>
            <div class="molecule-panel-body">
              <form class="organism-form--grid" id="form-entrada" novalidate>
                <div class="molecule-field--full">${alerta('entrada-alerta')}</div>
                <div class="molecule-field molecule-field--full">
                  <label for="entrada-placa">Placa${requerido}</label>
                  <input class="atom-input atom-input--plate" id="entrada-placa" type="text" maxlength="9" required autocomplete="off" spellcheck="false" placeholder="ABC123" aria-describedby="entrada-placa-hint entrada-placa-error" />
                  <p class="molecule-field-hint" id="entrada-placa-hint" aria-live="polite">Escriba la placa: el sistema busca el vehículo.</p>
                  ${error('entrada-placa')}
                </div>
                <fieldset class="molecule-field molecule-field--full hidden" id="entrada-tipo">
                  <legend>Tipo del vehículo nuevo${requerido}</legend>
                  <div class="molecule-tiles molecule-tiles--2">
                    <label class="molecule-tile"><input type="radio" name="entrada-tipo" id="entrada-tipo-carro" value="carro" checked aria-describedby="entrada-tipo-carro-error" /><span>${icono('i-car')}Carro</span></label>
                    <label class="molecule-tile"><input type="radio" name="entrada-tipo" value="moto" /><span>${icono('i-moto')}Moto</span></label>
                  </div>
                  ${error('entrada-tipo-carro')}
                </fieldset>
                <div class="organism-form--grid molecule-field--full hidden" id="entrada-nuevo">
                  <div class="molecule-field">
                    <label for="entrada-color">Color</label>
                    <input class="atom-input" id="entrada-color" type="text" maxlength="30" autocomplete="off" aria-describedby="entrada-color-error" />
                    ${error('entrada-color')}
                  </div>
                  <div class="molecule-field">
                    <label for="entrada-marca">Marca</label>
                    <input class="atom-input" id="entrada-marca" type="text" maxlength="40" autocomplete="off" aria-describedby="entrada-marca-error" />
                    ${error('entrada-marca')}
                  </div>
                </div>
                <div class="molecule-field">
                  <label for="entrada-puerta">Puerta${requerido}</label>
                  <select class="atom-select" id="entrada-puerta" required aria-describedby="entrada-puerta-error"></select>
                  ${error('entrada-puerta')}
                </div>
                <div class="molecule-field">
                  <label for="entrada-celda">Celda</label>
                  <select class="atom-select" id="entrada-celda" aria-describedby="entrada-celda-error">
                    <option value="">Asignar automáticamente (menor código)</option>
                  </select>
                  ${error('entrada-celda')}
                </div>
                <div class="molecule-field--full">
                  <button class="atom-button" type="submit" id="entrada-guardar">${icono('i-in')}<span>Registrar entrada</span></button>
                </div>
              </form>
            </div>
          </section>

          <aside class="template-app-layout-stack" aria-live="polite">
            <div class="molecule-empty-state" id="ticket-vacio">
              <strong>Ticket de ingreso</strong>
              <p>Al registrar una entrada aparece aquí el ticket para imprimir o enviar.</p>
            </div>
            <div class="template-app-layout-stack hidden" id="ticket-emitido">
              ${ticket('ticket-ultimo')}
              <a class="atom-button atom-button--ghost" id="ticket-imprimir" href="#">${icono('i-print')}<span>Ver e imprimir el ticket</span></a>
            </div>
          </aside>
        </div>

        <section class="molecule-panel" aria-labelledby="salida-titulo">
          <div class="molecule-panel-head"><h2 id="salida-titulo">Registrar salida</h2></div>
          <div class="molecule-panel-body">
            <form class="molecule-filters" id="form-buscar" role="search">
              <div class="molecule-search-box">
                <label class="molecule-search-box-label" for="salida-buscar">Placa o ticket</label>
                <input class="atom-input" id="salida-buscar" type="search" placeholder="ABC123 o T-000123" autocomplete="off" maxlength="12" aria-describedby="salida-buscar-error" />
                ${error('salida-buscar')}
              </div>
              <button class="atom-button atom-button--ghost" type="submit" id="salida-buscar-boton"><span>Buscar</span></button>
            </form>
            <form class="organism-form--grid hidden" id="form-salida" novalidate>
              <div class="molecule-field--full">${alerta('salida-alerta')}</div>
              <dl class="molecule-data-list molecule-field--full">
                <div><dt>Placa</dt><dd><span class="atom-plate" id="salida-placa"></span></dd></div>
                <div><dt>Celda</dt><dd id="salida-celda"></dd></div>
                <div><dt>Entrada</dt><dd id="salida-entrada"></dd></div>
                <div><dt>Tiempo dentro</dt><dd id="salida-tiempo"></dd></div>
                <div><dt>Ticket</dt><dd id="salida-ticket"></dd></div>
              </dl>
              <div class="molecule-field">
                <label for="salida-puerta">Puerta de salida${requerido}</label>
                <select class="atom-select" id="salida-puerta" required aria-describedby="salida-puerta-error"></select>
                ${error('salida-puerta')}
              </div>
              <div class="molecule-field">
                <label class="molecule-check"><input type="checkbox" id="salida-extraviado" />El conductor no tiene el ticket</label>
              </div>
              <div class="molecule-field--full">
                <button class="atom-button" type="submit" id="salida-guardar">${icono('i-out')}<span>Registrar salida</span></button>
              </div>
            </form>
            <div class="molecule-alert molecule-alert--success hidden" id="salida-resultado" aria-live="polite">
              ${icono('i-check')}<p></p>
            </div>
          </div>
        </section>

        <section class="molecule-panel" aria-labelledby="dentro-titulo">
          <div class="molecule-panel-head"><h2 id="dentro-titulo">Vehículos dentro</h2><p class="organism-availability-time" id="dentro-actualizado"></p></div>
          <div class="molecule-panel-body">
            <div class="molecule-filters">
              <div class="molecule-search-box" role="search">
                <label class="molecule-search-box-label" for="dentro-buscar">Buscar placa</label>
                <input class="atom-input" id="dentro-buscar" type="search" placeholder="ABC1" autocomplete="off" maxlength="7" />
              </div>
            </div>
${tablaVacia(
  'tabla-dentro',
  'Vehículos dentro',
  [
    { texto: 'Placa' },
    { texto: 'Tipo' },
    { texto: 'Celda' },
    { texto: 'Entrada' },
    { texto: 'Tiempo dentro' },
    { texto: 'Acciones', derecha: true },
  ],
  'w760',
  ['El vehículo no está dentro', 'No hay vehículos dentro con esa búsqueda.']
)}
          </div>
        </section>

        <template id="tpl-dentro">
          <tr>
            <td><span class="atom-plate js-placa"></span></td>
            <td class="js-tipo"></td>
            <td class="js-celda"></td>
            <td class="organism-data-table-cell-nowrap js-entrada"></td>
            <td><span class="js-tiempo"></span> <span class="atom-status-chip atom-status-chip--out hidden js-alerta">Más de 24 h</span></td>
            <td class="organism-log-table-right">
              <div class="organism-data-table-row-actions">
                <a class="atom-button atom-button--ghost atom-button--sm js-ticket" href="#"><span>Ticket</span></a>
                <button class="atom-button atom-button--ghost atom-button--sm js-salida" type="button"><span>Salida</span></button>
                <button class="atom-button atom-button--ghost atom-button--sm hidden js-anular" type="button"><span>Anular</span></button>
              </div>
            </td>
          </tr>
        </template>
        <template id="tpl-opcion"><option></option></template>`,
    extra: `
    <dialog class="organism-modal organism-modal--sm" id="dialogo-anular" aria-labelledby="dialogo-anular-titulo">
      <header class="organism-modal-head">
        <div><h2 id="dialogo-anular-titulo">Anular entrada</h2><p>// La celda se libera y el ticket queda inválido</p></div>
        <button class="atom-icon-button" type="button" data-cerrar aria-label="Cerrar">${icono('i-x')}</button>
      </header>
      <div class="organism-modal-body">
        <form class="organism-form--stack" id="form-anular" novalidate>
          ${alerta('anular-alerta')}
          <div class="molecule-field">
            <label for="anular-motivo">Motivo${requerido}</label>
            <textarea class="atom-textarea" id="anular-motivo" rows="3" maxlength="200" required aria-describedby="anular-motivo-hint anular-motivo-error"></textarea>
            <p class="molecule-field-hint" id="anular-motivo-hint">De 10 a 200 caracteres. El Operador puede anular dentro de los 15 minutos siguientes a la entrada.</p>
            ${error('anular-motivo')}
          </div>
        </form>
      </div>
      <footer class="organism-modal-foot">
        <button class="atom-button atom-button--ghost" type="button" data-cerrar><span>Cancelar</span></button>
        <button class="atom-button atom-button--dark" type="submit" form="form-anular" id="anular-guardar"><span>Anular entrada</span></button>
      </footer>
    </dialog>
`,
  });

  // ---------------------------------------------------------------- ticket.html (HU-32: vista de impresión)
  pagina({
    archivo: 'ticket.html',
    titulo: 'Ticket',
    vista: 'ticket.view.js',
    activo: 'movimientos',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Ticket</h1>
            <p>// Movimientos › Ticket · formato de impresión de 80 mm</p>
          </div>
          <div class="molecule-page-head-actions">
            <a class="atom-button atom-button--ghost" href="/movimientos.html"><span>← Volver a movimientos</span></a>
            <button class="atom-button atom-button--ghost hidden" type="button" id="ticket-enviar">${icono('i-send')}<span>Enviar por correo</span></button>
            <button class="atom-button hidden" type="button" id="ticket-imprimir">${icono('i-print')}<span>Imprimir</span></button>
          </div>
        </div>

        <div class="molecule-empty-state hidden" id="ticket-no-encontrado">
          <strong>Ticket no encontrado</strong>
          <p>El código no corresponde a ningún ticket.</p>
          <div class="molecule-empty-state-action"><a class="atom-button" href="/movimientos.html"><span>Ir a movimientos</span></a></div>
        </div>

        <div class="template-ticket-sheet hidden" id="ticket-hoja">
          ${ticket('ticket')}
        </div>`,
  });
};
