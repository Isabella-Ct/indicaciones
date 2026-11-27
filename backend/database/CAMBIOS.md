# Cambios del esquema de base de datos

Historial de `schema.sql` y de las migraciones en `migrations/`. Cada entrada indica la versión, la fecha, la spec que lo origina y el RF/RNF que lo justifica.

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
| intentos de ingreso rechazados por pico y placa | 007 | RF-REP-06, RF-MOV-02 |
| festivos de pico y placa (API externa Nager.Date) | 016 | TBD-03 |
