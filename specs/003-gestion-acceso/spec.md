# Especificación de la funcionalidad: Gestión de acceso

**Rama**: `003-gestion-acceso`

**Creada**: 2026-11-27

**Estado**: Borrador

**Entrada**: descripción de la usuaria: "003-gestion-acceso — Módulo Gestión de acceso del Sistema de Gestión de Parqueadero (Parking Lot ABC), según SRS v2.0 §4.3, Apéndice B.1 §4.3, modelo 6.1 §4.3 e historias HU-12..HU-16."

**Fuentes de verdad**: SRS v2.0 §4.3 (RF-ACC-01 … RF-ACC-13), §2.7 (supuesto del Cliente con contraseña, TBD-05), §5.3 (RNF-SEG-02, RNF-SEG-03, RNF-SEG-05, RNF-PRI-01), §5.5 (RN-06, RN-07, RN-08), Apéndice B.1 §4.3, modelo 6.1 §4.3 (*TokenRecuperacion*, *IntentoAcceso*); historias HU-12 … HU-16.

**Depende de**: `001-roles-permisos` (login mínimo, sesiones por `jti`) y `002-gestion-usuarios` (usuarios, contraseña temporal, correo). **La usan**: todas las specs, porque completan el acceso al sistema.

## Aclaraciones

### Sesión 2026-11-27

La usuaria indicó resolver cada pregunta según los documentos entregados. Cada respuesta cita su fuente.

- P: ¿Qué código y mensaje recibe un documento bloqueado por intentos fallidos? → R: 429 «Demasiados intentos. Intente en 15 minutos.» (código `CUENTA_BLOQUEADA`). Mientras dure el bloqueo se rechaza incluso la contraseña correcta. Cuentan los fallos de los últimos 15 minutos después del último ingreso exitoso de ese documento, y también los fallos de documentos que no existen (así no se revela si existen). *Fuente:* criterio 3 de HU-12, RN-07 y RNF-SEG-05. El prompt del plan proponía 423, pero la HU tiene más precedencia.
- P: ¿Qué puede hacer un usuario con contraseña temporal antes de cambiarla? → R: Solo cambiarla (`PUT /auth/contrasena`) o cerrar sesión. Cualquier otra operación responde 403 «Debe cambiar su contraseña antes de continuar» (`CAMBIO_CONTRASENA_REQUERIDO`), y la interfaz lo lleva a «Cambiar contraseña». Al cambiarla, el mismo token sigue sirviendo. *Fuente:* RF-ACC-04, criterio 4 de HU-12 y prompt §3.7.
- P: ¿Qué reglas tiene una contraseña nueva? → R: De 8 a 64 caracteres, con al menos una letra y un número, y confirmación igual. Aplica a cambiar, autorregistrarse y restablecer. En el cambio se exige la contraseña actual y la nueva debe ser distinta. *Fuente:* «Datos» de HU-12 y HU-14.
- P: ¿Con qué datos se pide la recuperación? → R: Tipo y número de documento (como en el inicio de sesión, porque el documento es único junto con su tipo). La respuesta siempre es 200 «Si el documento está registrado, recibirá un correo», exista o no, y aunque el usuario esté inactivo (a un usuario inactivo no se le envía correo). *Fuente:* criterio 1 de HU-15, RF-ACC-11 y RN-06.
- P: ¿Qué pasa con las sesiones abiertas al restablecer la contraseña? → R: Se revocan todas, porque quien pide recuperar la cuenta puede sospechar que otro la usa. También se invalidan los enlaces anteriores sin usar. *Fuente:* RF-ACC-12, RF-ACC-13 y RNF-SEG-03 (sesión revocable).
- P: ¿A dónde lleva el inicio de sesión mientras no existen las pantallas de Movimientos (spec 007) ni el panel del cliente (specs 004, 005 y 010)? → R: A la primera pantalla del menú que su rol puede abrir: Usuarios para el Operador y Mi perfil para el Cliente. Cada spec que construya esas pantallas actualiza el destino. *Fuente:* criterio 1 de HU-12, criterio 1 de HU-13 y constitución §VII (rebanadas verticales).

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Iniciar sesión como Administrador u Operador (Prioridad: P1) — HU-12

Como Administrador u Operador, quiero ingresar con mi número de documento y mi contraseña, para gestionar usuarios, vehículos y la operación según mi rol.

**Por qué esta prioridad**: sin acceso seguro no se usa nada del sistema. Completa el inicio de sesión mínimo de la spec 001 con el bloqueo por intentos y el cambio obligatorio de la contraseña temporal.

**Prueba independiente**: un Operador inicia sesión, recibe el token y entra a su primera pantalla. Con 5 contraseñas erradas, el sexto intento se bloquea. Un usuario con contraseña temporal solo puede cambiarla.

**Escenarios de aceptación**:

1. **Dado** que soy Operador activo con credenciales válidas, **cuando** ingreso documento y contraseña, **entonces** el sistema me autentica, entrega el token con mi rol y mis permisos y me lleva a la primera pantalla de mi menú. *(RF-ACC-01)*
2. **Dado** que ingreso una contraseña incorrecta o un documento que no existe, **cuando** confirmo, **entonces** el sistema responde «Documento o contraseña incorrectos» sin indicar cuál falló (401). *(RF-ACC-02)*
3. **Dado** que fallé 5 veces en 15 minutos, **cuando** intento de nuevo (aunque sea con la contraseña correcta), **entonces** el sistema responde «Demasiados intentos. Intente en 15 minutos» (429). Pasados 15 minutos puedo volver a intentar. *(RF-ACC-03, RN-07)*
4. **Dado** que es mi primer inicio de sesión con contraseña temporal, **cuando** me autentico, **entonces** el sistema me obliga a definir una nueva contraseña antes de continuar: cualquier otra operación responde 403 hasta que la cambie. *(RF-ACC-04)*
5. **Dado** que cambio mi contraseña con la actual correcta y una nueva válida y confirmada, **cuando** confirmo, **entonces** el sistema la guarda, deja de exigir el cambio y puedo seguir con mi sesión. Si la actual es incorrecta (401), la nueva no cumple las reglas, no coincide con la confirmación o es igual a la actual (422), el sistema no la cambia. *(RF-ACC-04)*

---

### Historia de usuario 2 - Iniciar sesión como Cliente (Prioridad: P1) — HU-13

Como Cliente, quiero ingresar con mi número de documento y mi contraseña, para ver las celdas disponibles, mis vehículos y mis datos.

**Por qué esta prioridad**: el cliente necesita acceder a su información y a sus reservas; además, la contraseña protege sus datos personales (RNF-PRI-02, TBD-05).

**Prueba independiente**: un Cliente inicia sesión, ve solo las opciones de su rol y, si intenta una ruta de administración, la API responde 403.

**Escenarios de aceptación**:

1. **Dado** que soy Cliente activo, **cuando** ingreso documento y contraseña válidos, **entonces** el sistema me lleva a mi panel y mi menú solo muestra las opciones de mi rol. *(RF-ACC-05, RF-ACC-06)*
2. **Dado** un documento que no corresponde a un usuario registrado, **cuando** intento ingresar, **entonces** el sistema responde «Documento o contraseña incorrectos» (401). *(RF-ACC-02)*
3. **Dado** que inicié sesión como Cliente, **cuando** intento abrir una ruta de administración (p. ej. /usuarios), **entonces** la API responde 403 y la interfaz me devuelve a mi panel. *(RF-ACC-06, RNF-SEG-04)*

---

### Historia de usuario 3 - Registrarme como cliente (Prioridad: P2) — HU-14

Como Visitante, quiero crear mi cuenta de cliente desde la página de inicio, para reservar celdas y consultar mis servicios sin pedirlo en la caseta.

**Por qué esta prioridad**: reduce el trabajo de la caseta. Mientras tanto, el Operador puede registrar clientes (spec 002).

**Prueba independiente**: un visitante se registra con contraseña y autorización de datos, y luego inicia sesión como Cliente. Se prueban también el documento ya registrado, la falta de autorización y las contraseñas que no coinciden.

**Escenarios de aceptación**:

1. **Dado** que diligencio tipo y número de documento, nombre, correo, celular y una contraseña válida con su confirmación, y acepto el tratamiento de datos, **cuando** confirmo, **entonces** el sistema crea mi cuenta con rol Cliente activo, sin exigirme cambiar la contraseña, y me permite iniciar sesión. *(RF-ACC-07, RF-ACC-08)*
2. **Dado** que mi documento ya está registrado (p. ej. me registró el operador), **cuando** intento registrarme, **entonces** el sistema responde «Ya existe una cuenta con este documento. Use Recuperar contraseña» (409). Si el correo ya existe: «El correo ya está registrado» (409). *(RF-ACC-07, RN-05)*
3. **Dado** que no acepto la autorización de tratamiento de datos, **cuando** intento confirmar, **entonces** el formulario no se envía y lo indica junto a la casilla. Si la petición llega igual al servidor, este la rechaza (422). *(RF-ACC-09, RNF-PRI-01)*
4. **Dado** que la contraseña no cumple las reglas o no coincide con la confirmación, **cuando** confirmo, **entonces** el sistema la rechaza junto al campo (422). *(RF-ACC-07)*
5. **Dado** que intento elegir otro rol en la petición, **cuando** envío, **entonces** el sistema la rechaza (422): el autorregistro siempre crea Clientes. *(RF-ACC-08)*

---

### Historia de usuario 4 - Recuperar mi contraseña (Prioridad: P1) — HU-15

Como usuario registrado, quiero restablecer mi contraseña mediante un enlace enviado a mi correo, para volver a ingresar sin depender del administrador.

**Por qué esta prioridad**: sin recuperación, cada olvido detiene al usuario y carga al administrador. El SRS la marca como Alta.

**Prueba independiente**: se pide recuperar con un documento existente y con uno inexistente: la respuesta es idéntica y solo el primero recibe el correo. Con el enlace se define una contraseña nueva; el enlace ya no sirve de nuevo, y uno vencido tampoco.

**Escenarios de aceptación**:

1. **Dado** que ingreso mi tipo y número de documento, **cuando** solicito recuperar la contraseña, **entonces** el sistema envía a mi correo registrado un enlace válido por 30 minutos y muestra «Si el documento está registrado, recibirá un correo». *(RF-ACC-10)*
2. **Dado** un documento que no existe (o de un usuario inactivo), **cuando** solicito recuperar, **entonces** el sistema responde exactamente lo mismo y no envía correo. *(RF-ACC-11, RN-06)*
3. **Dado** un enlace vigente, **cuando** defino una nueva contraseña válida y la confirmo, **entonces** el sistema la actualiza, invalida el enlace, cierra mis sesiones abiertas y me lleva al inicio de sesión, donde entro con la contraseña nueva. *(RF-ACC-12, RN-08)*
4. **Dado** un enlace vencido, ya usado, reemplazado por uno más nuevo o inventado, **cuando** intento usarlo, **entonces** el sistema responde «El enlace no es válido o expiró» (409) y ofrece solicitar uno nuevo. *(RF-ACC-12, RN-08)*

---

### Historia de usuario 5 - Cerrar sesión (Prioridad: P1) — HU-16

Como usuario autenticado, quiero cerrar mi sesión, para que nadie más use mi cuenta en el equipo de la caseta.

**Por qué esta prioridad**: la caseta es un equipo compartido, y el token debe dejar de servir de verdad.

**Prueba independiente**: se cierra la sesión y cualquier petición con el token anterior responde 401.

**Escenarios de aceptación**:

1. **Dado** que tengo una sesión activa, **cuando** selecciono Cerrar sesión, **entonces** el sistema elimina el token del navegador, lo invalida en el servidor y me lleva al inicio de sesión. *(RF-ACC-13)*
2. **Dado** que cerré sesión, **cuando** uso el botón Atrás del navegador, **entonces** no veo información protegida y la API responde 401 a cualquier petición con el token anterior. *(RF-ACC-13, RNF-SEG-03)*

---

### Casos borde

- **Bloqueo y documentos inexistentes**: los fallos se cuentan por número de documento aunque no exista; un atacante no distingue documentos existentes por el bloqueo.
- **Ingreso exitoso**: reinicia la cuenta de fallos de ese documento.
- **Límite por IP**: además del bloqueo por documento, el límite de peticiones por IP de la spec 001 sigue activo en el inicio de sesión, el registro y la recuperación (429 `DEMASIADAS_PETICIONES`).
- **Varias solicitudes de recuperación**: cada una invalida los enlaces anteriores sin usar; solo vale el último.
- **Token de recuperación**: solo se guarda su hash (SHA-256); el valor viaja únicamente en el correo.
- **Contraseña temporal y recuperación**: si un usuario con contraseña temporal la restablece por correo, ya no se le exige cambiarla de nuevo.
- **Cerrar sesión dos veces** o con un token ya revocado: 401 (ya no hay sesión).
- **Usuario que se inactiva con sesión abierta**: ya cubierto por la spec 002 (sesiones revocadas).

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Inicio de sesión (HU-12, HU-13)**

- **FR-001** (RF-ACC-01, RF-ACC-05): El sistema DEBE autenticar a todos los roles con tipo y número de documento y contraseña, y entregar un token JWT con su rol y permisos, válido por 8 horas.
- **FR-002** (RF-ACC-02): El sistema DEBE responder con un mensaje genérico cuando el documento no exista o la contraseña sea incorrecta.
- **FR-003** (RF-ACC-03, RN-07): El sistema DEBE bloquear durante 15 minutos un documento con 5 intentos fallidos en 15 minutos, registrar cada intento (documento, éxito, IP, fecha) y rechazar los intentos durante el bloqueo con 429.
- **FR-004** (RF-ACC-04): El sistema DEBE exigir el cambio de la contraseña temporal antes de permitir cualquier otra operación.
- **FR-005** (RF-ACC-04): El sistema DEBE permitir al usuario autenticado cambiar su contraseña con la actual, una nueva que cumpla las reglas (8–64 caracteres, al menos una letra y un número) y su confirmación.
- **FR-006** (RF-ACC-06): El sistema DEBE dirigir a cada usuario a la primera pantalla permitida para su rol y limitar su menú a las opciones de su rol; la API responde 403 a las demás.

**Autorregistro (HU-14)**

- **FR-007** (RF-ACC-07): El sistema DEBE permitir el autorregistro con los mismos datos obligatorios del registro de usuarios más una contraseña y su confirmación.
- **FR-008** (RF-ACC-08): El sistema DEBE asignar siempre el rol Cliente a las cuentas creadas por autorregistro.
- **FR-009** (RF-ACC-09, RNF-PRI-01): El sistema DEBE exigir la autorización de tratamiento de datos para crear la cuenta y guardar su fecha.

**Recuperación (HU-15)**

- **FR-010** (RF-ACC-10, RN-08): El sistema DEBE enviar al correo registrado un enlace de un solo uso con vigencia de 30 minutos.
- **FR-011** (RF-ACC-11): El sistema DEBE responder lo mismo exista o no el documento consultado.
- **FR-012** (RF-ACC-12): El sistema DEBE permitir definir una nueva contraseña con un enlace vigente, invalidarlo después de usarlo y cerrar las sesiones abiertas del usuario.

**Cierre de sesión (HU-16)**

- **FR-013** (RF-ACC-13): El sistema DEBE invalidar el token de la sesión al cerrarla y rechazar con 401 las peticiones posteriores con ese token.

**Transversales**

- **FR-014** (RNF-SEG-02): Las contraseñas y los tokens de recuperación DEBEN guardarse solo como hash (bcrypt y SHA-256) y nunca devolverse ni registrarse en la bitácora.
- **FR-015** (RNF-SEG-03): Inicio de sesión, autorregistro, recuperación y restablecimiento DEBEN ser públicos; el cambio de contraseña y el cierre de sesión exigen un token válido.
- **FR-016** (RNF-SEG-07): El sistema DEBE registrar en la bitácora el autorregistro, el cambio y el restablecimiento de contraseña (sin la contraseña).

### Entidades clave

- **Usuario** (spec 002): su contraseña (hash) y el indicador de cambio obligatorio.
- **Sesión** (spec 001): una por inicio de sesión (`jti`), que se revoca al cerrar sesión o al restablecer.
- **Intento de acceso** (6.1 *IntentoAcceso*): documento, éxito, IP y fecha de cada intento de inicio de sesión.
- **Token de recuperación** (6.1 *TokenRecuperacion*): hash del enlace, usuario, vencimiento (30 min) y si ya se usó.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El usuario inicia sesión en menos de 10 segundos desde que abre la pantalla.
- **SC-002**: El 100 % de las peticiones con un token cerrado, revocado o vencido responden 401.
- **SC-003**: Tras 5 fallos, el sexto intento se rechaza en el 100 % de los casos durante 15 minutos.
- **SC-004**: Las respuestas de recuperación son idénticas (estado y cuerpo) para documentos existentes e inexistentes.
- **SC-005**: Un usuario recupera su acceso por correo en menos de 3 minutos.
- **SC-006**: Cada escenario de aceptación de HU-12 a HU-16 tiene su prueba automatizada y su caso en la colección de pruebas (RNF-CAL-03).

## Supuestos

- **Enlace de recuperación**: `<URL_PUBLICA>/restablecer.html?token=<valor>`; `URL_PUBLICA` se configura en `.env` (por defecto `http://localhost:PORT`).
- **Correo**: el adaptador de la spec 002 (`smtp`, `archivo` o `memoria`).
- **Bloqueo**: no hay desbloqueo manual en esta versión; el bloqueo vence solo a los 15 minutos.
- **Pantalla inicial**: Usuarios (Operador y Administrador) o Mi perfil (Cliente) hasta que existan Movimientos y el panel del cliente (ver Aclaraciones).
- **Interfaz**: Inicio de sesión (con «¿Olvidó su contraseña?» y «Crear cuenta»), Cambiar contraseña, Registro de cliente, Recuperar contraseña, Restablecer contraseña y Cerrar sesión desde el menú de usuario.
