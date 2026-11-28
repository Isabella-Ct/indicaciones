# Integración con el frontend — 007-control-ingreso-salida

## 1. Inventario

| Pantalla (SRS B.2) | Página | Vista (página) | Servicio → endpoint |
|---|---|---|---|
| Movimientos (caseta): registrar entrada, registrar salida, vehículos dentro, anular | `movimientos.html` | `views/movimientos.view.js` | `registrarEntrada`, `registrarSalida`, `listarMovimientos`, `anularMovimiento`, `obtenerTicket` + `listarParqueaderos`, `listarPuertas`, `listarCeldas`, `buscarPorPlaca`, `restriccionHoy` |
| Movimientos › Ticket (vista de impresión de 80 mm) | `ticket.html` | `views/ticket.view.js` | `obtenerTicket`, `enviarTicket` |

Servicios: `js/services/movimientos.service.js` y `js/services/tickets.service.js`.

## 2. Componentes por nivel (Atomic Design)

| Nivel | Componente | Clase CSS | Uso |
|---|---|---|---|
| Átomo | `atomos/placa.js` (existente) | `atom-plate` | placas en tablas y ticket |
| Molécula | `moleculas/aviso-pico-placa.js` (existente) | `molecule-pico-placa` | aviso de hoy en la caseta |
| Molécula | `moleculas/selector-tipo.js` (existente) | `molecule-tiles` | tipo de una placa nueva |
| Organismo | `organismos/ticket.js` · `ponerTicket(raiz, ticket)` (nuevo) | `organism-ticket` | ticket de la entrada y vista de impresión |
| Organismo | `organismos/tabla-datos.js`, `modal.js` (existentes) | — | vehículos dentro y diálogo de anulación |
| Página | las vistas de arriba | — | las únicas que llaman a `services/` |

## 3. Reglas de la interfaz

- La placa se escribe en el campo amarillo; al salir del campo se busca el vehículo: si existe, se muestra «marca · color · propietario» y el tipo queda fijo; si no, se piden los mosaicos Carro / Moto («vehículo ocasional»).
- Las puertas de entrada son las de `uso=entrada`; las de salida, `uso=salida` del parqueadero de la celda.
- La celda es opcional: la primera opción es «Asignar automáticamente (menor código)».
- Salida: un texto que empieza por `T-` se busca como ticket; si no, como placa (y se marca «El conductor no tiene el ticket»).
- Vehículos dentro: tiempo transcurrido con `formatearDuracion`; las filas de más de 24 h llevan la clase `organism-log-table-row--alert` y el texto «Más de 24 h» (no solo color).
- Anular solo aparece con `movimientos.anular`; el servidor aplica el límite de 15 minutos.
- El menú «Movimientos» exige `movimientos.ver` y es la primera pantalla del Operador.

## 4. Errores

- `PICO_Y_PLACA`, `VEHICULO_DENTRO`, `SIN_CELDAS`, `CELDA_NO_DISPONIBLE`, `PUERTA_NO_VALIDA` → alerta del formulario con el mensaje;
- `VALIDACION` → junto al campo (placa, tipo, celda);
- `MOVIMIENTO_NO_ABIERTO` → «El vehículo no tiene una entrada registrada»;
- `SOLO_ADMIN_ANULA`, `MOVIMIENTO_NO_ANULABLE` → alerta del diálogo de anulación;
- `SIN_CORREO` → aviso en el ticket.

## 5. Checklist por historia

| HU | Pantalla | Estados | Prueba manual |
|---|---|---|---|
| HU-31 | movimientos | botón en espera / errores 409 y 422 | entrada de placa registrada, nueva y restringida |
| HU-32 | movimientos, ticket | — | ticket tras la entrada; imprimir 80 mm; enviar por correo |
| HU-33 | movimientos | — | salida por ticket y por placa (extraviado) |
| HU-34 | movimientos | vacío «No hay vehículos dentro» / búsqueda sin resultado | orden y resaltado de más de 24 h |
| HU-35 | movimientos | — | anular con motivo; 403 después de 15 min |
