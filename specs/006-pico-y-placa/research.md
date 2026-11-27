# Investigación — 006-pico-y-placa

**Fecha**: 2026-11-27 · **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

Precedencia: rúbrica → constitución → SRS v2.0 → HU → spec → `CLAUDE.md`. La tabla `restriccion_placa` ya existe en `schema.sql` (2.0.0) con `CHECK` de día, dígitos, horas y vigencia: **sin cambios de esquema**.

---

## R-01 · Un módulo `restricciones` con capas

- **Decisión**: `modules/restricciones/` con `routes → controller → service → repository → validator`, más `restricciones.reglas.js` (funciones puras). Ruta base `/restricciones-placa` (B.1 §4.6); `GET /hoy` va antes de `/:id`.

## R-02 · Dígitos (RF-PYP-02)

- **Decisión**: la API recibe y devuelve una lista de enteros (`[6, 9]`), de 1 a 5, cada uno entre 0 y 9 y sin repetir (zod). Se guardan ordenados como texto `'6,9'`, que cumple `ck_restriccion_digitos`.
- **Alternativa descartada**: recibir el texto `'6,9'` (más fácil de equivocar y de validar por campo).

## R-03 · Franja horaria y vigencia

- **Decisión**: `horaInicio` y `horaFin` en `HH:MM` (24 h), `horaFin > horaInicio` (422 en `horaFin`). Se guardan como `TIME` y se devuelven como `HH:MM`. La franja es semiabierta `[inicio, fin)`: a la hora fin exacta ya se puede entrar. `vigenteDesde` (fecha `AAAA-MM-DD`) por defecto hoy en Bogotá; `vigenteHasta` opcional y ≥ `vigenteDesde`.

## R-04 · Superposición (RF-PYP-03, RN-14)

- **Decisión**: en el servicio, dentro de una transacción que bloquea las restricciones del mismo día y tipo (`SELECT … FOR UPDATE`), se busca otra activa con `vigente_desde ≤ hastaNueva` y `(vigente_hasta IS NULL OR vigente_hasta ≥ desdeNueva)`, excluyendo la propia al editar. Si existe → 409 `RESTRICCION_SUPERPUESTA` «Ya existe una restricción para ese día y tipo», con `details: [{ campo: 'idRestriccion', mensaje: '<id>' }]` para que la pantalla ofrezca editarla.
- **Por qué en el servicio**: MySQL no tiene restricciones de exclusión por rangos de fechas.

## R-05 · Dígito evaluado y evaluación (RN-13)

- **Decisión**: `digitoEvaluado(placa, posicion)`: los caracteres numéricos de la placa; `ultimo` → el último, `primero` → el primero; sin dígitos → `null`. `restringe(restriccion, { placa, fecha, hora, diaSemana })` es pura. El servicio `evaluar({ placa, tipo, fechaHora })` toma día, fecha y hora en Bogotá (`enBogota`), consulta las restricciones activas del día y tipo y devuelve `{ restringido, motivo, restriccion }`.
- **Motivo**: «Pico y placa: carros con placa terminada en 6 o 9, lunes de 05:00 a 20:00.» / «Pico y placa: motos con placa cuyo primer dígito es 6 o 9, lunes de 05:00 a 20:00.»
- **Uso**: la spec 007 la llama dentro de la transacción de la entrada (acepta `conexion`).

## R-06 · Restricción de hoy (RF-PYP-05)

- **Decisión**: `GET /restricciones-placa/hoy` → `{ fecha, diaSemana, nombreDia, tipos: { carro, moto }, mensaje }`. Cada tipo es la restricción vigente hoy (activa, del día, dentro de la vigencia) o `null`; `mensaje` = «Sin restricción hoy» si ambos son `null`. Permiso `restricciones.ver` (Operador, Cliente y Administrador en la semilla).

## R-07 · Edición y eliminación (RF-PYP-04)

- **Decisión**: `PUT` actualiza en su lugar (todos los campos, `estado` opcional) y registra en la bitácora solo los campos que cambian. `DELETE` cambia `estado` a `inactivo` (bitácora `inactivar`); si ya estaba inactiva → 200 sin cambios. Reactivar con `PUT … estado: 'activo'` revisa la superposición. No se recalculan las entradas pasadas (la spec 007 guarda el motivo de cada rechazo).
- **Permisos**: `PUT` exige `restricciones.editar`; `DELETE`, `restricciones.cambiar_estado`; cambiar `estado` en `PUT` exige además `restricciones.cambiar_estado` (como en parqueaderos).

## R-08 · Semilla (TBD-03)

- **Decisión**: 10 restricciones (lunes a viernes × carro y moto), 05:00–20:00, vigentes desde 2026-01-01 sin fin: lunes 6,9 · martes 5,7 · miércoles 1,8 · jueves 0,2 · viernes 3,4; carro `ultimo`, moto `primero`. Cumple el mínimo de 5 registros de la constitución.
- **Efecto en las pruebas**: las pruebas que crean restricciones usan el sábado y el domingo (libres en la semilla) o vigencias futuras, para no chocar con la semilla.

## R-09 · Festivos

- **Decisión**: fuera de esta spec. La spec 016 agregará la excepción de festivos (Nager.Date) dentro de `evaluar`, sin cambiar su contrato.
