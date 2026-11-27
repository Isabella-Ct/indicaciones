---
description: "Lista de tareas de 001-roles-permisos (incluye Setup y Foundational de la v2)"
---

# Tasks: Roles y permisos

**Input**: Documentos de diseño de `specs/001-roles-permisos/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/openapi.yaml](contracts/openapi.yaml), [quickstart.md](quickstart.md), [frontend-integration.md](frontend-integration.md)

**Tests**: **obligatorias**. La constitución §VI y SC-006 exigen una prueba por escenario de aceptación (Jest + Supertest) y un caso de éxito y otro de error por endpoint en Postman. Cada prueba se nombra `HU-xx Ey <descripción>`.

**Organization**: por historia de usuario (US1 = HU-01 … US6 = HU-06), en orden de prioridad.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivo distinto y sin depender de tareas pendientes)
- **[Story]**: historia a la que pertenece (US1…US6)
- Rutas relativas a la raíz del repositorio (`backend/`, `frontend/`)

---

## Phase 1: Setup (infraestructura compartida)

**Purpose**: retirar la v1 y dejar el esqueleto v2 listo (research R-01, R-02, R-14, R-15)

- [X] T001 Crear el tag `v0.9.0-legado` sobre el commit `ba86248` (último estado v1 en `main`) y subirlo a `origin`
- [X] T002 Retirar los módulos v1 de `backend/src/modules/` (todos), `backend/src/jobs/`, `backend/src/realtime/` y las pruebas v1 de `backend/tests/*.test.js`; conservar y adaptar después `backend/src/utils/{fechas,placas,pdf,csv,dinero,sql}.js`
- [X] T003 Retirar el frontend v1 (`frontend/app/`, `frontend/js/pages/`, `frontend/js/services/`, `frontend/js/utils/`, `frontend/styles/`) dejando una copia de referencia de los CSS de PARKO para T018; mover la colección `postman/` de la raíz a `backend/docs/postman/` (se reescribe en T020)
- [X] T004 Actualizar `backend/package.json`: `engines.node` `20.x`; scripts `dev` (`node --watch src/server.js`), `start`, `test`, `test:cobertura`, `test:api` (newman), `lint`, `format`, `db:reset`, `db:seed:generar`; quitar `cookie-parser` y `nodemon`; configurar Jest (`globalSetup`, `globalTeardown`, `testMatch` de `tests/unit` y `tests/integration`, cobertura de `src/modules/**/*.service.js` ≥ 80 %)
- [X] T005 [P] Crear `backend/.nvmrc` (`20`) y reescribir `backend/.env.example` con `PORT, NODE_ENV, TZ, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_COSTO, CORS_ORIGIN, TRUST_PROXY, LOGIN_LIMITE_IP`, cada una documentada
- [X] T006 [P] Ajustar `backend/eslint.config.js` y `.prettierrc` a la nueva estructura (`backend/src`, `backend/tests`, `frontend/js`) y prohibir `innerHTML`/`outerHTML`/`insertAdjacentHTML` en `frontend/js` (`no-restricted-properties`)

---

## Phase 2: Foundational (bloquea todas las historias)

**Purpose**: esquema 6.1, sobre de respuesta, errores, autenticación y autorización, bitácora, consecutivos, health, login mínimo, infraestructura de pruebas y armazón del frontend

**⚠️ CRITICAL**: ninguna historia empieza antes de terminar esta fase

### Base de datos

- [X] T007 Escribir `backend/database/schema.sql` v2.0.0 con **todas** las entidades del modelo 6.1 del SRS (§4.1 a §4.15), según las convenciones de [data-model.md](data-model.md): `rol` (con `data-model.md` Rol.nombre_normalizado generada y UNIQUE, Rol.estado, Rol.es_base), `permiso` (Permiso.accion ENUM, Permiso.codigo UNIQUE + CHECK), `rol_permiso` (PK compuesta, FK de rol con CASCADE), `usuario` (Usuario.tipo_documento ENUM, UNIQUE de documento y de correo, Usuario.debe_cambiar_contrasena), `permiso` además con `data-model.md` Permiso.modulo y Permiso.descripcion NOT NULL y UNIQUE (modulo, accion); y las tablas `[Propuesta]` `sesion` (`data-model.md` Sesion.jti UNIQUE, Sesion.emitida_en, Sesion.expira_en, Sesion.revocada_en), `bitacora` (`data-model.md` Bitacora.accion, Bitacora.entidad, Bitacora.id_registro NOT NULL, Bitacora.valor_anterior/valor_nuevo JSON) y `consecutivo` (`data-model.md` Consecutivo.clave PK, Consecutivo.prefijo, Consecutivo.siguiente, Consecutivo.longitud)
- [X] T008 Escribir `backend/database/CAMBIOS.md` con la versión 2.0.0: relación entre tablas v1 y 6.1, tablas `[Propuesta]` con su RF de origen (research R-09) y las reservadas para las specs 007, 009 y 016
- [X] T009 Reescribir `backend/database/generar-seed.js` y `backend/database/seed.sql`: 3 roles base + «Supervisor de turno» (activo) + «Auditor» (inactivo), los 63 permisos del [catálogo](data-model.md#catálogo-de-permisos), sus asignaciones por rol, los usuarios de prueba (1 admin, 2 operadores —uno con rol «Supervisor de turno», que es su único usuario activo—, 3 clientes activos, 1 cliente inactivo; bcrypt costo 10) y los consecutivos `ticket`, `factura`, `incidencia`, `reserva`
- [X] T010 Adaptar `backend/database/reset.js` a `DB_NAME` (por defecto `parqueaderodb`), bloqueado con `NODE_ENV=production`, mostrando el conteo de roles, permisos y usuarios

### Núcleo del backend

- [X] T011 [P] `backend/src/config/env.js`: validar con zod todas las variables de T005 (falla al arrancar si falta alguna, y exige `JWT_SECRET` ≥ 32 en producción); `backend/src/config/db.js`: pool `mysql2/promise` con `timezone:'-05:00'`, `SET time_zone` al conectar y `withTransaction(fn)`
- [X] T012 [P] `backend/src/utils/errores.js` (AppError con `status/code/message/details`, fábricas `validacion`, `solicitudInvalida`, `noAutenticado`, `sinPermiso`, `noEncontrado`, `conflicto`) y `backend/src/utils/respuesta.js` (`ok`, `creado`, `sinContenido` con el sobre `{ok,data,meta}`)
- [X] T013 [P] `backend/src/utils/paginacion.js` (zod `page`/`limit`/`q`, de 1 a 100, valor por defecto 10 → `{limit, offset, meta(total)}`) y `backend/src/utils/sql.js` (`escapeLike`, `aCamel`)
- [X] T014 [P] `backend/src/utils/bitacora.js` (escribe `data-model.md` Bitacora.accion/entidad/id_registro; `registrarBitacora(conexion, {idUsuario, accion, entidad, idRegistro, anterior, nuevo, ip})`, sin guardar nunca `contrasena_hash`) y `backend/src/utils/consecutivos.js` (`siguienteConsecutivo(conexion, clave)` con `FOR UPDATE`)
- [X] T015 Middlewares en `backend/src/middlewares/`:
  - `validate.js`: zod → `req.validado`, 422 con `details[{campo,mensaje}]`;
  - `authenticate.js`: Bearer → verificar firma, sesión por `jti` no revocada ni vencida y usuario `activo` → `req.usuario = {idUsuario, rol, permisos}`; 401 `NO_AUTENTICADO`;
  - `authorize.js`: `authorize(codigo)` → 403 `SIN_PERMISO`;
  - `rate-limit.js`: login por IP → 429 `DEMASIADAS_PETICIONES`;
  - `error-handler.js`: `AppError`; JSON inválido 400; `ER_DUP_ENTRY` 409; 500 sin stack fuera de desarrollo; 404 JSON bajo `/api` y `frontend/404.html` fuera de `/api`.
- [X] T016 `backend/src/app.js` (helmet, cors solo si existe `CORS_ORIGIN`, `express.json({limit:'100kb'})`, router `/api/v1`, estáticos de `frontend/`, 404, errorHandler) y `backend/src/server.js` (listen y cierre ordenado del pool con SIGINT/SIGTERM)
- [X] T017 Módulo `backend/src/modules/salud/` (`GET /api/v1/health` con ping a la BD → 200 o 503 `BD_NO_DISPONIBLE`) y módulo `backend/src/modules/auth/` con las capas routes/controller/service/repository/validator: `POST /api/v1/auth/login` según [contracts/openapi.yaml](contracts/openapi.yaml) (`LoginEntrada` → `Sesion`; mensaje genérico 401 `CREDENCIALES_INVALIDAS` para credencial errada **o** usuario inactivo; permisos del rol leídos al iniciar sesión; inserta en `data-model.md` Sesion.jti; rate limit)

### Frontend: armazón

- [X] T018 [P] `frontend/css/tokens.css` (tokens de `docs/diseno-parko/styles.css` sin cambios), `frontend/css/base.css` (reset, tipografía, utilidades `hidden`, foco naranja) y `frontend/css/componentes.css` (header, navbar, hazard-strip, page-head, panel, field, input, btn, log-table, status-chip, dialog, toast; breakpoints de 1180 y 760 px)
- [X] T019 [P] `frontend/js/config/config.js`, `frontend/js/api/http.js` (Bearer desde `sessionStorage`, sobre `{ok,data,meta,error}`, `ErrorApi`, timeout de 15 s, 401 → `login.html?vencida=1`, 403 → toast), `frontend/js/utils/{sesion.js, formato.js, dom.js}` y `frontend/js/components/{plantilla.js, toast.js, dialogo.js, formulario.js, navbar.js, tabla-paginada.js}` según [frontend-integration.md](frontend-integration.md) §3–§5
- [X] T020 `frontend/login.html` + `frontend/js/views/login.view.js` + `frontend/js/services/auth.service.js` (tipo y número de documento más contraseña, errores junto al campo, guarda la sesión y redirige a `roles.html` si tiene `roles.ver` o muestra el armazón vacío), `frontend/index.html` público mínimo y `frontend/404.html`/`error.html` con el estilo PARKO

### Infraestructura de pruebas

- [X] T021 `backend/tests/setup/global-setup.js` (carga `.env.test` y recrea `parqueaderodb_test` con `schema.sql` + `seed.sql`), `global-teardown.js` y `helpers.js` (`app`, `tokenDe('admin'|'operador'|'cliente'|'supervisor')`, `auth(token)`)
- [X] T022 [P] Pruebas unitarias en `backend/tests/unit/`: `respuesta.test.js`, `paginacion.test.js` (límites 1/100/101, `q` con `%` y `_` escapados), `errores.test.js` (traducción en el error-handler)
- [X] T023 [P] Prueba de integración `backend/tests/integration/consecutivos.test.js` (con BD: dos llamadas seguidas dan consecutivos sin hueco; con rollback no se consume el número)
- [X] T024 Pruebas de integración `backend/tests/integration/salud.test.js` (200) y `auth-login.test.js` (200 con token y permisos y sin `contrasena_hash`; 401 contraseña errada; 401 usuario inactivo con el mismo mensaje; 422 sin documento; 401 en ruta protegida sin token o con token alterado)
- [X] T025 Colección base `backend/docs/postman/parqueadero.postman_collection.json` (variables `baseUrl`; *pre-request* de login que guarda `{{tokenAdmin}}`, `{{tokenOperador}}` y `{{tokenCliente}}`; carpeta «000 Fundación» con health y login éxito/error) y `backend/docs/postman/local.postman_environment.json`

**Checkpoint**: `npm run db:reset`, `npm test` (unitarias + salud + login) y `npm run lint` en verde; `GET /health` 200; login funciona desde `login.html`.

---

## Phase 3: User Story 1 — Perfiles iniciales del sistema (Priority: P1) 🎯 MVP · HU-01

**Goal**: existen exactamente 3 roles base activos con sus permisos, y los roles base no se pueden inactivar ni renombrar (RF-ROL-01/02/03, RN-01).

**Independent Test**: con la BD recién sembrada, `GET /roles` muestra Administrador, Operador y Cliente con `esBase:true`; inactivar o renombrar cualquiera de ellos → 409 `ROL_BASE_INMUTABLE`.

### Tests for User Story 1

- [X] T026 [P] [US1] `backend/tests/unit/roles.reglas.test.js`: `normalizarNombre` (recorte, minúsculas), `esRenombre(actual, nuevo)` y `faltanProtegidos(codigos)` con los 8 permisos protegidos ([data-model.md](data-model.md#catálogo-de-permisos))
- [X] T027 [US1] `backend/tests/integration/roles.test.js` bloque HU-01: `HU-01 E1` solo 3 roles base activos con `estado=activo&q=` filtrando los semilla; `E2` el Operador no tiene `roles.*`, `tarifas.crear` ni `reportes.*` y sí tiene `usuarios.crear`, `vehiculos.crear`, `movimientos.crear`, `facturas.crear`, `reservas.crear` e `incidencias.crear`; `E3` el Administrador tiene los 63; `E4` el Cliente solo tiene los 11 de su lista; `E5` PATCH estado y PUT con otro nombre sobre un rol base → 409

### Implementation for User Story 1

- [X] T028 [P] [US1] `backend/src/modules/roles/roles.reglas.js`: funciones puras de T026 y `agruparPorModulo(permisos)`
- [X] T029 [P] [US1] `backend/src/modules/roles/roles.validator.js`: esquemas zod `params.id`, `query` del listado (paginación + `estado`), `RolEntrada` (`data-model.md` Rol.nombre 3–40 con recorte, Rol.descripcion ≤150 o null, `permisos` ≥1 enteros únicos) y `estado` (`data-model.md` Rol.estado)
- [X] T030 [US1] `backend/src/modules/roles/roles.repository.js`: `listar({q, estado, limit, offset})` con `COUNT` de usuarios asignados y activos en una consulta + `contar`, `obtenerPorId(conexion, id, {bloquear})`, `permisosDeRol`, `usuariosDeRol` (solo `id_usuario, nombre_completo, estado`), `insertar`, `actualizar`, `reemplazarPermisos`, `cambiarEstado`, `contarUsuariosActivos`, `existenPermisos(ids)`, `catalogo()`; snake → camel; sin `SELECT *`
- [X] T031 [US1] `backend/src/modules/roles/roles.service.js`: `listar` y la regla de rol base (`asegurarNoBase` → 409 `ROL_BASE_INMUTABLE`) que usan T042 y T047
- [X] T032 [US1] `backend/src/modules/roles/roles.controller.js` + `roles.routes.js` (`GET /roles` con `authenticate` + `authorize('roles.ver')` + `validate`), montados en `backend/src/app.js`

**Checkpoint**: HU-01 en verde. Es el MVP mínimo del control de acceso.

---

## Phase 4: User Story 2 — Registrar un rol (Priority: P2) · HU-02

**Goal**: el Administrador crea roles activos, no base, con ≥1 permiso y nombre único (RF-ROL-04/05/06, RN-03).

**Independent Test**: POST «Supervisor» → 201; POST « supervisor » → 409; POST sin permisos → 422; con el token de un Operador → 403.

### Tests for User Story 2

- [X] T033 [US2] `backend/tests/integration/roles.test.js` bloque HU-02: `E1` 201 con `estado:'activo'`, `esBase:false`, permisos guardados y entrada en `bitacora`; `E2` duplicado sin distinguir mayúsculas ni espacios → 409 `ROL_DUPLICADO`; `E3` `permisos:[]` → 422 con `details[0].campo='permisos'`; `E4` nombre de 2 o 41 caracteres, descripción de 151, permiso 99999 → 422; Operador → 403

### Implementation for User Story 2

- [X] T034 [US2] `rolesService.crear(datos, actor)` en `backend/src/modules/roles/roles.service.js`: `withTransaction`; valida que los permisos existan (si no → 422 con campo `permisos`); inserta rol + `rol_permiso` (sin duplicados); `registrarBitacora(accion:'crear', entidad:'rol')`; traduce `ER_DUP_ENTRY` en `uq_rol_nombre` a 409 `ROL_DUPLICADO`; devuelve el `RolDetalle`
- [X] T035 [US2] Ruta `POST /roles` (`authorize('roles.crear')`) y controlador `crear` → 201 en `backend/src/modules/roles/roles.{routes,controller}.js`

**Checkpoint**: HU-01 y HU-02 en verde.

---

## Phase 5: User Story 3 — Consultar y buscar roles (Priority: P2) · HU-03

**Goal**: listado paginado con búsqueda y filtro, y detalle con permisos agrupados y usuarios (RF-ROL-07/08).

**Independent Test**: `?q=oper`, `?estado=inactivo`, `?page=1&limit=10` con `meta`, `GET /roles/:id` agrupado; `GET /roles/9999` → 404.

### Tests for User Story 3

- [X] T036 [US3] `backend/tests/integration/roles.test.js` bloque HU-03: `E1` `meta {page:1, limit:10, total}`, cada fila con `usuariosAsignados` y `usuariosActivos`; `E2` `q=OPER` solo trae los que contienen «oper»; `E3` `estado=inactivo` trae Auditor; `E4` detalle con `permisos[]` agrupados por `modulo` y `usuarios[]` sin correo, documento ni hash; `E5` 404 `ROL_NO_ENCONTRADO`; `limit=101` → 422

### Implementation for User Story 3

- [X] T037 [US3] `rolesService.obtener(id)` (404 `ROL_NO_ENCONTRADO`; agrupa con `agruparPorModulo`) y filtros `q`/`estado` en `rolesService.listar` en `backend/src/modules/roles/roles.service.js`
- [X] T038 [US3] Ruta `GET /roles/:id` (`authorize('roles.ver')`) y controlador `obtener` en `backend/src/modules/roles/roles.{routes,controller}.js`

**Checkpoint**: HU-01 a HU-03 en verde.

---

## Phase 6: User Story 4 — Actualizar un rol y sus permisos (Priority: P2) · HU-04

**Goal**: editar nombre, descripción y permisos manteniendo la unicidad; nombre de rol base fijo; el Administrador conserva los permisos protegidos; los cambios aplican desde el siguiente inicio de sesión (RF-ROL-09/10/11).

**Independent Test**: PUT agrega `reportes.ver` a Supervisor de turno; el token viejo del supervisor recibe 403 en una ruta que exige ese permiso y uno nuevo lo incluye en `permisos[]`; PUT al Administrador sin `roles.editar` → 409.

### Tests for User Story 4

- [X] T039 [US4] `backend/tests/integration/roles.test.js` bloque HU-04: `E1` 200, bitácora con `valor_anterior`/`valor_nuevo` de permisos y descripción; `permisos[]` del token viejo sin el nuevo código y login nuevo con él; `E2` nombre de otro rol → 409 `ROL_DUPLICADO`; `E3` `permisos:[]` → 422; `E4` Administrador sin `roles.editar` → 409 `PERMISOS_ADMIN_PROTEGIDOS`; `E5` rol base Operador: cambiar descripción y permisos → 200, cambiar nombre → 409 `ROL_BASE_INMUTABLE`; `E6` 404

### Implementation for User Story 4

- [X] T040 [US4] `rolesService.actualizar(id, datos, actor)` en `backend/src/modules/roles/roles.service.js`: `withTransaction` + `obtenerPorId(..., {bloquear:true})`; 404; si `es_base` y `esRenombre` → 409; si es el rol Administrador y `faltanProtegidos` → 409; valida que los permisos existan; `actualizar` + `reemplazarPermisos`; `registrarBitacora(accion:'editar')` con la diferencia; `ER_DUP_ENTRY` → 409
- [X] T041 [US4] Ruta `PUT /roles/:id` (`authorize('roles.editar')`) y controlador `actualizar` en `backend/src/modules/roles/roles.{routes,controller}.js`

**Checkpoint**: HU-01 a HU-04 en verde.

---

## Phase 7: User Story 5 — Activar o inactivar un rol (Priority: P2) · HU-05

**Goal**: cambio de estado con bitácora; rechazo de roles base y de roles con usuarios activos; los roles inactivos no se ofrecen al asignar (RF-ROL-12/13/14, RN-04).

**Independent Test**: inactivar un rol sin usuarios activos → 200; inactivar «Supervisor de turno» → 409 «El rol tiene 1 usuarios activos»; activar Auditor → 200 y aparece en `?estado=activo`.

### Tests for User Story 5

- [X] T042 [US5] `backend/tests/integration/roles.test.js` bloque HU-05: `E1` rol creado en la prueba → inactivo + bitácora `cambiar_estado`, y ya no sale en `GET /roles?estado=activo` (fuente de las opciones de asignación, RF-ROL-14); `E2` 409 `ROL_CON_USUARIOS_ACTIVOS` con N real en el mensaje; `E3` rol base → 409 `ROL_BASE_INMUTABLE`; `E4` reactivar Auditor → 200; `E5` `estado:'borrado'` → 422; mismo estado → 200 sin nueva entrada en bitácora

### Implementation for User Story 5

- [X] T043 [US5] `rolesService.cambiarEstado(id, estado, actor)` en `backend/src/modules/roles/roles.service.js`: `withTransaction` + bloqueo del rol; 404; sin cambios → devuelve el actual; si `inactivo`: rol base → 409 y `contarUsuariosActivos > 0` → 409 con N; `cambiarEstado` + `registrarBitacora`
- [X] T044 [US5] Ruta `PATCH /roles/:id/estado` (`authorize('roles.cambiar_estado')`) y controlador `cambiarEstado` en `backend/src/modules/roles/roles.{routes,controller}.js`

**Checkpoint**: HU-01 a HU-05 en verde.

---

## Phase 8: User Story 6 — Catálogo de permisos (Priority: P3) · HU-06

**Goal**: catálogo agrupado por módulo, solo para quien tenga `roles.ver` (RF-ROL-15, RNF-SEG-04).

**Independent Test**: Administrador → 200 agrupado; Operador → 403; sin token → 401.

### Tests for User Story 6

- [X] T045 [US6] `backend/tests/integration/permisos.test.js`: `HU-06 E1` 200 con 21 grupos y 63 permisos con `codigo = modulo.accion`; `E2` Operador → 403 `SIN_PERMISO`; `E3` sin token → 401 `NO_AUTENTICADO`

### Implementation for User Story 6

- [X] T046 [US6] `rolesService.catalogo()` + ruta `GET /permisos` (`authorize('roles.ver')`) montada en `/api/v1` desde `backend/src/modules/roles/roles.routes.js` (exporta `rolesRouter` y `permisosRouter`)

**Checkpoint**: las 6 historias en verde en la API.

---

## Phase 9: Interfaz por historia (rebanada vertical, constitución §VII)

- [X] T047 [P] [US1] [US3] [US5] `frontend/roles.html` + `frontend/js/views/roles.view.js` + `frontend/js/services/roles.service.js`: tabla paginada (10) con buscador, filtro de estado, etiqueta BASE, conteo de usuarios, acciones Ver, Editar y Cambiar estado (`<dialog>` de confirmación; 409 → toast con `message`); estados de carga, vacío y error
- [X] T048 [P] [US2] [US4] Diálogo «Nuevo / Editar rol» en `frontend/roles.html` (`<template>` de grupos de permisos con casillas por módulo; validación en línea 3–40 y «Seleccione al menos un permiso»; `details` junto al campo; `ROL_DUPLICADO` en el campo nombre; el nombre se deshabilita en roles base)
- [X] T049 [P] [US3] `frontend/rol-detalle.html` + `frontend/js/views/rol-detalle.view.js`: datos del rol, permisos agrupados, usuarios asignados y 404 «Rol no encontrado»
- [X] T050 [P] [US6] `frontend/permisos.html` + `frontend/js/views/permisos.view.js`: catálogo de solo lectura agrupado
- [X] T051 `frontend/js/components/navbar.js`: entradas Configuración › Roles y Permisos solo con `roles.ver`; acceso directo sin permiso → aviso 403 (criterio 2 de HU-06)

---

## Phase 10: Polish & Cross-Cutting

- [X] T052 Carpeta «001 Roles y permisos» en `backend/docs/postman/parqueadero.postman_collection.json` con las peticiones de la tabla de [quickstart.md](quickstart.md#colección-postman-carpeta-001-roles-y-permisos), cada una con `pm.test` de status y `ok`/`error.code`; `npm run test:api` en verde con el servidor en marcha
- [X] T053 [P] Actualizar `README.md` (se unificó en el README raíz; no se crea `backend/README.md`): instalación, Node 20, `.env`/`.env.test`, `db:reset`, usuarios de prueba, endpoints de 001, pruebas (Jest y Newman), flujo spec-kit + Gitflow y aviso de certificados TLS
- [ ] T054 Verificar la cobertura de `roles.service.js` (≥ 80 %), `npm run lint` sin errores y `npm run dev` arrancando; prueba manual según [quickstart.md](quickstart.md#interfaz-prueba-manual) en escritorio y a 375 px — **Hecho:** cobertura de roles.service 97,6 %, lint sin errores, `npm run dev` arranca. **Pendiente:** prueba manual en navegador (escritorio y 375 px).
- [X] T055 Verificar SC-004/RNF-REN-02: sembrar 50 000 filas de prueba en `usuario` (script temporal fuera del repositorio), medir `GET /roles` (p95 ≤ 1 s) y revisar `EXPLAIN` de `rolesRepository.listar`; documentar el resultado en `specs/001-roles-permisos/quickstart.md`
- [X] T056 Revisar que cada criterio de HU-01 a HU-06 tenga su prueba Jest con nombre `HU-xx Ey` y su caso Postman (RNF-CAL-03), y marcar `[X]` en este archivo

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → historias (3–8) → interfaz (9) → pulido (10).
- Foundational **bloquea** todas las historias (esquema, auth, validación y sobre).

### User Story Dependencies

- **US1 (P1)**: solo depende de Foundational. Crea el repositorio, el validador y las reglas que reutilizan las demás.
- **US2, US3, US6**: dependen de T028–T032 (archivos del módulo roles). Entre ellas son independientes en cuanto a funcionalidad.
- **US4**: usa `faltanProtegidos`/`esRenombre` (US1) y la validación de permisos de US2 (T034).
- **US5**: usa `asegurarNoBase` (US1).
- **Interfaz (9)**: cada pantalla depende del endpoint de su historia.

### Within Each User Story

- Primero las pruebas (y verificar que fallan), luego validador y repositorio, después el servicio y por último la ruta y el controlador.
- `roles.service.js`, `roles.routes.js`, `roles.controller.js` y `roles.test.js` son archivos compartidos, así que las tareas de US2 a US6 sobre ellos son **secuenciales**.

### Parallel Opportunities

- Setup: T005 ∥ T006.
- Foundational: T011 ∥ T012 ∥ T013 ∥ T014; T018 ∥ T019; T022 ∥ T023.
- US1: T026 ∥ T028 ∥ T029.
- Interfaz: T047 ∥ T049 ∥ T050 (archivos distintos).

## Parallel Example: User Story 1

```text
T026 roles.reglas.test.js   ∥   T028 roles.reglas.js   ∥   T029 roles.validator.js
→ T030 roles.repository.js → T031 roles.service.js → T032 controller + routes → T027 HU-01 en verde
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup → Foundational (checkpoint: health, login y pruebas base).
2. US1 → validar HU-01 (roles base inmutables y con sus permisos). **Stop & validate.**

### Incremental Delivery

3. US2 → US3 → US4 → US5 → US6, con un checkpoint en verde después de cada una.
4. Interfaz (fase 9) y pulido (fase 10).
5. PR `001-roles-permisos` → `develop` con el resumen de HU/RF cubiertos.

### Commits (C6 de la rúbrica)

Un commit por fase como mínimo, con trazabilidad, por ejemplo:
- `chore(fundacion): esquema 6.1, sobre {ok}, auth Bearer y bitácora [RNF-SEG-03][RNF-SEG-07]`
- `feat(roles): roles base inmutables [HU-01][RF-ROL-01][RF-ROL-03]`
- `feat(roles): registrar rol [HU-02][RF-ROL-04..06]`

### Notas para specs siguientes

- Spec 002: al crear o editar usuarios debe rechazar los roles `inactivo` (RF-ROL-14) y bloquear el rol (`FOR UPDATE`) mientras asigna (riesgo del plan).
