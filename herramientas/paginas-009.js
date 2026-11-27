// Páginas de la spec 009 (Facturación, Comprobante, Caja y Mis facturas), con el mismo marco que las anteriores
// (se ejecuta junto con armar-paginas.js). El panel de cobro de la caseta está en paginas-007.js (partesCobro).
module.exports = ({ pagina, tablaVacia, icono }) => {
  const requerido = '<span class="molecule-field-required" aria-hidden="true"> *</span>';
  const error = (id) => `<p class="molecule-field-error" id="${id}-error" aria-live="polite"></p>`;
  const alerta = (id) => `<div class="molecule-alert molecule-alert--error molecule-field--full hidden" id="${id}" aria-live="assertive">
            ${icono('i-alert')}<p></p>
          </div>`;
  const metodos = `<option value="">Todos</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="qr">QR</option>`;
  const dialogo = ({ id, titulo, subtitulo, formulario, guardar, textoGuardar = 'Guardar', cuerpo, oscuro = false }) => `
    <dialog class="organism-modal organism-modal--sm" id="${id}" aria-labelledby="${id}-titulo">
      <header class="organism-modal-head">
        <div><h2 id="${id}-titulo">${titulo}</h2><p>${subtitulo}</p></div>
        <button class="atom-icon-button" type="button" data-cerrar aria-label="Cerrar">${icono('i-x')}</button>
      </header>
      <div class="organism-modal-body">
        <form class="organism-form--stack" id="${formulario}" novalidate>
          ${cuerpo}
        </form>
      </div>
      <footer class="organism-modal-foot">
        <button class="atom-button atom-button--ghost" type="button" data-cerrar><span>Cancelar</span></button>
        <button class="atom-button${oscuro ? ' atom-button--dark' : ''}" type="submit" form="${formulario}" id="${guardar}"><span>${textoGuardar}</span></button>
      </footer>
    </dialog>`;

  // ---------------------------------------------------------------- facturas.html (HU-42, HU-43)
  pagina({
    archivo: 'facturas.html',
    titulo: 'Facturación',
    vista: 'facturas.view.js',
    activo: 'facturas',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Facturación</h1>
            <p>// Facturas emitidas y anuladas · el total suma solo las emitidas</p>
          </div>
        </div>

        <section class="molecule-panel" aria-labelledby="panel-facturas-titulo">
          <div class="molecule-panel-head">
            <h2 id="panel-facturas-titulo">Facturas</h2>
            <p class="molecule-kpi-note" aria-live="polite">Total del filtro: <strong id="facturas-suma">—</strong></p>
          </div>
          <div class="molecule-panel-body">
            <div class="molecule-filters">
              <div class="molecule-search-box" role="search">
                <label class="molecule-search-box-label" for="filtro-texto">Buscar</label>
                <input class="atom-input" id="filtro-texto" type="search" placeholder="Número, placa, cliente o documento" autocomplete="off" maxlength="60" />
              </div>
              <div class="molecule-field">
                <label for="filtro-desde">Desde</label>
                <input class="atom-input" id="filtro-desde" type="date" />
              </div>
              <div class="molecule-field">
                <label for="filtro-hasta">Hasta</label>
                <input class="atom-input" id="filtro-hasta" type="date" />
              </div>
              <div class="molecule-field">
                <label for="filtro-metodo">Método</label>
                <select class="atom-select" id="filtro-metodo">
                  ${metodos}
                </select>
              </div>
              <div class="molecule-field">
                <label for="filtro-estado">Estado</label>
                <select class="atom-select" id="filtro-estado">
                  <option value="">Todas</option>
                  <option value="emitida">Emitidas</option>
                  <option value="anulada">Anuladas</option>
                </select>
              </div>
            </div>
${tablaVacia(
  'tabla-facturas',
  'Facturas',
  [
    { texto: 'Número' },
    { texto: 'Fecha' },
    { texto: 'Placa' },
    { texto: 'Cliente' },
    { texto: 'Método' },
    { texto: 'Total', derecha: true },
    { texto: 'Estado' },
    { texto: 'Acciones', derecha: true },
  ],
  'w980',
  ['Sin facturas', 'Ninguna factura coincide con los filtros.']
)}
          </div>
        </section>

        <template id="tpl-factura">
          <tr>
            <td><strong class="js-numero"></strong></td>
            <td class="organism-data-table-cell-nowrap js-fecha"></td>
            <td><span class="atom-plate js-placa"></span></td>
            <td class="js-cliente"></td>
            <td class="js-metodo"></td>
            <td class="organism-log-table-right js-total"></td>
            <td><span class="atom-status-chip js-estado"></span></td>
            <td class="organism-log-table-right">
              <div class="organism-data-table-row-actions">
                <a class="atom-button atom-button--ghost atom-button--sm js-ver" href="#"><span>Ver</span></a>
              </div>
            </td>
          </tr>
        </template>`,
  });

  // ---------------------------------------------------------------- factura.html (HU-41, HU-42)
  pagina({
    archivo: 'factura.html',
    titulo: 'Comprobante',
    vista: 'factura.view.js',
    activo: 'facturas',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Comprobante</h1>
            <p>// Facturación › Comprobante · formato de impresión de 80 mm</p>
          </div>
          <div class="molecule-page-head-actions">
            <a class="atom-button atom-button--ghost" href="/facturas.html" id="factura-volver"><span>← Volver</span></a>
            <button class="atom-button atom-button--ghost hidden" type="button" id="factura-tercero">${icono('i-user')}<span>A nombre de un tercero</span></button>
            <button class="atom-button atom-button--ghost hidden" type="button" id="factura-enviar">${icono('i-send')}<span>Enviar por correo</span></button>
            <button class="atom-button atom-button--ghost hidden" type="button" id="factura-pdf">${icono('i-print')}<span>Descargar PDF</span></button>
            <button class="atom-button hidden" type="button" id="factura-imprimir">${icono('i-print')}<span>Imprimir</span></button>
            <button class="atom-button atom-button--dark hidden" type="button" id="factura-anular"><span>Anular</span></button>
          </div>
        </div>

        <div class="molecule-empty-state hidden" id="factura-no-encontrada">
          <strong>Factura no encontrada</strong>
          <p>La factura no existe o no tiene permiso para verla.</p>
        </div>

        <div class="template-ticket-sheet hidden" id="factura-hoja">
          <aside class="organism-ticket" id="factura" aria-labelledby="factura-titulo">
            <div class="organism-ticket-head"><span id="factura-titulo">FACTURA</span></div>
            <dl>
              <div class="organism-ticket-number"><dt>N.º</dt><dd class="js-numero"></dd></div>
              <div><dt>Estado</dt><dd><span class="atom-status-chip js-estado"></span></dd></div>
              <div><dt>Parqueadero</dt><dd class="js-parqueadero"></dd></div>
              <div><dt>Fecha</dt><dd class="js-fecha"></dd></div>
              <div><dt>Cliente</dt><dd class="js-cliente"></dd></div>
              <div><dt>Placa</dt><dd><span class="atom-plate js-placa"></span></dd></div>
              <div><dt>Entrada</dt><dd class="js-entrada"></dd></div>
              <div><dt>Salida</dt><dd class="js-salida"></dd></div>
              <div><dt>Tiempo</dt><dd class="js-tiempo"></dd></div>
              <div><dt>Tarifa</dt><dd class="js-tarifa"></dd></div>
              <div><dt>Cálculo</dt><dd class="js-calculo"></dd></div>
              <div><dt>Descuento</dt><dd class="js-descuento"></dd></div>
              <div class="organism-ticket-number"><dt>Total</dt><dd class="js-total"></dd></div>
              <div><dt>Método</dt><dd class="js-metodo"></dd></div>
              <div><dt>Pago</dt><dd class="js-pago-detalle"></dd></div>
            </dl>
            <div class="organism-ticket-barcode" aria-hidden="true"></div>
            <p class="organism-ticket-note js-nota"></p>
          </aside>
        </div>`,
    extra: `${dialogo({
      id: 'dialogo-tercero',
      titulo: 'Factura a nombre de un tercero',
      subtitulo: '// NIT o documento y razón social',
      formulario: 'form-tercero',
      guardar: 'tercero-guardar',
      textoGuardar: 'Emitir a este nombre',
      cuerpo: `${alerta('tercero-alerta')}
          <div class="molecule-field">
            <label for="tercero-documento">NIT o documento${requerido}</label>
            <input class="atom-input" id="tercero-documento" type="text" maxlength="20" required autocomplete="off" aria-describedby="tercero-documento-error" />
            ${error('tercero-documento')}
          </div>
          <div class="molecule-field">
            <label for="tercero-nombre">Razón social o nombre${requerido}</label>
            <input class="atom-input" id="tercero-nombre" type="text" maxlength="100" required autocomplete="off" aria-describedby="tercero-nombre-error" />
            ${error('tercero-nombre')}
          </div>`,
    })}
${dialogo({
  id: 'dialogo-anular',
  titulo: 'Anular factura',
  subtitulo: '// Se conserva con su número; deja de sumar en los totales',
  formulario: 'form-anular',
  guardar: 'anular-guardar',
  textoGuardar: 'Anular factura',
  oscuro: true,
  cuerpo: `${alerta('anular-alerta')}
          <div class="molecule-field">
            <label for="anular-motivo">Motivo${requerido}</label>
            <textarea class="atom-textarea" id="anular-motivo" rows="3" maxlength="200" required aria-describedby="anular-motivo-error"></textarea>
            ${error('anular-motivo')}
          </div>`,
})}`,
  });

  // ---------------------------------------------------------------- caja.html (HU-44)
  const kpi = (id, etiqueta, principal = false) =>
    `<article class="molecule-kpi${principal ? ' molecule-kpi--main' : ''}" id="${id}"><p class="atom-label-caps">${etiqueta}</p><p class="molecule-kpi-value">—</p><p class="molecule-kpi-note"></p></article>`;
  pagina({
    archivo: 'caja.html',
    titulo: 'Caja',
    vista: 'caja.view.js',
    activo: 'caja',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Cierre de caja</h1>
            <p id="caja-subtitulo">// Facturación › Cierre de caja · turno abierto</p>
          </div>
        </div>

        <section class="organism-kpis" aria-label="Cuadre del turno">
          ${kpi('kpi-esperado', 'Efectivo esperado', true)}
          ${kpi('kpi-total', 'Total del turno')}
          ${kpi('kpi-servicios', 'Servicios')}
          ${kpi('kpi-otros', 'Tarjeta · transferencia · QR')}
          ${kpi('kpi-anuladas', 'Facturas anuladas')}
        </section>

        <div class="template-app-layout-workspace">
          <section class="molecule-panel" aria-labelledby="turno-titulo">
            <div class="molecule-panel-head"><h2 id="turno-titulo">Facturas del turno</h2></div>
            <div class="molecule-panel-body">
${tablaVacia(
  'tabla-turno',
  'Facturas del turno',
  [{ texto: 'Número' }, { texto: 'Placa' }, { texto: 'Método' }, { texto: 'Total', derecha: true }, { texto: 'Estado' }],
  'w600',
  ['Turno sin pagos', 'Todavía no hay pagos en este turno.']
)}
            </div>
          </section>

          <section class="molecule-panel" aria-labelledby="cierre-titulo">
            <div class="molecule-panel-head"><h2 id="cierre-titulo">Cerrar el turno</h2></div>
            <div class="molecule-panel-body">
              <form class="organism-form--stack" id="form-cierre" novalidate>
                ${alerta('cierre-alerta')}
                <div class="molecule-field">
                  <label for="cierre-contado">Efectivo contado ($)${requerido}</label>
                  <input class="atom-input" id="cierre-contado" type="number" min="0" step="any" inputmode="decimal" required aria-describedby="cierre-diferencia cierre-contado-error" />
                  <p class="molecule-field-hint" id="cierre-diferencia" aria-live="polite"></p>
                  ${error('cierre-contado')}
                </div>
                <div class="molecule-field">
                  <label for="cierre-observaciones">Observaciones</label>
                  <textarea class="atom-textarea" id="cierre-observaciones" rows="2" maxlength="200" aria-describedby="cierre-observaciones-error"></textarea>
                  ${error('cierre-observaciones')}
                </div>
                <button class="atom-button" type="submit" id="cierre-guardar">${icono('i-check')}<span>Cerrar caja</span></button>
              </form>
            </div>
          </section>
        </div>

        <section class="molecule-panel" aria-labelledby="cierres-titulo">
          <div class="molecule-panel-head"><h2 id="cierres-titulo">Cierres registrados</h2></div>
          <div class="molecule-panel-body">
${tablaVacia(
  'tabla-cierres',
  'Cierres registrados',
  [
    { texto: 'Fin del turno' },
    { texto: 'Operador' },
    { texto: 'Esperado', derecha: true },
    { texto: 'Contado', derecha: true },
    { texto: 'Diferencia', derecha: true },
    { texto: 'Facturas' },
  ],
  'w760',
  ['Sin cierres', 'Aún no hay cierres de caja.']
)}
          </div>
        </section>

        <template id="tpl-turno">
          <tr>
            <td><a class="atom-link js-numero" href="#"></a></td>
            <td><span class="atom-plate js-placa"></span></td>
            <td class="js-metodo"></td>
            <td class="organism-log-table-right js-total"></td>
            <td><span class="atom-status-chip js-estado"></span></td>
          </tr>
        </template>
        <template id="tpl-cierre">
          <tr>
            <td class="organism-data-table-cell-nowrap js-fin"></td>
            <td class="js-operador"></td>
            <td class="organism-log-table-right js-esperado"></td>
            <td class="organism-log-table-right js-contado"></td>
            <td class="organism-log-table-right"><strong class="js-diferencia"></strong></td>
            <td class="js-facturas"></td>
          </tr>
        </template>`,
  });

  // ---------------------------------------------------------------- mis-facturas.html (HU-43 E2)
  pagina({
    archivo: 'mis-facturas.html',
    titulo: 'Mis facturas',
    vista: 'mis-facturas.view.js',
    activo: 'mis-facturas',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Mis facturas</h1>
            <p>// Comprobantes de sus vehículos, para descargar en PDF</p>
          </div>
        </div>

        <section class="molecule-panel" aria-labelledby="panel-mis-facturas-titulo">
          <div class="molecule-panel-head"><h2 id="panel-mis-facturas-titulo">Facturas</h2></div>
          <div class="molecule-panel-body">
${tablaVacia(
  'tabla-mis-facturas',
  'Mis facturas',
  [{ texto: 'Número' }, { texto: 'Fecha' }, { texto: 'Placa' }, { texto: 'Total', derecha: true }, { texto: 'Estado' }, { texto: 'PDF', derecha: true }],
  'w600',
  ['Sin facturas', 'Aún no tiene facturas.']
)}
          </div>
        </section>

        <template id="tpl-mi-factura">
          <tr>
            <td><strong class="js-numero"></strong></td>
            <td class="organism-data-table-cell-nowrap js-fecha"></td>
            <td><span class="atom-plate js-placa"></span></td>
            <td class="organism-log-table-right js-total"></td>
            <td><span class="atom-status-chip js-estado"></span></td>
            <td class="organism-log-table-right">
              <button class="atom-button atom-button--ghost atom-button--sm js-pdf" type="button"><span>Descargar</span></button>
            </td>
          </tr>
        </template>`,
  });
};
