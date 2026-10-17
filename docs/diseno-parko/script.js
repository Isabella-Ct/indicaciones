/* ==========================================================================
   Ejercicio 6 · PARKO — tu código JavaScript va aquí
   ==========================================================================

   Elementos con los que vas a trabajar
   ------------------------------------
   Niveles          Pestañas .level-tab (data-level = id del nivel)
                    Paneles #level-1 (Sótano 1) y #level-2 (Sótano 2)

   Espacios         Botones .space dentro de cada nivel. Datos en data-*:
                    space, level, type (Carro / Moto / Accesible),
                    status (Libre / Ocupado / Reservado / Fuera de servicio),
                    plate, vehicle, client, holder, entry (fecha y hora ISO),
                    ticket, rateMinute, dayCap, note.
                    Clases de estado: space--free, space--occupied,
                    space--reserved, space--out.

   Detalle          #space-empty  -> mensaje "Selecciona un espacio"
                    #space-detail -> detalle del espacio
                    Campos: #detail-level, #detail-code, #detail-status,
                    #detail-plate, #detail-vehicle, #detail-client,
                    #detail-ticket, #detail-entry, #detail-elapsed,
                    #detail-rate, #detail-cap, #detail-charge,
                    #detail-cap-pct, #detail-cap-bar (ancho: --v),
                    #detail-note.
                    Botones: #btn-checkout, #btn-print-ticket,
                    #btn-close-detail.

   Bitácora         #movement-log (tbody)

   Modal            #modal-new-entry (overlay)
                    Abrir: #btn-new-entry · Cerrar: #btn-close-entry,
                    #btn-cancel-entry · Formulario: #new-entry-form
                    (campos #entry-…, radios name="vehicleType" y
                    name="clientType"). Ticket: #ticket-number,
                    #ticket-plate, #ticket-space, #ticket-time,
                    #ticket-rate.

   La hora "actual" del ejercicio es 13/10/2026 18:42 (#clock-time).
   La clase .hidden (en styles.css) oculta cualquier elemento.
   La clase .is-selected marca el espacio activo; .is-active la pestaña.

   Retos
   -----
   1. Al iniciar, ocultar #level-2, #space-detail y #modal-new-entry.
   2. Pestañas: mostrar solo el nivel elegido y marcar la pestaña activa.
   3. Clic en un espacio: marcarlo y mostrar el detalle con sus datos.
   4. Calcular el tiempo dentro (minutos entre data-entry y la hora actual)
      y el valor a pagar: minutos × tarifa, sin pasar el tope del día.
      Las mensualidades pagan $0.
   5. Para espacios Libre / Reservado / Fuera de servicio, mostrar un
      mensaje distinto en lugar del cobro.
   6. "Registrar salida": convertir el espacio en libre (cambiar clases,
      contenido y data-status) y agregar una fila a #movement-log.
   7. Formulario: escribir la placa en mayúsculas mientras se teclea y
      actualizar el ticket de vista previa.
   8. Al enviar: ocupar el espacio elegido en el mapa.
   ========================================================================== */
