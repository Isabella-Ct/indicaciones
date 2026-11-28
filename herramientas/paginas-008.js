// Página de la spec 008 (Configuración › Tarifas), con el mismo marco que las anteriores (se ejecuta junto con
// armar-paginas.js). La sección pública de tarifas está en index.html, que no usa el marco interno.
module.exports = ({ pagina, tablaVacia, icono }) => {
  const requerido = '<span class="molecule-field-required" aria-hidden="true"> *</span>';
  const error = (id) => `<p class="molecule-field-error" id="${id}-error" aria-live="polite"></p>`;
  const campo = (id, etiqueta, { tipo = 'number', obligatorio = true, extra = '', pista } = {}) => `<div class="molecule-field">
            <label for="${id}">${etiqueta}${obligatorio ? requerido : ''}</label>
            <input class="atom-input" id="${id}" type="${tipo}"${obligatorio ? ' required' : ''} ${extra} aria-describedby="${pista ? `${id}-hint ` : ''}${id}-error" />
            ${pista ? `<p class="molecule-field-hint" id="${id}-hint">${pista}</p>` : ''}
            ${error(id)}
          </div>`;
  const lista = (id, etiqueta, opciones) => `<div class="molecule-field">
            <label for="${id}">${etiqueta}${requerido}</label>
            <select class="atom-select" id="${id}" required aria-describedby="${id}-error">
              ${opciones.map(([v, t]) => `<option value="${v}">${t}</option>`).join('\n              ')}
            </select>
            ${error(id)}
          </div>`;

  pagina({
    archivo: 'tarifas.html',
    titulo: 'Tarifas',
    vista: 'tarifas.view.js',
    activo: 'tarifas',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Tarifas</h1>
            <p>// Configuración › primera hora, fracción, tope diario y gracia por tipo de vehículo y cliente</p>
          </div>
          <div class="molecule-page-head-actions">
            <button class="atom-button hidden" type="button" id="accion-nueva">${icono('i-calendar')}<span>Nueva tarifa</span></button>
          </div>
        </div>

        <section class="molecule-panel" aria-labelledby="panel-tarifas-titulo">
          <div class="molecule-panel-head"><h2 id="panel-tarifas-titulo">Tarifas registradas</h2></div>
          <div class="molecule-panel-body">
            <div class="molecule-filters">
              <div class="molecule-field">
                <label for="filtro-vehiculo">Vehículo</label>
                <select class="atom-select" id="filtro-vehiculo">
                  <option value="">Carros y motos</option>
                  <option value="carro">Carros</option>
                  <option value="moto">Motos</option>
                </select>
              </div>
              <div class="molecule-field">
                <label for="filtro-cliente">Cliente</label>
                <select class="atom-select" id="filtro-cliente">
                  <option value="">Todos</option>
                  <option value="ocasional">Ocasional</option>
                  <option value="registrado">Registrado</option>
                </select>
              </div>
              <div class="molecule-field">
                <label for="filtro-estado">Estado</label>
                <select class="atom-select" id="filtro-estado">
                  <option value="">Todos</option>
                  <option value="activo">Activas</option>
                  <option value="inactivo">Inactivas</option>
                </select>
              </div>
            </div>
${tablaVacia(
  'tabla-tarifas',
  'Tarifas registradas',
  [
    { texto: 'Tarifa' },
    { texto: 'Primera hora', derecha: true },
    { texto: 'Fracción', derecha: true },
    { texto: 'Tope diario', derecha: true },
    { texto: 'Gracia' },
    { texto: 'Vigencia' },
    { texto: 'Situación' },
    { texto: 'Acciones', derecha: true },
  ],
  'w980',
  ['Sin tarifas', 'Ninguna tarifa coincide con los filtros.']
)}
          </div>
        </section>

        <template id="tpl-tarifa">
          <tr>
            <td><strong class="js-nombre"></strong><span class="organism-data-table-cell-sub js-combinacion"></span></td>
            <td class="organism-log-table-right js-primera"></td>
            <td class="organism-log-table-right js-fraccion"></td>
            <td class="organism-log-table-right js-tope"></td>
            <td class="js-gracia"></td>
            <td class="organism-data-table-cell-nowrap js-vigencia"></td>
            <td><span class="atom-status-chip js-situacion"></span> <span class="atom-status-chip hidden js-usada">Usada</span></td>
            <td class="organism-log-table-right">
              <div class="organism-data-table-row-actions">
                <button class="atom-button atom-button--ghost atom-button--sm hidden js-editar" type="button"><span>Editar</span></button>
                <button class="atom-button atom-button--ghost atom-button--sm hidden js-estado" type="button"><span></span></button>
              </div>
            </td>
          </tr>
        </template>`,
    extra: `
    <dialog class="organism-modal" id="dialogo-tarifa" aria-labelledby="dialogo-tarifa-titulo">
      <header class="organism-modal-head">
        <div><h2 id="dialogo-tarifa-titulo">Nueva tarifa</h2><p>// Valores en pesos; fechas en hora de Bogotá</p></div>
        <button class="atom-icon-button" type="button" data-cerrar aria-label="Cerrar">${icono('i-x')}</button>
      </header>
      <div class="organism-modal-body">
        <form class="organism-form--grid" id="form-tarifa" novalidate>
          <div class="molecule-alert molecule-alert--error molecule-field--full hidden" id="tarifa-alerta" aria-live="assertive">
            ${icono('i-alert')}<p></p>
          </div>
          <div class="molecule-field--full hidden" id="tarifa-cerrar-campo">
            <button class="atom-button atom-button--sm" type="button" id="tarifa-cerrar-anterior"><span>Cerrar la anterior y crear</span></button>
          </div>
          <p class="molecule-field-hint molecule-field--full hidden" id="tarifa-usada-aviso">Esta tarifa ya se usó en liquidaciones: solo se puede cambiar el nombre y cerrar su vigencia. Para cambiar precios, cree una tarifa nueva.</p>
          ${campo('tarifa-nombre', 'Nombre', { tipo: 'text', extra: 'maxlength="60" autocomplete="off" placeholder="Carro ocasional"' })}
          ${lista('tarifa-vehiculo', 'Tipo de vehículo', [['carro', 'Carro'], ['moto', 'Moto']])}
          ${lista('tarifa-cliente', 'Tipo de cliente', [['ocasional', 'Ocasional (sin propietario)'], ['registrado', 'Registrado (con propietario)']])}
          ${campo('tarifa-primera', 'Valor de la primera hora ($)', { extra: 'min="1" step="any" inputmode="decimal"' })}
          ${campo('tarifa-minutos-fraccion', 'Minutos de la fracción', { extra: 'min="1" max="60" step="1" inputmode="numeric"', pista: 'De 1 a 60.' })}
          ${campo('tarifa-valor-fraccion', 'Valor de la fracción ($)', { extra: 'min="0" step="any" inputmode="decimal"' })}
          ${campo('tarifa-tope', 'Tope diario ($)', { obligatorio: false, extra: 'min="0" step="any" inputmode="decimal"', pista: 'Opcional; mayor o igual que la primera hora.' })}
          ${campo('tarifa-gracia', 'Minutos de gracia', { extra: 'min="0" max="30" step="1" inputmode="numeric"', pista: 'De 0 a 30.' })}
          ${campo('tarifa-desde', 'Vigente desde', { tipo: 'datetime-local' })}
          ${campo('tarifa-hasta', 'Vigente hasta', { tipo: 'datetime-local', obligatorio: false, pista: 'Vacío: sin fecha de fin.' })}
        </form>
      </div>
      <footer class="organism-modal-foot">
        <button class="atom-button atom-button--ghost" type="button" data-cerrar><span>Cancelar</span></button>
        <button class="atom-button" type="submit" form="form-tarifa" id="tarifa-guardar">${icono('i-check')}<span>Guardar</span></button>
      </footer>
    </dialog>
`,
  });
};
