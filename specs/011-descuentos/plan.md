# Plan de implementación: Beneficios y descuentos

**Rama**: `011-descuentos` | **Fecha**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de `specs/011-descuentos/spec.md`

## Resumen

Descuentos y promociones (HU-49 a HU-51; RF-DES-01 a RF-DES-05; RN-21, RN-25). Abarca los 4 endpoints de B.1 §4.11 y la aplicación automática en la liquidación de la spec 009:
- **Configuración:** crear, editar y activar o inactivar descuentos por porcentaje o valor fijo, por tipo de cliente y de vehículo, con minutos mínimos y vigencia.
- **Aplicación:** la liquidación aplica, como máximo, el descuento activo y vigente a la hora de salida que más descuenta; con membresía o sin valor bruto no se aplica ninguno.
- **Detalle:** el nombre y el valor del descuento en la liquidación, el cobro, el comprobante y el PDF.

En el frontend: Configuración › Descuentos y la fila del descuento en el cobro y el comprobante. Sin cambios de esquema; la semilla trae 3 descuentos. Decisiones en [research.md](research.md).

## Contexto técnico

**Lenguaje/Versión**: JavaScript (ES2022) en CommonJS sobre Node.js 20 LTS

**Dependencias principales**: las existentes; sin dependencias nuevas.

**Almacenamiento**: MySQL 8: `descuento`, `liquidacion` (`id_descuento`, `valor_descuento`), más `bitacora`.

**Pruebas**: Jest + Supertest (`tests/integration/descuentos.test.js`, `tests/unit/descuentos.reglas.test.js`, casos nuevos en `tests/unit/liquidaciones.reglas.test.js`) con el reloj fijado; Postman/Newman (`casos/011-descuentos.js`).

**Plataforma objetivo / Tipo de proyecto**: los mismos.

**Metas de rendimiento**: RNF-REN-01: la salida con su liquidación sigue en ≤ 2 s p95 (una consulta indexada más: `idx_descuento_vigencia`).

**Restricciones**: RN-25 (un descuento, el mayor; total ≥ 0), RN-21 (membresía primero), RF-DES-05 (las liquidaciones guardadas no cambian), hora de Bogotá.

**Escala/Alcance**: decenas de descuentos.

## Verificación de la constitución (Constitution Check)

*COMPUERTA: pasa antes de la fase 0 y se vuelve a verificar después del diseño.*

| Principio | Cumplimiento en 011 | Estado |
|---|---|---|
| I. La especificación manda | 8 aclaraciones con su fuente | ✅ |
| II. Monolito por capas y REST | 1 módulo con capas; rutas de B.1; sobre `{ok}` | ✅ |
| III. Seguridad y privacidad | solo el Administrador configura (RN-02); el Operador consulta | ✅ |
| IV. Integridad de datos | el descuento se guarda con la liquidación, una sola vez; `CHECK` y `UNIQUE` del esquema; bitácora | ✅ |
| V. Frontend vanilla y accesible (Atomic Design) | 1 átomo (variante) nuevo; molécula `cobro` y organismo `comprobante` ampliados; página Descuentos | ✅ |
| VI. Pruebas | escenario → Jest + Postman (éxito y error por endpoint) | ✅ |
| VII. Simplicidad | sin tablas ni dependencias nuevas; regla pura reutilizable | ✅ |

**Re-evaluación después de la fase 1**: sin violaciones. **COMPUERTA: PASA.**

## Estructura del proyecto

```text
backend/
├── database/{generar-seed.js, seed.sql}             # 3 descuentos
├── src/modules/
│   ├── descuentos/    descuentos.{routes,controller,service,repository,validator,reglas}.js
│   ├── liquidaciones/ liquidaciones.{reglas,service,repository}.js   # aplicarDescuento, id_descuento
│   └── facturas/      factura.pdf.js                                 # línea del descuento
├── docs/postman/casos/011-descuentos.js
└── tests/{unit/descuentos.reglas.test.js, unit/liquidaciones.reglas.test.js, integration/descuentos.test.js}

frontend/
├── descuentos.html
└── js/
    ├── services/descuentos.service.js
    ├── views/descuentos.view.js
    └── components/
        ├── atomos/chip-estado.js          # + ponerChipDescuento
        ├── moleculas/cobro.js             # fila del descuento
        └── organismos/comprobante.js      # fila del descuento
herramientas/paginas-011.js (+ fila del descuento en paginas-007.js y paginas-009.js)
```

**Decisión de estructura**: la misma; un módulo nuevo y la liquidación ampliada.

## Fases

| Fase | Contenido |
|---|---|
| 1 · Preparación | semilla de 3 descuentos; nota en `CAMBIOS.md` |
| 2 · Fundacional | `descuentos.reglas.js` + `aplicarDescuento` con pruebas unitarias |
| 3 · US1 (P1) HU-49 | GET, POST, PUT /descuentos |
| 4 · US2 (P1) HU-50 | aplicación en la liquidación; factura y PDF |
| 5 · US3 (P2) HU-51 | PATCH /descuentos/:id/estado |
| 6 · Interfaz | página Descuentos, cobro y comprobante, menú |
| 7 · Pulido | Postman 011, README, revisión de que todo esté en español |

## Matriz de trazabilidad

| HU | RF | RN | Endpoint | Servicio | Pruebas |
|---|---|---|---|---|---|
| HU-49 | RF-DES-01, 02 | RN-02 | GET/POST /descuentos · PUT /:id | `descuentosService.listar/crear/actualizar` | `HU-49 E1–E4` |
| HU-50 | RF-DES-03, 04 | RN-21, RN-25 | GET /movimientos/:id/liquidacion · salida · factura | `liquidaciones.calcularPara` + `descuentos.reglas` | `HU-50 E1–E4` |
| HU-51 | RF-DES-05 | — | PATCH /descuentos/:id/estado | `descuentosService.cambiarEstado` | `HU-51 E1–E2` |

## Cumplimiento de RNF

| RNF | Cómo | Dónde |
|---|---|---|
| RNF-SEG-04 | `authorize('descuentos.*')` | rutas |
| RNF-SEG-07 | bitácora de crear, editar y cambiar estado | `descuentos.service` |
| RNF-SAF-02 | nada se borra; el descuento se inactiva | `descuentos.service` |
| RNF-CAL-03 | Postman 011 | `casos/011-descuentos.js` |

## Permisos del módulo

| Código | Operaciones | Roles en el seed |
|---|---|---|
| `descuentos.ver` | GET /descuentos | Administrador, Operador |
| `descuentos.crear` / `descuentos.editar` / `descuentos.cambiar_estado` | POST / PUT / PATCH estado | Administrador |

## Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Dos descuentos en una liquidación | `elegir` devuelve uno solo (RN-25) |
| Total negativo | el fijo se limita al bruto |
| Cambiar un descuento cambia cobros pasados | la liquidación guarda `id_descuento` y `valor_descuento` y la guardada usa esos valores |
| Los descuentos de una prueba cambian las liquidaciones de otra | nombres únicos e inactivación en `afterEach`; semilla sin descuentos vigentes en noviembre de 2026 |

## Seguimiento de complejidad (Complexity Tracking)

Sin violaciones ni dependencias nuevas.
