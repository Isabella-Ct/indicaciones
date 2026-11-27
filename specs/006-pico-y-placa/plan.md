# Plan de implementación: Restricción de pico y placa

**Rama**: `006-pico-y-placa` | **Fecha**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de `specs/006-pico-y-placa/spec.md`

## Resumen

Configuración y consulta de pico y placa (HU-29 y HU-30; RF-PYP-01 a RF-PYP-05; RN-13, RN-14). Abarca los 5 endpoints de B.1 §4.6:
- **Restricciones:** CRUD con eliminación lógica, validación de dígitos, franja y vigencia, y bloqueo de superposiciones por día y tipo.
- **Hoy:** la restricción vigente por tipo de vehículo, o «Sin restricción hoy».
- **Evaluación de una placa (`evaluar`):** operación de dominio probada aquí y usada por la entrada de la spec 007 (RF-MOV-02).

En el frontend: Configuración › Pico y placa con la tabla semanal, y el aviso de hoy en las pantallas de la caseta y del cliente. Sin cambios de esquema; la semilla carga el calendario de ejemplo de Medellín. Decisiones en [research.md](research.md).

## Contexto técnico

**Lenguaje/Versión**: JavaScript (ES2022) en CommonJS sobre Node.js 20 LTS

**Dependencias principales**: las existentes; sin dependencias nuevas.

**Almacenamiento**: MySQL 8: `restriccion_placa` y `bitacora`.

**Pruebas**: Jest + Supertest (`tests/integration/restricciones.test.js`, `tests/unit/restricciones.reglas.test.js`) y Postman/Newman (`casos/006-pico-y-placa.js`).

**Plataforma objetivo / Tipo de proyecto**: los mismos.

**Metas de rendimiento**: RNF-REN-02: hoy y listado ≤ 1 s p95, con `idx_restriccion_dia`.

**Restricciones**: RN-14 (sin superposición: transacción con `FOR UPDATE`), zona America/Bogota para día y hora (constitución §IV).

**Escala/Alcance**: 10 restricciones en la semilla; a lo sumo 14 vigentes a la vez (7 días × 2 tipos).

## Verificación de la constitución (Constitution Check)

*COMPUERTA: pasa antes de la fase 0 y se vuelve a verificar después del diseño.*

| Principio | Cumplimiento en 006 | Estado |
|---|---|---|
| I. La especificación manda | 6 aclaraciones con su fuente; festivos remitidos a la spec 016 (TBD-03) | ✅ |
| II. Monolito por capas y REST | módulo `restricciones` con capas; rutas de B.1 (DELETE lógico); sobre `{ok}` | ✅ |
| III. Seguridad y privacidad | permisos por endpoint; cambio de estado con su permiso | ✅ |
| IV. Integridad de datos | `CHECK` en la BD; superposición en transacción; bitácora; hora de Bogotá | ✅ |
| V. Frontend vanilla y accesible (Atomic Design) | 1 átomo, 1 molécula y 1 organismo nuevos; casillas con etiqueta; tabla con `caption` | ✅ |
| VI. Pruebas | escenario → Jest + Postman (éxito y error por endpoint); pruebas unitarias de límites | ✅ |
| VII. Simplicidad | sin tablas ni dependencias nuevas | ✅ |

**Re-evaluación después de la fase 1**: sin violaciones. **COMPUERTA: PASA.**

## Estructura del proyecto

```text
backend/
├── database/{generar-seed.js, seed.sql}             # 10 restricciones
├── src/modules/restricciones/ restricciones.{routes,controller,service,repository,validator,reglas}.js
├── docs/postman/casos/006-pico-y-placa.js
└── tests/{unit/restricciones.reglas.test.js, integration/restricciones.test.js}

frontend/
├── pico-placa.html · celdas.html, disponibilidad.html, mis-vehiculos.html (aviso)
└── js/
    ├── services/restricciones.service.js
    ├── views/pico-placa.view.js (+ celdas, disponibilidad, mis-vehiculos)
    └── components/
        ├── atomos/digitos.js
        ├── moleculas/aviso-pico-placa.js
        └── organismos/tabla-semanal.js
herramientas/paginas-006.js (+ partes-pico-placa.js)
```

**Decisión de estructura**: la misma; un módulo nuevo.

## Fases

| Fase | Contenido |
|---|---|
| 1 · Preparación | semilla de restricciones; `db:reset` |
| 2 · Fundacional | `restricciones.reglas.js` (dígitos, dígito evaluado, superposición de vigencias, `restringe`, motivo) + pruebas unitarias |
| 3 · US1 (P1) HU-29 | GET/POST /restricciones-placa, PUT y DELETE /:id |
| 4 · US2 (P2) HU-30 | GET /hoy y `evaluar` |
| 5 · Interfaz | componentes, página Pico y placa, aviso en 3 pantallas, menú |
| 6 · Pulido | Postman 006, README, rendimiento, revisión de que todo esté en español |

## Matriz de trazabilidad

| HU | RF | RN | Endpoint | Servicio | Pruebas |
|---|---|---|---|---|---|
| HU-29 | RF-PYP-01..04 | RN-02, RN-14 | GET/POST /restricciones-placa · PUT/DELETE /:id | `restriccionesService.listar/crear/actualizar/eliminar` | `HU-29 E1–E5` |
| HU-30 | RF-PYP-05 | RN-13 | GET /restricciones-placa/hoy · (`evaluar` para la 007) | `hoy`, `evaluar` | `HU-30 E1–E3` |

## Cumplimiento de RNF

| RNF | Cómo | Dónde |
|---|---|---|
| RNF-SEG-04 | `authorize('restricciones.*')`; `estado` en PUT con `cambiar_estado` | rutas, service |
| RNF-SEG-07 | bitácora de crear, editar e inactivar en la misma transacción | service |
| RNF-REN-02 | consultas por `idx_restriccion_dia` | repository |
| RNF-USA-01/04 | tabla semanal con scroll en móvil; casillas accesibles | `pico-placa.html` |
| RNF-CAL-03 | Postman 006 | `casos/006-pico-y-placa.js` |

## Permisos del módulo

| Código | Operaciones | Roles en el seed |
|---|---|---|
| `restricciones.ver` | GET /restricciones-placa, GET /hoy | Administrador, Operador, Cliente |
| `restricciones.crear` | POST /restricciones-placa | Administrador |
| `restricciones.editar` | PUT /restricciones-placa/:id | Administrador |
| `restricciones.cambiar_estado` | DELETE /restricciones-placa/:id; `estado` en PUT | Administrador |

## Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Pruebas que dependan del día real | `evaluar` recibe la fecha; las pruebas de `/hoy` calculan lo esperado con el día de Bogotá |
| Pruebas que choquen con la semilla | usan sábado y domingo o vigencias futuras |
| Zona horaria del servidor distinta de Bogotá | `enBogota` en `utils/fechas.js` |
| Dos restricciones superpuestas creadas al mismo tiempo | `FOR UPDATE` sobre las filas del día y tipo dentro de la transacción |

## Seguimiento de complejidad (Complexity Tracking)

Sin violaciones ni dependencias nuevas.
