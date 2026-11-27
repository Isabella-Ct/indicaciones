# Investigación — 004-parqueaderos-celdas

**Fecha**: 2026-11-27 · **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

Precedencia: rúbrica → constitución → SRS v2.0 → HU → spec → `CLAUDE.md`. Se reutiliza la fundación (specs 001–003); las tablas `parqueadero`, `puerta_acceso` y `celda` ya existen en `schema.sql` 2.0.0.

---

## R-01 · Tres módulos con capas

- **Decisión**: `modules/parqueaderos/` (parqueaderos y puertas, B.1 agrupa `/parqueaderos/:id/puertas` y `/puertas/:id`), `modules/celdas/` (celdas, lote, estado, mapa y las operaciones de dominio `ocupar`/`liberar`) y `modules/disponibilidad/` (endpoint público). Cada uno tiene `routes → controller → service → repository → validator`.
- **Justificación**: constitución §II (un módulo por dominio) y B.1. `disponibilidad` es público (RNF-SEG-03) y se monta antes del grupo protegido.

## R-02 · Unicidad sin mayúsculas (RF-CLD-01, RF-CLD-07, RF-CLD-10)

- **Decisión**: la intercalación `utf8mb4_0900_ai_ci` de la BD ya compara sin distinguir mayúsculas ni tildes, así que los `UNIQUE` existentes (`uq_parqueadero_nombre`, `uq_puerta_nombre`, `uq_celda_codigo`) bastan. El servicio recorta espacios y pasa el código de celda a mayúsculas (RF-CLD-10), y traduce `ER_DUP_ENTRY` a 409 con el código `PARQUEADERO_DUPLICADO`, `PUERTA_DUPLICADA` o `CELDA_DUPLICADA`.
- **Alternativas descartadas**: columnas generadas normalizadas como en `rol` (innecesario con la intercalación `ai_ci`; en `rol` se agregó para cumplir con «espacios extremos» antes de recortar en el servicio).

## R-03 · Inactivar y reactivar un parqueadero (RF-CLD-05, RN-10)

- **Decisión**: en una transacción con `FOR UPDATE` del parqueadero:
  1. se cuentan las celdas `ocupada`; si hay → 409 `PARQUEADERO_CON_VEHICULOS` «Hay N vehículos dentro del parqueadero»;
  2. se pasan sus celdas `disponible` a `inhabilitada` con `motivo_inhabilitacion = 'Parqueadero inactivo'`;
  3. se cambia el estado y se escribe la bitácora.

  Al reactivar, solo las celdas con ese motivo exacto vuelven a `disponible`. Las celdas `reservada` no se tocan (las gestiona la spec 012). `DELETE /parqueaderos/:id` es lo mismo que `PUT` con `estado = 'inactivo'`.

## R-04 · Reducir pisos (RF-CLD-06)

- **Decisión**: `PUT` con `pisos < MAX(celda.piso)` → 409 `PISOS_CON_CELDAS` «Hay celdas registradas en el piso N».

## R-05 · Máquina de estados de la celda (RN-09)

| Estado actual | Pedido manual (`PATCH …/estado`) | Resultado |
|---|---|---|
| disponible | `inhabilitada` + motivo | inhabilitada (bitácora) |
| inhabilitada | `disponible` | disponible, sin motivo |
| ocupada | cualquiera | 409 `CELDA_OCUPADA` «La celda está ocupada por ABC123» |
| reservada | cualquiera | 409 `CELDA_RESERVADA` |
| cualquiera | `ocupada` o `reservada` | 409 `CAMBIO_ESTADO_NO_PERMITIDO` «La ocupación se registra con una entrada; la reserva, desde Reservas.» |
| igual al pedido | — | 200 sin cambios |

- Validación: `estado` es uno de los 4 de 6.1; si el estado pedido es `inhabilitada`, el `motivo` (3–200) es obligatorio (422).
- `DELETE /celdas/:id` equivale a inhabilitar con el motivo «Retirada por el administrador».

## R-06 · Operaciones de dominio para la spec 007 (RF-CLD-19/20)

- **Decisión**: `celdasService.ocupar(conexion, { idCelda, idVehiculo, tipoVehiculo })` y `celdasService.liberar(conexion, idCelda)` reciben la conexión de la transacción del movimiento y bloquean la celda (`FOR UPDATE`).
  - `ocupar` exige celda `disponible` o `reservada`, del mismo tipo y de un parqueadero activo; si no → 409 `CELDA_NO_DISPONIBLE` o `TIPO_CELDA_INCOMPATIBLE`.
  - `liberar` deja la celda `disponible` sin vehículo.
  - El `CHECK ck_celda_ocupada` y el `UNIQUE uq_celda_vehiculo_actual` del esquema garantizan RNF-SAF-01 aunque haya un error en el código.
- `celdasService.sugerir(conexion, { idParqueadero, tipoVehiculo })` (para la 007): devuelve la celda `disponible` de menor código del tipo, con `FOR UPDATE SKIP LOCKED` (RF-MOV-04).
- **Pruebas**: HU-23 E1–E3 y E5 se prueban llamando estas operaciones dentro de `withTransaction`, con un vehículo de prueba insertado (la tabla `vehiculo` existe desde la 2.0.0).

## R-07 · Placa y hora de entrada en la celda (RF-CLD-18)

- **Decisión**: `GET /celdas` y `GET /celdas/:id` hacen `LEFT JOIN vehiculo` (por `id_vehiculo_actual`) y `LEFT JOIN movimiento` abierto de esa celda (`estado = 'abierto'`). Si el actor tiene `movimientos.ver`, la respuesta trae `ocupante: { placa, tipo, fechaHoraEntrada }`; si no, `ocupante` es `null`. Así el Cliente nunca recibe la placa (RNF-PRI-02).

## R-08 · Consulta del mapa

- **Decisión**: `GET /celdas?parqueadero&piso&tipo&estado&q&page&limit` paginado (máximo 100, constitución §II). La vista del mapa pide `limit=100` por piso y recorre las páginas si hacen falta. La respuesta incluye `piso` y `area` para agrupar. Orden: piso, área, código.

## R-09 · Disponibilidad pública (RF-CLD-22/23)

- **Decisión**: `GET /api/v1/disponibilidad` sin token y sin datos personales: `{ actualizadoEn, parqueaderos: [{ idParqueadero, nombre, direccion, horario, tipos: { carro: { disponibles, total, lleno }, moto: { … } } }] }`. Solo parqueaderos activos; `total` = celdas que no están inhabilitadas; `lleno = disponibles === 0 && total > 0`. Se calcula con una sola consulta agrupada.
- **Caché HTTP**: `Cache-Control: no-store` (el dato cambia con cada movimiento).

## R-10 · Tiempo real por consulta periódica (RF-CLD-21)

- **Decisión**: la molécula nueva `moleculas/consulta-periodica.js` llama a una función cada 10 s y se detiene si `document.visibilityState === 'hidden'`; al volver a la pestaña consulta de inmediato. Sin WebSockets ni SSE (SRS §3.4). Reemplaza el SSE de la v1 (contradicción C-05 de la spec 001).

## R-11 · Datos semilla y constitución §VI («al menos 5 registros por recurso»)

- **Decisión**:
  - Parqueadero ABC activo y «Parqueadero ABC · Zona anexa» inactivo, 2 parqueaderos;
  - 4 puertas (3 en el principal, 1 en el anexo);
  - 40 celdas: 36 en el principal (A-01..A-12 y M-01..M-12 en el piso 1; B-01..B-12 en el piso 2), una de ellas inhabilitada (A-12) para mostrar el estado, y 4 inhabilitadas «Parqueadero inactivo» en el anexo.
- **Justificación**: el SRS §2.7 fija una sola sede física. Inventar 5 parqueaderos contradiría el negocio, así que la regla de 5 registros se cumple en celdas (40) y en puertas (4), y en parqueaderos se usan 2 (el segundo solo para probar la inactivación).

## Contradicciones entre fuentes

| # | Fuentes | Resolución |
|---|---|---|
| C-01 | Constitución §VI (5 registros por recurso) frente al SRS §2.7 (una sede) | R-11: 2 parqueaderos |
| C-02 | v1 (SSE y fila de mapa) frente al SRS §3.4 (consulta cada 10 s) y al modelo 6.1 (sin columnas de mapa) | Consulta periódica; mapa por piso y área |

## [NEEDS CLARIFICATION] pendientes

Ninguno.
