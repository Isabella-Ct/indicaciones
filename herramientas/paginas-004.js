// Páginas de la spec 004 (parqueaderos, puertas, celdas y disponibilidad), con el mismo marco que
// las anteriores (se ejecuta junto con armar-paginas.js). La portada pública index.html se escribe
// aparte porque no usa el marco interno.
module.exports = ({ pagina, tablaVacia, icono }) => {
  const requerido = '<span class="molecule-field-required" aria-hidden="true"> *</span>';

  const campo = (id, etiqueta, { tipo = 'text', max, obligatorio = true, extra = '', pista } = {}) => `<div class="molecule-field">
            <label for="${id}">${etiqueta}${obligatorio ? requerido : ''}</label>
            <input class="atom-input" id="${id}" type="${tipo}"${max ? ` maxlength="${max}"` : ''}${obligatorio ? ' required' : ''} ${extra} aria-describedby="${pista ? `${id}-hint ` : ''}${id}-error" />
            ${pista ? `<p class="molecule-field-hint" id="${id}-hint">${pista}</p>` : ''}
            <p class="molecule-field-error" id="${id}-error" aria-live="polite"></p>
          </div>`;

  const lista = (id, etiqueta, opciones, { obligatorio = true } = {}) => `<div class="molecule-field">
            <label for="${id}">${etiqueta}${obligatorio ? requerido : ''}</label>
            <select class="atom-select" id="${id}"${obligatorio ? ' required' : ''} aria-describedby="${id}-error">
              ${opciones.map(([valor, texto]) => `<option value="${valor}">${texto}</option>`).join('\n              ')}
            </select>
            <p class="molecule-field-error" id="${id}-error" aria-live="polite"></p>
          </div>`;

  const alerta = (id) => `<div class="molecule-alert molecule-alert--error molecule-field--full hidden" id="${id}" aria-live="assertive">
            ${icono('i-alert')}<p></p>
          </div>`;

  const dialogo = ({ id, titulo, subtitulo, formulario, guardar, cuerpo, clase = 'organism-form--grid' }) => `
    <dialog class="organism-modal" id="${id}" aria-labelledby="${id}-titulo">
      <header class="organism-modal-head">
        <div><h2 id="${id}-titulo">${titulo}</h2><p>${subtitulo}</p></div>
        <button class="atom-icon-button" type="button" data-cerrar aria-label="Cerrar">${icono('i-x')}</button>
      </header>
      <div class="organism-modal-body">
        <form class="${clase}" id="${formulario}" novalidate>
          ${cuerpo}
        </form>
      </div>
      <footer class="organism-modal-foot">
        <button class="atom-button atom-button--ghost" type="button" data-cerrar><span>Cancelar</span></button>
        <button class="atom-button" type="submit" form="${formulario}" id="${guardar}">${icono('i-check')}<span>Guardar</span></button>
      </footer>
    </dialog>`;

  const TIPOS_VEHICULO = [
    ['carro', 'Carro'],
    ['moto', 'Moto'],
  ];
  const TIPOS_PUERTA = [
    ['mixta', 'Mixta (entrada y salida)'],
    ['entrada', 'Solo entrada'],
    ['salida', 'Solo salida'],
  ];
  const ESTADOS = [
    ['activo', 'Activo'],
    ['inactivo', 'Inactivo'],
  ];
  const opcionVacia = '<template id="tpl-opcion"><option></option></template>';

  // ---------------------------------------------------------------- parqueaderos.html (HU-17, HU-18)
  pagina({
    archivo: 'parqueaderos.html',
    titulo: 'Parqueaderos',
    vista: 'parqueaderos.view.js',
    activo: 'parqueaderos',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Parqueaderos</h1>
            <p>// Configuración › sedes, pisos, horario y puertas de acceso</p>
          </div>
          <div class="molecule-page-head-actions">
            <button class="atom-button hidden" type="button" id="accion-nuevo">${icono('i-map')}<span>Nuevo parqueadero</span></button>
          </div>
        </div>

        <section class="molecule-panel" aria-labelledby="panel-parqueaderos-titulo">
          <div class="molecule-panel-head"><h2 id="panel-parqueaderos-titulo">Parqueaderos registrados</h2></div>
          <div class="molecule-panel-body">
            <div class="molecule-filters">
              <div class="molecule-search-box" role="search">
                <label class="molecule-search-box-label" for="filtro-texto">Buscar</label>
                <input class="atom-input" id="filtro-texto" type="search" placeholder="Nombre del parqueadero" autocomplete="off" maxlength="60" />
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
  'tabla-parqueaderos',
  'Parqueaderos registrados',
  [
    { texto: 'Nombre' },
    { texto: 'Dirección' },
    { texto: 'Pisos' },
    { texto: 'Celdas' },
    { texto: 'Horario' },
    { texto: 'Estado' },
    { texto: 'Acciones', derecha: true },
  ],
  'w980',
  ['Sin parqueaderos', 'Ningún parqueadero coincide con la búsqueda o los filtros.']
)}
          </div>
        </section>

        <template id="tpl-parqueadero">
          <tr>
            <td><strong class="js-nombre"></strong></td>
            <td class="organism-data-table-cell-clamp js-direccion"></td>
            <td class="organism-data-table-cell-digit"><span class="js-pisos"></span></td>
            <td class="organism-data-table-cell-nowrap"><span class="js-celdas"></span><span class="organism-data-table-cell-sub js-celdas-detalle"></span></td>
            <td class="js-horario"></td>
            <td><span class="atom-status-chip js-estado"></span></td>
            <td class="organism-log-table-right">
              <div class="organism-data-table-row-actions">
                <a class="atom-button atom-button--ghost atom-button--sm js-ver" href="#"><span>Ver</span></a>
                <button class="atom-button atom-button--ghost atom-button--sm hidden js-editar" type="button"><span>Editar</span></button>
                <button class="atom-button atom-button--ghost atom-button--sm hidden js-estado-accion" type="button"><span></span></button>
              </div>
            </td>
          </tr>
        </template>`,
    extra: dialogo({
      id: 'dialogo-parqueadero',
      titulo: 'Nuevo parqueadero',
      subtitulo: '// Los campos con * son obligatorios',
      formulario: 'form-parqueadero',
      guardar: 'parqueadero-guardar',
      cuerpo: `${alerta('parqueadero-alerta')}
          ${campo('parqueadero-nombre', 'Nombre', { max: 80, extra: 'autocomplete="off"' })}
          ${campo('parqueadero-direccion', 'Dirección', { max: 150, extra: 'autocomplete="off"' })}
          ${campo('parqueadero-pisos', 'Pisos', { tipo: 'number', extra: 'min="1" max="20" step="1" inputmode="numeric"', pista: 'De 1 a 20.' })}
          ${campo('parqueadero-horario', 'Horario', { max: 60, obligatorio: false, extra: 'autocomplete="off" placeholder="24 horas"', pista: 'Si se deja vacío: 24 horas.' })}`,
    }),
  });

  // ---------------------------------------------------------------- parqueadero-detalle.html (HU-17 E5, HU-19)
  pagina({
    archivo: 'parqueadero-detalle.html',
    titulo: 'Detalle del parqueadero',
    vista: 'parqueadero-detalle.view.js',
    activo: 'parqueaderos',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1 id="detalle-nombre">Parqueadero</h1>
            <p>// Configuración › Parqueaderos › Detalle</p>
          </div>
          <div class="molecule-page-head-actions">
            <a class="atom-button atom-button--ghost" href="/parqueaderos.html"><span>← Volver a parqueaderos</span></a>
            <a class="atom-button hidden" href="#" id="detalle-celdas">${icono('i-map')}<span>Ver celdas</span></a>
          </div>
        </div>

        <div class="molecule-empty-state hidden" id="detalle-no-encontrado">
          <strong>Parqueadero no encontrado</strong>
          <p>El parqueadero que busca no existe.</p>
          <div class="molecule-empty-state-action"><a class="atom-button" href="/parqueaderos.html"><span>Ver parqueaderos</span></a></div>
        </div>

        <div class="template-app-layout-stack hidden" id="detalle-contenido" aria-live="polite">
          <section class="molecule-panel" aria-labelledby="detalle-datos-titulo">
            <div class="molecule-panel-head"><h2 id="detalle-datos-titulo">Datos del parqueadero</h2></div>
            <div class="molecule-panel-body">
              <dl class="molecule-data-list">
                <div><dt>Dirección</dt><dd id="detalle-direccion"></dd></div>
                <div><dt>Pisos</dt><dd id="detalle-pisos"></dd></div>
                <div><dt>Horario</dt><dd id="detalle-horario"></dd></div>
                <div><dt>Estado</dt><dd><span class="atom-status-chip" id="detalle-estado"></span></dd></div>
              </dl>
            </div>
          </section>

          <section class="molecule-panel" aria-labelledby="detalle-resumen-titulo">
            <div class="molecule-panel-head"><h2 id="detalle-resumen-titulo">Celdas por piso y tipo</h2></div>
            <div class="molecule-panel-body">
${tablaVacia(
  'tabla-resumen',
  'Celdas por piso y tipo',
  [
    { texto: 'Piso' },
    { texto: 'Tipo' },
    { texto: 'Total', derecha: true },
    { texto: 'Libres', derecha: true },
    { texto: 'Ocupadas', derecha: true },
    { texto: 'Reservadas', derecha: true },
    { texto: 'Inhabilitadas', derecha: true },
  ],
  'w760',
  ['Sin celdas', 'Este parqueadero aún no tiene celdas registradas.']
)}
            </div>
          </section>

          <section class="molecule-panel" aria-labelledby="detalle-puertas-titulo">
            <div class="molecule-panel-head">
              <h2 id="detalle-puertas-titulo">Puertas de acceso</h2>
              <button class="atom-button atom-button--sm hidden" type="button" id="accion-nueva-puerta">${icono('i-in')}<span>Nueva puerta</span></button>
            </div>
            <div class="molecule-panel-body">
${tablaVacia(
  'tabla-puertas',
  'Puertas de acceso',
  [{ texto: 'Nombre' }, { texto: 'Uso' }, { texto: 'Estado' }, { texto: 'Acciones', derecha: true }],
  'w480',
  ['Sin puertas', 'Agregue al menos una puerta para registrar entradas y salidas.']
)}
            </div>
          </section>
        </div>

        <template id="tpl-resumen">
          <tr>
            <td class="js-piso"></td>
            <td class="js-tipo"></td>
            <td class="organism-log-table-right js-total"></td>
            <td class="organism-log-table-right js-disponibles"></td>
            <td class="organism-log-table-right js-ocupadas"></td>
            <td class="organism-log-table-right js-reservadas"></td>
            <td class="organism-log-table-right js-inhabilitadas"></td>
          </tr>
        </template>
        <template id="tpl-puerta">
          <tr>
            <td><strong class="js-nombre"></strong></td>
            <td class="js-tipo"></td>
            <td><span class="atom-status-chip js-estado"></span></td>
            <td class="organism-log-table-right">
              <div class="organism-data-table-row-actions">
                <button class="atom-button atom-button--ghost atom-button--sm hidden js-editar" type="button"><span>Editar</span></button>
              </div>
            </td>
          </tr>
        </template>`,
    extra: dialogo({
      id: 'dialogo-puerta',
      titulo: 'Nueva puerta',
      subtitulo: '// Puerta por la que entran o salen los vehículos',
      formulario: 'form-puerta',
      guardar: 'puerta-guardar',
      clase: 'organism-form--stack',
      cuerpo: `${alerta('puerta-alerta')}
          ${campo('puerta-nombre', 'Nombre', { max: 60, extra: 'autocomplete="off" placeholder="Carrera 43"' })}
          ${lista('puerta-tipo', 'Uso', TIPOS_PUERTA)}
          <div class="hidden" id="puerta-estado-campo">
          ${lista('puerta-estado', 'Estado', ESTADOS)}
          </div>`,
    }),
  });

  // ---------------------------------------------------------------- celdas.html (HU-20..HU-23)
  pagina({
    archivo: 'celdas.html',
    titulo: 'Celdas',
    vista: 'celdas.view.js',
    activo: 'celdas',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Celdas</h1>
            <p id="celdas-subtitulo">// Mapa por piso · se actualiza cada 10 segundos</p>
          </div>
          <div class="molecule-page-head-actions">
            <button class="atom-button atom-button--ghost hidden" type="button" id="accion-lote">${icono('i-map')}<span>Crear por rango</span></button>
            <button class="atom-button hidden" type="button" id="accion-nueva">${icono('i-car')}<span>Nueva celda</span></button>
          </div>
        </div>

        <section class="molecule-panel" aria-labelledby="filtros-titulo">
          <div class="molecule-panel-head"><h2 id="filtros-titulo">Filtros</h2></div>
          <div class="molecule-panel-body">
            <div class="molecule-filters">
              <div class="molecule-field">
                <label for="filtro-parqueadero">Parqueadero</label>
                <select class="atom-select" id="filtro-parqueadero"></select>
              </div>
              <div class="molecule-field">
                <label for="filtro-tipo">Tipo</label>
                <select class="atom-select" id="filtro-tipo">
                  <option value="">Carros y motos</option>
                  <option value="carro">Carros</option>
                  <option value="moto">Motos</option>
                </select>
              </div>
              <div class="molecule-field">
                <label for="filtro-estado">Estado</label>
                <select class="atom-select" id="filtro-estado">
                  <option value="">Todos</option>
                  <option value="disponible">Libres</option>
                  <option value="ocupada">Ocupadas</option>
                  <option value="reservada">Reservadas</option>
                  <option value="inhabilitada">Inhabilitadas</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section class="organism-kpis organism-kpis--4" aria-label="Estado del piso">
          <article class="molecule-kpi molecule-kpi--main" id="kpi-libres">
            <p class="atom-label-caps">Celdas libres</p>
            <p class="molecule-kpi-value">—</p>
            <div class="atom-meter"><span></span></div>
            <p class="molecule-kpi-note"></p>
          </article>
          <article class="molecule-kpi" id="kpi-ocupadas"><p class="atom-label-caps">Ocupadas</p><p class="molecule-kpi-value">—</p><p class="molecule-kpi-note"></p></article>
          <article class="molecule-kpi" id="kpi-reservadas"><p class="atom-label-caps">Reservadas</p><p class="molecule-kpi-value">—</p><p class="molecule-kpi-note"></p></article>
          <article class="molecule-kpi" id="kpi-inhabilitadas"><p class="atom-label-caps">Inhabilitadas</p><p class="molecule-kpi-value">—</p><p class="molecule-kpi-note"></p></article>
        </section>

        <div class="template-app-layout-workspace">
          <section class="molecule-panel" aria-labelledby="mapa-titulo">
            <div class="molecule-panel-head">
              <h2 id="mapa-titulo">Mapa del parqueadero</h2>
              <div class="molecule-level-tabs" id="pisos" role="tablist" aria-label="Pisos"></div>
            </div>
            <div class="molecule-map-legend">
              <span><i class="molecule-map-legend-free"></i>Libre</span>
              <span><i class="molecule-map-legend-occupied"></i>Ocupada</span>
              <span><i class="molecule-map-legend-reserved"></i>Reservada</span>
              <span><i class="molecule-map-legend-out"></i>Inhabilitada</span>
            </div>
            <div class="organism-parking-map-level" id="mapa" role="tabpanel" aria-labelledby="mapa-titulo">
              <p class="organism-parking-map-level-title">
                <span class="organism-parking-map-level-name js-titulo">Piso</span><span class="js-conteo"></span>
              </p>
              <div class="organism-parking-map-lot js-lote"></div>
              <div class="molecule-empty-state hidden js-vacio">
                <strong>Sin celdas</strong>
                <p>No hay celdas en este piso con los filtros elegidos.</p>
              </div>
              <p class="organism-availability-time" id="mapa-actualizado"></p>
            </div>
          </section>

          <aside class="organism-space-detail-column" aria-live="polite">
            <div class="molecule-empty-state" id="detalle-vacio">
              <strong>Seleccione una celda</strong>
              <p>Toque cualquier celda del mapa para ver su estado, el vehículo que la ocupa y sus acciones.</p>
            </div>
            <article class="molecule-panel hidden" id="detalle-celda">
              <div class="organism-space-detail-hero">
                <div>
                  <p class="atom-label-caps" id="detalle-ubicacion"></p>
                  <p class="organism-space-detail-code" id="detalle-codigo"></p>
                </div>
                <span class="atom-status-chip" id="detalle-estado"></span>
              </div>
              <div class="organism-space-detail-block hidden" id="detalle-vehiculo">
                <p class="atom-label-caps">Vehículo</p>
                <div class="molecule-vehicle-line">
                  <span class="atom-plate" id="detalle-placa"></span>
                  <p id="detalle-tipo-vehiculo"></p>
                </div>
              </div>
              <div class="organism-space-detail-block">
                <dl class="molecule-data-list">
                  <div><dt>Tipo de celda</dt><dd id="detalle-tipo"></dd></div>
                  <div><dt>Área</dt><dd id="detalle-area"></dd></div>
                  <div class="hidden" id="detalle-entrada-fila"><dt>Hora de entrada</dt><dd id="detalle-entrada"></dd></div>
                  <div class="hidden" id="detalle-motivo-fila"><dt>Motivo</dt><dd id="detalle-motivo"></dd></div>
                </dl>
              </div>
              <div class="organism-space-detail-actions">
                <button class="atom-button hidden organism-space-detail-full" type="button" id="detalle-inhabilitar"><span>Inhabilitar celda</span></button>
                <button class="atom-button hidden organism-space-detail-full" type="button" id="detalle-habilitar"><span>Habilitar celda</span></button>
                <button class="atom-button atom-button--ghost hidden organism-space-detail-full" type="button" id="detalle-editar"><span>Editar celda</span></button>
                <button class="atom-button atom-button--ghost organism-space-detail-full" type="button" id="detalle-cerrar"><span>Cerrar detalle</span></button>
              </div>
            </article>
          </aside>
        </div>

        <template id="tpl-piso"><button class="molecule-level-tab" type="button" role="tab" aria-controls="mapa"></button></template>
        <template id="tpl-mapa-bloque">
          <div>
            <div class="organism-parking-map-row organism-parking-map-row--top"></div>
            <div class="organism-parking-map-lane"><span class="js-carril-arriba"></span><span>Carril</span><span class="js-carril-abajo"></span></div>
            <div class="organism-parking-map-row organism-parking-map-row--bottom"></div>
          </div>
        </template>
        <template id="tpl-celda-carro">
          <button class="molecule-space" type="button">
            <span class="molecule-space-code"></span>
            <svg class="molecule-space-car hidden" viewBox="0 0 26 46" aria-hidden="true" focusable="false"><use href="/assets/icons.svg#car-top"></use></svg>
            <span class="molecule-space-plate hidden"></span>
            <span class="molecule-space-tag"></span>
          </button>
        </template>
        <template id="tpl-celda-moto">
          <button class="molecule-space" type="button">
            <span class="molecule-space-code"></span>
            <svg class="molecule-space-car hidden" viewBox="0 0 14 34" aria-hidden="true" focusable="false"><use href="/assets/icons.svg#moto-top"></use></svg>
            <span class="molecule-space-plate hidden"></span>
            <span class="molecule-space-tag"></span>
          </button>
        </template>
        ${opcionVacia}`,
    extra: `${dialogo({
      id: 'dialogo-celda',
      titulo: 'Nueva celda',
      subtitulo: '// El código se guarda en mayúsculas',
      formulario: 'form-celda',
      guardar: 'celda-guardar',
      cuerpo: `${alerta('celda-alerta')}
          ${campo('celda-codigo', 'Código', { max: 10, extra: 'autocomplete="off" placeholder="A-01"', pista: 'Letras, dígitos y guiones (máximo 10).' })}
          ${lista('celda-tipo', 'Tipo de vehículo', TIPOS_VEHICULO)}
          ${campo('celda-piso', 'Piso', { tipo: 'number', extra: 'min="1" step="1" inputmode="numeric"' })}
          ${campo('celda-area', 'Área', { max: 20, obligatorio: false, extra: 'autocomplete="off" placeholder="A"' })}`,
    })}
${dialogo({
  id: 'dialogo-lote',
  titulo: 'Crear celdas por rango',
  subtitulo: '// Ej.: prefijo M-, del 1 al 20 → M-01 … M-20 (máximo 200)',
  formulario: 'form-lote',
  guardar: 'lote-guardar',
  cuerpo: `${alerta('lote-alerta')}
          ${campo('lote-prefijo', 'Prefijo', { max: 8, extra: 'autocomplete="off" placeholder="M-"' })}
          ${lista('lote-tipo', 'Tipo de vehículo', TIPOS_VEHICULO)}
          ${campo('lote-desde', 'Desde', { tipo: 'number', extra: 'min="0" step="1" inputmode="numeric"' })}
          ${campo('lote-hasta', 'Hasta', { tipo: 'number', extra: 'min="0" step="1" inputmode="numeric"' })}
          ${campo('lote-piso', 'Piso', { tipo: 'number', extra: 'min="1" step="1" inputmode="numeric"' })}
          ${campo('lote-area', 'Área', { max: 20, obligatorio: false, extra: 'autocomplete="off"' })}`,
})}
${dialogo({
  id: 'dialogo-inhabilitar',
  titulo: 'Inhabilitar celda',
  subtitulo: '// La celda deja de asignarse hasta que se habilite',
  formulario: 'form-inhabilitar',
  guardar: 'inhabilitar-guardar',
  clase: 'organism-form--stack',
  cuerpo: `${alerta('inhabilitar-alerta')}
          <div class="molecule-field">
            <label for="inhabilitar-motivo">Motivo${requerido}</label>
            <textarea class="atom-textarea" id="inhabilitar-motivo" maxlength="200" rows="3" required aria-describedby="inhabilitar-motivo-error"></textarea>
            <p class="molecule-field-error" id="inhabilitar-motivo-error" aria-live="polite"></p>
          </div>`,
})}`,
  });

  // ---------------------------------------------------------------- disponibilidad.html (HU-22 E4, Cliente)
  pagina({
    archivo: 'disponibilidad.html',
    titulo: 'Disponibilidad',
    vista: 'disponibilidad.view.js',
    activo: 'disponibilidad',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Disponibilidad</h1>
            <p>// Celdas libres por piso y área · se actualiza cada 10 segundos</p>
          </div>
        </div>

        <section class="molecule-panel" aria-labelledby="filtros-titulo">
          <div class="molecule-panel-head"><h2 id="filtros-titulo">Parqueadero</h2></div>
          <div class="molecule-panel-body">
            <div class="molecule-filters">
              <div class="molecule-field">
                <label for="filtro-parqueadero">Parqueadero</label>
                <select class="atom-select" id="filtro-parqueadero"></select>
              </div>
              <div class="molecule-field">
                <label for="filtro-tipo">Tipo</label>
                <select class="atom-select" id="filtro-tipo">
                  <option value="">Carros y motos</option>
                  <option value="carro">Carros</option>
                  <option value="moto">Motos</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section class="organism-kpis organism-kpis--2" aria-label="Celdas libres por tipo">
          <article class="molecule-kpi molecule-kpi--main" id="kpi-carro">
            <p class="atom-label-caps">Carros</p>
            <p class="molecule-kpi-value">—</p>
            <div class="atom-meter"><span></span></div>
            <p class="molecule-kpi-note"></p>
          </article>
          <article class="molecule-kpi" id="kpi-moto">
            <p class="atom-label-caps">Motos</p>
            <p class="molecule-kpi-value">—</p>
            <div class="atom-meter"><span></span></div>
            <p class="molecule-kpi-note"></p>
          </article>
        </section>

        <section class="molecule-panel" aria-labelledby="mapa-titulo">
          <div class="molecule-panel-head">
            <h2 id="mapa-titulo">Celdas libres</h2>
            <div class="molecule-level-tabs" id="pisos" role="tablist" aria-label="Pisos"></div>
          </div>
          <div class="organism-parking-map-level" id="mapa" role="tabpanel" aria-labelledby="mapa-titulo">
            <p class="organism-parking-map-level-title">
              <span class="organism-parking-map-level-name js-titulo">Piso</span><span class="js-conteo"></span>
            </p>
            <div class="organism-parking-map-lot js-lote"></div>
            <div class="molecule-empty-state hidden js-vacio">
              <strong>Sin celdas libres</strong>
              <p>En este momento no hay celdas libres en este piso.</p>
            </div>
            <p class="organism-availability-time" id="mapa-actualizado"></p>
          </div>
        </section>

        <template id="tpl-piso"><button class="molecule-level-tab" type="button" role="tab" aria-controls="mapa"></button></template>
        <template id="tpl-mapa-bloque">
          <div>
            <div class="organism-parking-map-row organism-parking-map-row--top"></div>
            <div class="organism-parking-map-lane"><span class="js-carril-arriba"></span><span>Carril</span><span class="js-carril-abajo"></span></div>
            <div class="organism-parking-map-row organism-parking-map-row--bottom"></div>
          </div>
        </template>
        <template id="tpl-celda-carro">
          <button class="molecule-space" type="button">
            <span class="molecule-space-code"></span>
            <svg class="molecule-space-car hidden" viewBox="0 0 26 46" aria-hidden="true" focusable="false"><use href="/assets/icons.svg#car-top"></use></svg>
            <span class="molecule-space-plate hidden"></span>
            <span class="molecule-space-tag"></span>
          </button>
        </template>
        <template id="tpl-celda-moto">
          <button class="molecule-space" type="button">
            <span class="molecule-space-code"></span>
            <svg class="molecule-space-car hidden" viewBox="0 0 14 34" aria-hidden="true" focusable="false"><use href="/assets/icons.svg#moto-top"></use></svg>
            <span class="molecule-space-plate hidden"></span>
            <span class="molecule-space-tag"></span>
          </button>
        </template>
        ${opcionVacia}`,
  });
};
