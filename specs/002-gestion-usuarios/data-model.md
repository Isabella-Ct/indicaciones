# Modelo de datos — 002-gestion-usuarios

**Fuente**: SRS v2.0 §6.1 (4.2 *Usuario*, 4.14 *Notificacion*), `backend/database/schema.sql` v2.0.0 y [research.md](research.md). **La spec no cambia el esquema**: todas las tablas ya existen desde la fundación (spec 001).

## Tablas que usa

### `usuario` (6.1 *Usuario*) — lectura y escritura

| Columna | Tipo | Restricciones | Regla de la spec |
|---|---|---|---|
| id_usuario | INT UNSIGNED | PK, AUTO_INCREMENT | código del usuario, no se modifica (FR-002) |
| tipo_documento | ENUM('CC','CE','TI','PAS','NIT') | NOT NULL | FR-001 |
| numero_documento | VARCHAR(20) | NOT NULL; `UNIQUE (tipo_documento, numero_documento)`; `CHECK` solo dígitos salvo PAS | R-07 (5–20) |
| nombre_completo | VARCHAR(100) | NOT NULL; índice `idx_usuario_nombre` | R-07 (3–100, letras) |
| correo | VARCHAR(120) | NOT NULL; `UNIQUE` | R-07 (minúsculas) |
| celular | VARCHAR(10) | NOT NULL; `CHECK REGEXP '^3[0-9]{9}$'` | R-07 |
| foto_url | VARCHAR(255) | NULL | clave relativa `usuarios/<uuid>.<ext>` (R-03) |
| id_rol | INT UNSIGNED | FK → `rol` RESTRICT; índice `(id_rol, estado)` | rol activo al asignar (FR-006) |
| contrasena_hash | VARCHAR(255) | NOT NULL | bcrypt; nunca sale de la BD (FR-020) |
| debe_cambiar_contrasena | BOOLEAN | DEFAULT TRUE | TRUE al registrar (FR-005) |
| estado | ENUM('activo','inactivo') | DEFAULT 'activo' | FR-013 |
| acepta_tratamiento_datos | BOOLEAN | NOT NULL, `CHECK = TRUE` | Ley 1581 (FR-022) |
| fecha_autorizacion | DATETIME | NULL | hora del servidor al registrar |
| created_at, updated_at | DATETIME | auditoría | |

### `sesion` (spec 001) — escritura

`revocada_en = NOW()` en todas las sesiones abiertas del usuario al inactivarlo (R-06).

### `notificacion` (6.1 *Notificacion*) — escritura

| Columna | Valor al notificar un cambio de datos (R-09) |
|---|---|
| id_usuario | cada Administrador activo, salvo quien hizo el cambio |
| tipo | `'datos'` |
| titulo | «Actualización de datos personales» |
| mensaje | «<nombre> (código N) cambió: <campo> <anterior> → <nuevo>; …» (≤ 300) |
| canal | `'ambos'` |
| enviada | FALSE al insertar; TRUE si el correo sale |
| leida | FALSE |
| fecha | NOW() |

### `bitacora` (spec 001) — escritura

| Acción | `valor_anterior` / `valor_nuevo` |
|---|---|
| `crear` | — / datos del usuario sin contraseña (`{ tipoDocumento, numeroDocumento, nombreCompleto, correo, celular, idRol, estado }`) |
| `editar` | solo los campos que cambiaron (RF-USR-11), por ejemplo `{ celular: '3101000004', idRol: 3 }` → `{ celular: '3109998877', idRol: 4 }` |
| `editar_perfil` | igual que `editar`, cuando el cambio lo hace el propio usuario |
| `cambiar_estado` | `{ estado }` → `{ estado }` |

### Solo lectura

`rol` (nombre, estado, `es_base`), `vehiculo` (`id_propietario`) y `membresia` + `plan_membresia` (vigente) para el detalle (R-10).

## Estados del usuario

| Desde | Hacia | Condición | Efectos |
|---|---|---|---|
| (nuevo) | activo | datos válidos, documento y correo únicos, rol activo | contraseña temporal + correo + bitácora |
| activo | inactivo | actor ≠ usuario (RF-USR-14) | revoca sesiones + bitácora |
| inactivo | activo | siempre | bitácora |
| x | x (mismo estado) | sin cambios | ninguno |

Un usuario inactivo conserva todo su historial (RN-06). No existe borrado.

## Recurso de la API

`Usuario` (camelCase):

```text
{ idUsuario, tipoDocumento, numeroDocumento, nombreCompleto, correo, celular,
  fotoUrl,                 // '/api/v1/usuarios/{id}/foto' o null
  rol: { idRol, nombre },
  estado, debeCambiarContrasena, aceptaTratamientoDatos, fechaAutorizacion,
  createdAt, updatedAt }
```

- `UsuarioDetalle` = `Usuario` + `{ vehiculos: [{ idVehiculo, placa, tipo, marca, color, estado }], membresiaVigente: { idMembresia, plan, placa, fechaInicio, fechaFin } | null }`
- La respuesta del registro agrega `correoEnviado: boolean`.

Nunca se incluye `contrasena_hash`.

## Migraciones

Ninguna. `CAMBIOS.md` solo registra que la spec 002 no cambia el esquema.
