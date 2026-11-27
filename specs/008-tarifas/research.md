# Investigación — 008-tarifas

**Fecha**: 2026-11-27 · **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

Precedencia: rúbrica → constitución → SRS v2.0 → HU → spec → `CLAUDE.md`. La tabla `tarifa` ya existe en `schema.sql` (2.0.0) con `CHECK` de primera hora, fracción, tope, gracia y vigencia: **sin cambios de esquema**.

---

## R-01 · Un módulo `tarifas` con capas

- **Decisión**: `modules/tarifas/` con `routes → controller → service → repository → validator` y `tarifas.reglas.js` (funciones puras). Las rutas son las de B.1 §4.8.
- **Ruta pública**: `GET /tarifas?vigentes=true` se atiende en un router público montado antes del grupo protegido; si la consulta no es `vigentes=true`, ese router pasa la petición (`next('router')`) al router protegido, que exige `tarifas.ver`. Así la misma ruta de B.1 sirve a los dos casos.

## R-02 · Valores y vigencia (RF-TAR-02)

- **Decisión**: los valores en pesos se reciben como números ≥ 0 con hasta 2 decimales y se devuelven como números (mysql2 entrega `DECIMAL` como texto: se convierten con `Number`). Primera hora > 0; fracción de 1–60 minutos con valor ≥ 0; tope opcional y ≥ primera hora; gracia entera de 0–30.
- **Vigencia**: `vigenteDesde` obligatoria, `AAAA-MM-DD` (= 00:00) o `AAAA-MM-DDTHH:MM`, en hora de Bogotá; `vigenteHasta` opcional y posterior. Se guardan como `DATETIME` (el pool usa `-05:00`) y se devuelven en ISO con `-05:00`. La vigencia es semiabierta `[desde, hasta)`.
- **Errores**: 422 en el campo (`valorPrimeraHora`, `topeDiario`, `minutosFraccion`, `minutosGracia`, `vigenteHasta`…). Los `CHECK` de la BD son la segunda barrera.

## R-03 · Superposición y cierre de la anterior (RF-TAR-03, RF-TAR-05, RN-18)

- **Decisión**: en una transacción que bloquea (`FOR UPDATE`) las tarifas activas del mismo tipo de vehículo y cliente, se busca otra con `desdeA < hastaB` y `desdeB < hastaA` (sin fin = infinito), excluyendo la propia al editar.
  - Si hay choque y **no** viene `cerrarAnterior: true` → 409 `TARIFA_SUPERPUESTA` «Ya existe una tarifa activa para carro ocasional en ese periodo», con `details: [{ campo: 'idTarifa', mensaje: '<id>' }]`.
  - Con `cerrarAnterior: true`: si hay **una** que empieza antes que la nueva, se le pone `vigente_hasta = vigenteDesde` de la nueva (bitácora `cerrar_vigencia`) y se crea la nueva; si la que choca empieza igual o después, o hay más de una, igual 409.
- **Por qué en el servicio**: MySQL no tiene restricciones de exclusión por rangos.

## R-04 · Tarifa usada (RF-TAR-04, RF-TAR-05)

- **Decisión**: `usada = EXISTS(SELECT 1 FROM liquidacion WHERE id_tarifa = ?)`. En `PUT`, si está usada y cambia algo distinto de `nombre` o `vigenteHasta` → 409 `TARIFA_USADA`. Cerrar la vigencia de una usada exige `vigenteHasta` ≥ ahora (no se acorta hacia el pasado, para no cambiar qué tarifa aplicaba a cobros hechos). El listado administrativo devuelve `usada` para que la pantalla bloquee los campos.

## R-05 · Inactivar la única vigente (RF-TAR-06)

- **Decisión**: `PATCH /tarifas/:id/estado` `{ estado, confirmar? }`. Al inactivar: si la tarifa está vigente ahora y no hay otra activa vigente ahora para su tipo de vehículo y cliente, y no viene `confirmar: true` → 409 `UNICA_TARIFA_VIGENTE` «Es la única tarifa vigente para carro ocasional: las salidas de ese tipo no podrán liquidarse. Confirme para inactivarla.». Al activar se revisa la superposición (R-03). Permiso `tarifas.cambiar_estado`; bitácora `cambiar_estado`.

## R-06 · Consulta pública (RF-TAR-07)

- **Decisión**: `GET /tarifas?vigentes=true` (público) → las tarifas activas con `vigente_hasta` nulo o futuro, ordenadas por tipo de vehículo, tipo de cliente y fecha de inicio, cada una con `situacion: vigente | programada` (según el reloj del servidor). Sin `estado`, `usada` ni fechas de auditoría. `Cache-Control: no-store`.

## R-07 · Tarifa vigente para la liquidación (RN-19)

- **Decisión**: `tarifasService.vigenteEn({ tipoVehiculo, tipoCliente, fechaHora }, { conexion })` → la tarifa activa con `vigente_desde ≤ fechaHora < vigente_hasta` (o sin fin), o `null`. Por RN-18 a lo sumo hay una. El tipo de cliente lo decide la spec 009: `registrado` si el vehículo tiene propietario, si no `ocasional`. La regla `tipoClienteDe(vehiculo)` queda en `tarifas.reglas.js` para que la 009 la use.

## R-08 · Semilla

- **Decisión**: cuatro tarifas activas desde 2026-01-01 00:00 sin fin (carro y moto × ocasional y registrado, valores de la spec) y una inactiva de 2025 («Carro ocasional 2025», del 2025-01-01 al 2026-01-01) como historial. Cumple el mínimo de 5 registros de la constitución.
- **Pruebas**: como la semilla ya ocupa las cuatro combinaciones sin fin, toda vigencia futura se cruza con ellas. Las pruebas (Jest y Postman) toman la vigencia más reciente de la combinación y crean la nueva un día después con `cerrarAnterior: true` (cierra la que estaba abierta en ese instante), o usan una tarifa inactiva. Así se pueden repetir sin chocar entre sí.
