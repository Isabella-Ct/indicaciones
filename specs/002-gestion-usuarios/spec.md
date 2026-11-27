# Especificación de la funcionalidad: Gestión de usuarios

**Rama**: `002-gestion-usuarios`

**Creada**: 2026-11-27

**Estado**: Borrador

**Entrada**: descripción de la usuaria: "002-gestion-usuarios — Módulo Gestión de usuarios del Sistema de Gestión de Parqueadero (Parking Lot ABC), según SRS v2.0 §4.2, Apéndice B.1 §4.2, modelo 6.1 §4.2 e historias HU-07..HU-11."

**Fuentes de verdad**: SRS v2.0 §4.2 (RF-USR-01 … RF-USR-17), §5.3 (RNF-SEG-02, RNF-SEG-04, RNF-SEG-07, RNF-PRI-01, RNF-PRI-02, RNF-PRI-03), §5.5 (RN-02, RN-05, RN-06), Apéndice B.1 §4.2, modelo 6.1 §4.2; historias HU-07 … HU-11.

**Depende de**: `001-roles-permisos` (roles, permisos, bitácora, login mínimo). **La usan**: `003-gestion-acceso` (contraseña temporal, cambio obligatorio), `005-vehiculos` (propietario), `010-membresias`, `012-reservas`, `014-monitoreo-alertas` (bandeja de notificaciones).

## Aclaraciones

### Sesión 2026-11-27

La usuaria indicó resolver cada pregunta según los documentos entregados. Cada respuesta cita su fuente.

- P: ¿Qué mensaje recibe un usuario inactivo que intenta iniciar sesión? → R: Si la contraseña es incorrecta, el mensaje genérico de siempre. Si es correcta y el usuario está inactivo, «Usuario inactivo. Comuníquese con el administrador» (401). Así se cumplen los dos requisitos sin revelar si un documento existe a quien no conoce la contraseña. *Fuente:* criterio 2 de HU-10, RF-ACC-02 y RN-06.
- P: ¿Cómo se entrega la contraseña temporal del usuario creado? → R: El sistema la genera (12 caracteres con mayúscula, minúscula, dígito y símbolo), la envía al correo del usuario y marca que debe cambiarla en el primer inicio de sesión. Nunca la devuelve en la respuesta de la API. Mientras no exista el SMTP institucional (TBD-09), en desarrollo el correo queda como archivo `.eml` y en pruebas se captura en memoria («entorno de pruebas de correo» del SRS). *Fuente:* RF-USR-05, RNF-SEG-02, TBD-09 y constitución §VII (permite `nodemailer`).
- P: ¿Cómo se carga la fotografía si el Apéndice B.1 no tiene un endpoint para ella? → R: Como un campo `foto` opcional en `multipart/form-data` en los mismos endpoints de registro y actualización (`POST /usuarios`, `PUT /usuarios/:id`, `PUT /usuarios/me`). Se guarda fuera de la carpeta pública con un nombre aleatorio y se consulta con un endpoint autenticado `[Propuesta]` (`GET /usuarios/:id/foto`). *Fuente:* RF-USR-01, RNF-PRI-03 y prompt §3.7.
- P: ¿Cómo se avisa al Administrador de los cambios que un usuario hace en sus propios datos? → R: Con una notificación interna por cada Administrador activo (tipo «datos», con el valor anterior y el nuevo de cada campo cambiado) y un correo con el mismo contenido. La bandeja para leerlas es de la spec 014. *Fuente:* RF-USR-16, criterio 2 de HU-11 y modelo 6.1 (*Notificacion*, tipo `datos`).
- P: ¿Qué recibe el Operador cuando consulta o pide crear un usuario que no es Cliente? → R: 403 «No tiene permiso para esta acción». En el listado, el filtro de rol queda fijo en Cliente aunque la petición pida otro. *Fuente:* RF-USR-04, RF-USR-08, criterio 5 de HU-07 y criterio 4 de HU-08.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Registrar un usuario (Prioridad: P1) — HU-07

Como Administrador u Operador, quiero registrar un usuario nuevo con sus datos de identificación y su rol, para darle acceso al sistema y poder asociarle vehículos.

**Por qué esta prioridad**: sin usuarios registrados no hay propietarios de vehículos, ni clientes con membresía o reservas, ni empleados. Es la base de las specs 003, 005, 010 y 012.

**Prueba independiente**: un Administrador registra un Cliente con todos los datos y su foto. El usuario queda activo con un código asignado y recibe un correo con la contraseña temporal. Después se prueban el documento repetido, los campos inválidos, la foto inválida y un Operador que intenta crear a alguien que no es Cliente.

**Escenarios de aceptación**:

1. **Dado** que ingreso tipo y número de documento, nombre completo, correo y celular válidos, selecciono el rol Cliente y marco la autorización de datos, **cuando** confirmo, **entonces** el sistema crea el usuario activo, le asigna un código único autoincremental, envía una contraseña temporal a su correo, exige cambiarla en el primer inicio de sesión y muestra «Usuario registrado — código N». *(RF-USR-01, RF-USR-02, RF-USR-05)*
2. **Dado** que ya existe un usuario con el documento CC 1020304050, **cuando** intento registrar otro con el mismo tipo y número, **entonces** el sistema rechaza el registro con «El documento ya está registrado» (409). Lo mismo con el correo: «El correo ya está registrado» (409). *(RF-USR-03, RN-05)*
3. **Dado** que dejo vacío algún campo obligatorio, el correo no tiene un formato válido, el celular no tiene 10 dígitos que inicien en 3, o no marco la autorización de tratamiento de datos, **cuando** intento guardar, **entonces** el sistema señala cada campo con su error y no crea el usuario (422). *(RF-USR-01, RNF-PRI-01)*
4. **Dado** que adjunto una fotografía PNG de 1 MB, **cuando** confirmo, **entonces** el sistema la guarda y la muestra en el detalle. Si el archivo supera 2 MB o no es JPG/PNG, el sistema lo rechaza con el motivo (422) y no crea el usuario. *(RF-USR-01, RNF-PRI-03)*
5. **Dado** que soy Operador, **cuando** registro un usuario, **entonces** solo puedo asignarle el rol Cliente. Si la petición trae otro rol, el sistema responde 403. *(RF-USR-04)*
6. **Dado** un rol inactivo o inexistente, **cuando** intento asignarlo a un usuario nuevo, **entonces** el sistema rechaza el registro (422) indicando el campo rol. *(RF-ROL-14)*

---

### Historia de usuario 2 - Consultar y buscar usuarios (Prioridad: P1) — HU-08

Como Administrador u Operador, quiero buscar usuarios por documento, nombre o correo y ver su detalle, para verificar si un cliente ya está registrado antes de crearlo o de asociarle un vehículo.

**Por qué esta prioridad**: la caseta necesita comprobar si una persona ya existe antes de registrarla o de asociarle un vehículo.

**Prueba independiente**: con los usuarios semilla se busca por documento, nombre y correo, se filtra por rol y estado, y se abre un detalle. Como Operador solo aparecen Clientes.

**Escenarios de aceptación**:

1. **Dado** que existen usuarios, **cuando** abro Usuarios, **entonces** veo una tabla paginada (10 por página) con código, documento, nombre, correo, celular, rol y estado. *(RF-USR-06)*
2. **Dado** el listado, **cuando** busco «1000000004», «salcedo» o «andrea.salcedo@», **entonces** el sistema muestra los usuarios cuyo documento, nombre o correo contienen ese texto. Si no hay coincidencias, muestra «No se encontraron usuarios». *(RF-USR-06)*
3. **Dado** el listado, **cuando** filtro por rol y por estado, **entonces** solo veo los usuarios que cumplen ambos filtros. *(RF-USR-06)*
4. **Dado** un usuario, **cuando** abro su detalle, **entonces** veo sus datos, su foto, sus vehículos asociados y su membresía vigente, sin mostrar nunca la contraseña ni datos de autenticación. *(RF-USR-07, RNF-SEG-02)*
5. **Dado** que soy Operador, **cuando** consulto el listado (con o sin filtro de rol), **entonces** solo veo usuarios con rol Cliente; si abro el detalle de un Administrador u Operador, el sistema responde 403. *(RF-USR-08, RNF-PRI-02)*
6. **Dado** un código de usuario que no existe, **cuando** consulto su detalle, **entonces** el sistema responde «Usuario no encontrado» (404).

---

### Historia de usuario 3 - Actualizar los datos de cualquier usuario (Prioridad: P2) — HU-09

Como Administrador, quiero corregir o modificar la información de cualquier usuario, para mantener correctos los datos de contacto e identificación.

**Por qué esta prioridad**: corrige errores de registro. El sistema es usable sin esto, pero con más trabajo manual.

**Prueba independiente**: el Administrador cambia el celular y el rol de un Cliente, y el cambio queda en la bitácora con el valor anterior y el nuevo. Después se prueban el correo duplicado y un Operador que intenta editar.

**Escenarios de aceptación**:

1. **Dado** un usuario existente, **cuando** cambio su celular y su rol y confirmo, **entonces** el sistema guarda los cambios, registra en la bitácora el valor anterior y el nuevo de cada dato modificado y muestra «Usuario actualizado». *(RF-USR-09, RF-USR-11)*
2. **Dado** que cambio el correo por uno que ya usa otro usuario, **cuando** confirmo, **entonces** el sistema rechaza el cambio con «El correo ya está registrado» (409). Lo mismo con un documento duplicado. *(RF-USR-10)*
3. **Dado** que soy Operador o Cliente, **cuando** intento editar los datos de otro usuario, **entonces** el sistema responde 403. *(RF-USR-09, RN-02)*
4. **Dado** un usuario, **cuando** abro el formulario de edición, **entonces** el código del usuario aparece como dato de solo lectura, y si la petición intenta cambiarlo, el sistema la rechaza (422). *(RF-USR-02, RN-05)*
5. **Dado** un código de usuario que no existe, **cuando** intento actualizarlo, **entonces** el sistema responde 404.

---

### Historia de usuario 4 - Activar o inactivar un usuario (Prioridad: P1) — HU-10

Como Administrador, quiero cambiar el estado de un usuario entre activo e inactivo, para controlar quién tiene acceso al sistema.

**Por qué esta prioridad**: es el control de acceso más directo: retirar a un empleado o a un cliente sin borrar su historial.

**Prueba independiente**: se inactiva un Cliente con sesión abierta; su token deja de servir y no puede volver a entrar. Al activarlo, entra de nuevo. Se prueban también el Operador sin permiso y el Administrador que intenta inactivarse a sí mismo.

**Escenarios de aceptación**:

1. **Dado** un usuario activo, **cuando** lo inactivo y confirmo en el diálogo, **entonces** el sistema cambia su estado a inactivo, invalida sus sesiones abiertas, lo registra en la bitácora y muestra «Estado actualizado». *(RF-USR-12, RF-USR-13, RNF-SEG-07)*
2. **Dado** un usuario inactivo, **cuando** intenta iniciar sesión con su contraseña correcta, **entonces** el sistema rechaza el acceso con «Usuario inactivo. Comuníquese con el administrador» (401). *(RF-USR-13, RN-06)*
3. **Dado** un usuario inactivo, **cuando** lo activo, **entonces** puede volver a iniciar sesión con sus credenciales. *(RF-USR-12)*
4. **Dado** que soy Operador o Cliente, **cuando** intento cambiar el estado de un usuario, **entonces** el sistema responde 403. *(RF-USR-12, RN-02)*
5. **Dado** que soy Administrador, **cuando** intento inactivar mi propia cuenta, **entonces** el sistema lo impide con «No puede inactivar su propia cuenta» (409). *(RF-USR-14)*
6. **Dado** un usuario inactivo, **cuando** consulto su historial, **entonces** conserva sus datos y sus relaciones (no se borra). *(RN-06)*

---

### Historia de usuario 5 - Actualizar mis datos personales (Prioridad: P2) — HU-11

Como Cliente (usuario registrado), quiero actualizar mis datos de contacto desde mi cuenta, para mantener mi información correcta en el sistema.

**Por qué esta prioridad**: da autonomía al cliente y reduce el trabajo de la caseta. No bloquea la operación.

**Prueba independiente**: un Cliente abre Mi perfil, cambia su celular, y cada Administrador activo recibe una notificación y un correo con el valor anterior y el nuevo. Se prueba también que no pueda cambiar su documento ni los datos de otra cuenta.

**Escenarios de aceptación**:

1. **Dado** que inicié sesión como Cliente, **cuando** abro Mi perfil, **entonces** veo mis datos y puedo editar nombre, correo, celular y foto; documento, código y rol son de solo lectura. *(RF-USR-15, RF-USR-17)*
2. **Dado** que cambio mi celular y confirmo, **entonces** el sistema guarda el cambio, lo registra en la bitácora y envía a cada Administrador activo una notificación y un correo con el dato anterior y el nuevo. *(RF-USR-15, RF-USR-16)*
3. **Dado** que ingreso un correo con formato inválido o uno que ya usa otra cuenta, **cuando** confirmo, **entonces** el sistema muestra el error junto al campo y no guarda (422 o 409). *(RF-USR-15, RF-USR-10)*
4. **Dado** que intento modificar los datos de otro usuario cambiando el id en la petición (`PUT /usuarios/:id`), **cuando** envío, **entonces** el sistema responde 403. *(RF-USR-17, RNF-PRI-02)*
5. **Dado** que envío en Mi perfil el documento, el rol, el estado o el código, **cuando** confirmo, **entonces** el sistema rechaza la petición (422) y no cambia nada. *(RF-USR-17)*
6. **Dado** que no cambio ningún dato, **cuando** confirmo, **entonces** el sistema responde sin cambios y no notifica a nadie.

---

### Casos borde

- **Documento con formato**: el número se guarda sin espacios, puntos ni guiones. Solo admite dígitos (5–20), salvo PAS, que admite letras y dígitos. El tipo y el número juntos son únicos.
- **Correo en mayúsculas**: se guarda en minúsculas y sin espacios extremos; `ANDREA@CORREO.CO` choca con `andrea@correo.co`.
- **Nombre**: se recortan los espacios extremos y se unifican los internos; solo letras (con tildes y ñ), espacios, apóstrofos y guiones; de 3 a 100 caracteres.
- **Carrera de duplicados**: dos registros simultáneos con el mismo documento o correo: el segundo recibe 409 (garantizado por `UNIQUE` en la BD).
- **Foto**: se valida el contenido del archivo (firma JPG/PNG), no solo la extensión. Al reemplazar la foto se elimina el archivo anterior. Sin foto, el detalle muestra las iniciales.
- **Correo que no sale**: si el envío falla, el usuario se crea igual y la respuesta advierte que el correo no se envió (`correoEnviado: false`). El reintento automático es de la spec 014 (RF-MON-07).
- **Rol que se inactiva mientras se asigna**: el rol se bloquea durante la transacción de registro y edición (nota de la spec 001).
- **Inactivar al último Administrador activo**: queda cubierto por RF-USR-14 cuando hay un solo Administrador. Si hay varios, se permite inactivar a otro Administrador.
- **Cambio de estado sin efecto**: activar un usuario activo responde 200 sin modificar nada ni escribir en la bitácora.
- **Paginación**: `limit` > 100 → 422; `page` fuera de rango → lista vacía con el total real.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Registro (HU-07)**

- **FR-001** (RF-USR-01): El sistema DEBE permitir al Administrador y al Operador registrar usuarios con tipo de documento (CC, CE, TI, PAS, NIT), número de documento, nombre completo, correo y celular como datos obligatorios, fotografía opcional, rol y la autorización de tratamiento de datos (Ley 1581) con su fecha.
- **FR-002** (RF-USR-02, RN-05): El sistema DEBE asignar a cada usuario un código único autoincremental que no se puede modificar.
- **FR-003** (RF-USR-03, RN-05): El sistema DEBE rechazar el registro cuando el documento (tipo + número) o el correo ya existan, indicando cuál.
- **FR-004** (RF-USR-04): El sistema DEBE restringir al Operador a registrar usuarios con rol Cliente (403 si pide otro).
- **FR-005** (RF-USR-05): El sistema DEBE generar una contraseña temporal segura para el usuario creado, enviarla a su correo y exigir que la cambie en el primer inicio de sesión. Nunca la devuelve en la respuesta.
- **FR-006** (RF-ROL-14): El sistema DEBE aceptar solo roles activos al registrar o editar un usuario.

**Consulta (HU-08)**

- **FR-007** (RF-USR-06): El sistema DEBE listar usuarios con paginación, búsqueda por documento, nombre o correo, y filtros por rol y estado.
- **FR-008** (RF-USR-07): El sistema DEBE mostrar el detalle de un usuario con sus datos, su foto, sus vehículos y su membresía vigente, sin datos de autenticación.
- **FR-009** (RF-USR-08, RNF-PRI-02): El sistema DEBE limitar al Operador la consulta a usuarios con rol Cliente.

**Actualización (HU-09)**

- **FR-010** (RF-USR-09, RN-02): El sistema DEBE permitir solo al Administrador actualizar el tipo y número de documento, el nombre, el correo, el celular, la foto y el rol de cualquier usuario.
- **FR-011** (RF-USR-10): El sistema DEBE validar la unicidad del documento y del correo al actualizar.
- **FR-012** (RF-USR-11, RNF-SEG-07): El sistema DEBE registrar en la bitácora el valor anterior y el nuevo de cada dato modificado.

**Estado (HU-10)**

- **FR-013** (RF-USR-12, RN-02): El sistema DEBE permitir solo al Administrador cambiar el estado de un usuario entre activo e inactivo. La interfaz pide confirmación.
- **FR-014** (RF-USR-13, RN-06): El sistema DEBE impedir el inicio de sesión de usuarios inactivos e invalidar sus sesiones abiertas al inactivarlos.
- **FR-015** (RF-USR-14): El sistema DEBE impedir que un Administrador inactive su propia cuenta.

**Mis datos (HU-11)**

- **FR-016** (RF-USR-15): El sistema DEBE permitir a cada usuario consultar sus datos y actualizar su nombre, correo, celular y foto desde su perfil.
- **FR-017** (RF-USR-16): El sistema DEBE notificar a cada Administrador activo, con notificación interna y correo, cada actualización de datos personales hecha por un usuario, con el valor anterior y el nuevo.
- **FR-018** (RF-USR-17): El sistema DEBE impedir que un usuario modifique datos de otra cuenta o su propio documento, código o rol.

**Transversales**

- **FR-019** (RNF-SEG-04): El sistema DEBE verificar en el servidor los permisos: `usuarios.ver` (listado y detalle), `usuarios.crear` (registro), `usuarios.editar` (actualizar cualquier usuario), `usuarios.cambiar_estado` (estado), `perfil.ver` y `perfil.editar` (mis datos). Sin el permiso responde 403.
- **FR-020** (RNF-SEG-02): El sistema NUNCA DEBE devolver ni registrar la contraseña ni su hash en respuestas, bitácora o correos de aviso.
- **FR-021** (RNF-PRI-03): La fotografía DEBE ser JPG o PNG de 2 MB como máximo, guardarse fuera de la carpeta pública y entregarse solo a usuarios autenticados con permiso sobre ese usuario (el propio usuario, o quien tenga `usuarios.ver` dentro de su alcance).
- **FR-022** (RNF-PRI-01): Los formularios de registro y de mis datos DEBEN mostrar el aviso de privacidad. El registro exige la autorización de tratamiento de datos.

### Entidades clave

- **Usuario** (6.1 *Usuario*): persona con cuenta. Código (id), tipo y número de documento (únicos juntos), nombre completo, correo (único), celular, foto opcional, rol, contraseña (hash), indicador de cambio obligatorio de contraseña, estado (activo/inactivo), autorización de tratamiento de datos y su fecha.
- **Rol** (spec 001): un usuario tiene un rol activo al asignarlo.
- **Sesión** (spec 001): las sesiones abiertas del usuario se revocan al inactivarlo.
- **Notificación** (6.1 *Notificacion*): aviso a un usuario; aquí, a los Administradores cuando alguien cambia sus datos (tipo `datos`).
- **Entrada de bitácora** (spec 001): registra creación, edición y cambio de estado con el valor anterior y el nuevo.
- **Vehículo** y **Membresía** (specs 005 y 010): solo se leen para el detalle del usuario.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El Operador registra un cliente nuevo en menos de 2 minutos desde la pantalla de usuarios.
- **SC-002**: El 100 % de los intentos de un Operador de crear, ver o editar usuarios que no son Clientes, y de un Cliente de tocar otra cuenta, se rechazan.
- **SC-003**: Un usuario inactivado no puede usar su sesión abierta ni iniciar una nueva; ningún escenario de prueba lo consigue.
- **SC-004**: La búsqueda de usuarios responde en 1 segundo o menos en el 95 % de las consultas con 50 000 usuarios (RNF-REN-02).
- **SC-005**: Ninguna respuesta de la API, entrada de bitácora o correo de aviso contiene una contraseña o su hash.
- **SC-006**: Cada escenario de aceptación de HU-07 a HU-11 tiene su prueba automatizada y su caso en la colección de pruebas, con éxito y error por endpoint (RNF-CAL-03).

## Supuestos

- **Código del usuario** = `id_usuario` autoincremental (modelo 6.1).
- **Contraseña temporal**: se cambia en el primer inicio de sesión. El cambio (`PUT /auth/contrasena`) y el bloqueo de las demás rutas hasta cambiarla son de la spec 003; aquí solo se marca `debe_cambiar_contrasena`.
- **Correo**: `nodemailer` con SMTP configurable por `.env`. Sin SMTP configurado, el transporte «archivo» guarda los correos en `backend/correos/` (no se versiona). El reintento de correos fallidos es de la spec 014.
- **Vehículos y membresía en el detalle**: se consultan de sus tablas, que se llenan en las specs 005 y 010. Hasta entonces aparecen vacíos.
- **Interfaz**: Usuarios (listado, nuevo, editar, cambiar estado), Usuarios › Detalle y Mi perfil son parte de esta rebanada vertical, con los componentes por niveles de Atomic Design de la spec 001.
