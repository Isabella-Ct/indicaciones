# Data Model — 001-roles-permisos

**Fuente**: SRS v2.0 §6.1 (4.1 Roles y permisos, 4.2 Usuario), [research.md](research.md) R-08 a R-12. El esquema completo vive en `backend/database/schema.sql`. Este documento detalla las tablas que **usa, crea o modifica** la spec 001; las demás se describen en la spec que las usa.

Convenciones comunes (constitución §IV, R-08): tablas en singular snake_case, PK `id_<entidad>` `INT UNSIGNED AUTO_INCREMENT`, columnas `created_at DATETIME DEFAULT CURRENT_TIMESTAMP` y `updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`, FK `ON DELETE RESTRICT ON UPDATE RESTRICT`, InnoDB `utf8mb4_0900_ai_ci`, sesión MySQL con `time_zone = '-05:00'`.

## Tablas de la spec

### `rol` (6.1 *Rol*)

| Columna | Tipo | Restricciones |
|---|---|---|
| id_rol | INT UNSIGNED | PK, AUTO_INCREMENT |
| nombre | VARCHAR(40) | NOT NULL, `CHECK (CHAR_LENGTH(TRIM(nombre)) BETWEEN 3 AND 40)` |
| nombre_normalizado | VARCHAR(40) | `GENERATED ALWAYS AS (LOWER(TRIM(nombre))) STORED`, **UNIQUE** `uq_rol_nombre` (RF-ROL-05) |
| descripcion | VARCHAR(150) | NULL |
| es_base | BOOLEAN | NOT NULL DEFAULT FALSE |
| estado | ENUM('activo','inactivo') | NOT NULL DEFAULT 'activo' |
| created_at, updated_at | DATETIME | auditoría |

Índices: `idx_rol_estado (estado)`.

### `permiso` (6.1 *Permiso*)

| Columna | Tipo | Restricciones |
|---|---|---|
| id_permiso | INT UNSIGNED | PK, AUTO_INCREMENT |
| modulo | VARCHAR(40) | NOT NULL |
| accion | ENUM('ver','crear','editar','cambiar_estado','anular','exportar') | NOT NULL |
| codigo | VARCHAR(60) | NOT NULL, **UNIQUE** `uq_permiso_codigo`, `CHECK (codigo = CONCAT(modulo,'.',accion))` |
| descripcion | VARCHAR(150) | NOT NULL |
| created_at, updated_at | DATETIME | auditoría |

UNIQUE `uq_permiso_modulo_accion (modulo, accion)`. Es un catálogo de solo lectura para la API (FR-015).

### `rol_permiso` (6.1 *RolPermiso*)

| Columna | Tipo | Restricciones |
|---|---|---|
| id_rol | INT UNSIGNED | FK → `rol.id_rol` ON DELETE **CASCADE** (tabla intermedia, constitución §II) |
| id_permiso | INT UNSIGNED | FK → `permiso.id_permiso` ON DELETE RESTRICT |
| created_at | DATETIME | auditoría |

PK compuesta `(id_rol, id_permiso)`, que es la forma de 6.1. Índice `idx_rol_permiso_permiso (id_permiso)`. Esta es la única tabla en la que se borran filas físicamente: al reemplazar los permisos de un rol se hace `DELETE` + `INSERT` dentro de la transacción.

### `usuario` (6.1 *Usuario*): solo lectura en 001

Se crea completa en Foundational (columnas de 6.1 más `debe_cambiar_contrasena BOOLEAN DEFAULT TRUE`, que pide RF-ACC-04). La spec 001 solo la lee para:

- contar los usuarios asignados y los activos de un rol (RF-ROL-07, RF-ROL-13);
- listar los usuarios de un rol en el detalle (`id_usuario`, `nombre_completo`, `estado`; RF-ROL-08, FR-019);
- iniciar sesión (R-05).

FK `id_rol` → `rol.id_rol` ON DELETE RESTRICT. Índice `idx_usuario_rol_estado (id_rol, estado)` para los conteos. `UNIQUE (tipo_documento, numero_documento)` y `UNIQUE (correo)`.

### `sesion` `[Propuesta]` (R-09; RF-ACC-13, RF-USR-13)

| Columna | Tipo | Restricciones |
|---|---|---|
| id_sesion | INT UNSIGNED | PK |
| jti | CHAR(36) | NOT NULL, UNIQUE (`crypto.randomUUID()`) |
| id_usuario | INT UNSIGNED | FK → usuario, NOT NULL |
| emitida_en | DATETIME | NOT NULL (hora del servidor) |
| expira_en | DATETIME | NOT NULL (emitida_en + 8 h) |
| revocada_en | DATETIME | NULL |
| ip | VARCHAR(45) | NULL |
| created_at, updated_at | DATETIME | auditoría |

Índice `idx_sesion_usuario (id_usuario, revocada_en)`. En 001 se crea al iniciar sesión y se consulta en cada petición. La revocación la implementa la spec 003.

### `bitacora` `[Propuesta]` (R-09, R-10; RNF-SEG-07)

| Columna | Tipo | Restricciones |
|---|---|---|
| id_bitacora | BIGINT UNSIGNED | PK |
| id_usuario | INT UNSIGNED | FK → usuario, NULL (acciones del sistema) |
| fecha | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| accion | VARCHAR(40) | NOT NULL (`crear`, `editar`, `cambiar_estado`, `anular`, `cerrar_caja`…) |
| entidad | VARCHAR(40) | NOT NULL (`rol`, `usuario`…) |
| id_registro | INT UNSIGNED | NOT NULL |
| valor_anterior | JSON | NULL |
| valor_nuevo | JSON | NULL |
| ip | VARCHAR(45) | NULL |
| created_at, updated_at | DATETIME | auditoría |

Índices `idx_bitacora_entidad (entidad, id_registro)` e `idx_bitacora_fecha (fecha)`. **Nunca** se borra ni se actualiza (RNF-SAF-02). Nunca guarda `contrasena_hash` (RNF-SEG-02).

### `consecutivo` `[Propuesta]` (R-09; RN-22)

| Columna | Tipo | Restricciones |
|---|---|---|
| clave | VARCHAR(20) | PK (`ticket`, `factura`, `incidencia`, `reserva`) |
| prefijo | VARCHAR(5) | NOT NULL (`T-`, `FV-`, `INC-`, `R-`) |
| siguiente | INT UNSIGNED | NOT NULL DEFAULT 1 |
| longitud | TINYINT UNSIGNED | NOT NULL DEFAULT 6 |
| created_at, updated_at | DATETIME | auditoría |

El helper `siguienteConsecutivo(conexion, clave)` hace `SELECT … FOR UPDATE` y `UPDATE siguiente = siguiente + 1` dentro de la transacción de quien lo llama, así no quedan huecos si se revierte. 001 lo crea y lo prueba. Lo usan las specs 007, 009, 012 y 013.

## Estados y transiciones del rol

| Desde | Hacia | Condición | Si no se cumple |
|---|---|---|---|
| (nuevo) | activo | ≥ 1 permiso, nombre único (RF-ROL-04/05/06) | 422 / 409 |
| activo | inactivo | `es_base = FALSE` **y** 0 usuarios con `estado='activo'` en el rol (RF-ROL-13) | 409 `ROL_BASE_INMUTABLE` o `ROL_CON_USUARIOS_ACTIVOS` |
| inactivo | activo | siempre | — |
| x | x (mismo estado) | sin cambios ni bitácora | 200 |

No hay estado «eliminado»: retirar un rol es inactivarlo.

Edición (`PUT`): si `es_base = TRUE`, el `nombre` enviado debe ser igual al actual, sin distinguir mayúsculas ni espacios extremos; si no, 409 `ROL_BASE_INMUTABLE`. Para el rol con nombre Administrador, el nuevo conjunto de permisos debe incluir los 8 permisos protegidos; si no, 409 `PERMISOS_ADMIN_PROTEGIDOS`.

## Catálogo de permisos

Columnas A, O y C: el seed los asigna a Administrador, Operador o Cliente. El Administrador tiene **todos**.

| Módulo | Acciones (códigos `modulo.accion`) | O | C | Endpoints principales (B.1) |
|---|---|---|---|---|
| roles | ver, crear, editar, cambiar_estado | — | — | `/roles`, `/permisos` (spec 001) |
| usuarios | ver, crear, editar, cambiar_estado | ver, crear | — | `/usuarios` (002) |
| perfil | ver, editar | ver, editar | ver, editar | `/usuarios/me/*` (002, 005, 009, 010, 012, 014) |
| parqueaderos | ver, crear, editar, cambiar_estado | ver | — | `/parqueaderos`, `/puertas` (004) |
| celdas | ver, crear, editar, cambiar_estado | ver | ver | `/celdas` (004) |
| vehiculos | ver, crear, editar | ver, crear | — | `/vehiculos` (005) |
| restricciones | ver, crear, editar, cambiar_estado | ver | ver | `/restricciones-placa` (006) |
| movimientos | ver, crear, anular | ver, crear, anular | — | `/movimientos`, `/tickets` (007) |
| tarifas | ver, crear, editar, cambiar_estado | ver | ver | `/tarifas` (008) |
| facturas | ver, crear, anular, exportar | ver, crear | — | `/movimientos/:id/liquidacion`, `/pagos`, `/facturas` (009) |
| caja | ver, crear | ver, crear | — | `/caja/*` (009) |
| planes | ver, crear, editar, cambiar_estado | ver | ver | `/planes-membresia` (010) |
| membresias | ver, crear, editar | ver, crear, editar | crear | `/membresias` (010) |
| descuentos | ver, crear, editar, cambiar_estado | ver | — | `/descuentos` (011) |
| reservas | ver, crear, editar | ver, crear, editar | crear, editar | `/reservas`, `/celdas/disponibles` (012) |
| incidencias | ver, crear, editar | ver, crear | — | `/incidencias` (013) |
| lecturas | ver | ver | — | `/lecturas-placa` (014) |
| alertas | ver, editar | — | — | `/alertas` (014) |
| notificaciones | ver, editar | ver, editar | ver, editar | `/usuarios/me/notificaciones`, `/notificaciones/:id/lectura` (014) |
| reportes | ver, exportar | — | — | `/reportes/*` (015) |
| indicadores | ver | — | — | `/indicadores` (015) |

Total: **63 permisos**. El Operador tiene 30 y el Cliente 11. Las specs posteriores pueden ajustar esta asignación con una migración documentada en `CAMBIOS.md`. Los códigos no cambian.

Permisos protegidos del rol Administrador (RF-ROL-11): `roles.ver`, `roles.crear`, `roles.editar`, `roles.cambiar_estado`, `usuarios.ver`, `usuarios.crear`, `usuarios.editar`, `usuarios.cambiar_estado`.

## Mapeo tabla ↔ recurso de la API

| Recurso JSON (camelCase) | Origen |
|---|---|
| `Rol` `{ idRol, nombre, descripcion, esBase, estado, usuariosAsignados, usuariosActivos, createdAt, updatedAt }` | `rol` + `COUNT` sobre `usuario` |
| `RolDetalle` = `Rol` + `{ permisos: [{ modulo, permisos: [{ idPermiso, codigo, accion, descripcion }] }], usuarios: [{ idUsuario, nombreCompleto, estado }] }` | `rol_permiso` ⋈ `permiso`, `usuario` |
| `GrupoPermisos` `{ modulo, permisos: [{ idPermiso, codigo, accion, descripcion }] }` | `permiso` agrupado por `modulo` |
| `Sesion` (respuesta del login) `{ token, expiraEn, usuario: { idUsuario, nombreCompleto, rol, debeCambiarContrasena }, permisos: [codigo] }` | `usuario`, `rol`, `rol_permiso`, `sesion` |

El repositorio hace la conversión snake_case ↔ camelCase. Nunca selecciona `contrasena_hash` salvo en la consulta del login.

## Migraciones

- `schema.sql` se reescribe completo (versión 2.0.0). `database/CAMBIOS.md` registra la versión 2.0.0, la relación entre las tablas v1 y las de 6.1, y las tablas `[Propuesta]` con su RF de origen.
- Las specs siguientes agregan `database/migrations/NNN_<descripcion>.sql` solo si cambian el esquema global.

## Datos semilla (`seed.sql`)

- 3 roles base (Administrador, Operador, Cliente; `es_base = TRUE`) y, para HU-03 y HU-05, 2 roles de ejemplo que no son base: «Supervisor de turno» (activo, con usuarios) y «Auditor» (inactivo, sin usuarios). Así hay al menos 5 roles, como pide la constitución §VI.
- Los 63 permisos y sus asignaciones.
- Usuarios de prueba, con la contraseña hasheada con bcrypt costo 10 (generada por `database/generar-seed.js`):
  - 1 administrador;
  - 2 operadores (uno con rol «Supervisor de turno»);
  - 3 clientes activos;
  - 1 cliente inactivo.
- Los consecutivos `ticket`, `factura`, `incidencia` y `reserva` en 1.
