// Página de la spec 006 (Configuración › Pico y placa), con el mismo marco que las anteriores (se ejecuta
// junto con armar-paginas.js). El aviso de hoy de las otras pantallas viene de partes-pico-placa.js.
const { avisoPicoPlaca } = require('./partes-pico-placa.js');

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const mayuscula = (t) => t[0].toUpperCase() + t.slice(1);

module.exports = ({ pagina, icono }) => {
  const requerido = '<span class="molecule-field-required" aria-hidden="true"> *</span>';
  const error = (id) => `<p class="molecule-field-error" id="${id}-error" aria-live="polite"></p>`;

  pagina({
    archivo: 'pico-placa.html',
    titulo: 'Pico y placa',
    vista: 'pico-placa.view.js',
    activo: 'pico-placa',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Pico y placa</h1>
            <p>// Configuración › dígitos restringidos por día, tipo de vehículo y franja (hora de Bogotá)</p>
          </div>
          <div class="molecule-page-head-actions">
            <button class="atom-button hidden" type="button" id="accion-nueva">${icono('i-calendar')}<span>Nueva restricción</span></button>
          </div>
        </div>

        ${avisoPicoPlaca(icono)}

        <section class="molecule-panel" aria-labelledby="semana-titulo">
          <div class="molecule-panel-head">
            <h2 id="semana-titulo">Tabla semanal</h2>
            <div class="molecule-field">
              <label for="filtro-estado">Mostrar</label>
              <select class="atom-select" id="filtro-estado">
                <option value="activo">Activas</option>
                <option value="">Activas e inactivas</option>
              </select>
            </div>
          </div>
          <div class="molecule-panel-body">
            <p class="molecule-field-hint" id="semana-cargando" aria-live="polite">Cargando…</p>
            <div class="organism-data-table-scroll" tabindex="0" role="region" aria-label="Tabla semanal de pico y placa">
              <table class="organism-log-table organism-data-table-table organism-data-table-table--w760" id="tabla-semanal">
                <caption class="visually-hidden">Restricciones de pico y placa por día y tipo de vehículo</caption>
                <thead>
                  <tr><th scope="col">Día</th><th scope="col">Carros</th><th scope="col">Motos</th></tr>
                </thead>
                <tbody>
${DIAS.map(
  (d, i) => `                  <tr data-id="${i + 1}">
                    <th scope="row">${mayuscula(d)}</th>
                    <td><div class="organism-week-table-cell js-carro"></div></td>
                    <td><div class="organism-week-table-cell js-moto"></div></td>
                  </tr>`
).join('\n')}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <template id="tpl-restriccion">
          <div class="organism-week-table-item">
            <div><span class="atom-plate js-digitos"></span> <span class="atom-status-chip js-estado"></span></div>
            <p class="js-franja"></p>
            <p class="organism-week-table-meta js-vigencia"></p>
            <div class="organism-data-table-row-actions">
              <button class="atom-button atom-button--ghost atom-button--sm hidden js-editar" type="button"><span>Editar</span></button>
              <button class="atom-button atom-button--ghost atom-button--sm hidden js-eliminar" type="button"><span>Eliminar</span></button>
            </div>
          </div>
        </template>
        <template id="tpl-sin-restriccion"><p class="organism-week-table-empty">Sin restricción</p></template>`,
    extra: `
    <dialog class="organism-modal" id="dialogo-restriccion" aria-labelledby="dialogo-restriccion-titulo">
      <header class="organism-modal-head">
        <div><h2 id="dialogo-restriccion-titulo">Nueva restricción</h2><p>// El cambio aplica a las entradas desde ahora</p></div>
        <button class="atom-icon-button" type="button" data-cerrar aria-label="Cerrar">${icono('i-x')}</button>
      </header>
      <div class="organism-modal-body">
        <form class="organism-form--grid" id="form-restriccion" novalidate>
          <div class="molecule-alert molecule-alert--error molecule-field--full hidden" id="restriccion-alerta" aria-live="assertive">
            ${icono('i-alert')}<p></p>
          </div>
          <div class="molecule-field--full hidden" id="restriccion-existente-campo">
            <button class="atom-button atom-button--sm" type="button" id="restriccion-editar-existente"><span>Editar la existente</span></button>
          </div>
          <div class="molecule-field">
            <label for="restriccion-dia">Día${requerido}</label>
            <select class="atom-select" id="restriccion-dia" required aria-describedby="restriccion-dia-error">
              ${DIAS.map((d, i) => `<option value="${i + 1}">${mayuscula(d)}</option>`).join('\n              ')}
            </select>
            ${error('restriccion-dia')}
          </div>
          <div class="molecule-field">
            <label for="restriccion-tipo">Tipo de vehículo${requerido}</label>
            <select class="atom-select" id="restriccion-tipo" required aria-describedby="restriccion-tipo-error">
              <option value="carro">Carros</option>
              <option value="moto">Motos</option>
            </select>
            ${error('restriccion-tipo')}
          </div>
          <fieldset class="molecule-field molecule-field--full" id="restriccion-digitos" aria-describedby="restriccion-digitos-hint restriccion-digitos-error">
            <legend>Dígitos restringidos${requerido}</legend>
            <div class="molecule-digit-picker">
              ${Array.from({ length: 10 }, (_, d) => `<label class="molecule-check"><input type="checkbox" class="js-digito" value="${d}" />${d}</label>`).join('\n              ')}
            </div>
            <p class="molecule-field-hint" id="restriccion-digitos-hint">De 1 a 5 dígitos.</p>
            ${error('restriccion-digitos')}
          </fieldset>
          <div class="molecule-field">
            <label for="restriccion-posicion">Dígito evaluado${requerido}</label>
            <select class="atom-select" id="restriccion-posicion" required aria-describedby="restriccion-posicion-error">
              <option value="ultimo">Último dígito de la placa</option>
              <option value="primero">Primer dígito de la placa</option>
            </select>
            ${error('restriccion-posicion')}
          </div>
          <div class="molecule-field hidden" id="restriccion-estado-campo">
            <label for="restriccion-estado">Estado</label>
            <select class="atom-select" id="restriccion-estado" aria-describedby="restriccion-estado-error">
              <option value="activo">Activa</option>
              <option value="inactivo">Inactiva</option>
            </select>
            ${error('restriccion-estado')}
          </div>
          <div class="molecule-field">
            <label for="restriccion-inicio">Hora de inicio${requerido}</label>
            <input class="atom-input" id="restriccion-inicio" type="time" required aria-describedby="restriccion-inicio-error" />
            ${error('restriccion-inicio')}
          </div>
          <div class="molecule-field">
            <label for="restriccion-fin">Hora de fin${requerido}</label>
            <input class="atom-input" id="restriccion-fin" type="time" required aria-describedby="restriccion-fin-error" />
            ${error('restriccion-fin')}
          </div>
          <div class="molecule-field">
            <label for="restriccion-desde">Vigente desde</label>
            <input class="atom-input" id="restriccion-desde" type="date" aria-describedby="restriccion-desde-hint restriccion-desde-error" />
            <p class="molecule-field-hint" id="restriccion-desde-hint">Si se deja vacío: hoy.</p>
            ${error('restriccion-desde')}
          </div>
          <div class="molecule-field">
            <label for="restriccion-hasta">Vigente hasta</label>
            <input class="atom-input" id="restriccion-hasta" type="date" aria-describedby="restriccion-hasta-hint restriccion-hasta-error" />
            <p class="molecule-field-hint" id="restriccion-hasta-hint">Vacío: sin fecha de fin.</p>
            ${error('restriccion-hasta')}
          </div>
        </form>
      </div>
      <footer class="organism-modal-foot">
        <button class="atom-button atom-button--ghost" type="button" data-cerrar><span>Cancelar</span></button>
        <button class="atom-button" type="submit" form="form-restriccion" id="restriccion-guardar">${icono('i-check')}<span>Guardar</span></button>
      </footer>
    </dialog>
`,
  });
};
