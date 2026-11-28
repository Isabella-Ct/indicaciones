// Páginas de la spec 012 (Reservas del personal y Panel del cliente › Mis reservas), con el mismo marco que las
// anteriores (se ejecuta junto con armar-paginas.js). El aviso de reserva en la entrada lo pone movimientos.view.js.
module.exports = ({ pagina, tablaVacia, icono }) => {
  const requerido = '<span class="molecule-field-required" aria-hidden="true"> *</span>';
  const error = (id) => `<p class="molecule-field-error" id="${id}-error" aria-live="polite"></p>`;
  const estados = `<option value="">Todos</option>
                  <option value="confirmada">Confirmadas</option>
                  <option value="cumplida">Cumplidas</option>
                  <option value="cancelada">Canceladas</option>
                  <option value="vencida">Vencidas</option>`;
  const fila = (conCliente) => `<tr>
            <td class="organism-data-table-cell-digit js-codigo"></td>
            <td class="organism-data-table-cell-nowrap js-hora"></td>
            <td><span class="atom-plate js-placa"></span></td>
            ${conCliente ? '<td><span class="js-cliente"></span><span class="organism-data-table-cell-sub js-documento"></span></td>' : ''}
            <td><span class="js-celda"></span><span class="organism-data-table-cell-sub js-parqueadero"></span></td>
            <td><span class="atom-status-chip js-estado"></span></td>
            <td class="organism-log-table-right">
              <div class="organism-data-table-row-actions">
                <button class="atom-button atom-button--ghost atom-button--sm hidden js-cancelar" type="button"><span>Cancelar</span></button>
              </div>
            </td>
          </tr>`;

  // ------------------------------------------------------------------ reservas.html (HU-54)
  pagina({
    archivo: 'reservas.html',
    titulo: 'Reservas',
    vista: 'reservas.view.js',
    activo: 'reservas',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Reservas</h1>
            <p>// Reservas del día ordenadas por hora · la celda queda reservada desde la hora de inicio</p>
          </div>
        </div>

        <section class="molecule-panel" aria-labelledby="panel-reservas-titulo">
          <div class="molecule-panel-head"><h2 id="panel-reservas-titulo">Reservas del <span id="reservas-dia">día</span></h2></div>
          <div class="molecule-panel-body">
            <div class="molecule-filters">
              <div class="molecule-field">
                <label for="filtro-fecha">Fecha</label>
                <input class="atom-input" id="filtro-fecha" type="date" />
              </div>
              <div class="molecule-field">
                <label for="filtro-estado">Estado</label>
                <select class="atom-select" id="filtro-estado">
                  ${estados}
                </select>
              </div>
              <div class="molecule-search-box" role="search">
                <label class="molecule-search-box-label" for="filtro-texto">Buscar</label>
                <input class="atom-input" id="filtro-texto" type="search" placeholder="Placa, código o cliente" autocomplete="off" maxlength="60" />
              </div>
            </div>
${tablaVacia(
  'tabla-reservas',
  'Reservas del día',
  [{ texto: 'Código' }, { texto: 'Hora' }, { texto: 'Placa' }, { texto: 'Cliente' }, { texto: 'Celda' }, { texto: 'Estado' }, { texto: 'Acciones', derecha: true }],
  'w960',
  ['Sin reservas', 'No hay reservas para esa fecha y estado.']
)}
          </div>
        </section>

        <template id="tpl-reserva">
          ${fila(true)}
        </template>`,
  });

  // ------------------------------------------------------------------ mis-reservas.html (HU-52, HU-53)
  pagina({
    archivo: 'mis-reservas.html',
    titulo: 'Mis reservas',
    vista: 'mis-reservas.view.js',
    activo: 'mis-reservas',
    contenido: `        <div class="molecule-page-head">
          <div>
            <h1>Mis reservas</h1>
            <p>// Panel del cliente › aparte una celda hasta con 7 días de anticipación</p>
          </div>
        </div>

        <div class="molecule-empty-state hidden" id="sin-vehiculos">
          <strong>Sin vehículos</strong>
          <p>Para reservar debe tener un vehículo registrado a su nombre.</p>
          <div class="molecule-empty-state-action"><a class="atom-button" href="/mis-vehiculos.html"><span>Ver mis vehículos</span></a></div>
        </div>

        <section class="molecule-panel hidden" id="panel-reservar" aria-labelledby="panel-reservar-titulo">
          <div class="molecule-panel-head"><h2 id="panel-reservar-titulo">Reservar</h2></div>
          <div class="molecule-panel-body">
            <form class="organism-form--grid" id="form-reserva" novalidate>
              <div class="molecule-alert molecule-alert--error molecule-field--full hidden" id="reserva-alerta" aria-live="assertive">
                ${icono('i-alert')}<p></p>
              </div>
              <div class="molecule-field">
                <label for="reserva-vehiculo">Vehículo${requerido}</label>
                <select class="atom-select" id="reserva-vehiculo" required aria-describedby="reserva-vehiculo-error"></select>
                ${error('reserva-vehiculo')}
              </div>
              <div class="molecule-field">
                <label for="reserva-inicio">Fecha y hora de llegada${requerido}</label>
                <input class="atom-input" id="reserva-inicio" type="datetime-local" required aria-describedby="reserva-inicio-hint reserva-inicio-error" />
                <p class="molecule-field-hint" id="reserva-inicio-hint">Hasta 7 días; la celda le espera 30 minutos.</p>
                ${error('reserva-inicio')}
              </div>
              <div class="molecule-field">
                <label for="reserva-celda">Celda</label>
                <select class="atom-select" id="reserva-celda" aria-describedby="reserva-celda-hint reserva-celda-error">
                  <option value="">Asignar automáticamente</option>
                </select>
                <p class="molecule-field-hint" id="reserva-celda-hint" aria-live="polite">Elija la hora para ver las celdas libres.</p>
                ${error('reserva-celda')}
              </div>
              <div class="molecule-field--full">
                <button class="atom-button" type="submit" id="reserva-guardar">${icono('i-calendar')}<span>Reservar</span></button>
              </div>
            </form>
          </div>
        </section>

        <section class="molecule-panel" aria-labelledby="panel-mis-reservas-titulo">
          <div class="molecule-panel-head"><h2 id="panel-mis-reservas-titulo">Mis reservas</h2></div>
          <div class="molecule-panel-body">
            <div class="molecule-filters">
              <div class="molecule-field">
                <label for="filtro-estado">Estado</label>
                <select class="atom-select" id="filtro-estado">
                  ${estados}
                </select>
              </div>
            </div>
${tablaVacia(
  'tabla-mis-reservas',
  'Mis reservas',
  [{ texto: 'Código' }, { texto: 'Llegada' }, { texto: 'Placa' }, { texto: 'Celda' }, { texto: 'Estado' }, { texto: 'Acciones', derecha: true }],
  'w760',
  ['Sin reservas', 'Todavía no tiene reservas.']
)}
          </div>
        </section>

        <template id="tpl-mi-reserva">
          ${fila(false)}
        </template>
        <template id="tpl-opcion"><option></option></template>`,
  });
};
