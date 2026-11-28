# Investigación — 007-control-ingreso-salida

**Fecha**: 2026-11-27 · **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

Precedencia: rúbrica → constitución → SRS v2.0 → HU → spec → `CLAUDE.md`. Las tablas `movimiento` y `ticket` ya existen (2.0.0), con `vehiculo_abierto` `UNIQUE` (un movimiento abierto por vehículo) y los datos de anulación.

---

## R-01 · Módulos `movimientos` y `tickets`

- **Decisión**: `modules/movimientos/` (entrada, salida, listado, anulación) y `modules/tickets/` (consulta y envío), cada uno con `routes → controller → service → repository → validator`; `movimientos.reglas.js` para las funciones puras (minutos, más de 24 h, límite de anulación del Operador, mensaje de pico y placa). Las rutas son las de B.1 §4.7.
- **Reutiliza**: `celdasService.ocupar/liberar/sugerir` (004), `parqueaderosRepository.obtenerPuerta` (004), `vehiculosRepository` (005), `restriccionesService.evaluar` (006), `siguienteConsecutivo('ticket')` (001), `enviarCorreo` (003).

## R-02 · Reloj del servidor (RN-16)

- **Decisión**: `utils/reloj.js` exporta `ahora()` (→ `new Date()`). La entrada, la salida, los minutos transcurridos, el límite de 15 minutos y el pico y placa usan ese reloj, y las fechas se guardan desde él (el pool usa la zona `-05:00`). Las pruebas lo reemplazan con `jest.spyOn(reloj, 'ahora')`.
- **Justificación**: la hora la pone el servidor (RN-16), y las pruebas no pueden depender del día real (el pico y placa cambia por día y hora).
- **Alternativa descartada**: `NOW()` de MySQL (no se puede fijar en las pruebas).

## R-03 · Transacción de la entrada (RF-MOV-01..06)

- **Decisión**: dentro de `withTransaction`:
  1. puerta (bloqueada) activa, de tipo `entrada` o `mixta`, de un parqueadero activo → si no, 409 `PUERTA_NO_VALIDA`;
  2. vehículo por placa (`FOR UPDATE`); si no existe y no viene `tipo` → 422; si no existe → se inserta como ocasional (sin propietario, bitácora `crear` del vehículo). Como 6.1 exige color, marca y modelo, la entrada los acepta opcionales (el modal de la caseta los pide solo para una placa nueva); si no llegan, se guardan «Sin registrar» y el año actual, y el Administrador los corrige luego en Vehículos (spec 005); si existe y el `tipo` enviado es otro → 422;
  3. movimiento abierto del vehículo → 409 `VEHICULO_DENTRO` «El vehículo ya se encuentra dentro (celda A-07)»;
  4. `evaluar` (pico y placa) con la hora del reloj → si está restringido, se aborta y se guarda el intento (R-04): 409 `PICO_Y_PLACA` «Vehículo con restricción de pico y placa hoy (dígito 3)», con el motivo completo en `details`;
  5. celda: la elegida (debe ser `disponible`, del tipo y del parqueadero de la puerta; si no → 409 `CELDA_NO_DISPONIBLE` o 422) o `sugerir` → si no hay, 409 `SIN_CELDAS` «Sin celdas disponibles para moto»;
  6. `ocupar` la celda, insertar el movimiento, el ticket (`siguienteConsecutivo('ticket')`) y la bitácora `registrar_entrada`.
- **Carreras**: el `UNIQUE uq_movimiento_abierto` y el de `celda.id_vehiculo_actual` impiden duplicados; `ER_DUP_ENTRY` se traduce a 409 `VEHICULO_DENTRO`.
- **Orden de los controles**: primero «ya está dentro» y después pico y placa, porque un vehículo dentro no está entrando.

## R-04 · Intentos rechazados `[Propuesta]` (RF-MOV-02, RF-REP-06)

- **Decisión**: tabla `ingreso_rechazado` (`id_ingreso_rechazado`, `placa`, `tipo_vehiculo`, `id_vehiculo` NULL, `id_puerta`, `fecha_hora`, `motivo`, `id_operador`). Se inserta en una transacción aparte, después del rollback de la entrada, para que el intento quede guardado. Índice por fecha (reporte por fecha de la spec 015).
- **Esquema 2.2.0**: migración `002_ingresos_rechazados_y_ticket_extraviado.sql`.

## R-05 · Ticket (RF-MOV-06..08)

- **Decisión**: código `T-` + 6 dígitos del consecutivo sin huecos (se toma en la transacción de la entrada: si la entrada falla, el número no se consume). `GET /tickets/:codigo` devuelve el ticket con su movimiento (cualquier estado) y el parqueadero, y `tieneCorreo` (sin el correo, RNF-PRI-02). `POST /tickets/:codigo/envio` envía el ticket en texto al correo del propietario: sin propietario o sin correo → 409 `SIN_CORREO`; responde el correo enmascarado (`a***@correo.co`). Columna nueva `ticket.extraviado` `[Propuesta]`. `impreso` queda sin uso: la vista de impresión es del navegador.
- **Vista de 80 mm**: `ticket.html` con `@media print` y `@page { size: 80mm auto; margin: 0 }`, que solo imprime el `organism-ticket`.

## R-06 · Salida (RF-MOV-09..12)

- **Decisión**: `POST /movimientos/:id/salida` `{ idPuerta, ticketExtraviado? }`. En la transacción: movimiento (`FOR UPDATE`) `abierto` → si no, 404 `MOVIMIENTO_NO_ABIERTO` «El vehículo no tiene una entrada registrada»; puerta activa de tipo `salida` o `mixta` y del mismo parqueadero que la celda → si no, 409 `PUERTA_NO_VALIDA`; salida = reloj; `minutos_estadia = floor((salida − entrada) / 60 000)`; `liberar` la celda; ticket extraviado si se indica; bitácora `registrar_salida`. Responde el movimiento cerrado con `liquidacion: null` (spec 009).

## R-07 · Listado (RF-MOV-13, RF-MOV-14)

- **Decisión**: `GET /movimientos?estado=abierto|cerrado|anulado` (por defecto `abierto`) `&placa` (exacta, normalizada) `&q` (placa que contiene el texto) `&page&limit`. Los abiertos se ordenan por entrada ascendente (más antiguo primero); los demás, descendente. Cada movimiento trae `minutosTranscurridos` (abiertos, con el reloj) y `masDe24h` (≥ 1440 min). Usa `idx_movimiento_estado_entrada`.

## R-08 · Anulación (RF-MOV-15..17)

- **Decisión**: `PATCH /movimientos/:id/anulacion` `{ motivo }` (10–200 caracteres), permiso `movimientos.anular`. En la transacción:
  1. el movimiento (`FOR UPDATE`) debe estar `abierto`; si no → 409 `MOVIMIENTO_NO_ANULABLE`;
  2. si la sesión no es del rol Administrador (`req.usuario.rol === ROL_ADMINISTRADOR`, RN-02) y pasaron más de 15 minutos desde la entrada (reloj del servidor) → 403 `SOLO_ADMIN_ANULA` «Solo el Administrador puede anular esta entrada»;
  3. `estado = 'anulado'`, `motivo_anulacion`, `id_usuario_anulacion` y `fecha_anulacion`; `liberar` la celda; `ticket.valido = FALSE`; bitácora `anular`.
- **Alternativa descartada**: un permiso nuevo «anular sin límite» (cambiaría el catálogo de la spec 001, y RN-02 ya nombra al Administrador).

## R-09 · Rendimiento (RNF-REN-01)

- **Decisión**: la entrada hace unas 10 consultas indexadas en una transacción; la salida, unas 6. Se mide con 20 entradas seguidas en local (meta ≤ 2 s p95).
