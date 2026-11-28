# Cambios del esquema de base de datos

Historial de `schema.sql` y de las migraciones en `migrations/`. Cada entrada indica la versión, la fecha, la spec que lo origina y el RF/RNF que lo justifica.

---

## 2.2.0 (sin cambios) — 2026-11-27 · spec `013-incidencias`

La spec 013 usa `incidencia` y `seguimiento_incidencia` tal como están: `UNIQUE uq_incidencia_codigo` (consecutivo `incidencia`, `INC-` + 6 dígitos, ya en la semilla, RF-INC-02), `CHECK ck_inc_cierre` (solución obligatoria al cerrar, RF-INC-08, RN-28) e índices por estado y fecha y por vehículo (RF-INC-05). `evidencia_url` guarda la clave del archivo privado `incidencias/<uuid>.<ext>` (en `backend/uploads/`, fuera de git y de la carpeta pública). La alerta al Administrador usa el tipo `incidencia` de `alerta` (RF-INC-04, RF-MON-04). La semilla no cambia.

---

## 2.2.0 (sin cambios) — 2026-11-27 · spec `012-reservas`

La spec 012 usa `reserva` tal como está: `UNIQUE uq_reserva_codigo` (consecutivo `reserva`, `R-` + 6 dígitos, ya en la semilla), los índices por celda, vehículo y cliente con estado y hora (para buscar cruces de franjas, RF-RES-02), `minutos_espera` (30 por defecto, TBD-07) e `id_movimiento` (al cumplirse, RF-RES-07). La celda usa su estado `reservada` durante la franja (RN-27) y la notificación su tipo `reserva`. La anticipación máxima (7 días) y la espera (30 min) son variables de entorno (`RESERVA_ANTICIPACION_DIAS`, `RESERVA_MINUTOS_ESPERA`) mientras TBD-07 no se decida; la espera se copia a cada reserva. La semilla no cambia.

---

## 2.2.0 (sin cambios en el esquema; semilla ampliada) — 2026-11-27 · spec `011-descuentos`

La spec 011 usa `descuento` y `liquidacion.id_descuento` / `liquidacion.valor_descuento` tal como están: `UNIQUE uq_descuento_nombre` (RF-DES-01), `CHECK` del valor (porcentaje 1–100 o fijo > 0, RF-DES-02) y de la vigencia, e índice `idx_descuento_vigencia` para buscar los vigentes al liquidar. La liquidación guarda el descuento aplicado y su valor una sola vez, así que editar o inactivar un descuento no cambia las ya guardadas (RF-DES-05). Solo cambia `seed.sql`: 3 descuentos — «Motos fin de semana» (20 %, motos, diciembre de 2026), «Navidad clientes registrados» (10 %, registrados, 15–31 de diciembre de 2026) y «Promoción de apertura» ($ 1.000, enero de 2026, inactivo); ninguno vigente en noviembre de 2026 (research R-08).

---

## 2.2.0 (sin cambios en el esquema; semilla ampliada) — 2026-11-27 · spec `010-membresias`

La spec 010 usa `plan_membresia`, `membresia` y `factura.id_membresia` tal como están: `UNIQUE uq_plan_nombre` (RF-MEM-01), la columna generada `vehiculo_activa` con `UNIQUE` (una membresía activa por vehículo, RN-23) y el `CHECK` de la factura (liquidación o membresía) ya cumplen RF-MEM-03..05. La renovación alarga la misma fila (`fecha_fin`; si estaba vencida también `fecha_inicio` y `estado`) y emite una factura nueva con el mismo `id_membresia`. Solo cambia `seed.sql`: 5 planes — «Mensual carro» ($ 180.000, 30 días), «Mensual moto» ($ 70.000, 30), «Trimestral carro» ($ 480.000, 90), «Anual moto» ($ 700.000, 365) y «Mensual carro nocturno» ($ 90.000, 30, inactivo); sin membresías (research R-08).

---

## 2.2.0 (sin cambios) — 2026-11-27 · spec `009-facturacion-pagos`

La spec 009 usa `liquidacion`, `factura`, `pago`, `cierre_caja` y `alerta` tal como están: sus `UNIQUE` (una liquidación por movimiento, una factura por liquidación, un pago por factura) y `CHECK` (efectivo con recibido ≥ valor, referencia salvo efectivo, totales ≥ 0) ya cumplen RF-FAC-06..09. El pago y su factura numerada (consecutivo `factura`, `FV-` + 6 dígitos) se crean en la misma transacción. `factura.cufe` sigue sin uso (TBD-02): la API la muestra como «pendiente de envío electrónico». La semilla no cambia.

---

## 2.2.0 (sin cambios en el esquema; semilla ampliada) — 2026-11-27 · spec `008-tarifas`

La spec 008 usa `tarifa` tal como está (sus `CHECK` de primera hora, fracción, tope, gracia y vigencia ya cumplen RF-TAR-02). Solo cambia `seed.sql`: 4 tarifas vigentes desde 2026-01-01 sin fin — carro ocasional ($ 4.000 / 15 min a $ 1.000 / tope $ 30.000 / 10 min de gracia), carro registrado ($ 3.500 / $ 900 / $ 27.000), moto ocasional ($ 2.000 / $ 500 / $ 12.000), moto registrado ($ 1.800 / $ 450 / $ 10.000) — y «Carro ocasional 2025» inactiva como historial (research R-08).

---

## 2.2.0 — 2026-11-27 · spec `007-control-ingreso-salida`

Migración: `migrations/002_ingresos_rechazados_y_ticket_extraviado.sql` (para una BD 2.1.0 con datos; `npm run db:reset` ya crea la 2.2.0).

| Cambio | Detalle | RF / decisión |
|---|---|---|
| Columna `ticket.extraviado` `[Propuesta]` | `BOOLEAN NOT NULL DEFAULT FALSE`: la salida se registró sin el ticket (búsqueda por placa) | criterio 4 de HU-33 · research R-05 de la spec 007 |
| Tabla `ingreso_rechazado` `[Propuesta]` | `placa`, `tipo_vehiculo`, `id_vehiculo` (NULL si la placa no estaba registrada), `id_puerta`, `fecha_hora`, `motivo`, `id_operador`; índices por fecha y por placa | RF-MOV-02, RF-REP-06 (spec 015), RF-MON-04 (alertas, spec 014) · research R-04 |

El intento rechazado se guarda en una transacción aparte, después del rollback de la entrada, para que quede aunque la entrada no se cree. La semilla no cambia: la operación empieza sin movimientos; el consecutivo `ticket` (T-, 6 dígitos) ya existía.

---

## 2.1.0 (sin cambios en el esquema; semilla ampliada) — 2026-11-27 · spec `006-pico-y-placa`

La spec 006 usa `restriccion_placa` tal como está (sus `CHECK` de día, dígitos, horas y vigencia ya cumplen RF-PYP-02). Solo cambia `seed.sql`: 10 restricciones de ejemplo de Medellín (lunes a viernes × carro y moto, 05:00–20:00, vigentes desde 2026-01-01): lunes 6,9 · martes 5,7 · miércoles 1,8 · jueves 0,2 · viernes 3,4; carros por el último dígito y motos por el primero (research R-08; el calendario oficial es TBD-03).

---

## 2.1.0 — 2026-11-27 · spec `005-vehiculos`

Migración: `migrations/001_historial_propietario.sql` (para una BD 2.0.0 con datos; `npm run db:reset` ya crea la 2.1.0).

| Cambio | Detalle | RF / decisión |
|---|---|---|
| Tabla `historial_propietario` `[Propuesta]` | `id_historial`, `id_vehiculo`, `id_usuario`, `fecha_desde`, `fecha_hasta` (NULL = vigente), `id_usuario_registro`; columna generada `vehiculo_abierto` con `UNIQUE` (un solo periodo abierto por vehículo); `CHECK fecha_hasta ≥ fecha_desde`; índices por vehículo y por usuario | RF-VEH-08, RN-12 · research R-05 de la spec 005 |
| Semilla | 6 vehículos: ABC123 y QWE45A (Andrea), FGH678 (Carlos), JKL482 (Valentina), MNP908 (sin propietario), RTY12 (Mateo, inactivo); cada uno con propietario tiene su periodo abierto | research R-11 |

6.1 solo guarda el propietario actual (`vehiculo.id_propietario`); sin el historial, al reasignar se perdería a quién pertenecían los movimientos anteriores (criterio 2 de HU-27). La migración abre un periodo para cada vehículo que ya tiene propietario, con su `created_at` como inicio.

---

## 2.0.0 (sin cambios en el esquema; semilla ampliada) — 2026-11-27 · spec `004-parqueaderos-celdas`

La spec 004 usa `parqueadero`, `puerta_acceso` y `celda` tal como están en la 2.0.0. Solo cambia `seed.sql` (generado con `generar-seed.js`, research R-11):

| Dato | Contenido |
|---|---|
| `parqueadero` | 1 «Parqueadero ABC» (Carrera 43 # 47-53, Medellín; 2 pisos; 24 horas; activo) · 2 «Parqueadero ABC · Zona anexa» (inactivo) |
| `puerta_acceso` | Carrera 43 (mixta), Calle 47 (entrada), Calle 48 (salida) y Portón anexo (mixta, zona anexa) |
| `celda` | 40: A-01..A-11 carros piso 1 y A-12 inhabilitada («Mantenimiento de la demarcación»); M-01..M-12 motos piso 1; B-01..B-12 carros piso 2; Z-01..Z-04 de la zona anexa, inhabilitadas («Parqueadero inactivo») |

Inactivar un parqueadero pone sus celdas libres en `inhabilitada` con el motivo «Parqueadero inactivo» y reactivarlo devuelve a `disponible` solo esas (RF-CLD-07, research R-03).

---

## 2.0.0 (sin cambios) — 2026-11-27 · spec `002-gestion-usuarios`

La spec 002 no cambia el esquema: usa `usuario`, `sesion`, `notificacion` y `bitacora` tal como quedaron en la 2.0.0. Las fotos se guardan fuera de la BD (`backend/uploads/usuarios/`); en `usuario.foto_url` va solo la clave relativa (RNF-PRI-03).

---

## 2.0.0 — 2026-11-26 · spec `001-roles-permisos` (fundación v2)

Reescritura completa según el **modelo lógico 6.1 del SRS v2.0**. Reemplaza el esquema v1 (PARKO, 24 tablas con PK `id`), que se conserva en el tag `v0.9.0-legado`.

### Convenciones

- Tablas en singular snake_case como en 6.1 (`rol`, `usuario`, `movimiento`…), PK `id_<entidad>` `INT UNSIGNED AUTO_INCREMENT`.
- `created_at` / `updated_at` en todas las tablas.
- FK `ON DELETE RESTRICT ON UPDATE RESTRICT`. MySQL 8 no permite `CHECK` ni columnas generadas sobre columnas con FK de acción en cascada, y las PK no cambian. La única excepción es `rol_permiso.id_rol` con `ON DELETE CASCADE` (tabla intermedia).
- `DECIMAL(12,2)` para dinero, `utf8mb4_0900_ai_ci`, sesión `time_zone = '-05:00'`.

### Relación de tablas v1 → v2

| v1 | v2 (6.1) | Nota |
|---|---|---|
| roles, permisos, roles_permisos | rol, permiso, rol_permiso | `permiso.accion` ENUM de 6.1; `rol.es_base` |
| usuarios | usuario | `nombre_completo` en un campo; `acepta_tratamiento_datos` (Ley 1581) |
| parqueaderos, pisos | parqueadero | `pisos` como número 1–20 (RF-CLD-01) |
| puertas | puerta_acceso | tipo entrada/salida/mixta |
| celdas | celda | estado `inhabilitada` (antes `fuera_servicio`) |
| vehiculos, vehiculos_historial_propietario | vehiculo | el historial de propietarios va a la bitácora (RF-VEH-08/09); se revisa en la spec 005 |
| pico_placa | restriccion_placa | dígitos como lista, vigencia y franja |
| estadias | movimiento + ticket + liquidacion | se separan entrada/salida, ticket y cálculo |
| facturas | factura + pago | un pago por factura; datos de tercero |
| membresias | plan_membresia + membresia | planes configurables |
| tarifas, descuentos | tarifa, descuento | primera hora + fracción + gracia + tope; tipo de cliente |
| reservas | reserva | estados confirmada/cumplida/cancelada/vencida |
| tipos_incidencia, incidencias | incidencia + seguimiento_incidencia | tipo ENUM de 6.1 |
| lecturas_placa | lectura_placa | confianza y estado |
| notificaciones | alerta + notificacion | alertas de operación separadas de mensajes a clientes |
| accesos_denegados | — | se define en la spec 007 (RF-REP-06) |
| configuracion | — | se retira; los parámetros van en sus tablas |
| consecutivos | consecutivo | `[Propuesta]` |

### Agregados que no están en 6.1 `[Propuesta]`

| Elemento | Motivo | Origen |
|---|---|---|
| tabla `sesion` | revocar el JWT por `jti` al cerrar sesión o inactivar el usuario | RF-ACC-13, RF-USR-13 |
| tabla `bitacora` | auditoría con valor anterior y nuevo | RNF-SEG-07, RF-USR-11, RF-VEH-09 |
| tabla `consecutivo` | numeración sin huecos de T-, FV-, INC- y R- | RN-22, RF-MOV-06, RF-INC-02, RF-RES-03 |
| `rol.nombre_normalizado` (generada, UNIQUE) | unicidad sin mayúsculas ni espacios | RF-ROL-05 |
| `usuario.debe_cambiar_contrasena` | cambio obligatorio de la contraseña temporal | RF-ACC-04, RF-USR-05 |
| `celda.motivo_inhabilitacion` | motivo obligatorio al inhabilitar | RF-CLD-14 |
| `movimiento.vehiculo_abierto` (generada, UNIQUE) | un movimiento abierto por vehículo | RNF-SAF-01, RN-15 |
| `movimiento.id_usuario_anulacion`, `fecha_anulacion` | conservar quién y cuándo anuló | RF-MOV-17, RNF-SAF-02 |
| `ticket.valido` | ticket inválido al anular la entrada | RF-MOV-15 |
| `celda.id_vehiculo_actual` UNIQUE | un vehículo por celda | RNF-SAF-01 |
| `membresia.vehiculo_activa` (generada, UNIQUE), `motivo_cancelacion` | una membresía activa por vehículo; motivo de cancelación | RN-23, RF-MEM-07 |
| `factura.tercero_documento`, `tercero_nombre` | factura a nombre de un tercero | RF-FAC-11 |
| `factura.id_usuario_anulacion`, `fecha_anulacion` | anulación con usuario y fecha | RF-FAC-14 |
| `pago.id_cierre` | el pago pertenece al cierre del turno (NULL = turno abierto) | RF-FAC-17, RF-FAC-18 |
| `pago.id_factura` UNIQUE | un solo pago por liquidación/factura | RF-FAC-08 |
| `incidencia.fecha_cierre` | fecha de cierre | RF-INC-08 |
| `notificacion.intentos_envio` | reintentos de correo (máximo 3) | RF-MON-07 |

### Decisiones sobre 6.1

- **Sin FK circular factura ↔ membresía.** 6.1 tiene `membresia.id_factura` y `factura.id_membresia`. Solo se conserva `factura.id_membresia`; la factura de una membresía se consulta por esa columna. `CHECK` exige que la factura sea de una liquidación **o** de una membresía.
- **`factura.cufe`** se conserva como opcional y sin uso (decisión del equipo: sin facturación electrónica DIAN, TBD-02).

### Reservado para specs posteriores (se agregará con migración y su entrada aquí)

| Elemento | Spec | Origen |
|---|---|---|
| festivos de pico y placa (API externa Nager.Date) | 016 | TBD-03 |
