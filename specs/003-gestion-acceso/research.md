# Investigación — 003-gestion-acceso

**Fecha**: 2026-11-27 · **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

Precedencia: rúbrica → constitución → SRS v2.0 → HU → spec → `CLAUDE.md`. Se completa el módulo `auth` que la spec 001 dejó con un inicio de sesión mínimo, y se reutilizan el adaptador de correo, las reglas de normalización y los validadores de la spec 002.

---

## R-01 · Bloqueo por intentos fallidos (RN-07)

- **Decisión**: cada intento de inicio de sesión (documento con formato válido) se registra en `intento_acceso` (`numero_documento`, `exitoso`, `ip`, `fecha = NOW()`). Antes de comparar la contraseña se cuentan los fallos del documento en los **últimos 15 minutos posteriores a su último éxito**; si son ≥ 5, responde **429 `CUENTA_BLOQUEADA`** «Demasiados intentos. Intente en 15 minutos.» sin comparar ni registrar. El quinto fallo todavía responde 401; el bloqueo empieza en el sexto intento (criterio 3 de HU-12). Los fallos de documentos que no existen también cuentan.
- **Valores**: `LOGIN_MAX_FALLIDOS = 5` y `LOGIN_VENTANA_MIN = 15` en `config/constantes.js` (RN-07 los fija; no son configurables).
- **Contradicción registrada**: el prompt (§3.6) proponía **423** para un documento bloqueado; HU-12 E3 dice **429**. Prevalece la HU.
- **Alternativas descartadas**: un contador en memoria (se pierde al reiniciar y no sirve con varias instancias); bloquear por IP (ya lo hace `express-rate-limit`).

## R-02 · Cambio obligatorio de la contraseña temporal (RF-ACC-04)

- **Decisión**: `authenticate` lee `usuario.debe_cambiar_contrasena` en la misma consulta de la sesión. Si es verdadero, solo dejan pasar las rutas montadas con `authenticate.permitirCambioPendiente` (`PUT /auth/contrasena` y `POST /auth/logout`); el resto responde **403 `CAMBIO_CONTRASENA_REQUERIDO`** «Debe cambiar su contraseña antes de continuar.». Al cambiarla, el indicador pasa a falso y el mismo token sigue sirviendo, sin volver a iniciar sesión.
- **Justificación**: el prompt §3.7 pide «sin acceso a ningún otro endpoint hasta cambiarla». Leer el valor en cada petición (no en el token) hace que el cambio aplique de inmediato.

## R-03 · Reglas de contraseña

- **Decisión**: el esquema zod `contrasenaNueva` exige 8–64 caracteres, al menos una letra (`\p{L}`) y un dígito, y que la confirmación coincida (`refine` con el campo `confirmacion`). En el cambio también se exige que la nueva sea distinta de la actual (se verifica con bcrypt en el servicio). Las contraseñas temporales de la spec 002 ya cumplen estas reglas.

## R-04 · Recuperación con token de un solo uso (RN-08)

- **Decisión**: `POST /auth/recuperar` recibe `{ tipoDocumento, numeroDocumento }` y siempre responde **200** `{ mensaje: 'Si el documento está registrado, recibirá un correo.' }`. Si el usuario existe y está activo:
  1. se generan 32 bytes con `crypto.randomBytes` (64 en hexadecimal);
  2. se guarda **solo** `sha256(token)` en `token_recuperacion.token_hash`, con `expira_en = NOW() + 30 min`;
  3. se marcan como usados los tokens anteriores sin usar de ese usuario (solo vale el último);
  4. después del commit se envía el correo con `URL_PUBLICA/restablecer.html?token=<token>`.

  `POST /auth/restablecer` recibe `{ token, contrasenaNueva, confirmacion }`. Busca por hash un token vigente y no usado con `FOR UPDATE`; si no existe → **409 `ENLACE_INVALIDO`** «El enlace no es válido o expiró.». Si existe, en una transacción: guarda el nuevo hash bcrypt, deja `debe_cambiar_contrasena = FALSE`, marca el token como usado, revoca todas las sesiones del usuario y escribe la bitácora.
- **Tiempo de respuesta**: para no delatar si el documento existe por la demora, el correo se envía sin esperar la respuesta (`setImmediate`) y la consulta es la misma en los dos casos.
- **Alternativas descartadas**: un JWT como token de recuperación (no se puede invalidar después de usarlo sin guardar estado, y RN-08 exige un solo uso).

## R-05 · Autorregistro (RF-ACC-07/08/09)

- **Decisión**: `POST /auth/registro`, público y con el límite por IP. Reutiliza los campos y las normalizaciones de `usuarios.validator` (spec 002) más `contrasena` y `confirmacion`; el esquema es estricto, así que no acepta `idRol` (422). El rol es siempre el base Cliente, `debe_cambiar_contrasena = FALSE` (la contraseña la eligió el titular) y `acepta_tratamiento_datos = TRUE` con `fecha_autorizacion = NOW()`. Si el documento está duplicado → 409 `CUENTA_EXISTENTE` «Ya existe una cuenta con este documento. Use Recuperar contraseña.»; si el correo está duplicado → 409 `CORREO_DUPLICADO`. Responde 201 con el usuario (sin token): la interfaz lo envía al inicio de sesión. La bitácora registra `accion = 'autorregistro'` con `id_usuario` = el usuario nuevo.
- **Reutilización**: `usuarios.repository.insertar` acepta `debeCambiarContrasena` (antes era siempre TRUE).

## R-06 · Cierre de sesión (RF-ACC-13)

- **Decisión**: `POST /auth/logout` (con `authenticate.permitirCambioPendiente`) marca `sesion.revocada_en = NOW()` para el `jti` del token y responde **204**. Un segundo cierre con el mismo token → 401, porque la sesión ya no es vigente.
- **Frontend**: cada página pasa `alSalir: cerrarSesion` (servicio que llama a `/auth/logout` y borra `sessionStorage`) a la plantilla `marco-app`, que no llama a la API (Atomic Design). Si el navegador restaura la página desde la caché al volver atrás (`pageshow` con `persisted`) y ya no hay sesión, la plantilla redirige al inicio de sesión (criterio 2 de HU-16).

## R-07 · Destino después del inicio de sesión y ruta no permitida (RF-ACC-06)

- **Decisión**: si la sesión tiene `debeCambiarContrasena`, va a `cambiar-contrasena.html`. Si no, va a `paginaInicial(permisos)` (primer ítem del menú que puede ver). Si una página exige un permiso que la sesión no tiene, `marco-app` redirige a `paginaInicial` (criterio 3 de HU-13) en lugar de mostrar el aviso de la spec 001.

## R-08 · Variables de entorno

| Variable | Uso | Valor por defecto |
|---|---|---|
| `URL_PUBLICA` | base de los enlaces de recuperación | `http://localhost:<PORT>` |

## Contradicciones entre fuentes

| # | Fuentes | Resolución |
|---|---|---|
| C-01 | Prompt §3.6 (423 para un documento bloqueado) frente a HU-12 E3 (429) | HU: 429 (R-01) |
| C-02 | Prompt D-01 (Cliente sin contraseña) frente a RF-ACC-05, HU-13 y TBD-05 | SRS: el Cliente usa contraseña (igual que en la spec 001) |
| C-03 | Prompt (recuperación solo para Administrador y Operador por D-01) frente a SRS §2.7 (recuperación para todos) | SRS: todos los usuarios |
| C-04 | HU-12 E1 («me lleva a Movimientos») frente a la spec 007 aún no construida | Aclaración 6 de la spec: primera pantalla del menú |

## [NEEDS CLARIFICATION] pendientes

Ninguno.
