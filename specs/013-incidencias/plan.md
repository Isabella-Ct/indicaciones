# Plan de implementación: Incidencias

**Rama**: `013-incidencias` | **Fecha**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Entrada**: especificación de `specs/013-incidencias/spec.md`

## Resumen

Incidencias (HU-56 a HU-58; RF-INC-01 a RF-INC-08; RN-28). Abarca los 5 endpoints de B.1 §4.13 más la descarga de la evidencia `[Propuesta]`:
- **Registro:** con código `INC-`, evidencia opcional y alerta al Administrador.
- **Consulta:** listado con filtros y detalle con el seguimiento.
- **Seguimiento y cierre:** notas y cierre con solución; una incidencia cerrada no cambia.

En el frontend: Incidencias (listado y nueva) e Incidencias › Detalle. Sin cambios de esquema. Decisiones en [research.md](research.md).

## Contexto técnico

**Lenguaje/Versión**: JavaScript (ES2022) en CommonJS sobre Node.js 20 LTS

**Dependencias principales**: las existentes (`multer` para la evidencia); sin dependencias nuevas.

**Almacenamiento**: MySQL 8: `incidencia`, `seguimiento_incidencia`, `alerta`, `vehiculo`, `consecutivo`, más `bitacora`; archivos en `backend/uploads/incidencias/` (fuera de la carpeta pública, ignorada por git).

**Pruebas**: Jest + Supertest (`tests/integration/incidencias.test.js`, `tests/unit/incidencias.reglas.test.js`) con el reloj fijado; Postman/Newman (`casos/013-incidencias.js`).

**Plataforma objetivo / Tipo de proyecto**: los mismos.

**Metas de rendimiento**: RNF-REN-02: consultas ≤ 1 s p95 (índices por estado y fecha y por vehículo).

**Restricciones**: RN-28 (no se borran; se cierran con solución, `CHECK` del esquema), RNF-PRI-03 (evidencia privada), hora de Bogotá.

**Escala/Alcance**: decenas de incidencias por mes.

## Verificación de la constitución (Constitution Check)

*COMPUERTA: pasa antes de la fase 0 y se vuelve a verificar después del diseño.*

| Principio | Cumplimiento en 013 | Estado |
|---|---|---|
| I. La especificación manda | 7 aclaraciones con su fuente; la descarga de la evidencia marcada `[Propuesta]` | ✅ |
| II. Monolito por capas y REST | 1 módulo con capas; rutas de B.1; sobre `{ok}` | ✅ |
| III. Seguridad y privacidad | permisos por endpoint; evidencia validada por firma y servida solo con permiso | ✅ |
| IV. Integridad de datos | registro, consecutivo y alerta en una transacción; el archivo se borra si falla; bitácora | ✅ |
| V. Frontend vanilla y accesible (Atomic Design) | 1 átomo (variante) nuevo; páginas con componentes existentes | ✅ |
| VI. Pruebas | escenario → Jest + Postman (éxito y error por endpoint) | ✅ |
| VII. Simplicidad | sin tablas ni dependencias nuevas; el middleware de la foto se generaliza en vez de duplicarse | ✅ |

**Re-evaluación después de la fase 1**: sin violaciones. **COMPUERTA: PASA.**

## Estructura del proyecto

```text
backend/
├── src/middlewares/subir-foto.js             # subirImagen({ campo, tamanoMaximo }) + subirFoto
├── src/utils/archivos.js                     # carpetas usuarios | incidencias
├── src/modules/incidencias/  incidencias.{routes,controller,service,repository,validator,reglas}.js
├── docs/postman/casos/013-incidencias.js (+ archivos/evidencia.png)
└── tests/{unit/incidencias.reglas.test.js, integration/incidencias.test.js}

frontend/
├── incidencias.html · incidencia.html
└── js/
    ├── services/incidencias.service.js
    ├── views/{incidencias, incidencia}.view.js
    └── components/atomos/chip-estado.js       # + ponerChipIncidencia
herramientas/paginas-013.js
```

**Decisión de estructura**: la misma; un módulo nuevo.

## Fases

| Fase | Contenido |
|---|---|
| 1 · Preparación | middleware de imagen generalizado y carpetas de archivos; nota en `CAMBIOS.md` |
| 2 · Fundacional | `incidencias.reglas.js` + pruebas unitarias |
| 3 · US1 (P1) HU-56 | POST /incidencias (con evidencia y alerta) |
| 4 · US2 (P2) HU-57 | GET /incidencias, GET /:id, GET /:id/evidencia |
| 5 · US3 (P2) HU-58 | POST /:id/seguimientos, PATCH /:id/cierre |
| 6 · Interfaz | páginas, menú |
| 7 · Pulido | Postman 013, README, revisión de que todo esté en español |

## Matriz de trazabilidad

| HU | RF | RN | Endpoint | Servicio | Pruebas |
|---|---|---|---|---|---|
| HU-56 | RF-INC-01..04 | — | POST /incidencias | `incidenciasService.registrar` | `HU-56 E1–E5` |
| HU-57 | RF-INC-05, 06 | — | GET /incidencias · GET /:id · GET /:id/evidencia | `listar`, `obtener`, `evidencia` | `HU-57 E1–E2` |
| HU-58 | RF-INC-07, 08 | RN-28 | POST /:id/seguimientos · PATCH /:id/cierre | `agregarSeguimiento`, `cerrar` | `HU-58 E1–E3` |

## Cumplimiento de RNF

| RNF | Cómo | Dónde |
|---|---|---|
| RNF-SEG-04 | `authorize('incidencias.*')` | rutas |
| RNF-SEG-07 | bitácora de registrar, seguimiento y cerrar | `incidencias.service` |
| RNF-PRI-03 | evidencia con nombre aleatorio fuera de la carpeta pública, servida con permiso | `utils/archivos.js`, ruta de evidencia |
| RNF-SAF-02 | nada se borra (RN-28) | sin endpoint de borrado |
| RNF-CAL-03 | Postman 013 | `casos/013-incidencias.js` |

## Permisos del módulo

| Código | Operaciones | Roles en el seed |
|---|---|---|
| `incidencias.ver` | GET /incidencias, /:id, /:id/evidencia | Administrador, Operador |
| `incidencias.crear` | POST /incidencias | Administrador, Operador |
| `incidencias.editar` | seguimientos y cierre | Administrador |

## Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Archivos huérfanos si el registro falla | se borra el archivo en el `catch` |
| Un archivo que dice ser imagen y no lo es | validación por la firma del contenido |
| Recorrer carpetas con la clave guardada | `rutaArchivo` solo acepta `carpeta/<uuid>.<ext>` |
| Cambios en una incidencia cerrada | `FOR UPDATE` y 409 `INCIDENCIA_CERRADA` |

## Seguimiento de complejidad (Complexity Tracking)

Sin violaciones ni dependencias nuevas.
