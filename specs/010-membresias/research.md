# Investigación — 010-membresias

**Fecha**: 2026-11-27 · **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

Precedencia: rúbrica → constitución → SRS v2.0 → HU → spec → `CLAUDE.md`. Las tablas `plan_membresia` y `membresia` ya existen (2.0.0), con `UNIQUE uq_plan_nombre` y la columna generada `vehiculo_activa` `UNIQUE` (una activa por vehículo); `factura.id_membresia` ya existe con su `CHECK` (liquidación o membresía): **sin cambios de esquema**.

---

## R-01 · Dos módulos

- **Decisión**: `modules/planes/` (`/planes-membresia`) y `modules/membresias/` (`/membresias`, `/usuarios/me/membresias`), con capas. `membresias.reglas.js` para las fechas (fin, renovación, días restantes, aviso).

## R-02 · Fechas (RF-MEM-05, RF-MEM-06)

- **Decisión**: fechas `AAAA-MM-DD` de Bogotá (`enBogota(reloj.ahora()).fecha`).
  - `finDe(inicio, dias) = sumarDias(inicio, dias − 1)`: 30 días desde el 16/12/2026 terminan el 14/01/2027.
  - Renovación de una **activa**: `desde = sumarDias(fin, 1)` y `hasta = finDe(desde, dias)`; se alarga la misma fila (`fecha_fin = hasta`) y la cobertura sigue continua.
  - Renovación de una **vencida**: `desde = hoy`; se actualizan `fecha_inicio = desde`, `fecha_fin` y `estado = 'activa'` (así no cubre el hueco entre su fin anterior y hoy).
  - `diasRestantes = max(0, fin − hoy + 1)` si está activa; `avisoRenovacion = activa && diasRestantes ≤ 5`.

## R-03 · Suscripción con pago (RF-MEM-03..05, RN-23, RN-24)

- **Decisión**: `POST /membresias` `{ idVehiculo, idPlan, pago: { metodo, valorRecibido?, referencia? } }` (`membresias.crear`). En una transacción:
  1. el plan (`FOR UPDATE`) existe (si no → 422 en `idPlan`) y está activo (si no → 409 `PLAN_INACTIVO`);
  2. el vehículo existe, tiene propietario (si no → 422 «Asocie primero el vehículo a un cliente») y es de su tipo (si no → 422 en `idPlan` «El plan es para carros»);
  3. alcance: sin `membresias.ver` (el Cliente), el vehículo debe ser suyo (si no → 403);
  4. ya hay una activa → 409 `MEMBRESIA_ACTIVA` «El vehículo ya tiene una membresía activa hasta 15/12/2026»;
  5. el pago se valida con las reglas de la spec 009 (efectivo ≥ valor con cambio; referencia en los otros métodos; 422 si no);
  6. se inserta la membresía, la factura (`id_membresia`, `id_cliente` = propietario, `FV-` consecutivo) y el pago (`id_operador` = sesión); bitácora `suscribir`.
- **Reutilización**: la validación del pago y la inserción de factura y pago salen a `facturas.service.cobrar(conexion, { concepto, total, idCliente, pago, actor })`, que usan el pago del servicio (spec 009) y las membresías.
- **Carrera**: `ER_DUP_ENTRY` en `uq_membresia_activa` → 409 `MEMBRESIA_ACTIVA`.

## R-04 · Renovación y cancelación (RF-MEM-06, RF-MEM-07)

- **Decisión**:
  - `POST /membresias/:id/renovacion` `{ pago }` (`membresias.editar`): la membresía (`FOR UPDATE`) debe estar activa o vencida (cancelada → 409 `MEMBRESIA_CANCELADA`) y su plan activo (si no → 409 `PLAN_INACTIVO`). Calcula R-02, cobra el valor actual del plan con una factura nueva y deja la bitácora `renovar` con el periodo. Responde `{ membresia, periodo: { desde, hasta }, factura }`.
  - `PATCH /membresias/:id/cancelacion` `{ motivo }` (10–200, `membresias.editar`): activa → `cancelada` con `motivo_cancelacion`; si no está activa → 409 `MEMBRESIA_NO_ACTIVA`. Las salidas siguientes ya no la encuentran (la cobertura de la spec 009 exige `estado = 'activa'`).

## R-05 · Vencimiento diario (RF-MEM-08)

- **Decisión**: `membresiasService.vencer(hoy)` hace `UPDATE … SET estado = 'vencida' WHERE estado = 'activa' AND fecha_fin < hoy` y escribe una bitácora por lote (`vencer`, con la cantidad). `src/tareas/programador.js` lo ejecuta al iniciar el servidor y cada día a las 00:05 de Bogotá con `setTimeout` encadenado; no se programa con `NODE_ENV=test`. `server.js` lo arranca.
- **Alternativa descartada**: `node-cron` (dependencia fuera de la constitución; un `setTimeout` basta).

## R-06 · Consultas (RF-MEM-09, RF-MEM-10)

- **Decisión**:
  - **`GET /usuarios/me/membresias`** (`perfil.ver`): `{ membresias: [ { …, plan, vehiculo, fechaInicio, fechaFin, diasRestantes, avisoRenovacion, estado, facturas: [{ numero, fecha, total, estado }] } ], planesDisponibles }`. `planesDisponibles` son los planes activos si el cliente no tiene ninguna membresía activa; si tiene, una lista vacía.
  - **`GET /membresias?q&estado&page&limit`** `[Propuesta]` (`membresias.ver`): listado para el personal con la misma forma (sin las facturas).
  - **`GET /planes-membresia?estado`** (`planes.ver`): el Cliente lo tiene en la semilla para ver los planes.

## R-07 · Factura de membresía (spec 009)

- **Decisión**: el repositorio de facturas agrega `LEFT JOIN membresia` / `plan_membresia` / `vehiculo`, para que la factura muestre `membresia: { idMembresia, plan, placa, fechaFin }` y la placa se vea en el listado (`COALESCE` de la placa del movimiento o de la membresía). El PDF imprime el plan y la vigencia cuando no hay movimiento.

## R-08 · Semilla

- **Decisión**: 5 planes (R-08 de la spec): 4 activos y «Mensual carro nocturno» inactivo; sin membresías.

## R-09 · Pruebas

- **Decisión**: Jest con el reloj fijado (p. ej. 16/11/2026 → fin 15/12/2026; renovación → 16/12/2026 a 14/01/2027) y vehículos propios creados por la API. La colección Postman suscribe un vehículo nuevo con propietario (placa aleatoria) y lo cancela al final, así se puede repetir.
