# Plan de implementación: Parqueaderos y celdas

**Rama**: `004-parqueaderos-celdas` | **Fecha**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de `specs/004-parqueaderos-celdas/spec.md`

## Resumen

Infraestructura física y disponibilidad (HU-17 a HU-24; RF-CLD-01 a RF-CLD-23; RN-09, RN-10). Abarca los 18 endpoints de B.1 §4.4:
- **Parqueaderos:** CRUD con inactivación lógica que deja sus celdas fuera de servicio.
- **Puertas:** por parqueadero, filtradas por uso.
- **Celdas:** individuales y por rango, con máquina de estados manual.
- **Mapa:** muestra la placa solo al personal.
- **Disponibilidad pública:** sin datos personales.
- **Operaciones de dominio `ocupar`, `liberar` y `sugerir`:** probadas aquí y usadas por la spec 007.

En el frontend: mapa por piso y área con consulta cada 10 s, configuración de parqueaderos y puertas, vista de disponibilidad del Cliente y la página pública. Sin cambios de esquema; la semilla agrega la infraestructura del Parqueadero ABC. Decisiones en [research.md](research.md).

## Contexto técnico

**Lenguaje/Versión**: JavaScript (ES2022) en CommonJS sobre Node.js 20 LTS

**Dependencias principales**: las existentes; sin dependencias nuevas.

**Almacenamiento**: MySQL 8: `parqueadero`, `puerta_acceso` y `celda` (lectura de `vehiculo` y `movimiento`), más `bitacora`.

**Pruebas**: Jest + Supertest (`tests/integration/parqueaderos.test.js`, `tests/integration/celdas.test.js`, `tests/unit/celdas.reglas.test.js`) y Postman/Newman (`casos/004-parqueaderos-celdas.js`).

**Plataforma objetivo / Tipo de proyecto**: los mismos.

**Metas de rendimiento**:
- RNF-REN-02: mapa de un piso y disponibilidad ≤ 1 s p95; una consulta agrupada con el índice `idx_celda_estado`.
- RNF-REN-03: retraso ≤ 10 s.

**Restricciones**: RNF-SAF-01 (un vehículo por celda: `CHECK` + `UNIQUE` + `FOR UPDATE`), RNF-PRI-02 (placa solo al personal), RNF-SEG-03 (disponibilidad pública).

**Escala/Alcance**: 1 sede activa, unas 40 celdas en la semilla; el modelo admite varias sedes.

## Verificación de la constitución (Constitution Check)

*COMPUERTA: pasa antes de la fase 0 y se vuelve a verificar después del diseño.*

| Principio | Cumplimiento en 004 | Estado |
|---|---|---|
| I. La especificación manda | 6 aclaraciones con su fuente; contradicciones C-01 y C-02 registradas | ✅ |
| II. Monolito por capas y REST | 3 módulos con capas; rutas de B.1 (incluidos los DELETE lógicos); `PATCH …/estado`; sobre `{ok}` | ✅ |
| III. Seguridad y privacidad | permisos por endpoint; ocupante según `movimientos.ver`; disponibilidad pública sin datos personales | ✅ |
| IV. Integridad de datos | transacciones con `FOR UPDATE`; `UNIQUE` y `CHECK` en la BD; bitácora | ✅ |
| V. Frontend vanilla y accesible (Atomic Design) | átomo, 3 moléculas y 1 organismo nuevos por nivel; pestañas con `role="tablist"`; color + texto; scroll en móvil | ✅ |
| VI. Pruebas | escenario → Jest + Postman (éxito y error por endpoint) | ✅ |
| VII. Simplicidad | sin tablas ni dependencias nuevas; consulta periódica en lugar de WebSockets | ✅ |

**Re-evaluación después de la fase 1**: sin violaciones. **COMPUERTA: PASA.**

## Estructura del proyecto

```text
backend/
├── database/{generar-seed.js, seed.sql}          # parqueaderos, puertas y celdas
├── src/modules/
│   ├── parqueaderos/  parqueaderos.{routes,controller,service,repository,validator}.js  (+ puertas)
│   ├── celdas/        celdas.{routes,controller,service,repository,validator,reglas}.js   (ocupar/liberar/sugerir)
│   └── disponibilidad/ disponibilidad.{routes,controller,service,repository}.js          (público)
├── docs/postman/casos/004-parqueaderos-celdas.js
└── tests/{unit/celdas.reglas.test.js, integration/parqueaderos.test.js, integration/celdas.test.js}

frontend/
├── parqueaderos.html · parqueadero-detalle.html · celdas.html · disponibilidad.html · index.html
└── js/
    ├── services/{parqueaderos, celdas, disponibilidad}.service.js
    ├── views/{parqueaderos, parqueadero-detalle, celdas, disponibilidad, inicio}.view.js
    └── components/
        ├── atomos/chip-estado.js                           # + ponerChipCelda
        ├── moleculas/{consulta-periodica, pestanas, kpi}.js
        └── organismos/mapa-celdas.js
herramientas/paginas-004.js
```

**Decisión de estructura**: la misma; tres módulos nuevos.

## Fases

| Fase | Contenido |
|---|---|
| 1 · Preparación | semilla: parqueaderos, puertas y celdas en `generar-seed.js`; `db:reset` |
| 2 · Fundacional | `celdas.reglas.js` (normalizar código, códigos del rango, transiciones manuales permitidas) + pruebas unitarias |
| 3 · US1 (P1) HU-17 | POST/GET /parqueaderos, GET /:id |
| 4 · US4 (P1) HU-20 | POST /celdas, POST /celdas/lote |
| 5 · US6 (P1) HU-22 | GET /celdas, GET /celdas/:id con ocupante según permiso |
| 6 · US7 (P1) HU-23 | `ocupar`, `liberar` y `sugerir` + pruebas en transacción |
| 7 · US8 (P1) HU-24 | GET /disponibilidad |
| 8 · US2 (P2) HU-18 | PUT y DELETE /parqueaderos/:id |
| 9 · US3 (P2) HU-19 | puertas |
| 10 · US5 (P2) HU-21 | PUT, PATCH /estado y DELETE /celdas/:id |
| 11 · Interfaz | componentes, páginas, menú «Celdas», «Parqueaderos» y «Disponibilidad» |
| 12 · Pulido | Postman 004, README, rendimiento, revisión de que todo esté en español |

## Matriz de trazabilidad

| HU | RF | RN | Endpoint | Servicio | Pruebas |
|---|---|---|---|---|---|
| HU-17 | RF-CLD-01..03 | — | POST/GET /parqueaderos · GET /parqueaderos/:id | `parqueaderosService.crear/listar/obtener` | `HU-17 E1–E5` |
| HU-18 | RF-CLD-04..06 | RN-10 | PUT/DELETE /parqueaderos/:id | `actualizar`, `inactivar` | `HU-18 E1–E5` |
| HU-19 | RF-CLD-07, 08 | — | GET/POST /parqueaderos/:id/puertas · PUT /puertas/:id | `puertas*` | `HU-19 E1–E4` |
| HU-20 | RF-CLD-09..12 | — | POST /celdas · POST /celdas/lote | `celdasService.crear/crearLote` | `HU-20 E1–E5` |
| HU-21 | RF-CLD-13..15 | RN-09, RN-10 | PUT /celdas/:id · PATCH /celdas/:id/estado · DELETE /celdas/:id | `actualizar/cambiarEstado/inhabilitar` | `HU-21 E1–E6` |
| HU-22 | RF-CLD-16..18 | — | GET /celdas · GET /celdas/:id | `listar/obtener` | `HU-22 E1–E4` |
| HU-23 | RF-CLD-19..21 | RN-09, RN-15 | (efecto de los movimientos de la 007) | `ocupar/liberar/sugerir` | `HU-23 E1–E3, E5` (E4 manual: consulta de 10 s) |
| HU-24 | RF-CLD-22, 23 | — | GET /disponibilidad | `disponibilidadService.consultar` | `HU-24 E1–E3` |

## Cumplimiento de RNF

| RNF | Cómo | Dónde |
|---|---|---|
| RNF-SAF-01 | `FOR UPDATE` + `CHECK ck_celda_ocupada` + `UNIQUE uq_celda_vehiculo_actual` | `celdas.service.ocupar` |
| RNF-REN-02/03 | consultas agrupadas con índices; consulta cada 10 s | repositorios; `moleculas/consulta-periodica.js` |
| RNF-SEG-03 | `/disponibilidad` montado fuera del grupo protegido | `app.js` |
| RNF-SEG-04 | `authorize('parqueaderos.*' / 'celdas.*')` | rutas |
| RNF-PRI-02 | ocupante solo con `movimientos.ver`; sin datos personales en la disponibilidad | `celdas.service`, `disponibilidad.repository` |
| RNF-USA-01/04 | scroll del mapa en móvil; pestañas accesibles; color + texto | `celdas.html`, `organismos/mapa-celdas.js` |
| RNF-CAL-03 | Postman 004 | `casos/004-parqueaderos-celdas.js` |

## Permisos del módulo

| Código | Operaciones | Roles en el seed |
|---|---|---|
| `parqueaderos.ver` | GET /parqueaderos, /:id, /:id/puertas | Administrador, Operador |
| `parqueaderos.crear` | POST /parqueaderos | Administrador |
| `parqueaderos.editar` | PUT /parqueaderos/:id, POST /parqueaderos/:id/puertas, PUT /puertas/:id | Administrador |
| `parqueaderos.cambiar_estado` | DELETE /parqueaderos/:id; `estado` en PUT | Administrador |
| `celdas.ver` | GET /celdas, GET /celdas/:id | Administrador, Operador, Cliente |
| `celdas.crear` | POST /celdas, POST /celdas/lote | Administrador |
| `celdas.editar` | PUT /celdas/:id | Administrador |
| `celdas.cambiar_estado` | PATCH /celdas/:id/estado, DELETE /celdas/:id | Administrador |
| (público) | GET /disponibilidad | todos |

## Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Doble asignación de una celda en entradas simultáneas (spec 007) | `FOR UPDATE` en `ocupar`; `SKIP LOCKED` en `sugerir`; restricciones de la BD |
| Cambios de la semilla que rompan las pruebas de 001–003 | la semilla solo agrega filas; los ids de roles y usuarios no cambian |
| Mapa lento con muchos pisos | se pide un piso a la vez (`limit=100`, con paginación) |
| Fuga de placas al Cliente | el ocupante se calcula en el servicio según el permiso; prueba HU-22 E3 |

## Seguimiento de complejidad (Complexity Tracking)

Sin violaciones ni dependencias nuevas.
