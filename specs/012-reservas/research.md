# Investigación — 012-reservas

**Fecha**: 2026-11-27 · **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

Precedencia: rúbrica → constitución → SRS v2.0 → HU → spec → `CLAUDE.md`. La tabla `reserva` ya existe (2.0.0) con `UNIQUE uq_reserva_codigo`, índices por celda, vehículo y cliente con estado y hora, `minutos_espera` (30 por defecto) e `id_movimiento`; la celda ya tiene el estado `reservada`, la notificación el tipo `reserva` y el consecutivo `reserva` (`R-`) está en la semilla: **sin cambios de esquema**.

---

## R-01 · Un módulo y reglas puras

- **Decisión**: `modules/reservas/` (`/reservas`, `/usuarios/me/reservas`, `/celdas/disponibles`) con capas y `reservas.reglas.js`:
  - `franja(inicio, minutosEspera)` → `{ desde: inicio, hasta: inicio + espera }`;
  - `seCruzan(a, b)`: `a.desde ≤ b.hasta && b.desde ≤ a.hasta` (los extremos cuentan);
  - `validarInicio(inicio, ahora, diasMaximos)` → mensaje de error o null (futura y ≤ 7 días);
  - `enFranja(reserva, instante)`, `vencida(reserva, instante)` (`instante > hasta`).

## R-02 · Parámetros (TBD-07)

- **Decisión**: `RESERVA_ANTICIPACION_DIAS` (7) y `RESERVA_MINUTOS_ESPERA` (30) en `config/env.js` y `.env.example`. La espera se copia a la reserva al crearla (`minutos_espera`), así cambiar el parámetro no altera reservas existentes.
- **Alternativa descartada**: una tabla de configuración (cambio de esquema que TBD-07 todavía no justifica).

## R-03 · Crear (RF-RES-01..03, RN-26)

- **Decisión**: `POST /reservas { idVehiculo, fechaHoraInicio, idCelda?, idParqueadero? }` (`reservas.crear`). En una transacción:
  1. inicio válido (422 en `fechaHoraInicio`);
  2. vehículo (`FOR UPDATE`) activo con propietario (422); sin `reservas.ver` debe ser del actor (403);
  3. sin otra reserva confirmada del vehículo que se cruce (409 `RESERVA_VEHICULO_CRUZADA`);
  4. celda: la indicada (`FOR UPDATE`; otro tipo o inhabilitada → 422; cruzada → 409 `CELDA_NO_DISPONIBLE` «La celda no está disponible en ese horario» con `details: [{ campo: 'idCelda', mensaje: 'Sugerida: B-02' }]` y `sugerida`) o la primera libre en la franja del parqueadero (el indicado o el activo de menor id; sin celdas → 409 `SIN_CELDAS`);
  5. código `siguienteConsecutivo('reserva')`, inserción, notificación interna (tipo `reserva`, canal `ambos`) y bitácora `reservar`; el correo va después del commit y marca la notificación como enviada.
- **Cruce en SQL**: `o.fecha_hora_inicio ≤ :hasta AND :desde ≤ o.fecha_hora_inicio + INTERVAL o.minutos_espera MINUTE` con `estado = 'confirmada'`.

## R-04 · Celdas disponibles

- **Decisión**: `GET /celdas/disponibles?fecha&tipo&idParqueadero` (`celdas.ver`), registrada antes de `/:id` en `celdas.routes.js`; el controlador está en el módulo de reservas. Devuelve las celdas del tipo, no inhabilitadas, de un parqueadero activo y sin reservas confirmadas que se crucen con la franja de esa hora.

## R-05 · Cancelar (RF-RES-04, RF-RES-05)

- **Decisión**: `PATCH /reservas/:id/cancelacion` (`reservas.editar`, sin cuerpo). Sin `reservas.ver`, solo el dueño (403). No confirmada → 409 `RESERVA_NO_CANCELABLE` «La reserva está cumplida»; ya inició → 409 `RESERVA_INICIADA`. Notificación, correo y bitácora `cancelar`.

## R-06 · Listados (RF-RES-06)

- **Decisión**: `GET /reservas?fecha&estado&q&page&limit` (`reservas.ver`): una fecha (hoy por defecto), orden por hora, búsqueda por placa, código o cliente. `GET /usuarios/me/reservas?estado&page&limit` (`perfil.ver`): las del Cliente, las más recientes primero.

## R-07 · Control cada minuto (RF-RES-08, RF-RES-09, RN-27)

- **Decisión**: `reservasService.controlar(ahora)` en una transacción:
  1. **vencer**: confirmadas con `ahora > inicio + espera` → `vencida`; si su celda está `reservada`, queda `disponible`; notificación y correo «Su reserva venció»;
  2. **activar**: confirmadas en franja cuya celda no está `reservada`: si está `disponible` → `reservada`; si no (ocupada o inhabilitada), se busca otra libre del tipo y parqueadero sin cruces → se reasigna, queda `reservada` y se avisa al cliente; si no hay, sigue confirmada.
- `src/tareas/programador.js` lo ejecuta al iniciar y cada 60 s (`setInterval` con `unref`), salvo con `NODE_ENV=test`; las pruebas llaman a `controlar` con el reloj fijado.

## R-08 · Entrada con reserva (RF-RES-07, HU-55 E3)

- **Decisión**: en `movimientos.service.registrarEntrada`, con el vehículo conocido, `reservasService.paraEntrada(conexion, idVehiculo, ahora, idParqueadero)` busca su reserva confirmada en franja (`FOR UPDATE`). Si la hay, la entrada usa su celda (si está `disponible` o `reservada`; si no, la sugerida) en lugar de la elegida, y después de crear el movimiento la reserva queda `cumplida` con `id_movimiento` (bitácora `cumplir`). La respuesta agrega `reserva: { idReserva, codigo }`.
- **Otros vehículos**: `celdas.sugerir` solo ofrece celdas `disponible` y `celdaElegida` rechaza las que no lo están, así que una celda `reservada` no se asigna a otro vehículo (sin cambios).

## R-09 · Pruebas

- **Decisión**: Jest con el reloj fijado: reservas creadas el viernes 27/11/2026 para el sábado 28/11/2026 a las 08:00 (sin pico y placa), en una sede propia (`crearSede`) para no tocar las celdas de la semilla; clientes con `crearCliente()`. El correo se revisa con `bandejaMemoria()`. Postman usa la hora real: reserva para mañana a las 08:00 en el parqueadero principal y la cancela al final.
