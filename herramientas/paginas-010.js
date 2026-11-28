// Páginas de la spec 010 (Configuración › Planes, Membresías y Panel del cliente › Mi membresía), con el mismo
// marco que las anteriores (se ejecuta junto con armar-paginas.js). El pago usa partes-pago.js.
const { camposPago } = require('./partes-pago.js');

module.exports = ({ pagina, tablaVacia, icono }) => {
  const requerido = '<span class="molecule-field-required" aria-hidden="true"> *</span>';
  const error = (id) => `<p class="molecule-field-error" id="${id}-error" aria-live="polite"></p>`;
  const alerta = (id) => `<div class="molecule-alert molecule-alert--error molecule-field--full hidden" id="${id}" aria-live="assertive">
            ${icono('i-alert')}<p></p>
          </div>`;
  const campo = (id, etiqueta, { tipo = 'number', obligatorio = true, extra = '', pista } = {}) => `<div class="molecule-field">
            <label for="${id}">${etiqueta}${obligatorio ? requerido : ''}</label>
            <input class="atom-input" id="${id}" type="${tipo}"${obligatorio ? ' required' : ''} ${extra} aria-describedby="${pista ? `${id}-hint ` : ''}${id}-error" />
            ${pista ? `<p class="molecule-field-hint" id="${id}-hint">${pista}</p>` : ''}
            ${error(id)}
          </div>`;
  const lista = (id, etiqueta, opciones = []) => `<div class="molecule-field">
            <label for="${id}">${etiqueta}${requerido}</label>
            <select class="atom-select" id="${id}" required aria-describedby="${id}-error">
              ${opciones.map(([v, t]) => `<option value="${v}">${t}</option>`).join('\n              ')}
            </select>
            ${error(id)}
          </div>`;
  const dialogo = (id, titulo, subtitulo, cuerpo, pie, { chico = false } = {}) => `
    <dialog class="organism-modal${chico ? ' organism-modal--sm' : ''}" id="${id}" aria-labelledby="${id}-titulo">
      <header class="organism-modal-head">
        <div><h2 id="${id}-titulo">${titulo}</h2><p>${subtitulo}</p></div>
        <button class="atom-icon-button" type="button" data-cerrar aria-label="Cerrar">${icono('i-x')}</button>
      </header>
      <div class="organism-modal-body">
${cuerpo}
      </div>
      <footer class="organism-modal-foot">
        <button class="atom-button atom-button--ghost" type="button" data-cerrar><span>Cancelar</span></button>
${pie}
      </footer>
    </dialog>
`;
  const opcion = '<template id="tpl-opcion"><option></option></template>';

  // ------------------------------------------------------------------ planes.html (HU-45)
  pagina({
    archivo: 'planes.html',
    titulo: 'Planes de membresía',
    vista: 'planes.view.js',
    activo: 'planes',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Planes de membresía</h1>
            <p>// Configuración › valor, días de vigencia y beneficios por tipo de vehículo</p>
          </div>
          <div class="molecule-page-head-actions">
            <button class="atom-button hidden" type="button" id="accion-nuevo">${icono('i-calendar')}<span>Nuevo plan</span></button>
          </div>
        </div>

        <section class="molecule-panel" aria-labelledby="panel-planes-titulo">
          <div class="molecule-panel-head"><h2 id="panel-planes-titulo">Planes registrados</h2></div>
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
                <label for="filtro-estado">Estado</label>
                <select class="atom-select" id="filtro-estado">
                  <option value="">Todos</option>
                  <option value="activo">Activos</option>
                  <option value="inactivo">Inactivos</option>
                </select>
              </div>
            </div>
${tablaVacia(
  'tabla-planes',
  'Planes de membresía',
  [
    { texto: 'Plan' },
    { texto: 'Vehículo' },
    { texto: 'Valor', derecha: true },
    { texto: 'Vigencia' },
    { texto: 'Activas', derecha: true },
    { texto: 'Estado' },
    { texto: 'Acciones', derecha: true },
  ],
  'w900',
  ['Sin planes', 'Ningún plan coincide con los filtros.']
)}
          </div>
        </section>

        <template id="tpl-plan">
          <tr>
            <td><strong class="js-nombre"></strong><span class="organism-data-table-cell-sub js-beneficios"></span></td>
            <td class="js-vehiculo"></td>
            <td class="organism-log-table-right js-valor"></td>
            <td class="organism-data-table-cell-nowrap js-dias"></td>
            <td class="organism-log-table-right organism-data-table-cell-digit js-activas"></td>
            <td><span class="atom-status-chip js-estado"></span></td>
            <td class="organism-log-table-right">
              <div class="organism-data-table-row-actions">
                <button class="atom-button atom-button--ghost atom-button--sm hidden js-editar" type="button"><span>Editar</span></button>
                <button class="atom-button atom-button--ghost atom-button--sm hidden js-cambiar" type="button"><span></span></button>
              </div>
            </td>
          </tr>
        </template>`,
    extra: dialogo(
      'dialogo-plan',
      'Nuevo plan',
      '// El valor se cobra por cada periodo de vigencia',
      `        <form class="organism-form--grid" id="form-plan" novalidate>
          ${alerta('plan-alerta')}
          ${campo('plan-nombre', 'Nombre', { tipo: 'text', extra: 'maxlength="60" autocomplete="off" placeholder="Mensual carro"' })}
          ${lista('plan-vehiculo', 'Tipo de vehículo', [['carro', 'Carro'], ['moto', 'Moto']])}
          ${campo('plan-valor', 'Valor del periodo ($)', { extra: 'min="1" step="any" inputmode="decimal"' })}
          ${campo('plan-dias', 'Días de vigencia', { extra: 'min="1" max="366" step="1" inputmode="numeric"', pista: 'De 1 a 366; el primer día cuenta.' })}
          <div class="molecule-field molecule-field--full">
            <label for="plan-beneficios">Beneficios</label>
            <textarea class="atom-textarea" id="plan-beneficios" rows="3" maxlength="300" aria-describedby="plan-beneficios-hint plan-beneficios-error"></textarea>
            <p class="molecule-field-hint" id="plan-beneficios-hint">Opcional; hasta 300 caracteres.</p>
            ${error('plan-beneficios')}
          </div>
        </form>`,
      `        <button class="atom-button" type="submit" form="form-plan" id="plan-guardar">${icono('i-check')}<span>Guardar</span></button>`
    ),
  });

  // ------------------------------------------------------------------ membresias.html (HU-46, HU-47)
  pagina({
    archivo: 'membresias.html',
    titulo: 'Membresías',
    vista: 'membresias.view.js',
    activo: 'membresias',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Membresías</h1>
            <p>// Suscripciones con pago, renovaciones y cancelaciones</p>
          </div>
          <div class="molecule-page-head-actions">
            <button class="atom-button hidden" type="button" id="accion-suscribir">${icono('i-calendar')}<span>Nueva suscripción</span></button>
          </div>
        </div>

        <section class="molecule-panel" aria-labelledby="panel-membresias-titulo">
          <div class="molecule-panel-head"><h2 id="panel-membresias-titulo">Membresías registradas</h2></div>
          <div class="molecule-panel-body">
            <div class="molecule-filters">
              <div class="molecule-search-box" role="search">
                <label class="molecule-search-box-label" for="filtro-texto">Buscar</label>
                <input class="atom-input" id="filtro-texto" type="search" placeholder="Placa, cliente o documento" autocomplete="off" maxlength="60" />
              </div>
              <div class="molecule-field">
                <label for="filtro-estado">Estado</label>
                <select class="atom-select" id="filtro-estado">
                  <option value="">Todos</option>
                  <option value="activa">Activas</option>
                  <option value="vencida">Vencidas</option>
                  <option value="cancelada">Canceladas</option>
                </select>
              </div>
            </div>
${tablaVacia(
  'tabla-membresias',
  'Membresías registradas',
  [
    { texto: 'Placa' },
    { texto: 'Cliente' },
    { texto: 'Plan' },
    { texto: 'Vigencia' },
    { texto: 'Días', derecha: true },
    { texto: 'Estado' },
    { texto: 'Acciones', derecha: true },
  ],
  'w980',
  ['Sin membresías', 'Ninguna membresía coincide con la búsqueda.']
)}
          </div>
        </section>

        <template id="tpl-membresia">
          <tr>
            <td><span class="atom-plate js-placa"></span></td>
            <td><span class="js-cliente"></span><span class="organism-data-table-cell-sub js-documento"></span></td>
            <td><span class="js-plan"></span><span class="organism-data-table-cell-sub js-valor"></span></td>
            <td class="organism-data-table-cell-nowrap js-vigencia"></td>
            <td class="organism-log-table-right organism-data-table-cell-digit js-dias"></td>
            <td><span class="atom-status-chip js-estado"></span> <span class="atom-status-chip atom-status-chip--reserved hidden js-aviso">Por vencer</span></td>
            <td class="organism-log-table-right">
              <div class="organism-data-table-row-actions">
                <button class="atom-button atom-button--ghost atom-button--sm hidden js-renovar" type="button"><span>Renovar</span></button>
                <button class="atom-button atom-button--ghost atom-button--sm hidden js-cancelar" type="button"><span>Cancelar</span></button>
              </div>
            </td>
          </tr>
        </template>
        ${opcion}`,
    extra:
      dialogo(
        'dialogo-suscripcion',
        'Nueva suscripción',
        '// La membresía queda activa solo con el pago',
        `        <form class="organism-form--grid" id="form-suscripcion" novalidate>
          ${alerta('suscripcion-alerta')}
          <div class="molecule-field">
            <label for="suscripcion-placa">Placa${requerido}</label>
            <input class="atom-input atom-input--plate" id="suscripcion-placa" type="text" maxlength="8" autocomplete="off" required aria-describedby="suscripcion-placa-error" />
            ${error('suscripcion-placa')}
          </div>
          <div class="molecule-field">
            <span class="molecule-field-label" aria-hidden="true">&nbsp;</span>
            <button class="atom-button atom-button--ghost" type="button" id="suscripcion-buscar"><span>Buscar vehículo</span></button>
          </div>
          <dl class="molecule-data-list molecule-field--full hidden" id="suscripcion-vehiculo" aria-live="polite">
            <div><dt>Propietario</dt><dd class="js-propietario"></dd></div>
            <div><dt>Tipo</dt><dd class="js-tipo"></dd></div>
          </dl>
          ${lista('suscripcion-plan', 'Plan')}
          <div class="molecule-field">
            <span class="molecule-field-label">Valor a pagar</span>
            <strong class="molecule-charge-value" id="suscripcion-valor">—</strong>
          </div>
          ${camposPago('suscripcion')}
        </form>`,
        `        <button class="atom-button" type="submit" form="form-suscripcion" id="suscripcion-guardar">${icono('i-check')}<span>Cobrar y activar</span></button>`
      ) +
      dialogo(
        'dialogo-renovacion',
        'Renovar membresía',
        '// Activa: desde el día siguiente al fin · Vencida: desde hoy',
        `        <form class="organism-form--grid" id="form-renovacion" novalidate>
          ${alerta('renovacion-alerta')}
          <dl class="molecule-data-list molecule-field--full">
            <div><dt>Placa</dt><dd><span class="atom-plate" id="renovacion-placa"></span></dd></div>
            <div><dt>Plan</dt><dd id="renovacion-plan"></dd></div>
            <div><dt>Vigencia actual</dt><dd id="renovacion-vigencia"></dd></div>
            <div><dt>Valor a pagar</dt><dd id="renovacion-valor"></dd></div>
          </dl>
          ${camposPago('renovacion')}
        </form>`,
        `        <button class="atom-button" type="submit" form="form-renovacion" id="renovacion-guardar">${icono('i-check')}<span>Cobrar y renovar</span></button>`
      ) +
      dialogo(
        'dialogo-cancelacion',
        'Cancelar membresía',
        '// Desde ahora las salidas se cobran con la tarifa normal',
        `        <form class="organism-form--stack" id="form-cancelacion" novalidate>
          ${alerta('cancelacion-alerta')}
          <p id="cancelacion-resumen"></p>
          <div class="molecule-field">
            <label for="cancelacion-motivo">Motivo${requerido}</label>
            <textarea class="atom-textarea" id="cancelacion-motivo" rows="3" maxlength="200" required aria-describedby="cancelacion-motivo-hint cancelacion-motivo-error"></textarea>
            <p class="molecule-field-hint" id="cancelacion-motivo-hint">Entre 10 y 200 caracteres.</p>
            ${error('cancelacion-motivo')}
          </div>
        </form>`,
        `        <button class="atom-button" type="submit" form="form-cancelacion" id="cancelacion-guardar">${icono('i-x')}<span>Cancelar membresía</span></button>`,
        { chico: true }
      ),
  });

  // ------------------------------------------------------------------ mi-membresia.html (HU-48, HU-46 Cliente)
  pagina({
    archivo: 'mi-membresia.html',
    titulo: 'Mi membresía',
    vista: 'mi-membresia.view.js',
    activo: 'mi-membresia',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Mi membresía</h1>
            <p>// Panel del cliente › vigencia, días restantes e historial de pagos</p>
          </div>
        </div>

        <div class="template-app-layout-stack" id="mis-membresias" aria-live="polite"></div>
        <div class="molecule-empty-state hidden" id="sin-membresias">
          <strong>Sin membresía</strong>
          <p>Todavía no tiene membresías. Elija un plan para no pagar cada vez que use el parqueadero.</p>
        </div>

        <section class="molecule-panel hidden" id="panel-planes" aria-labelledby="panel-planes-titulo">
          <div class="molecule-panel-head"><h2 id="panel-planes-titulo">Planes disponibles</h2></div>
          <div class="molecule-panel-body">
            <div class="organism-pricing-table" id="planes-lista"></div>
          </div>
        </section>

        <section class="molecule-panel hidden" id="panel-suscribir" aria-labelledby="panel-suscribir-titulo">
          <div class="molecule-panel-head"><h2 id="panel-suscribir-titulo">Suscribir un vehículo</h2></div>
          <div class="molecule-panel-body">
            <form class="organism-form--grid" id="form-mi-suscripcion" novalidate>
              ${alerta('mi-suscripcion-alerta')}
              ${lista('mi-suscripcion-vehiculo', 'Vehículo')}
              ${lista('mi-suscripcion-plan', 'Plan')}
              <div class="molecule-field">
                <span class="molecule-field-label">Valor a pagar</span>
                <strong class="molecule-charge-value" id="mi-suscripcion-valor">—</strong>
              </div>
              ${camposPago('mi-pago', { soloElectronico: true })}
              <div class="molecule-field--full">
                <button class="atom-button" type="submit" id="mi-suscripcion-guardar">${icono('i-check')}<span>Pagar y activar</span></button>
              </div>
            </form>
          </div>
        </section>

        <template id="tpl-mi-membresia">
          <section class="molecule-panel">
            <div class="molecule-panel-head"><h2><span class="js-plan"></span> <span class="atom-status-chip js-estado"></span></h2></div>
            <div class="molecule-panel-body">
              <div class="molecule-alert molecule-alert--info hidden js-aviso" aria-live="polite">${icono('i-bell')}<p></p></div>
              <div class="organism-kpis">
                <div class="molecule-kpi">
                  <p class="atom-label-caps">Días restantes</p>
                  <p class="molecule-kpi-value"></p>
                  <div class="atom-meter"><span></span></div>
                  <p class="molecule-kpi-note"></p>
                </div>
              </div>
              <dl class="molecule-data-list">
                <div><dt>Vehículo</dt><dd><span class="atom-plate js-placa"></span></dd></div>
                <div><dt>Inicio</dt><dd class="js-inicio"></dd></div>
                <div><dt>Fin</dt><dd class="js-fin"></dd></div>
                <div><dt>Valor del plan</dt><dd class="js-valor"></dd></div>
              </dl>
              <div class="organism-data-table-scroll" tabindex="0" role="region" aria-label="Historial de pagos de la membresía">
                <table class="organism-log-table organism-data-table-table--w480">
                  <caption class="visually-hidden">Historial de pagos</caption>
                  <thead>
                    <tr><th scope="col">Factura</th><th scope="col">Fecha</th><th scope="col" class="organism-log-table-right">Total</th><th scope="col">Estado</th></tr>
                  </thead>
                  <tbody></tbody>
                </table>
              </div>
            </div>
          </section>
        </template>
        <template id="tpl-mi-factura">
          <tr>
            <td class="organism-data-table-cell-digit js-numero"></td>
            <td class="js-fecha"></td>
            <td class="organism-log-table-right js-total"></td>
            <td><span class="atom-status-chip js-estado"></span></td>
          </tr>
        </template>
        <template id="tpl-plan-tarjeta">
          <article class="organism-pricing-table-card">
            <h3 class="organism-pricing-table-title">${icono('i-car')}<span class="js-nombre"></span></h3>
            <p class="organism-pricing-table-main"><strong class="js-valor"></strong> <span class="js-dias"></span></p>
            <p class="js-beneficios"></p>
          </article>
        </template>
        ${opcion}`,
  });
};
