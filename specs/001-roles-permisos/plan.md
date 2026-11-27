# Implementation Plan: Roles y permisos

**Branch**: `001-roles-permisos` | **Date**: 2026-11-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-roles-permisos/spec.md`

## Summary

Administración de roles y del catálogo de permisos (HU-01 a HU-06; RF-ROL-01 a RF-ROL-15; RN-01, RN-03, RN-04). Se implementan los 7 endpoints del Apéndice B.1 §4.1 sobre un backend monolítico Node.js 20 + Express + MySQL 8 sin ORM.

Como es la **primera spec**, el plan incluye las fases **Setup** y **Foundational** de la versión 2:

- esquema global según el modelo 6.1 del SRS;
- sobre `{ ok, data, meta, error }` y errores tipados;
- JWT Bearer con sesiones revocables y login mínimo;
- autorización por permisos, validación con zod, paginación;
- `withTransaction`, consecutivos y bitácora;
- `/health`;
- frontend reestructurado según la constitución;
- infraestructura de pruebas con Jest, Supertest y Newman.

Las decisiones de detalle están en [research.md](research.md).

## Technical Context

**Language/Version**: JavaScript (ES2022) en **CommonJS** sobre **Node.js 20 LTS** (`engines: "20.x"`, `.nvmrc`). Ver R-02 y R-15.

**Primary Dependencies**:
- Producción: `express` 5, `mysql2/promise`, `zod` 3, `jsonwebtoken`, `bcrypt`, `helmet`, `cors`, `dotenv`.
- Justificadas en *Complexity Tracking*: `express-rate-limit`, `multer`, `pdfkit`.
- Desarrollo: `jest`, `supertest`, `eslint`, `prettier`.
- Global: `newman`.

**Storage**: MySQL 8.0+ (InnoDB, `utf8mb4_0900_ai_ci`), base `parqueaderodb` (configurable). Pool `mysql2/promise` con `timezone: '-05:00'`, consultas parametrizadas, sin `SELECT *`. Esquema en `backend/database/schema.sql`, cambios en `backend/database/CAMBIOS.md`.

**Testing**:
- Jest + Supertest (integración por HU y escenario; unitarias de funciones puras) contra `parqueaderodb_test`, que un `globalSetup` recrea.
- Postman + Newman en `backend/docs/postman/`, con una carpeta por spec y casos de éxito y de error por endpoint (RNF-CAL-03).

**Target Platform**: un proceso Node que sirve `/api/v1` y `frontend/` estático. Navegadores Chrome, Edge, Firefox y Safari en sus dos últimas versiones.

**Project Type**: aplicación web monolítica: `backend/` + `frontend/` en el mismo repositorio y el mismo origen.

**Performance Goals**: listados y búsquedas ≤ 1 s p95 con 50 000 registros (RNF-REN-02, SC-004). El listado de roles usa `COUNT` agregado en una consulta, sin N+1.

**Constraints**:
- RNF-SEG-02 a RNF-SEG-07 y RNF-PRI-01/02;
- token de 8 h;
- 403 en el servidor aunque la opción esté oculta;
- bitácora en la misma transacción;
- sin borrado de roles;
- español, COP y `America/Bogota`;
- sin `innerHTML` con datos externos.

**Scale/Scope**: 1 sede, unos 20 usuarios concurrentes. Catálogo de 63 permisos y menos de 50 roles esperados.

## Constitution Check

*GATE: pasa antes de la fase 0 y se vuelve a verificar después del diseño (fase 1).*

| Principio | Cumplimiento en 001 | Estado |
|---|---|---|
| I. La especificación manda | `spec.md` aprobada con su sección Clarifications. La trazabilidad HU/RF/RN/FR está en la matriz de abajo, en los nombres de las pruebas y en los commits. Las tablas nuevas van marcadas `[Propuesta]` con su RF de origen. | ✅ |
| II. Monolito por capas y REST | `routes → controller → service → repository`. Rutas en plural y kebab-case de B.1, `PATCH …/estado`, sobre `{ok,data,meta,error}`, 409 para reglas y 422 para validación, paginación `page/limit/q`, eliminación lógica (no hay DELETE de roles). | ✅ |
| III. Seguridad y privacidad | JWT Bearer de 8 h, bcrypt 10, `authorize('roles.*')` con denegación por defecto, zod en todas las entradas, SQL parametrizado, `helmet`, `cors` restringido a `CORS_ORIGIN`, límite de intentos de login, `.env` fuera del repositorio. El detalle de un rol muestra solo los datos mínimos del usuario. | ✅ |
| IV. Integridad de datos | MySQL 8 sin ORM, PK `id_<entidad>`, FK, `UNIQUE` sobre el nombre normalizado, `created_at/updated_at`, transacciones en crear, actualizar y cambiar estado, hora del servidor. Cada RN tiene una prueba de que se cumple y otra de que se rechaza su violación. | ✅ |
| V. Frontend vanilla y accesible | Estructura `index.html, css/, js/{config,api,services,views,components,utils}, assets/`; un único cliente `fetch` en `js/api/`; `textContent`; `<dialog>`; errores junto al campo; de 360 a 1920 px; teclado; menú por permisos. | ✅ (ver nota 1) |
| VI. Pruebas | Cada escenario de aceptación → prueba Jest + Postman (éxito y error). Seed con ≥ 5 roles y un usuario por rol. Las pruebas se escriben antes o junto con cada historia en `tasks.md`. | ✅ |
| VII. Simplicidad | Rebanada vertical (BD + API + pantalla). Sin abstracciones extra. Las dependencias fuera de la lista se justifican abajo. | ✅ con justificaciones |

**Nota 1**: las páginas `.html` internas quedan en la raíz de `frontend/`, junto a `index.html`, porque la constitución no fija dónde van las páginas además de `index.html`. Ver R-13.

**Re-evaluación después de la fase 1**: el diseño (data-model, contrato y quickstart) no agrega violaciones. Las tablas `sesion`, `bitacora` y `consecutivo` son `[Propuesta]` justificadas en RF y RNF (R-09) y no contradicen principios. **GATE: PASA.**

## Project Structure

### Documentation (this feature)

```text
specs/001-roles-permisos/
├── spec.md
├── plan.md                  # este archivo
├── research.md              # fase 0
├── data-model.md            # fase 1
├── quickstart.md            # fase 1
├── frontend-integration.md  # fase 1 (prompt §3.11)
├── contracts/openapi.yaml   # fase 1
├── checklists/requirements.md
└── tasks.md                 # /speckit-tasks (no lo genera este comando)
```

### Source Code (repository root)

```text
backend/
├── .env.example                # PORT, NODE_ENV, TZ, DB_*, JWT_SECRET, JWT_EXPIRES_IN, CORS_ORIGIN, TRUST_PROXY, BCRYPT_COSTO
├── .nvmrc                      # 20
├── package.json                # scripts: dev (node --watch), start, test, test:cobertura, test:api, lint, format, db:reset
├── database/
│   ├── schema.sql              # v2.0.0: modelo 6.1 completo + sesion, bitacora, consecutivo
│   ├── seed.sql                # roles, 63 permisos, asignaciones, usuarios de prueba, consecutivos
│   ├── generar-seed.js         # hashea las contraseñas de prueba con bcrypt
│   ├── reset.js                # recrea la BD (bloqueado en producción)
│   ├── migrations/             # vacío en 2.0.0
│   └── CAMBIOS.md              # historial del esquema (rúbrica C9)
├── docs/postman/
│   ├── parqueadero.postman_collection.json   # carpeta «001 Roles y permisos»
│   └── local.postman_environment.json
├── src/
│   ├── app.js                  # helmet, cors, json(100kb), /api/v1, estáticos, 404, errorHandler
│   ├── server.js               # listen + cierre ordenado del pool
│   ├── config/{env.js, db.js}  # env validado con zod; pool + withTransaction
│   ├── middlewares/
│   │   ├── authenticate.js     # Bearer + jti vigente + usuario activo → req.usuario
│   │   ├── authorize.js        # authorize('roles.ver') → 403
│   │   ├── validate.js         # zod → req.validado | 422
│   │   ├── rate-limit.js       # login por IP
│   │   └── error-handler.js    # AppError → {ok:false,error}; 404 API JSON
│   ├── utils/
│   │   ├── respuesta.js        # ok(res, data, meta, status), creado(), sinContenido()
│   │   ├── errores.js          # AppError + fábricas (validacion, conflicto, noEncontrado…)
│   │   ├── paginacion.js       # page/limit/q → LIMIT/OFFSET + meta
│   │   ├── fechas.js           # ahora() Bogotá, ISO -05:00 (se reutiliza de v1)
│   │   ├── bitacora.js         # registrarBitacora(conexion, …)
│   │   ├── consecutivos.js     # siguienteConsecutivo(conexion, clave)
│   │   └── sql.js              # escapeLike, mapeo snake ↔ camel
│   └── modules/
│       ├── salud/{salud.routes.js, salud.controller.js}
│       ├── auth/{auth.routes.js, auth.controller.js, auth.service.js, auth.repository.js, auth.validator.js}
│       └── roles/
│           ├── roles.routes.js         # /roles y /permisos
│           ├── roles.controller.js
│           ├── roles.service.js        # RN-01, RN-03, RN-04, RF-ROL-05/11/13 + bitácora
│           ├── roles.repository.js
│           ├── roles.validator.js
│           └── roles.reglas.js         # funciones puras: normalizarNombre, faltanProtegidos, agruparPorModulo
└── tests/
    ├── setup/{global-setup.js, global-teardown.js, helpers.js}   # login(rol) → token
    ├── unit/{roles.reglas.test.js, respuesta.test.js, paginacion.test.js, consecutivos.test.js}
    └── integration/{salud.test.js, auth-login.test.js, roles.test.js, permisos.test.js}

frontend/
├── index.html                  # página pública mínima (las specs 004 y 008 la completan)
├── login.html
├── roles.html                  # listado + diálogo nuevo/editar + diálogo de cambio de estado
├── rol-detalle.html
├── permisos.html
├── 404.html, error.html
├── css/{tokens.css, base.css, componentes.css}
├── js/
│   ├── config/config.js
│   ├── api/http.js
│   ├── services/{auth.service.js, roles.service.js}
│   ├── views/{login.view.js, roles.view.js, rol-detalle.view.js, permisos.view.js}
│   ├── components/{navbar.js, tabla-paginada.js, dialogo.js, toast.js, plantilla.js, formulario.js}
│   └── utils/{sesion.js, formato.js, dom.js}
└── assets/{icons.svg, logo.svg}
```

**Structure Decision**: aplicación web monolítica con `backend/` y `frontend/`. Los módulos v1 que no son de esta spec y sus pantallas se **retiran** de `src/modules/`, `tests/` y `frontend/` (R-01). Quedan en el tag `v0.9.0-legado` y en el historial de git, para que cada spec 002–015 los consulte al reconstruirse. Se reutilizan de v1: `fechas`, `placas`, `pdf`, `csv`, `dinero`, `generar-seed.js`, `reset.js` y el CSS de PARKO.

## Fases

| Fase | Contenido | Entregable verificable |
|---|---|---|
| **1 · Setup** | Tag `v0.9.0-legado`; retiro de los módulos, pruebas y pantallas v1; `package.json` (Node 20, scripts, dependencias limpias); `.nvmrc`; `.env.example`; ESLint y Prettier | `npm run lint` sin errores sobre el esqueleto |
| **2 · Foundational** (bloquea las historias) | `schema.sql` 6.1 completo + `CAMBIOS.md`; `seed.sql`; `config/env` y `db` (pool, `withTransaction`); `respuesta`, `errores`, `paginacion`, `bitacora`, `consecutivos`; middlewares; `app.js`/`server.js`; `/health`; login mínimo con `sesion`; `globalSetup` de Jest; colección Postman base; frontend: `css/`, `js/api/http.js`, componentes, `login.html` y el armazón con navbar | `npm run db:reset`, `GET /health` 200, login 200/401/422, una ruta protegida responde 401/403, pruebas unitarias en verde |
| **3 · US1 (P1, MVP)** HU-01 | Seed de roles base y permisos; `GET /roles`; reglas de rol base en servicio y repositorio | Pruebas HU-01 E1–E5 |
| **4 · US2 (P2)** HU-02 | `POST /roles` + bitácora | HU-02 E1–E4 |
| **5 · US3 (P2)** HU-03 | Búsqueda, filtro, paginación; `GET /roles/:id` | HU-03 E1–E5 |
| **6 · US4 (P2)** HU-04 | `PUT /roles/:id` (RF-ROL-09/10/11) + bitácora | HU-04 E1–E6 |
| **7 · US5 (P2)** HU-05 | `PATCH /roles/:id/estado` (RF-ROL-12/13/14) + bitácora | HU-05 E1–E5 |
| **8 · US6 (P3)** HU-06 | `GET /permisos` agrupado | HU-06 E1–E3 |
| **9 · Pulido** | Pantallas `roles`, `rol-detalle` y `permisos` completas; README; Postman/Newman de la carpeta 001; cobertura ≥ 80 % en services; prueba manual a 375 px | `npm test`, `npm run lint`, `npm run test:api` en verde; app arranca con `npm run dev` |

## Matriz de trazabilidad

| HU | RF | RN | Endpoint | Servicio | Pruebas (`tests/integration/…` + Postman) |
|---|---|---|---|---|---|
| HU-01 | RF-ROL-01, 02, 03 | RN-01 | GET /roles · PUT /roles/:id · PATCH /roles/:id/estado | `rolesService.listar`, `actualizar`, `cambiarEstado` | `HU-01 E1 existen solo los 3 roles base activos` · `E2 operador sin configuración ni reportes` · `E3 admin con todos` · `E4 cliente con permisos propios` · `E5 rechaza inactivar/renombrar rol base (409)` |
| HU-02 | RF-ROL-04, 05, 06 | RN-03 | POST /roles | `rolesService.crear` | `HU-02 E1 crea activo no base` · `E2 duplicado sin mayúsculas/espacios (409)` · `E3 sin permisos (422)` · `E4 longitudes/permiso inexistente (422)` |
| HU-03 | RF-ROL-07, 08 | — | GET /roles?page&limit&q&estado · GET /roles/:id | `rolesService.listar`, `obtener` | `HU-03 E1 paginado 10 con meta` · `E2 q=oper` · `E3 estado=inactivo` · `E4 detalle agrupado + usuarios` · `E5 404` |
| HU-04 | RF-ROL-09, 10, 11 | RN-03 | PUT /roles/:id | `rolesService.actualizar` | `HU-04 E1 agrega permiso; token viejo sin permiso, login nuevo con él; bitácora` · `E2 nombre duplicado (409)` · `E3 sin permisos (422)` · `E4 admin sin roles.editar (409)` · `E5 rol base: descripción/permisos OK` · `E6 404` |
| HU-05 | RF-ROL-12, 13, 14 | RN-01, RN-04 | PATCH /roles/:id/estado | `rolesService.cambiarEstado` | `HU-05 E1 inactiva sin usuarios activos + bitácora` · `E2 con N activos (409 con N)` · `E3 rol base (409)` · `E4 reactiva` · `E5 estado inválido (422)` · unit `roles inactivos excluidos de opciones` (`listar?estado=activo`) |
| HU-06 | RF-ROL-15 | — | GET /permisos | `rolesService.catalogo` | `HU-06 E1 agrupado por módulo` · `E2 operador 403` · `E3 sin token 401` |
| Fundación | RF-ACC-01/02 (mínimo), RNF-SEG-03/04/07, RN-22 | — | POST /auth/login · GET /health `[Propuesta]` | `authService.iniciarSesion` | `auth-login 200/401/422/inactivo 401` · `salud 200` · unit `consecutivos sin huecos con rollback` |

`GET /health` no está en B.1: es `[Propuesta]` por el prompt §3.12, para el monitoreo de RNF-CAL-01.

## Cumplimiento de RNF

| RNF | Cómo | Dónde |
|---|---|---|
| RNF-SEG-02 | bcrypt costo `BCRYPT_COSTO` (10); el repositorio nunca devuelve `contrasena_hash`; la bitácora no guarda contraseñas | `auth.service`, `*.repository`, `utils/bitacora` |
| RNF-SEG-03 | `authenticate` en todo `/api/v1` salvo `/auth/login` y `/health`; `exp` de 8 h; verificación de `jti` | `middlewares/authenticate.js`, `app.js` |
| RNF-SEG-04 | `authorize('modulo.accion')` en cada ruta; 403 `SIN_PERMISO` | `middlewares/authorize.js`, `roles.routes.js` |
| RNF-SEG-05 | 001: rate limit por IP en el login. El bloqueo por documento (RN-07) se completa en la spec 003. | `middlewares/rate-limit.js` |
| RNF-SEG-06 | zod en params, query y body; `mysql2` con `?`; `escapeLike` | `validate.js`, `*.repository.js`, `utils/sql.js` |
| RNF-SEG-07 | `registrarBitacora` en la transacción de crear, editar y cambiar estado de un rol | `roles.service.js` |
| RNF-PRI-02 | el detalle de un rol solo lo ven quienes tienen `roles.ver`; datos mínimos de usuario (FR-019) | `roles.repository.obtenerUsuarios` |
| RNF-REN-02 | `COUNT` con `GROUP BY` en una consulta; índices `idx_rol_estado`, `idx_usuario_rol_estado`, `uq_rol_nombre` | `roles.repository.listar` |
| RNF-USA-03/04 | `details` por campo → error junto al campo; foco visible; `<dialog>`; `aria-live` en los toasts | `frontend/js/components/formulario.js`, `dialogo.js`, `toast.js` |
| RNF-USA-01 | tabla con scroll interno; breakpoints de 1180 y 760 px | `css/componentes.css` |
| RNF-CAL-03 | carpeta Postman 001 con éxito y error por endpoint; `npm run test:api` | `backend/docs/postman/` |
| RNF-TEC-01…04 | Node 20 + Express por capas; MySQL 8 con `mysql2/promise` sin ORM; frontend vanilla; `/api/v1` + JWT | todo |

## Permisos del módulo

| Código | Operación | Roles en el seed |
|---|---|---|
| `roles.ver` | GET /roles, GET /roles/:id, GET /permisos | Administrador |
| `roles.crear` | POST /roles | Administrador |
| `roles.editar` | PUT /roles/:id | Administrador |
| `roles.cambiar_estado` | PATCH /roles/:id/estado | Administrador |

Catálogo completo y asignación por rol: [data-model.md § Catálogo de permisos](data-model.md#catálogo-de-permisos).

## Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Al retirar los módulos v1, la app pierde funciones hasta que se reconstruyan las specs 002–015 | Se hace en una rama de spec. `develop` solo recibe specs completas y probadas. El tag `v0.9.0-legado` conserva la v1. |
| Condición de carrera con nombres duplicados | `UNIQUE` sobre la columna generada `nombre_normalizado` y traducción de `ER_DUP_ENTRY` a 409 `ROL_DUPLICADO` |
| Inactivar un rol mientras se le asigna un usuario | `SELECT … FOR UPDATE` del rol en `cambiarEstado` y bloqueo del rol al asignar usuarios en la spec 002 |
| Dejar el sistema sin administración | regla pura `faltanProtegidos()` probada de forma unitaria (RF-ROL-11) y un rol base que no se puede inactivar |
| Diferencias de hora entre Node y MySQL | `TZ=America/Bogota` en el proceso, `timezone:'-05:00'` en el pool y `SET time_zone` al conectar |
| Pruebas que dependen del estado de la BD | `globalSetup` recrea `parqueaderodb_test`; cada prueba que muta crea sus propios roles con nombres únicos |
| Diferencias entre Node 26 (máquina local) y Node 20 (rúbrica) | `engines` 20.x, sin APIs posteriores; se recomienda probar con nvm-windows antes de la entrega |
| La inspección de TLS del equipo bloquea `npm`/`uv` | documentado en el README (`npm config set cafile` / `--system-certs`) |

## Complexity Tracking

Dependencias que no están en la lista de la constitución §VII (que permite express, mysql2, dotenv, bcrypt/bcryptjs, jsonwebtoken, helmet, cors, una librería de validación, morgan y nodemailer):

| Dependencia | Por qué hace falta | Alternativa más simple descartada |
|---|---|---|
| `express-rate-limit` | Limita las peticiones de login por IP (RNF-SEG-05, constitución §III "límite de intentos de inicio de sesión") como complemento del bloqueo por documento | Escribir un middleware propio con un `Map` en memoria duplica una librería probada y sin dependencias |
| `multer` | Subir la foto de usuario y la evidencia de incidencias en JPG/PNG ≤ 2 MB (RNF-PRI-03, RF-USR-01, RF-INC-01; specs 002 y 013) | Procesar `multipart/form-data` a mano tiene riesgo de seguridad alto |
| `pdfkit` | Ticket de 80 mm, factura PDF y exportación PDF de reportes (RF-MOV-07, RF-FAC-10, RF-REP-05/12; specs 007, 009 y 015) | Generar PDF sin librería no es viable |
| `eslint`, `@eslint/js`, `prettier` (dev) | Calidad y formato de código (`npm run lint`, Definición de Terminado). No se despliegan. | Revisar a mano no es verificable |
| `jest`, `supertest` (dev) | Pruebas automatizadas (constitución §VI y tabla de restricciones las nombra) | — (permitidas) |

Se eliminan `cookie-parser` (la reemplaza Bearer) y `nodemon` (la reemplaza `node --watch`). No se agregan `pino`, `node-cron` ni `swagger-ui-express` (R-14, R-16).
