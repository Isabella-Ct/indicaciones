# Investigación — 002-gestion-usuarios

**Fecha**: 2026-11-27 · **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

Precedencia: rúbrica → constitución → SRS v2.0 → HU → spec → `CLAUDE.md`. Se reutiliza todo lo que dejó la spec 001: sobre de respuesta, errores, `authenticate`/`authorize`, `validate`, paginación, bitácora, `withTransaction`, `sesion` y los componentes por niveles de Atomic Design. Las decisiones de la 001 (R-01 … R-17) siguen vigentes.

---

## R-01 · Correo con nodemailer y transportes intercambiables

- **Decisión**: se agrega `nodemailer` (permitido por la constitución §VII) detrás del adaptador `backend/src/integrations/correo.js`, con `enviarCorreo({ para, asunto, texto })`. El transporte sale de `CORREO_TRANSPORTE`:
  - `smtp`: usa `SMTP_HOST`, `SMTP_PUERTO`, `SMTP_SEGURO`, `SMTP_USUARIO`, `SMTP_CLAVE` (constitución, tabla de configuración `SMTP_*`);
  - `archivo` (por defecto en desarrollo): guarda cada correo como `.eml` en `backend/correos/` (en `.gitignore`);
  - `memoria` (pruebas): guarda los correos en una bandeja que las pruebas leen.
- **Justificación**: RF-USR-05 y RF-USR-16 se verifican «en entorno de pruebas de correo». TBD-09 deja el SMTP sin definir, así que el sistema debe funcionar sin él. La rúbrica no acepta SMTP como API externa, pero sí como dependencia del sistema.
- **Alternativas descartadas**: Mailpit o Ethereal obligatorios (otro servicio que instalar o que depende de internet); no enviar correo (incumple RF-USR-05).

## R-02 · Contraseña temporal

- **Decisión**: 12 caracteres generados con `crypto.randomInt`, con al menos una mayúscula, una minúscula, un dígito y un símbolo, sin caracteres ambiguos (`0 O l 1 I`). Se guarda con bcrypt (`BCRYPT_COSTO`), se marca `debe_cambiar_contrasena = TRUE` y se envía por correo. Nunca va en la respuesta ni en la bitácora.
- **Justificación**: RF-USR-05 y RNF-SEG-02.
- **Si el correo falla**: el usuario se crea igual (el registro no depende del SMTP) y la respuesta trae `correoEnviado: false` para que la interfaz lo advierta. El reintento es de la spec 014 (RF-MON-07).

## R-03 · Foto con multer y almacenamiento privado

- **Decisión**: `multer` (ya justificado en el *Seguimiento de complejidad* de la spec 001) con `memoryStorage`, límite de 2 MB y un archivo. Se valida la **firma** del contenido (`FF D8 FF` en JPG, `89 50 4E 47` en PNG) y no solo el tipo declarado. Se guarda en `backend/uploads/usuarios/<uuid>.<ext>` (fuera de `frontend/`, ya en `.gitignore`) y en `usuario.foto_url` va la clave relativa `usuarios/<uuid>.<ext>`. Se entrega con `GET /api/v1/usuarios/:id/foto` `[Propuesta]` con autenticación. Al reemplazarla o quitarla se borra el archivo anterior **después** del commit.
- **Errores**: archivo de más de 2 MB → 422 `{ campo: 'foto', mensaje: 'La foto supera 2 MB.' }`; tipo inválido → 422 «La foto debe ser JPG o PNG.».
- **Justificación**: RNF-PRI-03, RF-USR-01 y prompt §3.7 (nombre aleatorio, fuera de la carpeta pública, endpoint autenticado).

## R-04 · Cuerpo JSON o multipart en los mismos endpoints

- **Decisión**: `POST /usuarios`, `PUT /usuarios/:id` y `PUT /usuarios/me` aceptan `application/json` **o** `multipart/form-data`. El middleware `subirFoto` corre antes de `validate`; los validadores zod usan `z.preprocess` para convertir los textos del multipart (`"true"` → `true`, `"3"` → `3`).
- **Justificación**: B.1 no tiene endpoint de foto (aclaración 3 de la spec) y el JSON sigue sirviendo para Postman y para los clientes sin foto.

## R-05 · Usuario inactivo en el login (HU-10 E2)

- **Decisión**: `auth.service.iniciarSesion` compara primero la contraseña. Si no coincide → 401 `CREDENCIALES_INVALIDAS` (genérico). Si coincide y el usuario está inactivo → 401 `USUARIO_INACTIVO` «Usuario inactivo. Comuníquese con el administrador».
- **Contradicción registrada**: RF-ACC-02 (mensaje genérico) frente al criterio 2 de HU-10 (mensaje específico). Se resuelve en la aclaración 1 de la spec: el mensaje específico solo se da a quien conoce la contraseña, así que no permite enumerar documentos.
- **Impacto en la 001**: la prueba `auth-login` «mismo mensaje para documento inexistente y usuario inactivo» y el caso Postman `401 usuario inactivo` se actualizan al nuevo código.

## R-06 · Revocación de sesiones al inactivar (RF-USR-13)

- **Decisión**: dentro de la transacción del cambio de estado se ejecuta `UPDATE sesion SET revocada_en = NOW() WHERE id_usuario = ? AND revocada_en IS NULL`. Además, `authenticate` ya rechaza a los usuarios inactivos (spec 001), así que la protección es doble.

## R-07 · Normalización y validación de los datos

| Campo | Regla (spec › Casos borde, HU-07 «Datos») |
|---|---|
| `tipoDocumento` | CC, CE, TI, PAS, NIT |
| `numeroDocumento` | se quitan espacios, puntos y guiones; 5–20 dígitos (PAS: 5–20 letras o dígitos, en mayúsculas) |
| `nombreCompleto` | se recortan los extremos y se unifican los espacios internos; 3–100; solo letras (con tildes y ñ), espacios, `'` y `-` |
| `correo` | minúsculas y sin espacios extremos; formato válido; ≤ 120 |
| `celular` | se quitan espacios y guiones; 10 dígitos, empieza por 3 |
| `idRol` | entero; el rol debe existir y estar activo (RF-ROL-14) |
| `aceptaTratamientoDatos` | obligatorio y `true` al registrar (RNF-PRI-01) |

Las funciones puras `normalizarDocumento`, `normalizarNombre`, `normalizarCorreo`, `normalizarCelular`, `generarContrasenaTemporal` y `diferencias(anterior, nuevo)` van en `usuarios.reglas.js`, con pruebas unitarias.

## R-08 · Alcance del Operador (RF-USR-04, RF-USR-08)

- **Decisión**: el servicio recibe el actor con sus permisos. Si el actor no tiene `usuarios.editar` (permiso del Administrador en el seed), su **alcance** se limita a usuarios con el rol base Cliente:
  - el listado fuerza el filtro al rol Cliente;
  - el detalle o la foto de un usuario que no es Cliente → 403;
  - el registro con un rol que no es Cliente → 403.
- **Justificación**: el criterio se basa en permisos y no en el nombre del rol del actor, así sirve también para roles nuevos como «Supervisor de turno».
- **Rol por defecto del Operador**: el Operador no tiene `roles.ver` (criterio 2 de HU-01), así que su formulario no puede consultar el id del rol Cliente. En `POST /usuarios`, `idRol` es **opcional** para quien no tiene alcance total y el servidor asigna Cliente; si lo envía con otro rol → 403. Para el Administrador, `idRol` sigue siendo obligatorio (422 si falta). No hace falta un endpoint nuevo.

## R-09 · Aviso al Administrador (RF-USR-16)

- **Decisión**: `PUT /usuarios/me` calcula las diferencias entre los valores guardados y los nuevos (nombre, correo, celular, foto). Si hay cambios, en la misma transacción:
  - escribe la bitácora;
  - inserta una `notificacion` (`tipo = 'datos'`, `canal = 'ambos'`) para cada usuario **activo** con el rol base Administrador, con el título «Actualización de datos personales» y el mensaje «<nombre> (código N) cambió: celular 3101000004 → 3109998877; …».

  Después del commit envía el correo y marca `enviada = TRUE`. Si el que edita es un Administrador, no se notifica a sí mismo.
- **Justificación**: RF-USR-16 y criterio 2 de HU-11. La bandeja la construye la spec 014.

## R-10 · Detalle con vehículos y membresía (RF-USR-07)

- **Decisión**: `GET /usuarios/:id` agrega:
  - `vehiculos`: `id_vehiculo, placa, tipo, marca, color, estado` del `vehiculo` con `id_propietario`;
  - `membresiaVigente`: la `membresia` con `estado = 'activa'` y `fecha_fin >= CURDATE()`, con el nombre del plan, o `null`.

  Hasta las specs 005 y 010 estas tablas están vacías y el detalle muestra listas vacías.

## R-11 · Frontend: Atomic Design y archivos con token

- **Decisión**: la foto se pide con `fetch` y `Authorization: Bearer` (un `<img src>` no envía el token). `js/api/http.js` agrega:
  - `solicitarArchivo(ruta)`, que devuelve un `Blob`; el átomo `atom-avatar` lo muestra con `URL.createObjectURL`;
  - el envío de `FormData` sin `Content-Type` manual.

  Componentes nuevos por nivel:
  - átomo `atomos/avatar.js` (`atom-avatar`: foto o iniciales);
  - molécula `moleculas/foto.js` (`molecule-photo-input`: vista previa y validación de 2 MB JPG/PNG).

  Las páginas nuevas `usuarios.html`, `usuario-detalle.html` y `mi-perfil.html` siguen el marco de la 001.
- **Menú**: se agregan «Usuarios» (`usuarios.ver`) y «Mi perfil» (`perfil.ver`); el menú de usuario agrega «Mi perfil». `paginaInicial` lleva al Operador a Usuarios y al Cliente a Mi perfil.

## R-12 · Dependencias

| Dependencia | Decisión |
|---|---|
| `nodemailer` | Se agrega. Está permitida por la constitución §VII, así que no requiere justificación. |
| `multer` | Ya está, justificada en la spec 001 (*Seguimiento de complejidad*). |

## Contradicciones entre fuentes

| # | Fuentes | Resolución |
|---|---|---|
| C-01 | RF-ACC-02 frente al criterio 2 de HU-10 | R-05: mensaje específico solo cuando la contraseña es correcta |
| C-02 | Criterio 4 de HU-07 («foto… lo rechaza con el motivo») frente a B.1 (sin endpoint de foto) | R-03/R-04: multipart en los mismos endpoints + `GET /usuarios/:id/foto` `[Propuesta]` |
| C-03 | Modelo 6.1 *Notificacion* («Mensaje a un cliente») frente a RF-USR-16 (aviso al Administrador) | Se usa la misma tabla con `tipo = 'datos'` para cualquier usuario destinatario |

## Cambios pendientes de reflejar en el SRS

- Apéndice B.1: agregar `GET /api/v1/usuarios/:id/foto` y documentar `multipart/form-data` en los endpoints de usuarios.
- Modelo 6.1 *Notificacion*: «mensaje a un usuario» (no solo a clientes).

## [NEEDS CLARIFICATION] pendientes

Ninguno.
