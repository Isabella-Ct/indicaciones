// Páginas de la spec 002, armadas con el mismo marco que las de la 001 (se ejecuta junto con armar-paginas.js).
module.exports = ({ pagina, tablaVacia, icono }) => {
  const AVISO_PRIVACIDAD = `<p class="molecule-field-hint" id="aviso-privacidad">
                Aviso de privacidad (Ley 1581 de 2012): Parking Lot ABC trata los datos personales solo para
                prestar el servicio de parqueadero (identificación, contacto, vehículos, cobros y avisos). El
                titular puede consultarlos, actualizarlos o pedir su corrección desde Mi perfil o en la caseta.
              </p>`;

  const campoFoto = (prefijo, conQuitar) => `<div class="molecule-field molecule-field--full molecule-photo-input" id="${prefijo}-foto-campo">
                <span class="molecule-field-label">Fotografía (opcional)</span>
                <div class="molecule-photo-input-row">
                  <div class="molecule-photo-input-preview" aria-hidden="true">
                    <img class="hidden" alt="" />
                    <span class="js-iniciales">—</span>
                  </div>
                  <div class="molecule-photo-input-actions">
                    <input class="visually-hidden" id="${prefijo}-foto" type="file" accept="image/jpeg,image/png" aria-describedby="${prefijo}-foto-hint ${prefijo}-foto-error" />
                    <label class="atom-button atom-button--ghost atom-button--sm" for="${prefijo}-foto">Elegir foto</label>
                    <p class="molecule-field-hint" id="${prefijo}-foto-hint">JPG o PNG, máximo 2 MB.</p>
                    ${conQuitar ? `<label class="molecule-check hidden js-quitar-etiqueta"><input type="checkbox" class="js-quitar" />Quitar la foto actual</label>` : ''}
                  </div>
                </div>
                <p class="molecule-field-error" id="${prefijo}-foto-error" aria-live="polite"></p>
              </div>`;

  const campo = (id, etiqueta, { tipo = 'text', max, requerido = true, extra = '', pista } = {}) => `<div class="molecule-field">
                <label for="${id}">${etiqueta}${requerido ? '<span class="molecule-field-required" aria-hidden="true"> *</span>' : ''}</label>
                <input class="atom-input" id="${id}" type="${tipo}"${max ? ` maxlength="${max}"` : ''}${requerido ? ' required' : ''} ${extra} aria-describedby="${pista ? `${id}-hint ` : ''}${id}-error" />
                ${pista ? `<p class="molecule-field-hint" id="${id}-hint">${pista}</p>` : ''}
                <p class="molecule-field-error" id="${id}-error" aria-live="polite"></p>
              </div>`;

  const opcionesDocumento = `<option value="CC">Cédula de ciudadanía (CC)</option>
                  <option value="CE">Cédula de extranjería (CE)</option>
                  <option value="TI">Tarjeta de identidad (TI)</option>
                  <option value="PAS">Pasaporte (PAS)</option>
                  <option value="NIT">NIT</option>`;

  // ---------------------------------------------------------------- usuarios.html
  pagina({
    archivo: 'usuarios.html',
    titulo: 'Usuarios',
    vista: 'usuarios.view.js',
    activo: 'usuarios',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Usuarios</h1>
            <p>// Registro y consulta de administradores, operadores y clientes</p>
          </div>
          <div class="molecule-page-head-actions">
            <button class="atom-button hidden" type="button" id="accion-nuevo">
              ${icono('i-user')}<span>Nuevo usuario</span>
            </button>
          </div>
        </div>

        <section class="molecule-panel" aria-labelledby="panel-usuarios-titulo">
          <div class="molecule-panel-head"><h2 id="panel-usuarios-titulo">Usuarios registrados</h2></div>
          <div class="molecule-panel-body">
            <div class="molecule-filters">
              <div class="molecule-search-box" role="search">
                <label class="molecule-search-box-label" for="filtro-texto">Buscar</label>
                <input class="atom-input" id="filtro-texto" type="search" placeholder="Documento, nombre o correo" autocomplete="off" maxlength="60" />
              </div>
              <div class="molecule-field">
                <label for="filtro-rol">Rol</label>
                <select class="atom-select" id="filtro-rol"><option value="">Todos</option></select>
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
  'tabla-usuarios',
  'Usuarios registrados',
  [{ texto: 'Usuario' }, { texto: 'Documento' }, { texto: 'Contacto' }, { texto: 'Rol' }, { texto: 'Estado' }, { texto: 'Acciones', derecha: true }],
  'w980',
  ['No se encontraron usuarios', 'Ningún usuario coincide con la búsqueda o los filtros.']
)}
          </div>
        </section>

        <template id="tpl-usuario">
          <tr>
            <td>
              <div class="organism-data-table-cell-person">
                <span class="atom-avatar" aria-hidden="true"><img class="hidden" alt="" /><span class="js-iniciales"></span></span>
                <div>
                  <strong class="js-nombre"></strong>
                  <span class="organism-data-table-cell-sub js-codigo"></span>
                </div>
              </div>
            </td>
            <td class="organism-data-table-cell-nowrap js-documento"></td>
            <td><span class="js-correo"></span><span class="organism-data-table-cell-sub js-celular"></span></td>
            <td class="js-rol"></td>
            <td><span class="atom-status-chip js-estado"></span></td>
            <td class="organism-log-table-right">
              <div class="organism-data-table-row-actions">
                <a class="atom-button atom-button--ghost atom-button--sm js-ver" href="#"><span>Ver</span></a>
                <button class="atom-button atom-button--ghost atom-button--sm hidden js-editar" type="button"><span>Editar</span></button>
                <button class="atom-button atom-button--ghost atom-button--sm hidden js-estado-accion" type="button"><span></span></button>
              </div>
            </td>
          </tr>
        </template>
        <template id="tpl-opcion"><option></option></template>`,
    extra: `
    <!-- Diálogo Nuevo / Editar usuario (HU-07, HU-09) -->
    <dialog class="organism-modal" id="dialogo-usuario" aria-labelledby="usuario-titulo">
      <header class="organism-modal-head">
        <div><h2 id="usuario-titulo">Nuevo usuario</h2><p id="usuario-subtitulo">// Los campos con * son obligatorios</p></div>
        <button class="atom-icon-button" type="button" data-cerrar aria-label="Cerrar">${icono('i-x')}</button>
      </header>
      <div class="organism-modal-body">
        <form class="organism-form--grid" id="form-usuario" novalidate>
          <div class="molecule-alert molecule-alert--error molecule-field--full hidden" id="usuario-alerta" aria-live="assertive">
            ${icono('i-alert')}<p></p>
          </div>
          <div class="molecule-field hidden" id="usuario-codigo-campo">
            <label for="usuario-codigo">Código</label>
            <input class="atom-input" id="usuario-codigo" type="text" readonly aria-readonly="true" />
          </div>
          <div class="molecule-field">
            <label for="usuario-tipo-documento">Tipo de documento<span class="molecule-field-required" aria-hidden="true"> *</span></label>
            <select class="atom-select" id="usuario-tipo-documento" required aria-describedby="usuario-tipo-documento-error">
                  ${opcionesDocumento}
            </select>
            <p class="molecule-field-error" id="usuario-tipo-documento-error" aria-live="polite"></p>
          </div>
          ${campo('usuario-numero-documento', 'Número de documento', { max: 20, extra: 'inputmode="numeric" autocomplete="off"', pista: '5 a 20 dígitos (pasaporte: letras y dígitos).' })}
          ${campo('usuario-nombre', 'Nombre completo', { max: 100, extra: 'autocomplete="off"' })}
          ${campo('usuario-correo', 'Correo', { tipo: 'email', max: 120, extra: 'autocomplete="off"' })}
          ${campo('usuario-celular', 'Celular', { tipo: 'tel', max: 10, extra: 'inputmode="numeric" autocomplete="off"', pista: '10 dígitos, empieza por 3.' })}
          <div class="molecule-field">
            <label for="usuario-rol">Rol<span class="molecule-field-required" aria-hidden="true"> *</span></label>
            <select class="atom-select" id="usuario-rol" required aria-describedby="usuario-rol-error"></select>
            <p class="molecule-field-error" id="usuario-rol-error" aria-live="polite"></p>
          </div>
          ${campoFoto('usuario', true)}
          <div class="molecule-field molecule-field--full" id="usuario-autorizacion-campo">
            ${AVISO_PRIVACIDAD}
            <label class="molecule-check"><input type="checkbox" id="usuario-autorizacion" aria-describedby="aviso-privacidad usuario-autorizacion-error" />Autorizo el tratamiento de mis datos personales<span class="molecule-field-required" aria-hidden="true"> *</span></label>
            <p class="molecule-field-error" id="usuario-autorizacion-error" aria-live="polite"></p>
          </div>
        </form>
      </div>
      <footer class="organism-modal-foot">
        <button class="atom-button atom-button--ghost" type="button" data-cerrar><span>Cancelar</span></button>
        <button class="atom-button" type="submit" form="form-usuario" id="usuario-guardar">${icono('i-check')}<span>Registrar usuario</span></button>
      </footer>
    </dialog>
`,
  });

  // ---------------------------------------------------------------- usuario-detalle.html
  pagina({
    archivo: 'usuario-detalle.html',
    titulo: 'Detalle del usuario',
    vista: 'usuario-detalle.view.js',
    activo: 'usuarios',
    contenido: `        <div class="molecule-page-head">
          <div class="organism-data-table-cell-person">
            <span class="atom-avatar atom-avatar--md" id="detalle-avatar" aria-hidden="true"><img class="hidden" alt="" /><span class="js-iniciales"></span></span>
            <div>
              <h1 id="detalle-nombre">Usuario</h1>
              <p>// Usuarios › Detalle</p>
            </div>
          </div>
          <div class="molecule-page-head-actions">
            <a class="atom-button atom-button--ghost" href="/usuarios.html"><span>← Volver a usuarios</span></a>
            <a class="atom-button hidden" href="#" id="detalle-editar">${icono('i-key')}<span>Editar</span></a>
          </div>
        </div>

        <div class="molecule-empty-state hidden" id="detalle-no-encontrado">
          <strong>Usuario no encontrado</strong>
          <p>El usuario que busca no existe o no tiene permiso para verlo.</p>
          <div class="molecule-empty-state-action"><a class="atom-button" href="/usuarios.html"><span>Ver usuarios</span></a></div>
        </div>

        <div class="template-app-layout-stack hidden" id="detalle-contenido" aria-live="polite">
          <section class="molecule-panel" aria-labelledby="detalle-datos-titulo">
            <div class="molecule-panel-head"><h2 id="detalle-datos-titulo">Datos del usuario</h2></div>
            <div class="molecule-panel-body">
              <dl class="molecule-data-list">
                <div><dt>Código</dt><dd id="detalle-codigo"></dd></div>
                <div><dt>Documento</dt><dd id="detalle-documento"></dd></div>
                <div><dt>Correo</dt><dd id="detalle-correo"></dd></div>
                <div><dt>Celular</dt><dd id="detalle-celular"></dd></div>
                <div><dt>Rol</dt><dd id="detalle-rol"></dd></div>
                <div><dt>Estado</dt><dd><span class="atom-status-chip" id="detalle-estado"></span></dd></div>
                <div><dt>Autorización de datos</dt><dd id="detalle-autorizacion"></dd></div>
                <div><dt>Registrado</dt><dd id="detalle-registro"></dd></div>
              </dl>
            </div>
          </section>

          <section class="molecule-panel" aria-labelledby="detalle-membresia-titulo">
            <div class="molecule-panel-head"><h2 id="detalle-membresia-titulo">Membresía vigente</h2></div>
            <div class="molecule-panel-body">
              <p id="detalle-sin-membresia">Sin membresía vigente.</p>
              <dl class="molecule-data-list hidden" id="detalle-membresia">
                <div><dt>Plan</dt><dd id="membresia-plan"></dd></div>
                <div><dt>Placa</dt><dd id="membresia-placa"></dd></div>
                <div><dt>Desde</dt><dd id="membresia-inicio"></dd></div>
                <div><dt>Hasta</dt><dd id="membresia-fin"></dd></div>
              </dl>
            </div>
          </section>

          <section class="molecule-panel" aria-labelledby="detalle-vehiculos-titulo">
            <div class="molecule-panel-head"><h2 id="detalle-vehiculos-titulo">Vehículos asociados</h2></div>
            <div class="molecule-panel-body">
${tablaVacia(
  'tabla-vehiculos-usuario',
  'Vehículos asociados',
  [{ texto: 'Placa' }, { texto: 'Tipo' }, { texto: 'Marca' }, { texto: 'Color' }, { texto: 'Estado' }],
  'w600',
  ['Sin vehículos', 'El usuario no tiene vehículos asociados.']
)}
            </div>
          </section>
        </div>

        <template id="tpl-vehiculo-usuario">
          <tr>
            <td><span class="atom-plate js-placa"></span></td>
            <td class="js-tipo"></td>
            <td class="js-marca"></td>
            <td class="js-color"></td>
            <td><span class="atom-status-chip js-estado"></span></td>
          </tr>
        </template>`,
  });

  // ---------------------------------------------------------------- mi-perfil.html
  pagina({
    archivo: 'mi-perfil.html',
    titulo: 'Mi perfil',
    vista: 'mi-perfil.view.js',
    activo: 'mi-perfil',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Mi perfil</h1>
            <p>// Mis datos personales</p>
          </div>
        </div>

        <div class="template-app-layout-stack">
          <section class="molecule-panel" aria-labelledby="perfil-fijos-titulo">
            <div class="molecule-panel-head"><h2 id="perfil-fijos-titulo">Datos de la cuenta</h2></div>
            <div class="molecule-panel-body">
              <p class="molecule-field-hint">Estos datos solo los puede cambiar el administrador.</p>
              <dl class="molecule-data-list">
                <div><dt>Código</dt><dd id="perfil-codigo"></dd></div>
                <div><dt>Documento</dt><dd id="perfil-documento"></dd></div>
                <div><dt>Rol</dt><dd id="perfil-rol"></dd></div>
                <div><dt>Estado</dt><dd><span class="atom-status-chip" id="perfil-estado"></span></dd></div>
              </dl>
            </div>
          </section>

          <section class="molecule-panel" aria-labelledby="perfil-datos-titulo">
            <div class="molecule-panel-head"><h2 id="perfil-datos-titulo">Datos de contacto</h2></div>
            <div class="molecule-panel-body">
              <form class="organism-form--grid" id="form-perfil" novalidate>
                <div class="molecule-alert molecule-alert--error molecule-field--full hidden" id="perfil-alerta" aria-live="assertive">
                  ${icono('i-alert')}<p></p>
                </div>
                ${campo('perfil-nombre', 'Nombre completo', { max: 100, extra: 'autocomplete="name"' })}
                ${campo('perfil-correo', 'Correo', { tipo: 'email', max: 120, extra: 'autocomplete="email"' })}
                ${campo('perfil-celular', 'Celular', { tipo: 'tel', max: 10, extra: 'inputmode="numeric" autocomplete="tel"', pista: '10 dígitos, empieza por 3.' })}
                ${campoFoto('perfil', true)}
                <div class="molecule-field molecule-field--full">
                  ${AVISO_PRIVACIDAD}
                </div>
                <div class="molecule-panel-actions molecule-field--full">
                  <button class="atom-button" type="submit" id="perfil-guardar">${icono('i-check')}<span>Guardar cambios</span></button>
                </div>
              </form>
            </div>
          </section>
        </div>`,
  });
};
