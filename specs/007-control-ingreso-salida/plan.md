# Plan de implementación: Control de ingreso y salida

**Rama**: `007-control-ingreso-salida` | **Fecha**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de `specs/007-control-ingreso-salida/spec.md`

## Resumen

El proceso central del parqueadero (HU-31 a HU-35; RF-MOV-01 a RF-MOV-17; RN-13, RN-15, RN-16). Abarca los 6 endpoints de B.1 §4.7:
- **Entrada:** valida la puerta, el vehículo (lo crea si es ocasional), que no esté dentro y el pico y placa (y guarda el intento rechazado); asigna la celda elegida o la sugerida, ocupa la celda y genera el ticket. Todo en una transacción.
- **Ticket:** consulta por código y envío al correo del propietario; vista de impresión de 80 mm.
- **Salida:** cierra el movimiento con los minutos de estadía, libera la celda y marca el ticket extraviado si aplica; deja el movimiento listo para la liquidación de la spec 009.
- **Vehículos dentro:** del más antiguo al más reciente, con el tiempo transcurrido y la marca de más de 24 h.
- **Anulación:** con motivo; el Operador puede anular dentro de los 15 minutos siguientes a la entrada y el Administrador siempre.

En el frontend: la pantalla de caseta (entrada, salida, dentro y anulación) y la vista del ticket. El esquema pasa a **2.2.0** (`ticket.extraviado`, `ingreso_rechazado`). Decisiones en [research.md](research.md).

## Contexto técnico

**Lenguaje/Versión**: JavaScript (ES2022) en CommonJS sobre Node.js 20 LTS

**Dependencias principales**: las existentes (nodemailer para el correo del ticket); sin dependencias nuevas.

**Almacenamiento**: MySQL 8: `movimiento`, `ticket`, `ingreso_rechazado` (nueva), `consecutivo`, más `celda`, `vehiculo`, `puerta_acceso`, `restriccion_placa` y `bitacora`.

**Pruebas**: Jest + Supertest (`tests/integration/movimientos.test.js`, `tests/integration/tickets.test.js`, `tests/unit/movimientos.reglas.test.js`) con el reloj fijado; Postman/Newman (`casos/007-control-ingreso-salida.js`) con placas calculadas según el pico y placa de hoy.

**Plataforma objetivo / Tipo de proyecto**: los mismos.

**Metas de rendimiento**: RNF-REN-01: entrada y salida ≤ 2 s p95.

**Restricciones**: RNF-SAF-01 (un movimiento abierto por vehículo, un vehículo por celda), RNF-SAF-02 (nada se borra), RN-16 (hora del servidor).

**Escala/Alcance**: 1 sede con 35 celdas en servicio; el modelo admite 50 000 movimientos (RNF-REN-01).

## Verificación de la constitución (Constitution Check)

*COMPUERTA: pasa antes de la fase 0 y se vuelve a verificar después del diseño.*

| Principio | Cumplimiento en 007 | Estado |
|---|---|---|
| I. La especificación manda | 7 aclaraciones con su fuente; las dos piezas `[Propuesta]` justificadas (R-04, R-05) | ✅ |
| II. Monolito por capas y REST | módulos `movimientos` y `tickets` con capas; rutas de B.1; sobre `{ok}` | ✅ |
| III. Seguridad y privacidad | permisos por endpoint; el correo del propietario nunca se devuelve | ✅ |
| IV. Integridad de datos | una transacción por operación con `FOR UPDATE`; `UNIQUE`; consecutivo sin huecos; bitácora; migración documentada | ✅ |
| V. Frontend vanilla y accesible (Atomic Design) | 1 organismo nuevo y reutilización de átomos y moléculas; la alerta de 24 h con texto; impresión de 80 mm | ✅ |
| VI. Pruebas | escenario → Jest + Postman (éxito y error por endpoint); reloj fijado | ✅ |
| VII. Simplicidad | una tabla y una columna nuevas; sin dependencias nuevas | ✅ |

**Re-evaluación después de la fase 1**: sin violaciones. **COMPUERTA: PASA.**

## Estructura del proyecto

```text
backend/
├── database/
│   ├── schema.sql                                    # 2.2.0
│   ├── migrations/002_ingresos_rechazados_y_ticket_extraviado.sql
│   └── CAMBIOS.md
├── src/utils/reloj.js
├── src/modules/
│   ├── movimientos/ movimientos.{routes,controller,service,repository,validator,reglas}.js
│   └── tickets/     tickets.{routes,controller,service,repository}.js
├── docs/postman/casos/007-control-ingreso-salida.js
└── tests/{unit/movimientos.reglas.test.js, integration/movimientos.test.js, integration/tickets.test.js}

frontend/
├── movimientos.html · ticket.html
└── js/
    ├── services/{movimientos, tickets}.service.js
    ├── views/{movimientos, ticket}.view.js
    └── components/organismos/ticket.js
herramientas/paginas-007.js
```

**Decisión de estructura**: la misma; dos módulos nuevos.

## Fases

| Fase | Contenido |
|---|---|
| 1 · Preparación | esquema 2.2.0 + migración 002 + `CAMBIOS.md`; `utils/reloj.js`; `db:reset` |
| 2 · Fundacional | `movimientos.reglas.js` (minutos, más de 24 h, límite de anulación, mensaje de pico y placa) + pruebas unitarias |
| 3 · US1 (P1) HU-31 | POST /movimientos (con el intento rechazado) |
| 4 · US2 (P1) HU-32 | GET /tickets/:codigo, POST /tickets/:codigo/envio |
| 5 · US3 (P1) HU-33 | POST /movimientos/:id/salida |
| 6 · US4 (P2) HU-34 | GET /movimientos |
| 7 · US5 (P2) HU-35 | PATCH /movimientos/:id/anulacion |
| 8 · Interfaz | organismo ticket, servicios, páginas movimientos y ticket, menú «Movimientos» |
| 9 · Pulido | Postman 007, README, medición de rendimiento, revisión de que todo esté en español |

## Matriz de trazabilidad

| HU | RF | RN | Endpoint | Servicio | Pruebas |
|---|---|---|---|---|---|
| HU-31 | RF-MOV-01..05 | RN-13, RN-15, RN-16 | POST /movimientos | `movimientosService.registrarEntrada` | `HU-31 E1–E6` |
| HU-32 | RF-MOV-06..08 | — | GET /tickets/:codigo · POST /tickets/:codigo/envio | `ticketsService.obtener/enviar` | `HU-32 E1–E3` |
| HU-33 | RF-MOV-09..12 | RN-16 | POST /movimientos/:id/salida · GET /movimientos?placa | `registrarSalida` | `HU-33 E1–E5` |
| HU-34 | RF-MOV-13, 14 | — | GET /movimientos?estado=abierto&q | `listar` | `HU-34 E1–E3` |
| HU-35 | RF-MOV-15..17 | RN-02 | PATCH /movimientos/:id/anulacion | `anular` | `HU-35 E1–E4` |

## Cumplimiento de RNF

| RNF | Cómo | Dónde |
|---|---|---|
| RNF-REN-01 | transacción con consultas indexadas; medición con 20 entradas | `movimientos.service` |
| RNF-SAF-01 | `FOR UPDATE` + `UNIQUE uq_movimiento_abierto` + `ocupar` | `movimientos.service`, `celdas.service` |
| RNF-SAF-02 | sin DELETE; anulación con motivo, usuario y fecha | `movimientos.service` |
| RNF-SEG-04 | `authorize('movimientos.*')`; límite de anulación por rol | rutas, service |
| RNF-SEG-07 | bitácora de entrada, salida y anulación | service |
| RNF-PRI-02 | el ticket no devuelve el correo (solo `tieneCorreo` y el correo enmascarado al enviar) | `tickets.service` |
| RNF-CAL-03 | Postman 007 | `casos/007-control-ingreso-salida.js` |

## Permisos del módulo

| Código | Operaciones | Roles en el seed |
|---|---|---|
| `movimientos.ver` | GET /movimientos, GET /tickets/:codigo | Administrador, Operador |
| `movimientos.crear` | POST /movimientos, POST /movimientos/:id/salida, POST /tickets/:codigo/envio | Administrador, Operador |
| `movimientos.anular` | PATCH /movimientos/:id/anulacion (Operador: 15 min) | Administrador, Operador |

## Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Pruebas que dependen del día y la hora real (pico y placa, minutos) | `utils/reloj.js` fijado en Jest; en Postman, placas calculadas con `/restricciones-placa/hoy` |
| Pruebas que llenan las celdas de la semilla | Jest crea su propio parqueadero; Postman cierra o anula lo que abre |
| Doble entrada simultánea | `UNIQUE` del movimiento abierto + `FOR UPDATE` del vehículo y de la celda |
| Intento rechazado perdido por el rollback | se guarda en su propia transacción después del rollback |

## Seguimiento de complejidad (Complexity Tracking)

| Elemento | Por qué | Alternativa descartada |
|---|---|---|
| Tabla `ingreso_rechazado` `[Propuesta]` | RF-MOV-02 guarda el motivo; RF-REP-06 lista los intentos rechazados por fecha | la tabla `alerta` (no guarda placa, puerta ni operador) |
| Columna `ticket.extraviado` `[Propuesta]` | criterio 4 de HU-33 | anotarlo en la bitácora (no se consulta desde el ticket) |

Sin dependencias nuevas.
