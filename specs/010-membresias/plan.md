# Plan de implementación: Membresías

**Rama**: `010-membresias` | **Fecha**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de `specs/010-membresias/spec.md`

## Resumen

Planes y membresías mensuales (HU-45 a HU-48; RF-MEM-01 a RF-MEM-10; RN-23, RN-24). Abarca los 8 endpoints de B.1 §4.10 más un listado para el personal `[Propuesta]`:
- **Planes:** crear, editar y cambiar estado; un plan inactivo conserva sus membresías vigentes.
- **Suscripción con pago:** en una transacción crea la membresía activa, su factura (`id_membresia`) y el pago; impide dos membresías activas por vehículo.
- **Renovación:** desde el día siguiente al fin actual, con una factura nueva.
- **Cancelación:** con motivo.
- **Vencimiento diario:** un proceso programado sin dependencias nuevas.
- **Mi membresía:** con días restantes, aviso de renovación, facturas y planes disponibles.

La liquidación de la spec 009 ya da $ 0 a las estadías cubiertas. En el frontend: Planes, Membresías y Mi membresía. Sin cambios de esquema; la semilla trae 5 planes. Decisiones en [research.md](research.md).

## Contexto técnico

**Lenguaje/Versión**: JavaScript (ES2022) en CommonJS sobre Node.js 20 LTS

**Dependencias principales**: las existentes; sin dependencias nuevas (el proceso diario usa `setTimeout`).

**Almacenamiento**: MySQL 8: `plan_membresia`, `membresia`, `factura`, `pago`, `consecutivo`, más `bitacora`.

**Pruebas**: Jest + Supertest (`tests/integration/{planes,membresias}.test.js`, `tests/unit/membresias.reglas.test.js`) con el reloj fijado; Postman/Newman (`casos/010-membresias.js`).

**Plataforma objetivo / Tipo de proyecto**: los mismos.

**Metas de rendimiento**: RNF-REN-02: consultas ≤ 1 s p95.

**Restricciones**: RN-23 (una activa por vehículo: `UNIQUE` + `FOR UPDATE`), RN-24 (solo con pago: misma transacción), hora de Bogotá.

**Escala/Alcance**: decenas de planes; cientos de membresías.

## Verificación de la constitución (Constitution Check)

*COMPUERTA: pasa antes de la fase 0 y se vuelve a verificar después del diseño.*

| Principio | Cumplimiento en 010 | Estado |
|---|---|---|
| I. La especificación manda | 7 aclaraciones con su fuente; el listado del personal marcado `[Propuesta]` | ✅ |
| II. Monolito por capas y REST | 2 módulos con capas; rutas de B.1; sobre `{ok}` | ✅ |
| III. Seguridad y privacidad | permisos por endpoint; el Cliente solo sus vehículos y membresías | ✅ |
| IV. Integridad de datos | membresía, factura y pago en una transacción; `UNIQUE` de la activa; bitácora | ✅ |
| V. Frontend vanilla y accesible (Atomic Design) | 1 átomo (variante), 1 molécula y 1 organismo nuevos; el cambio en vivo con `aria-live` | ✅ |
| VI. Pruebas | escenario → Jest + Postman (éxito y error por endpoint) | ✅ |
| VII. Simplicidad | sin tablas ni dependencias nuevas; `setTimeout` en lugar de `node-cron` | ✅ |

**Re-evaluación después de la fase 1**: sin violaciones. **COMPUERTA: PASA.**

## Estructura del proyecto

```text
backend/
├── database/{generar-seed.js, seed.sql}             # 5 planes
├── src/server.js · src/tareas/programador.js        # vencimiento diario
├── src/modules/
│   ├── planes/      planes.{routes,controller,service,repository,validator}.js
│   ├── membresias/  membresias.{routes,controller,service,repository,validator,reglas}.js
│   └── facturas/    facturas.service.js (cobrar reutilizable), facturas.repository.js y factura.pdf.js (membresía)
├── docs/postman/casos/010-membresias.js
└── tests/{unit/membresias.reglas.test.js, integration/{planes,membresias}.test.js}

frontend/
├── planes.html · membresias.html · mi-membresia.html
└── js/
    ├── services/membresias.service.js
    ├── views/{planes, membresias, mi-membresia}.view.js
    └── components/
        ├── atomos/chip-estado.js                     # + ponerChipMembresia
        ├── moleculas/vigencia.js
        └── organismos/formulario-pago.js
herramientas/paginas-010.js
```

**Decisión de estructura**: la misma; dos módulos nuevos.

## Fases

| Fase | Contenido |
|---|---|
| 1 · Preparación | semilla de planes; `facturas.service.cobrar` reutilizable; factura con membresía; nota en `CAMBIOS.md` |
| 2 · Fundacional | `membresias.reglas.js` (fin, renovación, días restantes, aviso) + pruebas unitarias |
| 3 · US1 (P1) HU-45 | planes: GET, POST, PUT, PATCH estado |
| 4 · US2 (P1) HU-46 | POST /membresias, GET /membresias |
| 5 · US3 (P2) HU-47 | renovación, cancelación, `vencer` y el programador |
| 6 · US4 (P3) HU-48 | GET /usuarios/me/membresias |
| 7 · Interfaz | componentes, páginas, menú |
| 8 · Pulido | Postman 010, README, revisión de que todo esté en español |

## Matriz de trazabilidad

| HU | RF | RN | Endpoint | Servicio | Pruebas |
|---|---|---|---|---|---|
| HU-45 | RF-MEM-01, 02 | RN-02 | GET/POST /planes-membresia · PUT /:id · PATCH /:id/estado | `planesService.*` | `HU-45 E1–E4` |
| HU-46 | RF-MEM-03..05 | RN-23, RN-24 | POST /membresias · GET /membresias | `membresiasService.suscribir/listar` | `HU-46 E1–E5` |
| HU-47 | RF-MEM-06..08 | — | POST /membresias/:id/renovacion · PATCH /:id/cancelacion · (proceso diario) | `renovar`, `cancelar`, `vencer` | `HU-47 E1–E4` |
| HU-48 | RF-MEM-09, 10 | — | GET /usuarios/me/membresias | `mias` | `HU-48 E1–E3` |

## Cumplimiento de RNF

| RNF | Cómo | Dónde |
|---|---|---|
| RNF-SEG-04 | `authorize('planes.*' / 'membresias.*')`; alcance del Cliente en el servicio | rutas, `membresias.service` |
| RNF-SEG-07 | bitácora de planes, suscribir, renovar, cancelar y vencer | services |
| RNF-SAF-02 | nada se borra; la membresía se cancela con motivo | `membresias.service` |
| RNF-CAL-03 | Postman 010 | `casos/010-membresias.js` |

## Permisos del módulo

| Código | Operaciones | Roles en el seed |
|---|---|---|
| `planes.ver` | GET /planes-membresia | Administrador, Operador, Cliente |
| `planes.crear` / `planes.editar` / `planes.cambiar_estado` | POST / PUT / PATCH estado | Administrador |
| `membresias.ver` | GET /membresias | Administrador, Operador |
| `membresias.crear` | POST /membresias (el Cliente, sus vehículos) | Administrador, Operador, Cliente |
| `membresias.editar` | renovación y cancelación | Administrador, Operador |
| `perfil.ver` | GET /usuarios/me/membresias | todos |

## Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Membresía activa sin pago | membresía, factura y pago en una sola transacción |
| Dos activas por vehículo | `UNIQUE uq_membresia_activa` + `FOR UPDATE` |
| Renovar una vencida cubre días sin pagar | se mueve `fecha_inicio` al nuevo inicio |
| El proceso diario dispara en las pruebas | no se programa con `NODE_ENV=test`; las pruebas llaman a `vencer` |

## Seguimiento de complejidad (Complexity Tracking)

Sin violaciones ni dependencias nuevas.
