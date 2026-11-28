# Plan de implementación: Reservas

**Rama**: `012-reservas` | **Fecha**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de `specs/012-reservas/spec.md`

## Resumen

Reservas de celdas (HU-52 a HU-55; RF-RES-01 a RF-RES-09; RN-26, RN-27). Abarca los endpoints de B.1 §4.12, el efecto en la entrada y el control cada minuto:
- **Reservar:** con un vehículo propio, para una hora futura (≤ 7 días), en una celda libre de su tipo (elegida o asignada); código `R-` y aviso por correo.
- **Cancelar:** las confirmadas que no han iniciado.
- **Listados:** las del día para el personal y «Mis reservas» para el Cliente; celdas libres en una franja.
- **Cumplir:** la entrada del vehículo en su franja usa la celda reservada.
- **Control cada minuto:** marca la celda como reservada desde el inicio (o reasigna si está ocupada) y vence las no usadas, liberando la celda y avisando.

En el frontend: Reservas (personal), Mis reservas con «Reservar» (Cliente) y el aviso de reserva en la entrada. Sin cambios de esquema. Decisiones en [research.md](research.md).

## Contexto técnico

**Lenguaje/Versión**: JavaScript (ES2022) en CommonJS sobre Node.js 20 LTS

**Dependencias principales**: las existentes; sin dependencias nuevas (el control usa `setInterval`).

**Almacenamiento**: MySQL 8: `reserva`, `celda`, `movimiento`, `notificacion`, `consecutivo`, más `bitacora`.

**Pruebas**: Jest + Supertest (`tests/integration/reservas.test.js`, `tests/unit/reservas.reglas.test.js`) con el reloj fijado; Postman/Newman (`casos/012-reservas.js`).

**Plataforma objetivo / Tipo de proyecto**: los mismos.

**Metas de rendimiento**: RNF-REN-01: la entrada sigue en ≤ 2 s p95 (una consulta indexada más: `idx_reserva_vehiculo`).

**Restricciones**: RN-26 (vehículo propio y franjas sin cruces: `FOR UPDATE` de la celda y del vehículo), RN-27 (reservada desde el inicio; libre al vencer), hora de Bogotá, TBD-07 como parámetros.

**Escala/Alcance**: decenas de reservas por día.

## Verificación de la constitución (Constitution Check)

*COMPUERTA: pasa antes de la fase 0 y se vuelve a verificar después del diseño.*

| Principio | Cumplimiento en 012 | Estado |
|---|---|---|
| I. La especificación manda | 8 aclaraciones con su fuente; TBD-07 como parámetro documentado | ✅ |
| II. Monolito por capas y REST | 1 módulo con capas; rutas de B.1; sobre `{ok}` | ✅ |
| III. Seguridad y privacidad | el Cliente solo reserva y cancela lo suyo; permisos por endpoint | ✅ |
| IV. Integridad de datos | creación y control en transacción con bloqueos; reserva y entrada en la misma transacción; bitácora | ✅ |
| V. Frontend vanilla y accesible (Atomic Design) | 1 átomo (variante) nuevo; páginas Reservas y Mis reservas con componentes existentes | ✅ |
| VI. Pruebas | escenario → Jest + Postman (éxito y error por endpoint) | ✅ |
| VII. Simplicidad | sin tablas ni dependencias nuevas; `setInterval` en el programador existente | ✅ |

**Re-evaluación después de la fase 1**: sin violaciones. **COMPUERTA: PASA.**

## Estructura del proyecto

```text
backend/
├── .env.example · src/config/env.js                       # RESERVA_ANTICIPACION_DIAS, RESERVA_MINUTOS_ESPERA
├── src/tareas/programador.js                              # control de reservas cada minuto
├── src/modules/
│   ├── reservas/     reservas.{routes,controller,service,repository,validator,reglas}.js
│   ├── celdas/       celdas.routes.js (GET /disponibles)
│   ├── usuarios/     usuarios.routes.js (GET /me/reservas)
│   └── movimientos/  movimientos.service.js (entrada con reserva)
├── docs/postman/casos/012-reservas.js
└── tests/{unit/reservas.reglas.test.js, integration/reservas.test.js}

frontend/
├── reservas.html · mis-reservas.html
└── js/
    ├── services/reservas.service.js
    ├── views/{reservas, mis-reservas}.view.js · movimientos.view.js (aviso de reserva)
    └── components/atomos/chip-estado.js                   # + ponerChipReserva
herramientas/paginas-012.js
```

**Decisión de estructura**: la misma; un módulo nuevo y la entrada ampliada.

## Fases

| Fase | Contenido |
|---|---|
| 1 · Preparación | parámetros en `env.js` y `.env.example`; nota en `CAMBIOS.md` |
| 2 · Fundacional | `reservas.reglas.js` + pruebas unitarias |
| 3 · US1 (P1) HU-52 | POST /reservas, GET /celdas/disponibles |
| 4 · US2 (P1) HU-53 | PATCH /reservas/:id/cancelacion, GET /usuarios/me/reservas |
| 5 · US3 (P2) HU-54 | GET /reservas |
| 6 · US4 (P2) HU-55 | entrada con reserva; `controlar` y el programador |
| 7 · Interfaz | páginas, aviso en la entrada, menú |
| 8 · Pulido | Postman 012, README, revisión de que todo esté en español |

## Matriz de trazabilidad

| HU | RF | RN | Endpoint | Servicio | Pruebas |
|---|---|---|---|---|---|
| HU-52 | RF-RES-01..03 | RN-26 | POST /reservas · GET /celdas/disponibles | `reservasService.reservar/disponibles` | `HU-52 E1–E5` |
| HU-53 | RF-RES-04, 05 | — | PATCH /reservas/:id/cancelacion · GET /usuarios/me/reservas | `cancelar`, `mias` | `HU-53 E1–E3` |
| HU-54 | RF-RES-06 | — | GET /reservas | `listar` | `HU-54 E1–E2` |
| HU-55 | RF-RES-07..09 | RN-27 | (POST /movimientos) · (control cada minuto) | `paraEntrada`, `cumplir`, `controlar` | `HU-55 E1–E3` |

## Cumplimiento de RNF

| RNF | Cómo | Dónde |
|---|---|---|
| RNF-SEG-04 | `authorize('reservas.*')`; alcance del Cliente en el servicio | rutas, `reservas.service` |
| RNF-SEG-07 | bitácora de reservar, cancelar, cumplir, reasignar y vencer | `reservas.service` |
| RNF-SAF-01 | entrada y cumplimiento en una transacción; control con bloqueos | `movimientos.service`, `reservas.service` |
| RNF-CAL-03 | Postman 012 | `casos/012-reservas.js` |

## Permisos del módulo

| Código | Operaciones | Roles en el seed |
|---|---|---|
| `reservas.ver` | GET /reservas; cancelar cualquiera | Administrador, Operador |
| `reservas.crear` | POST /reservas (el Cliente, sus vehículos) | Administrador, Operador, Cliente |
| `reservas.editar` | PATCH /reservas/:id/cancelacion (el Cliente, las suyas) | Administrador, Operador, Cliente |
| `perfil.ver` | GET /usuarios/me/reservas | todos |
| `celdas.ver` | GET /celdas/disponibles | Administrador, Operador, Cliente |

## Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Dos reservas cruzadas en la misma celda | `FOR UPDATE` de la celda y nueva verificación del cruce dentro de la transacción |
| La celda está ocupada al iniciar la franja | el control reasigna otra libre del tipo y avisa |
| El control dispara en las pruebas | no se programa con `NODE_ENV=test`; las pruebas llaman a `controlar` |
| Las reservas de una prueba quitan celdas a otras | sede propia en las pruebas; Postman cancela su reserva |

## Seguimiento de complejidad (Complexity Tracking)

Sin violaciones ni dependencias nuevas.
