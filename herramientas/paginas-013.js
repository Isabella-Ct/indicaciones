// Páginas de la spec 013 (Incidencias: listado con «Nueva incidencia» y el detalle con seguimiento y cierre), con
// el mismo marco que las anteriores (se ejecuta junto con armar-paginas.js).
module.exports = ({ pagina, tablaVacia, icono }) => {
  const requerido = '<span class="molecule-field-required" aria-hidden="true"> *</span>';
  const error = (id) => `<p class="molecule-field-error" id="${id}-error" aria-live="polite"></p>`;
  const alerta = (id) => `<div class="molecule-alert molecule-alert--error molecule-field--full hidden" id="${id}" aria-live="assertive">
            ${icono('i-alert')}<p></p>
          </div>`;
  const tipos = [
    ['rayon', 'Rayón'],
    ['choque', 'Choque'],
    ['atropellamiento', 'Atropellamiento'],
    ['golpe_muro', 'Golpe contra muro'],
  ];
  const opciones = (lista) => lista.map(([v, t]) => `<option value="${v}">${t}</option>`).join('\n                  ');
  const area = (id, etiqueta, max, min) => `<div class="molecule-field molecule-field--full">
            <label for="${id}">${etiqueta}${requerido}</label>
            <textarea class="atom-textarea" id="${id}" rows="4" maxlength="${max}" required aria-describedby="${id}-hint ${id}-error"></textarea>
            <p class="molecule-field-hint" id="${id}-hint" aria-live="polite">Entre ${min} y ${max} caracteres.</p>
            ${error(id)}
          </div>`;

  // ------------------------------------------------------------------ incidencias.html (HU-56, HU-57)
  pagina({
    archivo: 'incidencias.html',
    titulo: 'Incidencias',
    vista: 'incidencias.view.js',
    activo: 'incidencias',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Incidencias</h1>
            <p>// Rayones, choques, atropellamientos y golpes contra muro dentro del parqueadero</p>
          </div>
          <div class="molecule-page-head-actions">
            <button class="atom-button hidden" type="button" id="accion-nueva">${icono('i-alert')}<span>Nueva incidencia</span></button>
          </div>
        </div>

        <section class="molecule-panel" aria-labelledby="panel-incidencias-titulo">
          <div class="molecule-panel-head"><h2 id="panel-incidencias-titulo">Incidencias registradas</h2></div>
          <div class="molecule-panel-body">
            <div class="molecule-filters">
              <div class="molecule-search-box" role="search">
                <label class="molecule-search-box-label" for="filtro-texto">Buscar</label>
                <input class="atom-input" id="filtro-texto" type="search" placeholder="Código o placa" autocomplete="off" maxlength="60" />
              </div>
              <div class="molecule-field">
                <label for="filtro-tipo">Tipo</label>
                <select class="atom-select" id="filtro-tipo">
                  <option value="">Todos</option>
                  ${opciones(tipos)}
                </select>
              </div>
              <div class="molecule-field">
                <label for="filtro-estado">Estado</label>
                <select class="atom-select" id="filtro-estado">
                  <option value="">Todos</option>
                  <option value="abierta">Abiertas</option>
                  <option value="en_seguimiento">En seguimiento</option>
                  <option value="cerrada">Cerradas</option>
                </select>
              </div>
              <div class="molecule-field">
                <label for="filtro-desde">Desde</label>
                <input class="atom-input" id="filtro-desde" type="date" />
              </div>
              <div class="molecule-field">
                <label for="filtro-hasta">Hasta</label>
                <input class="atom-input" id="filtro-hasta" type="date" />
              </div>
            </div>
${tablaVacia(
  'tabla-incidencias',
  'Incidencias registradas',
  [{ texto: 'Código' }, { texto: 'Tipo' }, { texto: 'Fecha del evento' }, { texto: 'Placa' }, { texto: 'Celda' }, { texto: 'Operador' }, { texto: 'Estado' }, { texto: 'Acciones', derecha: true }],
  'w980',
  ['Sin incidencias', 'Ninguna incidencia coincide con los filtros.']
)}
          </div>
        </section>

        <template id="tpl-incidencia">
          <tr>
            <td class="organism-data-table-cell-digit js-codigo"></td>
            <td class="js-tipo"></td>
            <td class="organism-data-table-cell-nowrap js-fecha"></td>
            <td><span class="atom-plate js-placa"></span></td>
            <td class="js-celda"></td>
            <td class="js-operador"></td>
            <td><span class="atom-status-chip js-estado"></span></td>
            <td class="organism-log-table-right">
              <a class="atom-button atom-button--ghost atom-button--sm js-detalle" href="#"><span>Ver detalle</span></a>
            </td>
          </tr>
        </template>`,
    extra: `
    <dialog class="organism-modal" id="dialogo-incidencia" aria-labelledby="dialogo-incidencia-titulo">
      <header class="organism-modal-head">
        <div><h2 id="dialogo-incidencia-titulo">Nueva incidencia</h2><p>// Queda abierta con código y se alerta al Administrador</p></div>
        <button class="atom-icon-button" type="button" data-cerrar aria-label="Cerrar">${icono('i-x')}</button>
      </header>
      <div class="organism-modal-body">
        <form class="organism-form--grid" id="form-incidencia" novalidate>
          ${alerta('incidencia-alerta')}
          <div class="molecule-field">
            <label for="incidencia-tipo">Tipo${requerido}</label>
            <select class="atom-select" id="incidencia-tipo" required aria-describedby="incidencia-tipo-error">
              <option value="">Seleccione…</option>
              ${opciones(tipos)}
            </select>
            ${error('incidencia-tipo')}
          </div>
          <div class="molecule-field">
            <label for="incidencia-placa">Placa del vehículo afectado${requerido}</label>
            <input class="atom-input atom-input--plate" id="incidencia-placa" type="text" maxlength="9" required autocomplete="off" spellcheck="false" placeholder="ABC123" aria-describedby="incidencia-placa-hint incidencia-placa-error" />
            <p class="molecule-field-hint" id="incidencia-placa-hint" aria-live="polite">Registrada u ocasional.</p>
            ${error('incidencia-placa')}
          </div>
          <div class="molecule-field hidden" id="incidencia-tipo-vehiculo-campo">
            <label for="incidencia-tipo-vehiculo">Tipo de vehículo${requerido}</label>
            <select class="atom-select" id="incidencia-tipo-vehiculo" aria-describedby="incidencia-tipo-vehiculo-error">
              <option value="carro">Carro</option>
              <option value="moto">Moto</option>
            </select>
            ${error('incidencia-tipo-vehiculo')}
          </div>
          <div class="molecule-field">
            <label for="incidencia-fecha">Fecha y hora del evento${requerido}</label>
            <input class="atom-input" id="incidencia-fecha" type="datetime-local" required aria-describedby="incidencia-fecha-error" />
            ${error('incidencia-fecha')}
          </div>
          ${area('incidencia-descripcion', 'Descripción', 500, 10)}
          <div class="molecule-field molecule-field--full molecule-photo-input" id="incidencia-evidencia-campo">
            <span class="molecule-field-label">Evidencia (opcional)</span>
            <div class="molecule-photo-input-row">
              <div class="molecule-photo-input-preview" aria-hidden="true">
                <img class="hidden" alt="" />
                <span class="js-vacio">—</span>
              </div>
              <div class="molecule-photo-input-actions">
                <input class="visually-hidden" id="incidencia-evidencia" type="file" accept="image/jpeg,image/png" aria-describedby="incidencia-evidencia-hint incidencia-evidencia-error" />
                <label class="atom-button atom-button--ghost atom-button--sm" for="incidencia-evidencia">Elegir foto</label>
                <p class="molecule-field-hint" id="incidencia-evidencia-hint">JPG o PNG, máximo 5 MB.</p>
              </div>
            </div>
            ${error('incidencia-evidencia')}
          </div>
        </form>
      </div>
      <footer class="organism-modal-foot">
        <button class="atom-button atom-button--ghost" type="button" data-cerrar><span>Cancelar</span></button>
        <button class="atom-button" type="submit" form="form-incidencia" id="incidencia-guardar">${icono('i-check')}<span>Registrar</span></button>
      </footer>
    </dialog>
`,
  });

  // ------------------------------------------------------------------ incidencia.html (HU-57, HU-58)
  pagina({
    archivo: 'incidencia.html',
    titulo: 'Detalle de la incidencia',
    vista: 'incidencia.view.js',
    activo: 'incidencias',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1 id="detalle-codigo">Incidencia</h1>
            <p>// Incidencias › Detalle · seguimiento y cierre</p>
          </div>
          <div class="molecule-page-head-actions">
            <a class="atom-button atom-button--ghost" href="/incidencias.html"><span>← Volver a incidencias</span></a>
          </div>
        </div>
        <div class="molecule-empty-state hidden" id="detalle-no-encontrada">
          <strong>Incidencia no encontrada</strong>
          <p>La incidencia que busca no existe.</p>
          <div class="molecule-empty-state-action"><a class="atom-button" href="/incidencias.html"><span>Ver incidencias</span></a></div>
        </div>
        <div class="template-app-layout-stack hidden" id="detalle-contenido" aria-live="polite">
          <section class="molecule-panel" aria-labelledby="detalle-datos-titulo">
            <div class="molecule-panel-head"><h2 id="detalle-datos-titulo">Datos <span class="atom-status-chip" id="detalle-estado"></span></h2></div>
            <div class="molecule-panel-body">
              <dl class="molecule-data-list">
                <div><dt>Tipo</dt><dd id="detalle-tipo"></dd></div>
                <div><dt>Fecha del evento</dt><dd id="detalle-fecha"></dd></div>
                <div><dt>Vehículo</dt><dd><span class="atom-plate" id="detalle-placa"></span></dd></div>
                <div><dt>Celda</dt><dd id="detalle-celda"></dd></div>
                <div><dt>Registró</dt><dd id="detalle-operador"></dd></div>
                <div><dt>Descripción</dt><dd id="detalle-descripcion"></dd></div>
              </dl>
            </div>
          </section>
          <section class="molecule-panel" aria-labelledby="detalle-evidencia-titulo">
            <div class="molecule-panel-head"><h2 id="detalle-evidencia-titulo">Evidencia</h2></div>
            <div class="molecule-panel-body">
              <p class="molecule-field-hint" id="detalle-sin-evidencia">Sin evidencia.</p>
              <img class="molecule-evidence-image hidden" id="detalle-evidencia" alt="Foto de evidencia de la incidencia" />
            </div>
          </section>
          <section class="molecule-panel" aria-labelledby="detalle-seguimiento-titulo">
            <div class="molecule-panel-head"><h2 id="detalle-seguimiento-titulo">Seguimiento</h2></div>
            <div class="molecule-panel-body">
${tablaVacia('tabla-seguimiento', 'Historial de seguimiento', [{ texto: 'Fecha' }, { texto: 'Usuario' }, { texto: 'Nota' }], 'w600', ['Sin seguimiento', 'Todavía no hay notas de seguimiento.'])}
              <form class="organism-form--stack hidden" id="form-nota" novalidate>
                ${alerta('nota-alerta')}
                ${area('nota-texto', 'Nueva nota', 500, 5)}
                <div><button class="atom-button" type="submit" id="nota-guardar">${icono('i-check')}<span>Agregar nota</span></button></div>
              </form>
            </div>
          </section>
          <section class="molecule-panel" aria-labelledby="detalle-cierre-titulo">
            <div class="molecule-panel-head"><h2 id="detalle-cierre-titulo">Cierre</h2></div>
            <div class="molecule-panel-body">
              <dl class="molecule-data-list hidden" id="detalle-cierre">
                <div><dt>Solución</dt><dd id="detalle-solucion"></dd></div>
                <div><dt>Cerrada el</dt><dd id="detalle-fecha-cierre"></dd></div>
              </dl>
              <p class="molecule-field-hint" id="detalle-sin-cierre">La incidencia sigue abierta.</p>
              <form class="organism-form--stack hidden" id="form-cierre" novalidate>
                ${alerta('cierre-alerta')}
                ${area('cierre-solucion', 'Solución', 500, 10)}
                <div><button class="atom-button" type="submit" id="cierre-guardar">${icono('i-check')}<span>Cerrar incidencia</span></button></div>
              </form>
            </div>
          </section>
        </div>

        <template id="tpl-seguimiento">
          <tr>
            <td class="organism-data-table-cell-nowrap js-fecha"></td>
            <td class="js-usuario"></td>
            <td class="js-nota"></td>
          </tr>
        </template>`,
  });
};
