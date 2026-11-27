# Plan de implementación: Vehículos

**Rama**: `005-vehiculos` | **Fecha**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de `specs/005-vehiculos/spec.md`

## Resumen

Registro, propiedad y consulta de vehículos (HU-25 a HU-28; RF-VEH-01 a RF-VEH-12; RN-02, RN-06, RN-11, RN-12). Abarca los 6 endpoints de B.1 §4.5:
- **Registro:** placa normalizada y validada según el tipo, única en el sistema.
- **Propietario:** asociar un vehículo sin propietario (Operador y Administrador); reasignar o quitar el propietario (solo Administrador), con historial de periodos.
- **Actualización:** solo el Administrador; la placa y el tipo no cambian con el vehículo dentro.
- **Consulta:** listado con búsqueda y filtros (tipo, propietario, dentro), detalle con historial y últimos 10 movimientos, y «Mis vehículos» del Cliente.

En el frontend: listado y detalle de vehículos, la sección «Vehículos» del detalle del usuario y «Mis vehículos». El esquema pasa a **2.1.0** con la tabla `historial_propietario` `[Propuesta]`. Decisiones en [research.md](research.md).

## Contexto técnico

**Lenguaje/Versión**: JavaScript (ES2022) en CommonJS sobre Node.js 20 LTS

**Dependencias principales**: las existentes; sin dependencias nuevas.

**Almacenamiento**: MySQL 8: `vehiculo` y `historial_propietario` (nueva), lectura de `usuario` y `movimiento`, más `bitacora`.

**Pruebas**: Jest + Supertest (`tests/integration/vehiculos.test.js`, `tests/unit/vehiculos.reglas.test.js`) y Postman/Newman (`casos/005-vehiculos.js`).

**Plataforma objetivo / Tipo de proyecto**: los mismos.

**Metas de rendimiento**: RNF-REN-02: búsqueda ≤ 1 s p95, con los índices `uq_vehiculo_placa`, `idx_vehiculo_propietario` y `uq_movimiento_abierto`.

**Restricciones**: RN-11 (placa única y con formato: zod + `UNIQUE` + `CHECK`), RN-12 (un propietario a la vez: `FOR UPDATE` + un periodo abierto por vehículo), RNF-PRI-02 (el Cliente solo ve sus vehículos).

**Escala/Alcance**: 6 vehículos en la semilla; miles en operación.

## Verificación de la constitución (Constitution Check)

*COMPUERTA: pasa antes de la fase 0 y se vuelve a verificar después del diseño.*

| Principio | Cumplimiento en 005 | Estado |
|---|---|---|
| I. La especificación manda | 6 aclaraciones con su fuente; la tabla nueva es `[Propuesta]` justificada (R-05) | ✅ |
| II. Monolito por capas y REST | módulo `vehiculos` con capas; rutas de B.1; `PATCH …/propietario`; sobre `{ok}` | ✅ |
| III. Seguridad y privacidad | permisos por endpoint y regla de reasignación en el servicio; el Cliente solo ve lo suyo | ✅ |
| IV. Integridad de datos | transacciones con `FOR UPDATE`; `UNIQUE`, `CHECK` y columna generada; bitácora; migración documentada en `CAMBIOS.md` | ✅ |
| V. Frontend vanilla y accesible (Atomic Design) | 1 átomo y 1 molécula nuevos; mosaicos con radios nativos; foco y errores por campo | ✅ |
| VI. Pruebas | escenario → Jest + Postman (éxito y error por endpoint) | ✅ |
| VII. Simplicidad | una tabla nueva, sin dependencias nuevas | ✅ |

**Re-evaluación después de la fase 1**: sin violaciones. **COMPUERTA: PASA.**

## Estructura del proyecto

```text
backend/
├── database/
│   ├── schema.sql                                   # 2.1.0: historial_propietario
│   ├── migrations/001_historial_propietario.sql
│   ├── {generar-seed.js, seed.sql}                  # 6 vehículos y sus periodos
│   └── CAMBIOS.md
├── src/modules/vehiculos/ vehiculos.{routes,controller,service,repository,validator,reglas}.js
├── src/modules/usuarios/usuarios.routes.js           # + GET /me/vehiculos
├── src/utils/fechas.js                               # + anioActualBogota
├── docs/postman/casos/005-vehiculos.js
└── tests/{unit/vehiculos.reglas.test.js, integration/vehiculos.test.js}

frontend/
├── vehiculos.html · vehiculo-detalle.html · mis-vehiculos.html · usuario-detalle.html (sección)
└── js/
    ├── services/vehiculos.service.js
    ├── views/{vehiculos, vehiculo-detalle, mis-vehiculos, usuario-detalle}.view.js
    └── components/
        ├── atomos/placa.js
        └── moleculas/selector-tipo.js
herramientas/paginas-005.js
```

**Decisión de estructura**: la misma; un módulo nuevo.

## Fases

| Fase | Contenido |
|---|---|
| 1 · Preparación | `historial_propietario` en `schema.sql` + migración + `CAMBIOS.md`; semilla de vehículos; `db:reset` |
| 2 · Fundacional | `vehiculos.reglas.js` (normalizar placa, formato por tipo, rango del modelo) + pruebas unitarias |
| 3 · US1 (P1) HU-25 | POST /vehiculos |
| 4 · US2 (P1) HU-26 | PATCH /vehiculos/:id/propietario (asociar) |
| 5 · US4 (P1) HU-28 | GET /vehiculos, GET /vehiculos/:id, GET /usuarios/me/vehiculos |
| 6 · US3 (P2) HU-27 | PUT /vehiculos/:id; reasignar y quitar con historial |
| 7 · Interfaz | componentes, páginas, sección del usuario, menú «Vehículos» y «Mis vehículos» |
| 8 · Pulido | Postman 005, README, rendimiento, revisión de que todo esté en español |

## Matriz de trazabilidad

| HU | RF | RN | Endpoint | Servicio | Pruebas |
|---|---|---|---|---|---|
| HU-25 | RF-VEH-01..03 | RN-11 | POST /vehiculos | `vehiculosService.crear` | `HU-25 E1–E5` |
| HU-26 | RF-VEH-04..06 | RN-02, RN-12 | PATCH /vehiculos/:id/propietario | `asignarPropietario` | `HU-26 E1–E4` |
| HU-27 | RF-VEH-07..09 | RN-02, RN-12 | PUT /vehiculos/:id · PATCH …/propietario | `actualizar`, `asignarPropietario` | `HU-27 E1–E5` |
| HU-28 | RF-VEH-10..12 | RNF-PRI-02 | GET /vehiculos · GET /vehiculos/:id · GET /usuarios/me/vehiculos | `listar/obtener/misVehiculos` | `HU-28 E1–E3` |

## Cumplimiento de RNF

| RNF | Cómo | Dónde |
|---|---|---|
| RNF-SEG-04 | `authorize('vehiculos.*')` + regla de reasignación con `vehiculos.editar` | rutas, `vehiculos.service` |
| RNF-SEG-07 | bitácora de crear, editar y propietario en la misma transacción | `vehiculos.service` |
| RNF-PRI-02 | `/usuarios/me/vehiculos` filtra por la sesión | `vehiculos.repository` |
| RNF-REN-02 | consultas con índices | `vehiculos.repository` |
| RNF-USA-01/04 | errores junto al campo; mosaicos con radios; tabla con scroll en móvil | páginas 005 |
| RNF-CAL-03 | Postman 005 | `casos/005-vehiculos.js` |

## Permisos del módulo

| Código | Operaciones | Roles en el seed |
|---|---|---|
| `vehiculos.ver` | GET /vehiculos, GET /vehiculos/:id | Administrador, Operador |
| `vehiculos.crear` | POST /vehiculos, PATCH /vehiculos/:id/propietario (vehículo sin propietario) | Administrador, Operador |
| `vehiculos.editar` | PUT /vehiculos/:id; reasignar o quitar el propietario | Administrador |
| `perfil.ver` | GET /usuarios/me/vehiculos | Administrador, Operador, Cliente |

## Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Dos asociaciones simultáneas del mismo vehículo | `FOR UPDATE` del vehículo; `UNIQUE` del periodo abierto |
| Placas aleatorias de las pruebas que choquen con la semilla | lista de exclusión en `tests/setup/infraestructura.js` |
| Cambio de esquema que rompa las specs anteriores | solo se agrega una tabla; ninguna columna existente cambia |
| Fuga de vehículos ajenos al Cliente | el Cliente no tiene `vehiculos.ver`; prueba HU-28 E3 |

## Seguimiento de complejidad (Complexity Tracking)

| Elemento | Por qué | Alternativa descartada |
|---|---|---|
| Tabla `historial_propietario` `[Propuesta]` | RF-VEH-08 exige conservar el historial del propietario anterior; 6.1 solo guarda el actual | solo la bitácora (no permite consultar por periodo) |

Sin dependencias nuevas.
