# Investigación — 001-roles-permisos (incluye la fundación del backend v2)

**Fecha**: 2026-11-26 · **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

Precedencia de fuentes en esta fase, decidida por la usuaria: **rúbrica del instructor → constitución → SRS v2.0 → HU → spec → `CLAUDE.md` §1–10 → `prompt-plan-backend.md`**. Cada decisión trae *Decisión / Justificación / Alternativas descartadas*.

---

## R-01 · Reconstrucción sobre el backend v1 existente

- **Decisión**: el backend v1 (PARKO, 21 módulos con trazabilidad REQ-) se **retira de forma progresiva**. En 001 se reescribe la base común: configuración, sobre de respuesta, errores, autenticación, validación, bitácora, consecutivos y esquema. Se quitan del enrutador todos los módulos v1, porque dependen del esquema viejo. Cada spec 002…015 vuelve a construir su módulo y reutiliza la lógica v1 que sirva (cálculo de fechas Bogotá, normalización de placas, PDF, CSV). El estado v1 queda marcado con el tag `v0.9.0-legado` sobre `ba86248`, para consultarlo.
- **Justificación**: la usuaria eligió rehacer el esquema según el modelo 6.1 (PK `id_<entidad>`, `movimiento`/`liquidacion`/`pago` separados, caja, planes, alertas). Ninguna consulta v1 sobrevive a ese cambio. Mantener las rutas v1 encendidas haría fallar las pruebas y el arranque, y la rúbrica penaliza que la app no arranque.
- **Alternativas descartadas**: (a) adaptar las tablas v1 con migraciones, que viola la constitución §IV (`id_<entidad>`) y deja nombres que no coinciden con B.1; (b) tener dos esquemas en paralelo, que duplica el mantenimiento.

## R-02 · Módulos: CommonJS

- **Decisión**: se mantiene **CommonJS** (`require`) en todo el backend.
- **Justificación**: la constitución acepta "ES Modules o CommonJS de forma consistente", el código que se reutiliza ya es CommonJS y Jest 30 lo ejecuta sin configuración experimental.
- **Alternativas descartadas**: ESM (`"type":"module"`), que obliga a usar `--experimental-vm-modules` en Jest y reescribir todos los imports sin que la rúbrica lo valore.

## R-03 · Sobre de respuesta y códigos HTTP

- **Decisión**: éxito `{ ok: true, data, meta? }` y error `{ ok: false, error: { code, message, details? } }`, con `details = [{ campo, mensaje }]` y `meta = { page, limit, total }` en los listados. HTTP:
  - 200 consulta o actualización, 201 creación, 204 sin contenido;
  - **400** JSON mal formado o parámetro imposible de interpretar;
  - 401 sin token, token inválido, revocado o usuario inactivo;
  - 403 sin permiso;
  - 404 recurso o ruta inexistente;
  - **409** conflicto o regla de negocio (duplicado, rol base, rol con usuarios activos, RF-ROL-11);
  - **422** validación de campos (incluye "sin permisos", criterio 3 de HU-04);
  - 429 exceso de peticiones;
  - 500 sin traza.
- **Justificación**: la constitución §II asigna 422 a validación y 409 a reglas de negocio. Ese criterio coincide con las HU, aunque el prompt proponía 400 para validación.
- **Contradicción registrada**: el prompt (§3.6) pide 400 para validación y 422 para regla de negocio. **Prevalece la constitución.**
- **Alternativas descartadas**: el formato v1 `{ data } / { error:{codigo,mensaje} }`, que no cumple el C3 de la rúbrica.

## R-04 · Autenticación: JWT Bearer con revocación

- **Decisión**: `Authorization: Bearer <jwt>` (HS256). El payload lleva `sub` (id_usuario), `rol`, `permisos[]` y `jti`. Expira en 8 h (`JWT_EXPIRES_IN`). Cada inicio de sesión crea un registro en la tabla `sesion` (`[Propuesta]`, R-09). El middleware `authenticate` verifica la firma, que el `jti` no esté revocado ni vencido y que el usuario siga `activo`; si falla algo responde 401. Los permisos del token quedan fijos al iniciar sesión (RF-ROL-10). El frontend guarda el token en `sessionStorage`.
- **Justificación**: lo piden el SRS §3.4 y la constitución §III. La revocación es necesaria para RF-ACC-13 y RF-USR-13.
- **Alternativas descartadas**: la cookie httpOnly de v1 (contradice el SRS y la constitución); un JWT sin estado en el servidor (no permite cerrar sesión de verdad).

## R-05 · Alcance del login en 001

- **Decisión**: 001 implementa solo `POST /api/v1/auth/login` (tipo y número de documento más contraseña, para cualquier rol activo). Devuelve el token, los datos mínimos del usuario y sus permisos, y el indicador `debe_cambiar_contrasena`. Mensaje genérico ante credenciales incorrectas (RF-ACC-02). La spec 003 agrega el bloqueo por intentos, el cambio de contraseña, el autorregistro, la recuperación y el cierre de sesión.
- **Justificación**: sin login no se pueden probar los endpoints protegidos de 001 (prompt §3.13). El SRS RF-ACC-05 dice que el Cliente también inicia sesión con documento y contraseña, así que la D-01 del prompt (Cliente sin contraseña) **no aplica**, porque el SRS tiene más precedencia.
- **Alternativas descartadas**: un token "de servicio" solo para pruebas, que no se puede verificar desde Postman/Newman como en producción.

## R-06 · Validación con zod

- **Decisión**: `zod` 3 en `*.validator.js`, con el nombre de archivo que pide la constitución. El middleware `validate({ params, query, body })` guarda el resultado en `req.validado` y responde **422** con `details`.
- **Justificación**: la constitución §III permite "express-validator, Joi o Zod". zod ya está en el proyecto.
- **Alternativas descartadas**: express-validator (más verboso y sin tipos de salida).

## R-07 · Paginación y búsqueda

- **Decisión**: `?page` (≥1, por defecto 1), `?limit` (1–100, por defecto 10; fuera de rango → 422), `?q` (búsqueda sin distinguir mayúsculas con `LIKE` parametrizado y comodines escapados) y `?estado`. `meta.total` sale de un `COUNT(*)` con el mismo filtro.
- **Justificación**: constitución §II y criterio 1 de HU-03.

## R-08 · Esquema global de la base de datos

- **Decisión**: en la fase Fundacional de 001 se escribe **todo** el `backend/database/schema.sql` según el modelo 6.1 del SRS (las 15 características): tablas en singular snake_case como en 6.1 (`rol`, `permiso`, `rol_permiso`, `usuario`…), PK `id_<entidad>`, `created_at`/`updated_at` en todas, FK `ON DELETE RESTRICT` y `ON UPDATE RESTRICT` (MySQL no permite CHECK ni columnas generadas sobre FK con acciones en cascada; las PK no cambian), InnoDB `utf8mb4_0900_ai_ci`. Base `parqueaderodb` (configurable en `DB_NAME`). Las specs posteriores lo consultan, y si necesitan algo nuevo lo agregan en `database/migrations/NNN_*.sql` y lo anotan en `database/CAMBIOS.md`.
- **Justificación**: el prompt §3.8 pide un esquema global único y la rúbrica C9 exige `schema.sql` y `seed.sql`. Escribirlo una vez evita que las specs 002–015 se tropiecen con migraciones cruzadas.
- **Alternativas descartadas**: un esquema incremental por spec (cada spec rompe la anterior al agregar FK); nombres de tabla en plural (6.1 usa singular).

## R-09 · Tablas que no están en el modelo 6.1 `[Propuesta]`

| Tabla | Para qué | RF/RNF de origen |
|---|---|---|
| `sesion` (id_sesion, jti UNIQUE, id_usuario, emitida_en, expira_en, revocada_en, ip) | Revocar tokens | RF-ACC-13, RF-USR-13 |
| `bitacora` (id_bitacora, id_usuario NULL, fecha, accion, entidad, id_registro, valor_anterior JSON, valor_nuevo JSON, ip) | Auditoría | RNF-SEG-07, RF-USR-11, RF-VEH-09 |
| `consecutivo` (clave PK, prefijo, siguiente, longitud) | Numeración sin huecos de T-, FV-, INC- y reserva | RN-22, RF-MOV-06, RF-INC-02 |
| `turno_caja` (o `id_cierre` NULL en `pago`) | Pagos de un turno abierto | RF-FAC-18. **Se define en la spec 009.** |
| `intento_rechazado` | Intentos de ingreso rechazados por pico y placa | RF-REP-06. **Se define en la spec 007.** |
| `festivo` | Festivos de pico y placa | TBD-03. **Se define en la spec 016.** |

En 001 se crean `sesion`, `bitacora` y `consecutivo`. Las demás quedan reservadas en el esquema global con su RF y su spec de origen anotados en `CAMBIOS.md`.

## R-10 · Bitácora en la misma transacción

- **Decisión**: el helper `registrarBitacora(conexion, { idUsuario, accion, entidad, idRegistro, anterior, nuevo })` recibe la conexión de la transacción (`withTransaction`). Si el cambio se revierte, la entrada de bitácora también.
- **Justificación**: RNF-SEG-07 y prompt §3.7.
- **Alternativas descartadas**: escribirla después del `COMMIT`, que deja cambios sin auditar si el proceso cae entre los dos pasos.

## R-11 · Catálogo de permisos

- **Decisión**: el catálogo es fijo y lo carga `seed.sql` (spec FR-015), con códigos `modulo.accion`. Los módulos salen del Apéndice B.1: `roles, usuarios, parqueaderos, celdas, vehiculos, restricciones, movimientos, tarifas, facturas, caja, planes, membresias, descuentos, reservas, incidencias, lecturas, alertas, notificaciones, reportes, indicadores`. Las acciones son las de 6.1 y solo se crean las combinaciones que algún endpoint usa. El detalle está en [data-model.md](data-model.md#catálogo-de-permisos).
- **Justificación**: RF-ROL-15 y modelo 6.1 (`accion` ENUM).

## R-12 · Concurrencia en cambios de rol

- **Decisión**: `PUT /roles/:id` y `PATCH /roles/:id/estado` se ejecutan en una transacción con `SELECT … FOR UPDATE` sobre el rol. La unicidad del nombre se garantiza con la columna generada `nombre_normalizado = LOWER(TRIM(nombre))` y `UNIQUE`. Así, dos administradores no pueden crear «Supervisor» y «supervisor» al mismo tiempo.
- **Justificación**: RF-ROL-05 y la constitución §IV (invariantes también en la BD).

## R-13 · Frontend: estructura de la constitución

- **Decisión**: se reestructura `frontend/` así:
  - `frontend/index.html` (página pública), `login.html` y una página `.html` por pantalla interna (`roles.html`, `permisos.html`…) en la raíz de `frontend/`;
  - `css/` (tokens, base y componentes del diseño PARKO);
  - `js/config/` (URL base de la API, constantes);
  - `js/api/http.js` (cliente `fetch` único: Bearer, desarma `{ok,data,meta,error}`, timeout con `AbortController`, 401 → login, 403 → aviso);
  - `js/services/` (una función por endpoint);
  - `js/views/` (controlador de cada pantalla);
  - `js/components/` dividido por **niveles de Atomic Design**: `atomos/` (botón, chip de estado), `moleculas/` (campo, alerta, aviso, buscador, menú de usuario), `organismos/` (tabla de datos, modal `<dialog>`, navbar) y `plantillas/` (marco de la app). El clonado de `<template>` va en `js/utils/plantillas.js`. `js/views/` es el nivel **página** y es el único que llama a `js/services/`. ESLint bloquea importar niveles superiores o servicios desde un componente;
  - `js/utils/` (formatos es-CO, sesión);
  - `assets/` (logo, sprite de iconos).

  En 001 se construyen el login, el armazón (encabezado y navbar según permisos), Configuración › Roles (listado, nuevo, detalle, editar, cambiar estado con `<dialog>`) y Configuración › Permisos. Las demás pantallas v1 se retiran y cada spec las vuelve a construir.
- **Justificación**: decisión de la usuaria y constitución §V. El estilo visual PARKO se conserva (`CLAUDE.md` §5.1).
- **Alternativas descartadas**: una SPA con enrutador por hash (más JavaScript, más superficie para XSS); conservar `styles/` y `js/pages/` (contradice la constitución).

## R-14 · Dependencias

La constitución permite `express`, `mysql2`, `dotenv`, `bcrypt`, `jsonwebtoken`, `helmet`, `cors`, una librería de validación (zod), `morgan` y `nodemailer`.

| Dependencia | Decisión | Motivo |
|---|---|---|
| `cookie-parser` | **Se elimina** | Bearer reemplaza la cookie |
| `nodemon` | **Se elimina** | se usa `node --watch` (nativo de Node 20) |
| `express-rate-limit` | Se mantiene, justificada | límite de peticiones por IP en login, complementa el bloqueo por documento (RNF-SEG-05, constitución §III "límite de intentos") |
| `multer` | Se mantiene, justificada | foto de usuario y evidencias JPG/PNG ≤ 2 MB (RNF-PRI-03, RF-INC-01). La usa la spec 002. |
| `pdfkit` | Se mantiene, justificada | ticket de 80 mm y factura PDF (RF-MOV-07, RF-FAC-10, RF-REP-05) |
| `jest`, `supertest` (dev) | Permitidas | constitución §VI |
| `eslint`, `@eslint/js`, `prettier` (dev) | Se mantienen, justificadas | calidad de código. No se despliegan. |
| `pino`, `node-cron`, `swagger-ui-express` (prompt) | **No se agregan** | no están en la constitución. Los trabajos programados usan `setInterval` (R-16) y el contrato va en `contracts/openapi.yaml` sin servirlo. |

Las justificaciones se copian en el *Complexity Tracking* de [plan.md](plan.md), porque la rúbrica descuenta 2 puntos por cada dependencia no justificada.

## R-15 · Node 20 LTS

- **Decisión**: `engines.node = "20.x"` y `.nvmrc` con `20`. El código no usa APIs posteriores a Node 20.
- **Justificación**: la rúbrica y la constitución dicen Node 20. La D-03 del prompt (Node 22) **no aplica**.
- **Riesgo**: la máquina de desarrollo tiene Node 26. Se recomienda instalar Node 20 con nvm-windows para probar antes de entregar.

## R-16 · Tareas programadas sin node-cron

- **Decisión**: cuando las specs 010, 012 y 014 necesiten trabajos (vencer reservas cada minuto, membresías diarias, alertas), usarán `setInterval` con un candado de una instancia (`GET_LOCK` de MySQL) y operaciones idempotentes, en `src/jobs/`.
- **Justificación**: no agrega una dependencia fuera de la constitución. En 001 no hay trabajos.

## R-17 · Pruebas

- **Decisión**: Jest + Supertest contra una base de pruebas (`DB_NAME` de `.env.test`, por defecto `parqueaderodb_test`). Un `globalSetup` recrea `schema.sql` y `seed.sql` antes de la suite. Cada prueba se nombra con su HU y su escenario (`HU-02 E2 rechaza nombre duplicado sin distinguir mayúsculas`). Hay pruebas unitarias de las funciones puras (normalización de nombres, armado del catálogo agrupado, regla RF-ROL-11). Además se arma una colección Postman en `backend/docs/postman/` con una carpeta por spec y al menos un caso de éxito y uno de error por endpoint, que se ejecuta con `npm run test:api` (Newman) contra el servidor en marcha.
- **Justificación**: la constitución §VI, la rúbrica C8 y RNF-CAL-03.

## Contradicciones entre fuentes (registradas, no editan la spec)

| # | Fuentes | Contradicción | Resolución |
|---|---|---|---|
| C-01 | Prompt D-01 frente a SRS RF-ACC-05 y TBD-05 | Cliente sin contraseña frente a cliente con contraseña | SRS (más precedencia): **con contraseña** |
| C-02 | Prompt §3.6 frente a la constitución §II | 400 validación / 422 regla frente a 422 validación / 409 regla | Constitución |
| C-03 | Prompt D-03 (Node 22) frente a la rúbrica, la constitución y RNF-TEC-01 (Node 20) | Versión de Node | Node 20 |
| C-04 | Prompt §3.4 (Vitest, pino, node-cron, swagger, nodemailer) frente a la constitución §VII | Dependencias | Constitución: Jest y sin las demás. `nodemailer` se evalúa en las specs 003 y 014. |
| C-05 | SRS §3.4 (polling cada 10 s) frente a la v1 (SSE) | Tiempo real | SRS: polling (spec 004) |
| C-06 | `CLAUDE.md` §5.2 (sin `createElement`, Atomic Design) frente a la constitución §V (estructura de carpetas, solo `textContent`) | Arquitectura del frontend | Constitución para la estructura. Se conserva la regla de clonar `<template>` y no usar `innerHTML`. |
| C-07 | Prompt §3.14 (RF-TAR-07 público) frente a RNF-SEG-03 (lista de endpoints públicos) | Tarifas públicas | Se resuelve en la spec 008 (fuera de 001) |

## Cambios pendientes de reflejar en el SRS

- Agregar al modelo 6.1 las entidades `sesion`, `bitacora` y `consecutivo` (R-09).
- RNF-SEG-03: confirmar `GET /tarifas?vigentes=true` como público (spec 008).

## [NEEDS CLARIFICATION] pendientes

Ninguno para 001. La usuaria pidió resolver las ambigüedades con los documentos (sección Aclaraciones de la spec).
