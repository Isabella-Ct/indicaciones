# Plan de implementación: Tarifas

**Rama**: `008-tarifas` | **Fecha**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de `specs/008-tarifas/spec.md`

## Resumen

Configuración y consulta de tarifas (HU-36 a HU-38; RF-TAR-01 a RF-TAR-07; RN-18, RN-19). Abarca los 4 endpoints de B.1 §4.8:
- **Tarifas:** crear, editar y cambiar estado, con validación de valores y vigencia. Bloquea las superposiciones por tipo de vehículo y cliente, y permite cerrar la vigencia de la anterior al crear la nueva.
- **Protección de precios usados:** una tarifa ya usada en liquidaciones solo admite cambiar el nombre y cerrar su vigencia.
- **Única vigente:** inactivarla exige confirmación.
- **Consulta pública:** tarifas vigentes y programadas.
- **`vigenteEn`:** operación de dominio para la liquidación de la spec 009 (RN-19).

En el frontend: Configuración › Tarifas y la sección «Tarifas» de la página pública. Sin cambios de esquema; la semilla trae 5 tarifas. Decisiones en [research.md](research.md).

## Contexto técnico

**Lenguaje/Versión**: JavaScript (ES2022) en CommonJS sobre Node.js 20 LTS

**Dependencias principales**: las existentes; sin dependencias nuevas.

**Almacenamiento**: MySQL 8: `tarifa`, lectura de `liquidacion` (uso), más `bitacora`.

**Pruebas**: Jest + Supertest (`tests/integration/tarifas.test.js`, `tests/unit/tarifas.reglas.test.js`) con el reloj fijado; Postman/Newman (`casos/008-tarifas.js`).

**Plataforma objetivo / Tipo de proyecto**: los mismos.

**Metas de rendimiento**: RNF-REN-02: consulta pública ≤ 1 s p95, con `idx_tarifa_vigencia`.

**Restricciones**: RN-18 (sin superposición: transacción con `FOR UPDATE`), hora de Bogotá, reloj del servidor (`utils/reloj.js`).

**Escala/Alcance**: decenas de tarifas en total; a lo sumo 4 vigentes a la vez.

## Verificación de la constitución (Constitution Check)

*COMPUERTA: pasa antes de la fase 0 y se vuelve a verificar después del diseño.*

| Principio | Cumplimiento en 008 | Estado |
|---|---|---|
| I. La especificación manda | 6 aclaraciones con su fuente | ✅ |
| II. Monolito por capas y REST | módulo `tarifas` con capas; rutas de B.1 (GET público con `vigentes=true`); sobre `{ok}` | ✅ |
| III. Seguridad y privacidad | permisos por endpoint; la consulta pública no expone datos internos | ✅ |
| IV. Integridad de datos | `CHECK` en la BD; superposición en transacción; precios usados protegidos; bitácora | ✅ |
| V. Frontend vanilla y accesible (Atomic Design) | 1 átomo (variante), 1 molécula y 1 organismo nuevos; confirmaciones con `<dialog>` | ✅ |
| VI. Pruebas | escenario → Jest + Postman (éxito y error por endpoint) | ✅ |
| VII. Simplicidad | sin tablas ni dependencias nuevas | ✅ |

**Re-evaluación después de la fase 1**: sin violaciones. **COMPUERTA: PASA.**

## Estructura del proyecto

```text
backend/
├── database/{generar-seed.js, seed.sql}             # 5 tarifas
├── src/app.js                                       # GET /tarifas?vigentes=true público
├── src/modules/tarifas/ tarifas.{routes,controller,service,repository,validator,reglas}.js
├── docs/postman/casos/008-tarifas.js
└── tests/{unit/tarifas.reglas.test.js, integration/tarifas.test.js}

frontend/
├── tarifas.html · index.html (sección «Tarifas»)
└── js/
    ├── services/tarifas.service.js
    ├── views/{tarifas, inicio}.view.js
    └── components/
        ├── atomos/chip-estado.js                     # + ponerChipTarifa
        ├── moleculas/precio.js
        └── organismos/tabla-tarifas.js
herramientas/paginas-008.js
```

**Decisión de estructura**: la misma; un módulo nuevo.

## Fases

| Fase | Contenido |
|---|---|
| 1 · Preparación | semilla de tarifas; `db:reset`; nota en `CAMBIOS.md` |
| 2 · Fundacional | `tarifas.reglas.js` (vigencias que se cruzan, situación, tipo de cliente, campos editables de una usada) + pruebas unitarias |
| 3 · US1 (P1) HU-36 | POST /tarifas (con `cerrarAnterior`) |
| 4 · US2 (P2) HU-37 | PUT /tarifas/:id, PATCH /tarifas/:id/estado |
| 5 · US3 (P2) HU-38 | GET /tarifas (público con `vigentes=true`) y `vigenteEn` |
| 6 · Interfaz | componentes, página Tarifas, sección pública, menú |
| 7 · Pulido | Postman 008, README, rendimiento, revisión de que todo esté en español |

## Matriz de trazabilidad

| HU | RF | RN | Endpoint | Servicio | Pruebas |
|---|---|---|---|---|---|
| HU-36 | RF-TAR-01..03, 05 | RN-02, RN-18 | POST /tarifas | `tarifasService.crear` | `HU-36 E1–E4` |
| HU-37 | RF-TAR-04..06 | RN-18 | PUT /tarifas/:id · PATCH /tarifas/:id/estado | `actualizar`, `cambiarEstado` | `HU-37 E1–E4` |
| HU-38 | RF-TAR-07 | RN-19 | GET /tarifas?vigentes=true · (`vigenteEn` para la 009) | `vigentes`, `listar`, `vigenteEn` | `HU-38 E1–E3` |

## Cumplimiento de RNF

| RNF | Cómo | Dónde |
|---|---|---|
| RNF-SEG-03 | router público solo para `vigentes=true` | `app.js`, `tarifas.routes.js` |
| RNF-SEG-04 | `authorize('tarifas.*')` | rutas |
| RNF-SEG-07 | bitácora de crear, cerrar, editar y cambiar estado | service |
| RNF-REN-02 | consultas por `idx_tarifa_vigencia` | repository |
| RNF-USA-01/04 | valores en COP; confirmaciones accesibles; tabla con scroll en móvil | páginas 008 |
| RNF-CAL-03 | Postman 008 | `casos/008-tarifas.js` |

## Permisos del módulo

| Código | Operaciones | Roles en el seed |
|---|---|---|
| (público) | GET /tarifas?vigentes=true | todos |
| `tarifas.ver` | GET /tarifas (listado administrativo) | Administrador, Operador, Cliente |
| `tarifas.crear` | POST /tarifas | Administrador |
| `tarifas.editar` | PUT /tarifas/:id | Administrador |
| `tarifas.cambiar_estado` | PATCH /tarifas/:id/estado | Administrador |

## Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Pruebas que chocan con las tarifas indefinidas de la semilla | crear la nueva después de la vigencia más reciente con `cerrarAnterior` (research R-08) |
| Cambiar un precio ya cobrado | `TARIFA_USADA` (solo nombre y cierre hacia adelante) |
| Dejar un tipo sin tarifa | `UNICA_TARIFA_VIGENTE` exige confirmar |
| `DECIMAL` como texto | conversión con `Number` en el repository |

## Seguimiento de complejidad (Complexity Tracking)

Sin violaciones ni dependencias nuevas.
