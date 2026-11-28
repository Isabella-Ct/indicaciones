# Modelo de datos — 003-gestion-acceso

**Fuente**: SRS v2.0 §6.1 (4.3 *TokenRecuperacion*, *IntentoAcceso*), `backend/database/schema.sql` v2.0.0 y [research.md](research.md). **Sin cambios de esquema**: las tablas existen desde la fundación (spec 001).

## Tablas que usa

### `intento_acceso` (6.1 *IntentoAcceso*) — escritura y lectura

| Columna | Tipo | Restricciones | Uso (research R-01) |
|---|---|---|---|
| id_intento | INT UNSIGNED | PK | — |
| numero_documento | VARCHAR(20) | NOT NULL; índice `(numero_documento, fecha)` | documento ya normalizado (sin puntos ni guiones) |
| exitoso | BOOLEAN | NOT NULL | TRUE en ingreso válido; FALSE en contraseña errada o documento inexistente |
| ip | VARCHAR(45) | NULL | IP del cliente (`req.ip`) |
| fecha | DATETIME | NOT NULL | hora del servidor (`NOW()`) |

Consulta del bloqueo:

```sql
SELECT COUNT(*) FROM intento_acceso
 WHERE numero_documento = ? AND exitoso = FALSE
   AND fecha > NOW() - INTERVAL 15 MINUTE
   AND fecha > COALESCE((SELECT MAX(fecha) FROM intento_acceso WHERE numero_documento = ? AND exitoso = TRUE), '1000-01-01')
```

Es un registro histórico: no se borra ni se actualiza.

### `token_recuperacion` (6.1 *TokenRecuperacion*) — escritura y lectura

| Columna | Tipo | Restricciones | Uso (research R-04) |
|---|---|---|---|
| id_token | INT UNSIGNED | PK | — |
| id_usuario | INT UNSIGNED | FK → usuario RESTRICT | dueño del enlace |
| token_hash | VARCHAR(255) | NOT NULL, UNIQUE | SHA-256 en hexadecimal del token del correo |
| expira_en | DATETIME | NOT NULL | `NOW() + INTERVAL 30 MINUTE` |
| usado | BOOLEAN | DEFAULT FALSE | TRUE al usarlo o al pedir uno nuevo |

Un token es **vigente** si `usado = FALSE` y `expira_en > NOW()`.

### `usuario` (spec 002) — escritura

- `contrasena_hash`: bcrypt de la nueva (cambio, restablecimiento y registro).
- `debe_cambiar_contrasena`: FALSE después de cambiar o restablecer; FALSE en el autorregistro.
- Autorregistro: `id_rol` = rol base Cliente; `acepta_tratamiento_datos = TRUE`, `fecha_autorizacion = NOW()`.

### `sesion` (spec 001) — escritura

`revocada_en = NOW()`: la sesión del token al cerrar sesión; todas las del usuario al restablecer la contraseña.

### `bitacora` (spec 001) — escritura

| Acción | Entidad | `valor_nuevo` |
|---|---|---|
| `autorregistro` | usuario | datos del usuario sin contraseña |
| `cambiar_contrasena` | usuario | `{ debeCambiarContrasena: false }` |
| `restablecer_contrasena` | usuario | `{ sesionesRevocadas: N }` |

Nunca se guarda la contraseña ni el token.

## Estados

**Token de recuperación**

| Estado | Paso a | Evento |
|---|---|---|
| vigente | usado | se restablece la contraseña |
| vigente | usado | se pide otro enlace (solo vale el último) |
| vigente | vencido | pasan 30 minutos (implícito por `expira_en`) |

**Documento (bloqueo)**

| Estado | Condición |
|---|---|
| libre | menos de 5 fallos en los últimos 15 min después del último éxito |
| bloqueado | 5 o más fallos en esa ventana; se libera solo cuando el quinto fallo tiene más de 15 min |

## Recurso de la API

- `Sesion` (spec 001): `{ token, expiraEn, usuario: { idUsuario, nombreCompleto, rol, debeCambiarContrasena }, permisos }`.
- `Usuario` (spec 002): respuesta del autorregistro.
- `{ mensaje }`: respuesta de recuperar.

## Migraciones

Ninguna.
