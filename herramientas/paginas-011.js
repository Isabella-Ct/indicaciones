// Página de la spec 011 (Configuración › Descuentos), con el mismo marco que las anteriores (se ejecuta junto con
// armar-paginas.js). La fila del descuento en el cobro y en el comprobante está en paginas-007.js y paginas-009.js.
module.exports = ({ pagina, tablaVacia, icono }) => {
  const requerido = '<span class="molecule-field-required" aria-hidden="true"> *</span>';
  const error = (id) => `<p class="molecule-field-error" id="${id}-error" aria-live="polite"></p>`;
  const campo = (id, etiqueta, { tipo = 'number', obligatorio = true, extra = '', pista } = {}) => `<div class="molecule-field">
            <label for="${id}"><span id="${id}-etiqueta">${etiqueta}</span>${obligatorio ? requerido : ''}</label>
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
    archivo: 'descuentos.html',
    titulo: 'Descuentos',
    vista: 'descuentos.view.js',
    activo: 'descuentos',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Descuentos</h1>
            <p>// Configuración › promociones por porcentaje o valor fijo; se aplica el de mayor valor</p>
          </div>
          <div class="molecule-page-head-actions">
            <button class="atom-button hidden" type="button" id="accion-nuevo">${icono('i-calendar')}<span>Nuevo descuento</span></button>
          </div>
        </div>

        <section class="molecule-panel" aria-labelledby="panel-descuentos-titulo">
          <div class="molecule-panel-head"><h2 id="panel-descuentos-titulo">Descuentos registrados</h2></div>
          <div class="molecule-panel-body">
            <div class="molecule-filters">
              <div class="molecule-search-box" role="search">
                <label class="molecule-search-box-label" for="filtro-texto">Buscar</label>
                <input class="atom-input" id="filtro-texto" type="search" placeholder="Nombre del descuento" autocomplete="off" maxlength="60" />
              </div>
              <div class="molecule-field">
                <label for="filtro-vehiculo">Vehículo</label>
                <select class="atom-select" id="filtro-vehiculo">
                  <option value="">Carros y motos</option>
                  <option value="carro">Carros</option>
                  <option value="moto">Motos</option>
                </select>
              </div>
              <div class="molecule-field">
                <label for="filtro-estado">Estado</label>
                <select class="atom-select" id="filtro-estado">
                  <option value="">Todos</option>
                  <option value="activo">Activos</option>
                  <option value="inactivo">Inactivos</option>
                </select>
              </div>
            </div>
${tablaVacia(
  'tabla-descuentos',
  'Descuentos registrados',
  [
    { texto: 'Descuento' },
    { texto: 'Valor', derecha: true },
    { texto: 'Aplica a' },
    { texto: 'Mínimo' },
    { texto: 'Vigencia' },
    { texto: 'Situación' },
    { texto: 'Acciones', derecha: true },
  ],
  'w980',
  ['Sin descuentos', 'Ningún descuento coincide con los filtros.']
)}
          </div>
        </section>

        <template id="tpl-descuento">
          <tr>
            <td><strong class="js-nombre"></strong></td>
            <td class="organism-log-table-right js-valor"></td>
            <td class="js-aplica"></td>
            <td class="js-minimo"></td>
            <td class="organism-data-table-cell-nowrap js-vigencia"></td>
            <td><span class="atom-status-chip js-situacion"></span> <span class="atom-status-chip hidden js-usado">Usado</span></td>
            <td class="organism-log-table-right">
              <div class="organism-data-table-row-actions">
                <button class="atom-button atom-button--ghost atom-button--sm hidden js-editar" type="button"><span>Editar</span></button>
                <button class="atom-button atom-button--ghost atom-button--sm hidden js-cambiar" type="button"><span></span></button>
              </div>
            </td>
          </tr>
        </template>`,
    extra: `
    <dialog class="organism-modal" id="dialogo-descuento" aria-labelledby="dialogo-descuento-titulo">
      <header class="organism-modal-head">
        <div><h2 id="dialogo-descuento-titulo">Nuevo descuento</h2><p>// Fechas en hora de Bogotá; el último día cuenta completo</p></div>
        <button class="atom-icon-button" type="button" data-cerrar aria-label="Cerrar">${icono('i-x')}</button>
      </header>
      <div class="organism-modal-body">
        <form class="organism-form--grid" id="form-descuento" novalidate>
          <div class="molecule-alert molecule-alert--error molecule-field--full hidden" id="descuento-alerta" aria-live="assertive">
            ${icono('i-alert')}<p></p>
          </div>
          ${campo('descuento-nombre', 'Nombre', { tipo: 'text', extra: 'maxlength="60" autocomplete="off" placeholder="Motos fin de semana"' })}
          ${lista('descuento-tipo', 'Tipo', [['porcentaje', 'Porcentaje'], ['valor_fijo', 'Valor fijo']])}
          ${campo('descuento-valor', 'Porcentaje (%)', { extra: 'min="1" step="any" inputmode="decimal"', pista: 'De 1 a 100.' })}
          ${lista('descuento-cliente', 'Tipo de cliente', [['todos', 'Todos'], ['ocasional', 'Ocasional (sin propietario)'], ['registrado', 'Registrado (con propietario)']])}
          ${lista('descuento-vehiculo', 'Tipo de vehículo', [['todos', 'Carros y motos'], ['carro', 'Carros'], ['moto', 'Motos']])}
          ${campo('descuento-minimo', 'Minutos mínimos de estadía', { obligatorio: false, extra: 'min="1" max="10080" step="1" inputmode="numeric"', pista: 'Opcional; de 1 a 10.080.' })}
          ${campo('descuento-desde', 'Vigente desde', { tipo: 'date', pista: 'Desde las 00:00.' })}
          ${campo('descuento-hasta', 'Vigente hasta', { tipo: 'date', pista: 'Hasta las 23:59 de ese día.' })}
        </form>
      </div>
      <footer class="organism-modal-foot">
        <button class="atom-button atom-button--ghost" type="button" data-cerrar><span>Cancelar</span></button>
        <button class="atom-button" type="submit" form="form-descuento" id="descuento-guardar">${icono('i-check')}<span>Guardar</span></button>
      </footer>
    </dialog>
`,
  });
};
