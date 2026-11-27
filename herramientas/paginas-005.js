// Páginas de la spec 005 (vehículos, detalle del vehículo y mis vehículos), con el mismo marco que las
// anteriores (se ejecuta junto con armar-paginas.js). El formulario de vehículo viene de partes-vehiculo.js.
const { camposVehiculo, requerido } = require('./partes-vehiculo.js');

module.exports = ({ pagina, tablaVacia, icono }) => {
  const alerta = (id) => `<div class="molecule-alert molecule-alert--error molecule-field--full hidden" id="${id}" aria-live="assertive">
            ${icono('i-alert')}<p></p>
          </div>`;

  const dialogo = ({ id, titulo, subtitulo, formulario, guardar, textoGuardar = 'Guardar', cuerpo, clase = 'organism-form--grid' }) => `
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
        <button class="atom-button" type="submit" form="${formulario}" id="${guardar}">${icono('i-check')}<span>${textoGuardar}</span></button>
      </footer>
    </dialog>`;

  const opcionesDocumento = `<option value="CC">Cédula de ciudadanía (CC)</option>
              <option value="CE">Cédula de extranjería (CE)</option>
              <option value="TI">Tarjeta de identidad (TI)</option>
              <option value="PAS">Pasaporte (PAS)</option>
              <option value="NIT">NIT</option>`;

  // ---------------------------------------------------------------- vehiculos.html (HU-25, HU-28)
  pagina({
    archivo: 'vehiculos.html',
    titulo: 'Vehículos',
    vista: 'vehiculos.view.js',
    activo: 'vehiculos',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Vehículos</h1>
            <p>// Carros y motos registrados, su propietario y si están dentro del parqueadero</p>
          </div>
          <div class="molecule-page-head-actions">
            <button class="atom-button hidden" type="button" id="accion-nuevo">${icono('i-car')}<span>Nuevo vehículo</span></button>
          </div>
        </div>

        <section class="molecule-panel" aria-labelledby="panel-vehiculos-titulo">
          <div class="molecule-panel-head"><h2 id="panel-vehiculos-titulo">Vehículos registrados</h2></div>
          <div class="molecule-panel-body">
            <div class="molecule-filters">
              <div class="molecule-search-box" role="search">
                <label class="molecule-search-box-label" for="filtro-texto">Buscar</label>
                <input class="atom-input" id="filtro-texto" type="search" placeholder="Placa, nombre o documento del propietario" autocomplete="off" maxlength="60" />
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
                <label for="filtro-propietario">Propietario</label>
                <select class="atom-select" id="filtro-propietario">
                  <option value="">Todos</option>
                  <option value="ninguno">Sin propietario</option>
                </select>
              </div>
              <div class="molecule-field">
                <label for="filtro-dentro">Presencia</label>
                <select class="atom-select" id="filtro-dentro">
                  <option value="">Todos</option>
                  <option value="true">Dentro del parqueadero</option>
                  <option value="false">Fuera</option>
                </select>
              </div>
            </div>
${tablaVacia(
  'tabla-vehiculos',
  'Vehículos registrados',
  [
    { texto: 'Placa' },
    { texto: 'Tipo' },
    { texto: 'Marca y color' },
    { texto: 'Modelo' },
    { texto: 'Propietario' },
    { texto: 'Presencia' },
    { texto: 'Acciones', derecha: true },
  ],
  'w980',
  ['No se encontraron vehículos', 'Ningún vehículo coincide con la búsqueda o los filtros.']
)}
          </div>
        </section>

        <template id="tpl-vehiculo">
          <tr>
            <td><span class="atom-plate js-placa"></span></td>
            <td class="js-tipo"></td>
            <td><span class="js-marca"></span><span class="organism-data-table-cell-sub js-color"></span></td>
            <td class="organism-data-table-cell-digit js-modelo"></td>
            <td><span class="js-propietario"></span><span class="organism-data-table-cell-sub js-documento"></span></td>
            <td><span class="atom-status-chip js-dentro"></span></td>
            <td class="organism-log-table-right">
              <div class="organism-data-table-row-actions">
                <a class="atom-button atom-button--ghost atom-button--sm js-ver" href="#"><span>Ver</span></a>
              </div>
            </td>
          </tr>
        </template>`,
    extra: dialogo({
      id: 'dialogo-vehiculo',
      titulo: 'Nuevo vehículo',
      subtitulo: '// La placa se guarda en mayúsculas, sin espacios ni guiones',
      formulario: 'form-vehiculo',
      guardar: 'vehiculo-guardar',
      cuerpo: `${alerta('vehiculo-alerta')}
          ${camposVehiculo('vehiculo', icono)}`,
    }),
  });

  // ---------------------------------------------------------------- vehiculo-detalle.html (HU-26, HU-27, HU-28)
  pagina({
    archivo: 'vehiculo-detalle.html',
    titulo: 'Detalle del vehículo',
    vista: 'vehiculo-detalle.view.js',
    activo: 'vehiculos',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1><span class="atom-plate atom-plate--large" id="detalle-placa">Vehículo</span></h1>
            <p id="detalle-subtitulo">// Vehículos › Detalle</p>
          </div>
          <div class="molecule-page-head-actions">
            <a class="atom-button atom-button--ghost" href="/vehiculos.html"><span>← Volver a vehículos</span></a>
            <button class="atom-button hidden" type="button" id="accion-editar">${icono('i-key')}<span>Editar</span></button>
          </div>
        </div>

        <div class="molecule-empty-state hidden" id="detalle-no-encontrado">
          <strong>Vehículo no encontrado</strong>
          <p>El vehículo que busca no está registrado.</p>
          <div class="molecule-empty-state-action"><a class="atom-button" href="/vehiculos.html"><span>Ver vehículos</span></a></div>
        </div>

        <div class="template-app-layout-stack hidden" id="detalle-contenido" aria-live="polite">
          <section class="molecule-panel" aria-labelledby="detalle-datos-titulo">
            <div class="molecule-panel-head"><h2 id="detalle-datos-titulo">Datos del vehículo</h2></div>
            <div class="molecule-panel-body">
              <dl class="molecule-data-list">
                <div><dt>Tipo</dt><dd id="detalle-tipo"></dd></div>
                <div><dt>Marca</dt><dd id="detalle-marca"></dd></div>
                <div><dt>Color</dt><dd id="detalle-color"></dd></div>
                <div><dt>Modelo</dt><dd id="detalle-modelo"></dd></div>
                <div><dt>Presencia</dt><dd><span class="atom-status-chip" id="detalle-dentro"></span></dd></div>
                <div class="hidden" id="detalle-celda-fila"><dt>Celda actual</dt><dd id="detalle-celda"></dd></div>
              </dl>
            </div>
          </section>

          <section class="molecule-panel" aria-labelledby="detalle-propietario-titulo">
            <div class="molecule-panel-head">
              <h2 id="detalle-propietario-titulo">Propietario</h2>
              <div class="molecule-page-head-actions">
                <button class="atom-button atom-button--sm hidden" type="button" id="accion-asociar">${icono('i-user')}<span>Asociar propietario</span></button>
                <button class="atom-button atom-button--sm hidden" type="button" id="accion-reasignar">${icono('i-user')}<span>Reasignar</span></button>
                <button class="atom-button atom-button--ghost atom-button--sm hidden" type="button" id="accion-quitar"><span>Quitar propietario</span></button>
              </div>
            </div>
            <div class="molecule-panel-body">
              <p id="detalle-sin-propietario">Sin propietario (vehículo de visitante).</p>
              <dl class="molecule-data-list hidden" id="detalle-propietario">
                <div><dt>Nombre</dt><dd><a class="atom-link" id="detalle-propietario-nombre" href="#"></a></dd></div>
                <div><dt>Documento</dt><dd id="detalle-propietario-documento"></dd></div>
                <div><dt>Estado</dt><dd><span class="atom-status-chip" id="detalle-propietario-estado"></span></dd></div>
              </dl>
            </div>
          </section>

          <section class="molecule-panel" aria-labelledby="detalle-historial-titulo">
            <div class="molecule-panel-head"><h2 id="detalle-historial-titulo">Historial de propietarios</h2></div>
            <div class="molecule-panel-body">
${tablaVacia(
  'tabla-historial',
  'Historial de propietarios',
  [{ texto: 'Propietario' }, { texto: 'Desde' }, { texto: 'Hasta' }],
  'w480',
  ['Sin historial', 'El vehículo nunca ha tenido propietario.']
)}
            </div>
          </section>

          <section class="molecule-panel" aria-labelledby="detalle-movimientos-titulo">
            <div class="molecule-panel-head"><h2 id="detalle-movimientos-titulo">Últimos 10 movimientos</h2></div>
            <div class="molecule-panel-body">
${tablaVacia(
  'tabla-movimientos',
  'Últimos movimientos',
  [{ texto: 'Entrada' }, { texto: 'Salida' }, { texto: 'Celda' }, { texto: 'Tiempo', derecha: true }, { texto: 'Estado' }],
  'w600',
  ['Sin movimientos', 'El vehículo aún no registra entradas.']
)}
            </div>
          </section>
        </div>

        <template id="tpl-historial">
          <tr>
            <td class="js-nombre"></td>
            <td class="organism-data-table-cell-nowrap js-desde"></td>
            <td class="organism-data-table-cell-nowrap js-hasta"></td>
          </tr>
        </template>
        <template id="tpl-movimiento">
          <tr>
            <td class="organism-data-table-cell-nowrap js-entrada"></td>
            <td class="organism-data-table-cell-nowrap js-salida"></td>
            <td class="js-celda"></td>
            <td class="organism-log-table-right js-tiempo"></td>
            <td><span class="atom-status-chip js-estado"></span></td>
          </tr>
        </template>`,
    extra: `${dialogo({
      id: 'dialogo-vehiculo',
      titulo: 'Editar vehículo',
      subtitulo: '// Solo el Administrador actualiza los datos (RN-02)',
      formulario: 'form-vehiculo',
      guardar: 'vehiculo-guardar',
      cuerpo: `${alerta('vehiculo-alerta')}
          ${camposVehiculo('vehiculo', icono)}`,
    })}
${dialogo({
  id: 'dialogo-propietario',
  titulo: 'Asociar propietario',
  subtitulo: '// El usuario debe estar registrado y activo',
  formulario: 'form-propietario',
  guardar: 'propietario-guardar',
  textoGuardar: 'Asociar',
  cuerpo: `${alerta('propietario-alerta')}
          <div class="molecule-field">
            <label for="propietario-tipo-documento">Tipo de documento${requerido}</label>
            <select class="atom-select" id="propietario-tipo-documento" required aria-describedby="propietario-tipo-documento-error">
              ${opcionesDocumento}
            </select>
            <p class="molecule-field-error" id="propietario-tipo-documento-error" aria-live="polite"></p>
          </div>
          <div class="molecule-field">
            <label for="propietario-numero-documento">Número de documento${requerido}</label>
            <input class="atom-input" id="propietario-numero-documento" type="text" maxlength="20" required inputmode="numeric" autocomplete="off" aria-describedby="propietario-numero-documento-error" />
            <p class="molecule-field-error" id="propietario-numero-documento-error" aria-live="polite"></p>
          </div>`,
})}`,
  });

  // ---------------------------------------------------------------- mis-vehiculos.html (HU-28 E3)
  pagina({
    archivo: 'mis-vehiculos.html',
    titulo: 'Mis vehículos',
    vista: 'mis-vehiculos.view.js',
    activo: 'mis-vehiculos',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Mis vehículos</h1>
            <p>// Vehículos asociados a su cuenta. Para agregar uno, acérquese a la caseta.</p>
          </div>
        </div>

        <section class="molecule-panel" aria-labelledby="panel-mis-vehiculos-titulo">
          <div class="molecule-panel-head"><h2 id="panel-mis-vehiculos-titulo">Vehículos asociados</h2></div>
          <div class="molecule-panel-body">
${tablaVacia(
  'tabla-mis-vehiculos',
  'Mis vehículos',
  [{ texto: 'Placa' }, { texto: 'Tipo' }, { texto: 'Marca y color' }, { texto: 'Modelo' }, { texto: 'Presencia' }],
  'w600',
  ['Sin vehículos', 'Aún no tiene vehículos asociados a su cuenta.']
)}
          </div>
        </section>

        <template id="tpl-mi-vehiculo">
          <tr>
            <td><span class="atom-plate js-placa"></span></td>
            <td class="js-tipo"></td>
            <td><span class="js-marca"></span><span class="organism-data-table-cell-sub js-color"></span></td>
            <td class="organism-data-table-cell-digit js-modelo"></td>
            <td><span class="atom-status-chip js-dentro"></span></td>
          </tr>
        </template>`,
  });
};
