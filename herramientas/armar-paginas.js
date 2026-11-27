// Herramienta de desarrollo: escribe las páginas internas (marco común PARKO) en frontend/. Cada spec
// agrega su archivo paginas-NNN.js. Las páginas generadas son HTML estático que se versiona.
// Uso (desde la raíz del repo): node herramientas/armar-paginas.js "$(pwd)/frontend"
const fs = require('node:fs');
const path = require('node:path');

const destino = process.argv[2];
const icono = (id) =>
  `<svg class="atom-icon" aria-hidden="true" focusable="false"><use href="/assets/icons.svg#${id}"></use></svg>`;

const MENU = [
  ['celdas', 'Celdas', '/celdas.html'],
  ['disponibilidad', 'Disponibilidad', '/disponibilidad.html'],
  ['vehiculos', 'Vehículos', '/vehiculos.html'],
  ['mis-vehiculos', 'Mis vehículos', '/mis-vehiculos.html'],
  ['usuarios', 'Usuarios', '/usuarios.html'],
  ['parqueaderos', 'Parqueaderos', '/parqueaderos.html'],
  ['pico-placa', 'Pico y placa', '/pico-placa.html'],
  ['roles', 'Roles', '/roles.html'],
  ['permisos', 'Permisos', '/permisos.html'],
  ['mi-perfil', 'Mi perfil', '/mi-perfil.html'],
];

function pagina({ archivo, titulo, vista, activo, contenido, extra = '' }) {
  const items = MENU.map(
    ([id, texto, href]) => `            <li class="hidden">
              <a class="organism-navbar-item${id === activo ? ' is-active' : ''}" data-id="${id}" href="${href}"${id === activo ? ' aria-current="page"' : ''}>${texto}</a>
            </li>`
  ).join('\n');
  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PARKO · ${titulo}</title>
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
    />
    <link rel="stylesheet" href="/css/estilos.css" />
    <script type="module" src="/js/views/${vista}"></script>
  </head>
  <body>
    <div class="template-app-layout hidden" id="app">
      <a class="skip-link" href="#contenido">Saltar al contenido</a>

      <!-- organism-header -->
      <header class="organism-header">
        <div class="organism-header-inner">
          <a class="molecule-brand molecule-brand--link" href="/">
            <span class="atom-brand-mark" aria-hidden="true">P</span>
            <div>PARKO<small>Parking Lot ABC</small></div>
          </a>
          <div class="molecule-shift">
            <div>Fecha<strong id="marco-fecha">—</strong></div>
            <div>Hora<strong id="marco-hora">—</strong></div>
          </div>
          <div class="molecule-user-menu" id="menu-usuario">
            <button
              class="molecule-user-menu-button"
              id="menu-usuario-boton"
              type="button"
              aria-expanded="false"
              aria-controls="menu-usuario-lista"
              aria-haspopup="true"
            >
              <span class="atom-avatar" aria-hidden="true"><span id="menu-usuario-iniciales"></span></span>
              <span class="molecule-user-menu-name"
                ><span id="menu-usuario-nombre"></span><small id="menu-usuario-rol"></small
              ></span>
              ${icono('i-chevron-down')}
            </button>
            <ul class="molecule-user-menu-list hidden" id="menu-usuario-lista">
              <li>
                <a class="molecule-user-menu-item" href="/mi-perfil.html">${icono('i-user')}Mi perfil</a>
              </li>
              <li>
                <a class="molecule-user-menu-item" href="/cambiar-contrasena.html">${icono('i-key')}Cambiar contraseña</a>
              </li>
              <li>
                <button class="molecule-user-menu-item" id="menu-usuario-salir" type="button">
                  ${icono('i-logout')}Cerrar sesión
                </button>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <!-- organism-navbar (navbar.js oculta los ítems sin permiso) -->
      <nav class="organism-navbar" id="navbar" aria-label="Principal">
        <div class="organism-navbar-inner">
          <div class="organism-navbar-bar">
            <span class="organism-navbar-current">${titulo}</span>
            <button
              class="atom-icon-button"
              id="navbar-alternar"
              type="button"
              aria-label="Abrir menú de navegación"
              title="Menú"
              aria-expanded="false"
              aria-controls="navbar-lista"
            >
              ${icono('i-menu')}
            </button>
          </div>
          <ul class="organism-navbar-list" id="navbar-lista">
${items}
          </ul>
        </div>
      </nav>

      <div class="atom-hazard-strip" aria-hidden="true"></div>

      <div class="template-app-layout-page hidden" id="sin-permiso">
        <div class="molecule-empty-state">
          <strong>No tiene permiso para ver esta pantalla</strong>
          <p>Use el menú para ir a las secciones de su perfil.</p>
        </div>
      </div>

      <main class="template-app-layout-page hidden" id="contenido" tabindex="-1">
${contenido}
      </main>

      <!-- organism-footer -->
      <footer class="organism-footer">
        <div class="organism-footer-inner">
          <p class="organism-footer-brand">PARKO</p>
          <p>© <span id="pie-anio"></span> PARKO · Sistema de Gestión de Parqueadero · Parking Lot ABC</p>
        </div>
      </footer>
    </div>

    <!-- Diálogo de confirmación (constitución §V: <dialog>) -->
    <dialog class="organism-modal organism-modal--sm" id="dialogo-confirmar" aria-labelledby="confirmar-titulo">
      <header class="organism-modal-head">
        <div><h2 id="confirmar-titulo"></h2></div>
        <button class="atom-icon-button" type="button" data-cerrar aria-label="Cerrar">${icono('i-x')}</button>
      </header>
      <div class="organism-modal-body"><p id="confirmar-mensaje"></p></div>
      <footer class="organism-modal-foot">
        <button class="atom-button atom-button--ghost" type="button" data-cerrar><span>Cancelar</span></button>
        <button class="atom-button atom-button--dark" id="confirmar-aceptar" type="button"><span>Confirmar</span></button>
      </footer>
    </dialog>
${extra}
    <div class="molecule-toast-region" id="avisos" aria-live="polite"></div>

    <template id="tpl-aviso">
      <div class="molecule-toast" role="status">
        ${icono('i-info')}
        <p></p>
        <button class="molecule-toast-close" type="button" aria-label="Cerrar aviso">${icono('i-x')}</button>
      </div>
    </template>
  </body>
</html>
`;
  fs.writeFileSync(path.join(destino, archivo), html);
}

const tablaVacia = (id, etiqueta, columnas, ancho, vacio) => `
          <div class="organism-data-table" id="${id}">
            <div class="organism-data-table-scroll" tabindex="0" role="region" aria-label="${etiqueta}">
              <table class="organism-log-table organism-data-table-table organism-data-table-table--${ancho}">
                <caption class="visually-hidden">${etiqueta}</caption>
                <thead>
                  <tr>
${columnas.map((c) => `                    <th scope="col"${c.derecha ? ' class="organism-log-table-right"' : ''}>${c.texto}</th>`).join('\n')}
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
            <div class="molecule-empty-state hidden">
              <strong>${vacio[0]}</strong>
              <p>${vacio[1]}</p>
            </div>
            <nav class="molecule-pagination hidden" aria-label="Paginación">
              <button class="atom-button atom-button--ghost atom-button--sm" type="button"><span>Anterior</span></button>
              <p class="molecule-pagination-status" aria-live="polite"></p>
              <button class="atom-button atom-button--ghost atom-button--sm" type="button"><span>Siguiente</span></button>
            </nav>
            <div class="organism-data-table-loading hidden">
              <span class="atom-spinner" role="status"><span class="visually-hidden">Cargando datos…</span></span>
            </div>
          </div>`;

// ------------------------------------------------------------------ roles.html
pagina({
  archivo: 'roles.html',
  titulo: 'Roles',
  vista: 'roles.view.js',
  activo: 'roles',
  contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Roles</h1>
            <p>// Configuración › perfiles de acceso y sus permisos</p>
          </div>
          <div class="molecule-page-head-actions">
            <button class="atom-button hidden" type="button" id="accion-nuevo">
              ${icono('i-shield')}<span>Nuevo rol</span>
            </button>
          </div>
        </div>

        <section class="molecule-panel" aria-labelledby="panel-roles-titulo">
          <div class="molecule-panel-head"><h2 id="panel-roles-titulo">Roles registrados</h2></div>
          <div class="molecule-panel-body">
            <div class="molecule-filters">
              <div class="molecule-search-box" role="search">
                <label class="molecule-search-box-label" for="filtro-texto">Buscar</label>
                <input class="atom-input" id="filtro-texto" type="search" placeholder="Nombre del rol" autocomplete="off" maxlength="60" />
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
  'tabla-roles',
  'Roles registrados',
  [
    { texto: 'Nombre' },
    { texto: 'Descripción' },
    { texto: 'Usuarios' },
    { texto: 'Estado' },
    { texto: 'Acciones', derecha: true },
  ],
  'w760',
  ['Sin roles', 'Ningún rol coincide con los filtros.']
)}
          </div>
        </section>

        <template id="tpl-rol">
          <tr>
            <td>
              <strong class="js-nombre"></strong>
              <span class="atom-status-chip hidden js-base">Base</span>
            </td>
            <td class="organism-data-table-cell-clamp js-descripcion"></td>
            <td class="organism-data-table-cell-digit"><span class="js-usuarios"></span></td>
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
  extra: `
    <!-- Diálogo Nuevo / Editar rol (HU-02, HU-04) -->
    <dialog class="organism-modal" id="dialogo-rol" aria-labelledby="rol-titulo">
      <header class="organism-modal-head">
        <div><h2 id="rol-titulo">Nuevo rol</h2><p id="rol-subtitulo">// Elija al menos un permiso</p></div>
        <button class="atom-icon-button" type="button" data-cerrar aria-label="Cerrar">${icono('i-x')}</button>
      </header>
      <div class="organism-modal-body">
        <form class="organism-form--stack" id="form-rol" novalidate>
          <div class="molecule-alert molecule-alert--error hidden" id="rol-alerta" aria-live="assertive">
            ${icono('i-alert')}<p></p>
          </div>
          <div class="molecule-field">
            <label for="rol-nombre">Nombre<span class="molecule-field-required" aria-hidden="true"> *</span></label>
            <input class="atom-input" id="rol-nombre" type="text" maxlength="40" required aria-describedby="rol-nombre-hint rol-nombre-error" />
            <p class="molecule-field-hint" id="rol-nombre-hint">De 3 a 40 caracteres. Los roles base no se pueden renombrar.</p>
            <p class="molecule-field-error" id="rol-nombre-error" aria-live="polite"></p>
          </div>
          <div class="molecule-field">
            <label for="rol-descripcion">Descripción</label>
            <textarea class="atom-textarea" id="rol-descripcion" maxlength="150" rows="2" aria-describedby="rol-descripcion-error"></textarea>
            <p class="molecule-field-error" id="rol-descripcion-error" aria-live="polite"></p>
          </div>
          <fieldset class="organism-permission-picker" id="rol-permisos" aria-describedby="rol-permisos-error">
            <legend>Permisos<span class="molecule-field-required" aria-hidden="true"> *</span></legend>
            <p class="molecule-field-error" id="rol-permisos-error" aria-live="polite"></p>
            <div class="organism-permission-picker-grid" id="rol-permisos-grupos"></div>
          </fieldset>
        </form>
      </div>
      <footer class="organism-modal-foot">
        <button class="atom-button atom-button--ghost" type="button" data-cerrar><span>Cancelar</span></button>
        <button class="atom-button" type="submit" form="form-rol" id="rol-guardar">${icono('i-check')}<span>Guardar rol</span></button>
      </footer>
    </dialog>

    <template id="tpl-grupo-permisos">
      <div class="organism-permission-picker-group">
        <p class="atom-label-caps js-modulo"></p>
        <ul class="organism-permission-picker-list"></ul>
      </div>
    </template>
    <template id="tpl-permiso-casilla">
      <li>
        <label class="molecule-check"><input type="checkbox" class="js-casilla" /><span class="js-texto"></span></label>
      </li>
    </template>
`,
});

// ------------------------------------------------------------------ rol-detalle.html
pagina({
  archivo: 'rol-detalle.html',
  titulo: 'Detalle del rol',
  vista: 'rol-detalle.view.js',
  activo: 'roles',
  contenido: `        <div class="molecule-page-head">
          <div>
            <h1 id="detalle-nombre">Rol</h1>
            <p>// Configuración › Roles › Detalle</p>
          </div>
          <div class="molecule-page-head-actions">
            <a class="atom-button atom-button--ghost" href="/roles.html"><span>← Volver a roles</span></a>
            <a class="atom-button hidden" href="#" id="detalle-editar">${icono('i-key')}<span>Editar</span></a>
          </div>
        </div>

        <div class="molecule-empty-state hidden" id="detalle-no-encontrado">
          <strong>Rol no encontrado</strong>
          <p>El rol que busca no existe.</p>
          <div class="molecule-empty-state-action"><a class="atom-button" href="/roles.html"><span>Ver roles</span></a></div>
        </div>

        <div class="template-app-layout-stack hidden" id="detalle-contenido" aria-live="polite">
          <section class="molecule-panel" aria-labelledby="detalle-datos-titulo">
            <div class="molecule-panel-head"><h2 id="detalle-datos-titulo">Datos del rol</h2></div>
            <div class="molecule-panel-body">
              <dl class="molecule-data-list">
                <div><dt>Descripción</dt><dd id="detalle-descripcion"></dd></div>
                <div><dt>Tipo</dt><dd id="detalle-tipo"></dd></div>
                <div><dt>Estado</dt><dd><span class="atom-status-chip" id="detalle-estado"></span></dd></div>
                <div><dt>Usuarios</dt><dd id="detalle-usuarios"></dd></div>
              </dl>
            </div>
          </section>

          <section class="molecule-panel" aria-labelledby="detalle-permisos-titulo">
            <div class="molecule-panel-head"><h2 id="detalle-permisos-titulo">Permisos por módulo</h2></div>
            <div class="molecule-panel-body">
              <div class="organism-permission-picker-grid" id="detalle-permisos"></div>
            </div>
          </section>

          <section class="molecule-panel" aria-labelledby="detalle-usuarios-titulo">
            <div class="molecule-panel-head"><h2 id="detalle-usuarios-titulo">Usuarios con este rol</h2></div>
            <div class="molecule-panel-body">
${tablaVacia(
  'tabla-usuarios-rol',
  'Usuarios con este rol',
  [{ texto: 'Código' }, { texto: 'Nombre' }, { texto: 'Estado' }],
  'w480',
  ['Sin usuarios', 'Ningún usuario tiene este rol.']
)}
            </div>
          </section>
        </div>

        <template id="tpl-grupo-detalle">
          <div class="organism-permission-picker-group">
            <p class="atom-label-caps js-modulo"></p>
            <ul class="organism-permission-picker-list"></ul>
          </div>
        </template>
        <template id="tpl-permiso-detalle">
          <li><code class="js-codigo"></code> <span class="js-descripcion"></span></li>
        </template>
        <template id="tpl-usuario-rol">
          <tr>
            <td class="organism-data-table-cell-digit js-codigo"></td>
            <td class="js-nombre"></td>
            <td><span class="atom-status-chip js-estado"></span></td>
          </tr>
        </template>`,
});

// ------------------------------------------------------------------ permisos.html
pagina({
  archivo: 'permisos.html',
  titulo: 'Permisos',
  vista: 'permisos.view.js',
  activo: 'permisos',
  contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Permisos</h1>
            <p>// Configuración › catálogo de permisos (solo lectura)</p>
          </div>
        </div>

        <section class="molecule-panel" aria-labelledby="catalogo-titulo">
          <div class="molecule-panel-head"><h2 id="catalogo-titulo">Catálogo por módulo</h2></div>
          <div class="molecule-panel-body">
            <p class="molecule-field-hint" id="catalogo-cargando" aria-live="polite">Cargando…</p>
            <div class="organism-permission-picker-grid" id="catalogo"></div>
          </div>
        </section>

        <template id="tpl-modulo">
          <div class="organism-permission-picker-group">
            <p class="atom-label-caps js-modulo"></p>
            <table class="organism-log-table">
              <caption class="visually-hidden js-caption"></caption>
              <thead><tr><th scope="col">Código</th><th scope="col">Acción</th><th scope="col">Descripción</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </template>
        <template id="tpl-fila-permiso">
          <tr><td><code class="js-codigo"></code></td><td class="js-accion"></td><td class="js-descripcion"></td></tr>
        </template>`,
});

require('./paginas-002.js')({ pagina, tablaVacia, icono });
require('./paginas-003.js')({ pagina, icono, destino });
require('./paginas-004.js')({ pagina, tablaVacia, icono });
require('./paginas-005.js')({ pagina, tablaVacia, icono });
require('./paginas-006.js')({ pagina, icono });
console.log('Páginas escritas en', destino);
