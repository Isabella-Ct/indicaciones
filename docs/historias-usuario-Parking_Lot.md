# Historias de Usuario — Sistema de Gestión de Parqueadero (Parking Lot ABC)

> **Versión 2.0 — 2026-11-21.** Reemplaza la v1.0 (archivada en `v1.0/`). Cubre el total del proyecto: todas las historias de la matriz Excel (`2 Matriz Historias de Usuario/Matriz Historias de Usuario Proyecto Parking Lot.xlsx`), depuradas y redactadas con criterios Given-When-Then, más las historias inferidas de la ficha del proyecto para los procesos que la matriz no cubría. Cada historia referencia los requerimientos funcionales (`RF-`) de `SRS-Parking_Lot-v2.0.md` y la spec de GitHub spec-kit (`specs/NNN-modulo/spec.md`) donde se implementa.

## Resumen

**66 historias** (19 de la matriz Excel, 47 inferidas de la ficha) · **192 puntos** de estimación relativa · **15 módulos** (una spec por módulo).

| # | Épica / módulo | Spec | HU | Alta | Media | Baja | Puntos |
|---|---|---|---|---|---|---|---|
| 1 | Roles y permisos | `001-roles-permisos` | HU-01 – HU-06 (6) | 1 | 4 | 1 | 13 |
| 2 | Gestión de usuarios | `002-gestion-usuarios` | HU-07 – HU-11 (5) | 3 | 2 | 0 | 12 |
| 3 | Gestión de acceso | `003-gestion-acceso` | HU-12 – HU-16 (5) | 4 | 1 | 0 | 12 |
| 4 | Parqueaderos y celdas | `004-parqueaderos-celdas` | HU-17 – HU-24 (8) | 5 | 3 | 0 | 20 |
| 5 | Vehículos | `005-vehiculos` | HU-25 – HU-28 (4) | 3 | 1 | 0 | 10 |
| 6 | Restricción de pico y placa | `006-pico-y-placa` | HU-29 – HU-30 (2) | 1 | 1 | 0 | 6 |
| 7 | Control de ingreso y salida | `007-control-ingreso-salida` | HU-31 – HU-35 (5) | 3 | 2 | 0 | 17 |
| 8 | Tarifas | `008-tarifas` | HU-36 – HU-38 (3) | 1 | 2 | 0 | 9 |
| 9 | Facturación y pagos | `009-facturacion-pagos` | HU-39 – HU-44 (6) | 3 | 3 | 0 | 19 |
| 10 | Membresías | `010-membresias` | HU-45 – HU-48 (4) | 0 | 3 | 1 | 11 |
| 11 | Beneficios y descuentos | `011-descuentos` | HU-49 – HU-51 (3) | 0 | 2 | 1 | 7 |
| 12 | Reservas | `012-reservas` | HU-52 – HU-55 (4) | 0 | 4 | 0 | 12 |
| 13 | Incidencias | `013-incidencias` | HU-56 – HU-58 (3) | 1 | 2 | 0 | 8 |
| 14 | Monitoreo, placas y alertas | `014-monitoreo-alertas` | HU-59 – HU-62 (4) | 0 | 2 | 2 | 16 |
| 15 | Reportes e indicadores | `015-reportes-indicadores` | HU-63 – HU-66 (4) | 2 | 2 | 0 | 20 |

## Convenciones

- **HU-NN**: identificador estable de la historia en la v2.0. La columna *Excel* indica el código original de la matriz (`HU_xx`, `HU-UM-001`, etc.) y cuántos criterios (CA) traía; *Inferida* significa que la historia no estaba en la matriz y se dedujo de la ficha del proyecto.
- **Origen**: *Matriz Excel* (redactada de nuevo a partir de sus criterios), *Excel + completada* (se agregaron criterios o caminos de error que faltaban) o *Inferida* (nueva).
- **Prioridad** Alta / Media / Baja = P1 / P2 / P3 en las specs. **Estimación** en puntos de historia (Fibonacci 1-2-3-5-8), relativa dentro del proyecto.
- **Criterios de aceptación** en formato Dado / cuando / entonces; cada criterio es una prueba. Toda historia incluye al menos un camino de error.
- **API** y **Interfaz** son la ruta REST y la pantalla sugeridas para implementar la historia (insumo para `/speckit.plan`); el contrato definitivo lo fija el plan de cada spec.

### Definición de Terminado (común a todas las historias)

- Los escenarios de aceptación de la HU pasan como pruebas (colección Postman/Newman o pruebas automatizadas de API) y en la pantalla correspondiente.
- El endpoint valida la entrada en el servidor y responde con el sobre JSON `{ ok, data, meta, error }` y el código HTTP correcto (200/201/204/400/401/403/404/409/422).
- La pantalla valida en línea, muestra mensajes de error junto al campo, funciona de 360 a 1920 px y es operable con teclado.
- Las reglas de negocio (RN) asociadas se aplican en la capa de servicios del backend, no solo en el frontend.
- El commit/PR referencia la HU y los FR/RF que implementa (p. ej. `feat(roles): crear rol [HU-01][RF-ROL-01]`).
- Ningún secreto queda en el repositorio; los datos personales se tratan según Ley 1581 de 2012.

## Épica 1: Roles y permisos

> Proceso: Configuración · Spec: `specs/001-roles-permisos/spec.md` · SRS §4.1 · Actores: Administrador

Administra los roles del sistema y los permisos que cada rol tiene sobre los módulos. Sin roles y permisos no hay control de acceso, por lo que es la base de todas las demás características.

### HU-01 — Contar con los perfiles iniciales del sistema

**Como** Administrador  
**quiero** que el sistema arranque con los perfiles Administrador, Operador y Cliente con sus permisos base  
**para** tener desde el primer día la estructura de seguridad y asignar permisos a cada usuario

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 2 pts | Excel + completada | HU-CONFIG-001 (1 CA) | RF-ROL-01, RF-ROL-02, RF-ROL-03 |

**Criterios de aceptación**

1. **Dado** que el sistema se instala por primera vez con los datos semilla, **cuando** consulto los roles, **entonces** existen únicamente Administrador, Operador y Cliente, todos activos y marcados como roles base.
2. **Dado** el rol base Operador, **cuando** consulto su detalle, **entonces** tiene los permisos de registrar usuarios, vehículos, movimientos, pagos, reservas e incidencias, y no tiene permisos de configuración ni de reportes financieros.
3. **Dado** un rol base, **cuando** intento eliminarlo, inactivarlo o cambiarle el nombre, **entonces** el sistema rechaza la acción con el mensaje «Los roles base no se pueden modificar» (409).

- **Interfaz:** Configuración › Roles (listado)
- **API:** `GET /api/v1/roles`

### HU-02 — Registrar un rol con sus permisos

**Como** Administrador  
**quiero** crear un rol nuevo eligiendo sus permisos por módulo y acción  
**para** dar a un nuevo tipo de empleado (p. ej. supervisor de turno) solo el acceso que necesita

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 3 pts | Inferida (ficha §Alcance — Subproceso de Roles: registrar roles con sus permisos) | Inferida de la ficha del proyecto | RF-ROL-04, RF-ROL-05, RF-ROL-06 |

**Criterios de aceptación**

1. **Dado** que ingreso un nombre único de 3 a 40 caracteres y marco al menos un permiso, **cuando** confirmo el registro, **entonces** el sistema crea el rol en estado activo y lo muestra en el listado con el mensaje «Rol creado».
2. **Dado** que ya existe el rol «Supervisor», **cuando** intento crear otro llamado «supervisor», **entonces** el sistema rechaza el registro con «Ya existe un rol con ese nombre» (409).
3. **Dado** que no marco ningún permiso, **cuando** intento guardar, **entonces** el sistema no envía el formulario y muestra «Seleccione al menos un permiso» junto a la lista de permisos.

- **Datos:** nombre (obligatorio, 3–40, único); descripción (opcional, ≤150); permisos (≥1 id del catálogo)
- **Interfaz:** Configuración › Roles › Nuevo rol (formulario con permisos agrupados por módulo)
- **API:** `POST /api/v1/roles`

### HU-03 — Consultar y buscar roles

**Como** Administrador  
**quiero** ver la lista de roles con su estado, número de usuarios y permisos  
**para** revisar quién tiene acceso a qué antes de hacer cambios

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 2 pts | Inferida (ficha §Alcance — consultar roles) | Inferida de la ficha del proyecto | RF-ROL-07, RF-ROL-08 |

**Criterios de aceptación**

1. **Dado** que existen roles registrados, **cuando** abro Configuración › Roles, **entonces** veo una tabla paginada (10 por página) con nombre, descripción, número de usuarios asignados, estado y acciones.
2. **Dado** el listado de roles, **cuando** escribo «oper» en el buscador, **entonces** la tabla muestra solo los roles cuyo nombre contiene ese texto, sin distinguir mayúsculas.
3. **Dado** un rol, **cuando** abro su detalle, **entonces** veo sus permisos agrupados por módulo y la lista de usuarios que lo tienen.
4. **Dado** un id de rol que no existe, **cuando** consulto su detalle, **entonces** el sistema responde «Rol no encontrado» (404).

- **Interfaz:** Configuración › Roles (listado); Configuración › Roles › Detalle
- **API:** `GET /api/v1/roles?page&limit&q&estado`; `GET /api/v1/roles/:id`

### HU-04 — Actualizar un rol y sus permisos

**Como** Administrador  
**quiero** modificar el nombre, la descripción y los permisos de un rol  
**para** ajustar el acceso cuando cambian las funciones de un tipo de usuario

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 3 pts | Inferida (ficha §Alcance — actualizar roles y permisos) | Inferida de la ficha del proyecto | RF-ROL-09, RF-ROL-10, RF-ROL-11 |

**Criterios de aceptación**

1. **Dado** un rol no base, **cuando** cambio su descripción, agrego el permiso «reportes.ver» y confirmo, **entonces** el sistema guarda los cambios y los usuarios con ese rol obtienen el permiso en su siguiente inicio de sesión.
2. **Dado** un rol, **cuando** intento cambiarle el nombre por uno que ya existe, **entonces** el sistema rechaza el cambio con «Ya existe un rol con ese nombre» (409).
3. **Dado** un rol, **cuando** intento quitarle todos los permisos, **entonces** el sistema rechaza el cambio con «El rol debe tener al menos un permiso» (422).
4. **Dado** el rol Administrador, **cuando** intento quitarle el permiso «roles.editar», **entonces** el sistema lo impide y explica que el sistema quedaría sin administración.

- **Interfaz:** Configuración › Roles › Editar
- **API:** `PUT /api/v1/roles/:id`

### HU-05 — Activar o inactivar un rol

**Como** Administrador  
**quiero** cambiar el estado de un rol entre activo e inactivo  
**para** retirar de uso un perfil que ya no se necesita sin perder su historial

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 2 pts | Inferida (ficha §Alcance — cambiar el estado de los roles) | Inferida de la ficha del proyecto | RF-ROL-12, RF-ROL-13, RF-ROL-14 |

**Criterios de aceptación**

1. **Dado** un rol no base sin usuarios activos, **cuando** lo inactivo y confirmo en el diálogo, **entonces** el sistema cambia su estado a inactivo y deja de ofrecerlo al crear usuarios.
2. **Dado** un rol con usuarios activos asignados, **cuando** intento inactivarlo, **entonces** el sistema rechaza la acción con «El rol tiene N usuarios activos» (409).
3. **Dado** un rol inactivo, **cuando** lo activo, **entonces** vuelve a aparecer como opción al crear o editar usuarios.

- **Interfaz:** Configuración › Roles (acción Cambiar estado con diálogo de confirmación)
- **API:** `PATCH /api/v1/roles/:id/estado`

### HU-06 — Consultar el catálogo de permisos

**Como** Administrador  
**quiero** ver todos los permisos disponibles agrupados por módulo  
**para** entender qué puede habilitar al configurar un rol

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Baja | 1 pts | Inferida (ficha §Alcance — Subproceso de Permisos) | Inferida de la ficha del proyecto | RF-ROL-15 |

**Criterios de aceptación**

1. **Dado** el catálogo de permisos cargado, **cuando** abro Configuración › Permisos, **entonces** veo los permisos agrupados por módulo con su código y descripción.
2. **Dado** un usuario sin el permiso «roles.ver», **cuando** intenta consultar el catálogo, **entonces** el sistema responde 403 y la opción no aparece en su menú.

- **Interfaz:** Configuración › Permisos (solo lectura)
- **API:** `GET /api/v1/permisos`

## Épica 2: Gestión de usuarios

> Proceso: Usuarios · Spec: `specs/002-gestion-usuarios/spec.md` · SRS §4.2 · Actores: Administrador, Operador, Cliente

Administra las cuentas de las personas que usan el sistema: administradores, operadores y clientes registrados. El cliente registrado es además el propietario de vehículos, de reservas y de membresías.

### HU-07 — Registrar un usuario

**Como** Administrador u Operador  
**quiero** registrar un usuario nuevo con sus datos de identificación y su tipo de usuario  
**para** darle acceso al sistema y poder asociarle vehículos

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 3 pts | Matriz Excel (dos códigos con los mismos criterios, unificados) | HU-UM-001 (5 CA), HU-USER-CREATE-01 (5 CA) | RF-USR-01, RF-USR-02, RF-USR-03, RF-USR-04, RF-USR-05 |

**Criterios de aceptación**

1. **Dado** que ingreso tipo y número de documento, nombre completo, correo y celular válidos, selecciono el rol Cliente y marco la autorización de datos, **cuando** confirmo, **entonces** el sistema crea el usuario activo, le asigna un código único autoincremental y muestra «Usuario registrado — código 1025».
2. **Dado** que ya existe un usuario con el documento CC 1020304050, **cuando** intento registrar otro con el mismo documento, **entonces** el sistema rechaza el registro con «El documento ya está registrado» (409).
3. **Dado** que dejo vacío alguno de los campos obligatorios o el correo no tiene formato válido, **cuando** intento guardar, **entonces** el sistema señala cada campo con su error y no crea el usuario (422).
4. **Dado** que adjunto una fotografía PNG de 1 MB, **cuando** confirmo, **entonces** el sistema la guarda y la muestra en el detalle; si el archivo supera 2 MB o no es JPG/PNG, el sistema lo rechaza con el motivo.
5. **Dado** que soy Operador, **cuando** registro un usuario, **entonces** solo puedo asignarle el rol Cliente; si la petición trae otro rol, el sistema responde 403.

- **Datos:** tipo_documento (CC, CE, TI, PAS, NIT); numero_documento (5–20 dígitos; alfanumérico solo para PAS); nombre_completo (3–100, letras y espacios); correo (formato válido, ≤120); celular (10 dígitos, inicia en 3); foto (JPG/PNG ≤2 MB, opcional); rol (activo); autorización de datos (obligatoria)
- **Interfaz:** Usuarios › Nuevo usuario
- **API:** `POST /api/v1/usuarios`

### HU-08 — Consultar y buscar usuarios

**Como** Administrador u Operador  
**quiero** buscar usuarios por documento, nombre o correo y ver su detalle  
**para** verificar si un cliente ya está registrado antes de crearlo o de asociarle un vehículo

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 2 pts | Inferida (ficha §Alcance — consultar usuarios) | Inferida de la ficha del proyecto | RF-USR-06, RF-USR-07, RF-USR-08 |

**Criterios de aceptación**

1. **Dado** que existen usuarios, **cuando** abro Usuarios, **entonces** veo una tabla paginada con código, documento, nombre, correo, celular, rol y estado.
2. **Dado** el listado, **cuando** busco «1020304050», **entonces** el sistema muestra el usuario con ese documento; si no hay coincidencias, muestra «No se encontraron usuarios».
3. **Dado** un usuario, **cuando** abro su detalle, **entonces** veo sus datos, su foto, sus vehículos asociados y su membresía vigente, sin mostrar nunca la contraseña.
4. **Dado** que soy Operador, **cuando** filtro por rol, **entonces** solo veo usuarios con rol Cliente.

- **Interfaz:** Usuarios (listado); Usuarios › Detalle
- **API:** `GET /api/v1/usuarios?page&limit&q&rol&estado`; `GET /api/v1/usuarios/:id`

### HU-09 — Actualizar los datos de cualquier usuario

**Como** Administrador  
**quiero** corregir o modificar la información de cualquier usuario  
**para** mantener los datos de contacto e identificación correctos

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 2 pts | Excel + completada | HU-UM-004 (1 CA) | RF-USR-09, RF-USR-10, RF-USR-11 |

**Criterios de aceptación**

1. **Dado** un usuario existente, **cuando** cambio su celular y su rol y confirmo, **entonces** el sistema guarda los cambios, registra la modificación en la bitácora y muestra «Usuario actualizado».
2. **Dado** que cambio el correo por uno que ya usa otro usuario, **cuando** confirmo, **entonces** el sistema rechaza el cambio con «El correo ya está registrado» (409).
3. **Dado** que soy Operador, **cuando** intento editar los datos de otro usuario, **entonces** el sistema responde 403.
4. **Dado** un usuario, **cuando** abro el formulario de edición, **entonces** el código del usuario aparece como dato de solo lectura.

- **Interfaz:** Usuarios › Editar
- **API:** `PUT /api/v1/usuarios/:id`

### HU-10 — Activar o inactivar un usuario

**Como** Administrador  
**quiero** cambiar el estado de un usuario entre activo e inactivo  
**para** controlar quién tiene acceso al sistema

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 2 pts | Matriz Excel (dos códigos unificados) | HU-UM-002 (2 CA), HU-USER-STATUS-01 (9 CA) | RF-USR-12, RF-USR-13, RF-USR-14 |

**Criterios de aceptación**

1. **Dado** un usuario activo, **cuando** lo inactivo y confirmo en el diálogo, **entonces** el sistema cambia su estado a inactivo y muestra «Estado actualizado».
2. **Dado** un usuario inactivo, **cuando** intenta iniciar sesión, **entonces** el sistema rechaza el acceso con «Usuario inactivo. Comuníquese con el administrador».
3. **Dado** un usuario inactivo, **cuando** lo activo, **entonces** puede volver a iniciar sesión con sus credenciales.
4. **Dado** que soy Operador o Cliente, **cuando** intento cambiar el estado de un usuario, **entonces** el sistema responde 403.
5. **Dado** que soy Administrador, **cuando** intento inactivar mi propia cuenta, **entonces** el sistema lo impide con «No puede inactivar su propia cuenta».

- **Interfaz:** Usuarios (acción Cambiar estado)
- **API:** `PATCH /api/v1/usuarios/:id/estado`

### HU-11 — Actualizar mis datos personales

**Como** Cliente (usuario registrado)  
**quiero** actualizar mis datos de contacto desde mi cuenta  
**para** mantener mi información correcta en el sistema

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 3 pts | Excel + completada | HU-UM-003 (2 CA) | RF-USR-15, RF-USR-16, RF-USR-17 |

**Criterios de aceptación**

1. **Dado** que inicié sesión como Cliente, **cuando** abro Mi perfil, **entonces** veo mis datos y puedo editar nombre, correo, celular y foto; documento y código son de solo lectura.
2. **Dado** que cambio mi celular y confirmo, **entonces** el sistema guarda el cambio y envía una notificación al Administrador con el dato anterior y el nuevo.
3. **Dado** que ingreso un correo con formato inválido, **cuando** confirmo, **entonces** el sistema muestra el error junto al campo y no guarda (422).
4. **Dado** que intento modificar los datos de otro usuario cambiando el id en la petición, **cuando** envío, **entonces** el sistema responde 403.

- **Interfaz:** Mi perfil
- **API:** `GET /api/v1/usuarios/me`; `PUT /api/v1/usuarios/me`

## Épica 3: Gestión de acceso

> Proceso: Usuarios · Spec: `specs/003-gestion-acceso/spec.md` · SRS §4.3 · Actores: Administrador, Operador, Cliente

Autentica a los usuarios y entrega el token con el que la API autoriza cada operación según el rol. Incluye el autorregistro de clientes y la recuperación de contraseña por correo.

### HU-12 — Iniciar sesión como Administrador u Operador

**Como** Administrador u Operador  
**quiero** ingresar con mi número de documento y contraseña  
**para** gestionar usuarios, vehículos y la operación según mi rol

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 3 pts | Excel + completada | HU-UM-006 (3 CA) | RF-ACC-01, RF-ACC-02, RF-ACC-03, RF-ACC-04 |

**Criterios de aceptación**

1. **Dado** que soy Operador activo con credenciales válidas, **cuando** ingreso documento y contraseña, **entonces** el sistema me autentica, entrega el token y me lleva a la pantalla de Movimientos con el menú de mi rol.
2. **Dado** que ingreso una contraseña incorrecta, **cuando** confirmo, **entonces** el sistema responde «Documento o contraseña incorrectos» sin indicar cuál de los dos falló (401).
3. **Dado** que fallé 5 veces en 15 minutos, **cuando** intento de nuevo, **entonces** el sistema responde «Demasiados intentos. Intente en 15 minutos» (429).
4. **Dado** que es mi primer inicio de sesión con contraseña temporal, **cuando** me autentico, **entonces** el sistema me obliga a definir una nueva contraseña antes de continuar.

- **Datos:** numero_documento (obligatorio); contraseña (obligatoria; nueva contraseña: 8–64 caracteres con al menos una letra y un número)
- **Interfaz:** Inicio de sesión; Cambiar contraseña
- **API:** `POST /api/v1/auth/login`; `PUT /api/v1/auth/contrasena`

### HU-13 — Iniciar sesión como Cliente

**Como** Cliente (usuario registrado)  
**quiero** ingresar al sistema con mi número de documento y mi contraseña  
**para** ver las celdas disponibles, mis vehículos y mis datos

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 2 pts | Excel + completada (se exige contraseña; ver TBD-05) | HU-UM-007 (2 CA) | RF-ACC-05, RF-ACC-06 |

**Criterios de aceptación**

1. **Dado** que soy Cliente activo, **cuando** ingreso documento y contraseña válidos, **entonces** el sistema me lleva a mi panel con la disponibilidad de celdas, mis vehículos y mi membresía.
2. **Dado** un documento que no corresponde a un usuario registrado, **cuando** intento ingresar, **entonces** el sistema responde «Documento o contraseña incorrectos» (401).
3. **Dado** que inicié sesión como Cliente, **cuando** intento abrir una ruta de administración (p. ej. /usuarios), **entonces** la API responde 403 y la interfaz me devuelve a mi panel.

- **Interfaz:** Inicio de sesión; Panel del cliente
- **API:** `POST /api/v1/auth/login`
- **Nota:** REQ-USR-8 pedía ingreso solo con documento; se exige contraseña porque el panel muestra datos personales (RNF-PRI-02). Pendiente de confirmación (TBD-05).

### HU-14 — Registrarme como cliente

**Como** Visitante  
**quiero** crear mi cuenta de cliente desde la página de inicio  
**para** reservar celdas y consultar mis servicios sin tener que pedirlo en la caseta

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 3 pts | Inferida (ficha §Alcance — Gestión de Acceso: registrar nuevo usuario) | Inferida de la ficha del proyecto | RF-ACC-07, RF-ACC-08, RF-ACC-09 |

**Criterios de aceptación**

1. **Dado** que diligencio tipo y número de documento, nombre, correo, celular y contraseña válidos y acepto el tratamiento de datos, **cuando** confirmo, **entonces** el sistema crea mi cuenta con rol Cliente activo y me permite iniciar sesión.
2. **Dado** que mi documento ya está registrado (p. ej. me registró el operador), **cuando** intento registrarme, **entonces** el sistema responde «Ya existe una cuenta con este documento. Use Recuperar contraseña» (409).
3. **Dado** que no acepto la autorización de tratamiento de datos, **cuando** intento confirmar, **entonces** el sistema no envía el formulario y lo indica junto a la casilla.

- **Datos:** mismos campos de HU-07 + contraseña y confirmación (8–64 caracteres, al menos una letra y un número, deben coincidir)
- **Interfaz:** Registro de cliente
- **API:** `POST /api/v1/auth/registro`

### HU-15 — Recuperar mi contraseña

**Como** Usuario registrado  
**quiero** restablecer mi contraseña mediante un enlace enviado a mi correo  
**para** volver a ingresar sin depender del administrador

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 3 pts | Inferida (ficha §Objetivos 3 — autenticación con recuperación de contraseña) | Inferida de la ficha del proyecto | RF-ACC-10, RF-ACC-11, RF-ACC-12 |

**Criterios de aceptación**

1. **Dado** que ingreso mi número de documento, **cuando** solicito recuperar la contraseña, **entonces** el sistema envía a mi correo registrado un enlace válido por 30 minutos y muestra «Si el documento está registrado, recibirá un correo».
2. **Dado** un enlace vigente, **cuando** defino una nueva contraseña válida y la confirmo, **entonces** el sistema la actualiza, invalida el enlace y me lleva al inicio de sesión.
3. **Dado** un enlace vencido o ya usado, **cuando** intento usarlo, **entonces** el sistema responde «El enlace no es válido o expiró» y ofrece solicitar uno nuevo.

- **Interfaz:** Recuperar contraseña; Restablecer contraseña
- **API:** `POST /api/v1/auth/recuperar`; `POST /api/v1/auth/restablecer`

### HU-16 — Cerrar sesión

**Como** Usuario autenticado  
**quiero** cerrar mi sesión  
**para** que nadie más use mi cuenta en el equipo de la caseta

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 1 pts | Inferida (ficha §Alcance — cerrar sesión) | Inferida de la ficha del proyecto | RF-ACC-13 |

**Criterios de aceptación**

1. **Dado** que tengo una sesión activa, **cuando** selecciono Cerrar sesión, **entonces** el sistema elimina el token del navegador, lo invalida en el servidor y me lleva al inicio de sesión.
2. **Dado** que cerré sesión, **cuando** uso el botón Atrás del navegador, **entonces** no veo información protegida y la API responde 401 a cualquier petición con el token anterior.

- **Interfaz:** Menú de usuario › Cerrar sesión
- **API:** `POST /api/v1/auth/logout`

## Épica 4: Parqueaderos y celdas

> Proceso: Control de ingreso y salida · Spec: `specs/004-parqueaderos-celdas/spec.md` · SRS §4.4 · Actores: Administrador, Operador, Cliente, Visitante

Registra la infraestructura física —parqueaderos (sedes o zonas), sus puertas de acceso y sus celdas para carros y motos— y mantiene el estado de cada celda en tiempo real para que operadores y clientes sepan dónde hay espacio.

### HU-17 — Registrar un parqueadero

**Como** Administrador  
**quiero** registrar un parqueadero (sede o zona) con su dirección, pisos y horario  
**para** organizar las celdas y puertas de acceso por ubicación

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 3 pts | Inferida (ficha §Alcance — Control de disponibilidad: configurar la capacidad del parqueadero; REQ-CLD-01: celdas por área, piso o nivel) | Inferida de la ficha del proyecto | RF-CLD-01, RF-CLD-02, RF-CLD-03 |

**Criterios de aceptación**

1. **Dado** que ingreso nombre único, dirección, número de pisos entre 1 y 20 y horario, **cuando** confirmo, **entonces** el sistema crea el parqueadero activo y lo muestra en el listado.
2. **Dado** que ya existe el parqueadero «Sede Centro», **cuando** intento crear otro con el mismo nombre, **entonces** el sistema responde «Ya existe un parqueadero con ese nombre» (409).
3. **Dado** que dejo vacía la dirección o ingreso 0 pisos, **cuando** intento guardar, **entonces** el sistema señala el error en el campo (422).
4. **Dado** que existen parqueaderos, **cuando** abro Configuración › Parqueaderos, **entonces** veo la lista paginada con nombre, dirección, pisos, total de celdas por tipo y estado, con búsqueda por nombre.

- **Datos:** nombre (3–60, único); direccion (5–120); pisos (entero 1–20); horario (texto ≤60, por defecto «24 horas»)
- **Interfaz:** Configuración › Parqueaderos (listado, nuevo, detalle)
- **API:** `POST /api/v1/parqueaderos`; `GET /api/v1/parqueaderos?page&limit&q&estado`; `GET /api/v1/parqueaderos/:id`

### HU-18 — Actualizar o inactivar un parqueadero

**Como** Administrador  
**quiero** modificar los datos de un parqueadero o inactivarlo  
**para** reflejar cambios de horario o el cierre de una zona

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 2 pts | Inferida (gestión completa del recurso Parqueaderos) | Inferida de la ficha del proyecto | RF-CLD-04, RF-CLD-05, RF-CLD-06 |

**Criterios de aceptación**

1. **Dado** un parqueadero, **cuando** cambio su horario y confirmo, **entonces** el sistema guarda el cambio y muestra «Parqueadero actualizado».
2. **Dado** un parqueadero sin vehículos dentro, **cuando** lo inactivo y confirmo, **entonces** sus celdas dejan de ofrecerse para entradas y reservas.
3. **Dado** un parqueadero con vehículos dentro, **cuando** intento inactivarlo, **entonces** el sistema rechaza la acción con «Hay N vehículos dentro del parqueadero» (409).
4. **Dado** un parqueadero con celdas en el piso 3, **cuando** intento reducir los pisos a 2, **entonces** el sistema rechaza el cambio (409).

- **Interfaz:** Configuración › Parqueaderos › Editar
- **API:** `PUT /api/v1/parqueaderos/:id`; `DELETE /api/v1/parqueaderos/:id (inactivación lógica)`

### HU-19 — Configurar las puertas de acceso

**Como** Administrador  
**quiero** registrar las puertas de entrada y salida de cada parqueadero  
**para** que cada movimiento quede asociado a la puerta por donde ocurrió

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 2 pts | Inferida (REQ-INEX-1/2 y HU-ACC-001 exigen registrar la puerta de acceso) | Inferida de la ficha del proyecto | RF-CLD-07, RF-CLD-08 |

**Criterios de aceptación**

1. **Dado** un parqueadero, **cuando** agrego la puerta «Carrera 43» de tipo mixta, **entonces** queda disponible para seleccionarla al registrar entradas y salidas.
2. **Dado** que el parqueadero ya tiene la puerta «Carrera 43», **cuando** intento crear otra con el mismo nombre, **entonces** el sistema responde 409.
3. **Dado** una puerta de tipo salida, **cuando** el operador registra una entrada, **entonces** esa puerta no aparece entre las opciones.

- **Interfaz:** Configuración › Parqueaderos › Detalle › Puertas
- **API:** `GET /api/v1/parqueaderos/:id/puertas`; `POST /api/v1/parqueaderos/:id/puertas`; `PUT /api/v1/puertas/:id`

### HU-20 — Registrar celdas de parqueo

**Como** Administrador  
**quiero** registrar las celdas de un parqueadero con su código, tipo de vehículo, piso y área  
**para** tener el inventario de espacios que el sistema asigna y controla

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 3 pts | Inferida (ficha §Objetivos 6 — gestionar el inventario de celdas; REQ-CLD-01) | Inferida de la ficha del proyecto | RF-CLD-09, RF-CLD-10, RF-CLD-11, RF-CLD-12 |

**Criterios de aceptación**

1. **Dado** un parqueadero activo, **cuando** registro la celda «A-01» de tipo carro en el piso 1, **entonces** el sistema la crea en estado disponible.
2. **Dado** que ya existe la celda «A-01» en ese parqueadero, **cuando** intento registrarla otra vez (incluso como «a-01»), **entonces** el sistema responde «La celda ya existe en este parqueadero» (409).
3. **Dado** que indico el piso 5 en un parqueadero de 3 pisos, **cuando** confirmo, **entonces** el sistema rechaza el registro (422).
4. **Dado** que uso el registro por rango con prefijo «M-», desde 1 hasta 20, tipo moto y piso 1, **cuando** confirmo, **entonces** el sistema crea las celdas M-01 a M-20 y omite e informa las que ya existían.

- **Datos:** codigo (1–10, letras, dígitos y guion); tipo_vehiculo (carro | moto); piso (1..pisos del parqueadero); area (opcional, ≤20)
- **Interfaz:** Celdas › Nueva celda; Celdas › Registro por rango
- **API:** `POST /api/v1/celdas`; `POST /api/v1/celdas/lote`

### HU-21 — Actualizar o inhabilitar una celda

**Como** Administrador  
**quiero** editar los datos de una celda o inhabilitarla temporalmente  
**para** sacar de servicio una celda en mantenimiento sin borrarla

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 2 pts | Inferida (REQ-CLD-03 — actualizar el estado de la celda en cualquier momento) | Inferida de la ficha del proyecto | RF-CLD-13, RF-CLD-14, RF-CLD-15 |

**Criterios de aceptación**

1. **Dado** una celda disponible, **cuando** la inhabilito con el motivo «Mantenimiento» y confirmo, **entonces** el sistema la marca inhabilitada y deja de asignarla.
2. **Dado** una celda ocupada, **cuando** intento inhabilitarla o cambiar su tipo, **entonces** el sistema rechaza la acción con «La celda está ocupada por ABC123» (409).
3. **Dado** una celda inhabilitada, **cuando** la habilito, **entonces** vuelve a estado disponible.
4. **Dado** una celda, **cuando** intento marcarla manualmente como ocupada, **entonces** el sistema lo rechaza e indica que la ocupación se registra con una entrada.

- **Interfaz:** Celdas › Editar; Celdas (acción Inhabilitar/Habilitar)
- **API:** `PUT /api/v1/celdas/:id`; `PATCH /api/v1/celdas/:id/estado`; `DELETE /api/v1/celdas/:id (inhabilitación lógica)`

### HU-22 — Ver el mapa de celdas y su estado

**Como** Operador o Cliente  
**quiero** ver las celdas del parqueadero con su código, tipo y estado  
**para** saber dónde ubicar o encontrar un espacio disponible

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 3 pts | Excel + completada | HU-CLD-001 (2 CA) | RF-CLD-16, RF-CLD-17, RF-CLD-18 |

**Criterios de aceptación**

1. **Dado** que abro Celdas, **cuando** selecciono el parqueadero y el piso, **entonces** veo cada celda con su código, tipo (carro o moto) y estado diferenciado por color y por texto (disponible, ocupada, reservada, inhabilitada).
2. **Dado** el mapa, **cuando** filtro por tipo moto y estado disponible, **entonces** solo se muestran las celdas que cumplen ambos filtros.
3. **Dado** que soy Operador, **cuando** selecciono una celda ocupada, **entonces** veo la placa del vehículo y la hora de entrada; si soy Cliente, no veo la placa de otros vehículos.
4. **Dado** que soy Cliente, **cuando** abro Disponibilidad desde mi cuenta, **entonces** veo las celdas disponibles por piso y área en una vista individual.

- **Interfaz:** Celdas (mapa por piso); Panel del cliente › Disponibilidad
- **API:** `GET /api/v1/celdas?parqueadero&piso&tipo&estado`; `GET /api/v1/celdas/:id`

### HU-23 — Actualizar el estado de la celda con cada movimiento

**Como** Operador  
**quiero** que el sistema cambie el estado de la celda al registrar una entrada o una salida  
**para** mantener la disponibilidad siempre correcta y en tiempo real

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 3 pts | Excel + completada | HU-CLD-002 (2 CA) | RF-CLD-19, RF-CLD-20, RF-CLD-21 |

**Criterios de aceptación**

1. **Dado** una celda disponible, **cuando** registro la entrada de ABC123 en esa celda, **entonces** la celda pasa a ocupada y queda asociada a ese vehículo en la misma transacción.
2. **Dado** una celda ocupada por ABC123, **cuando** registro la salida de ABC123, **entonces** la celda pasa a disponible y se desasocia el vehículo.
3. **Dado** que el registro de la entrada falla por cualquier motivo, **cuando** la transacción se revierte, **entonces** la celda conserva su estado anterior.
4. **Dado** dos pantallas abiertas en el mapa de celdas, **cuando** se registra una entrada, **entonces** ambas reflejan el nuevo estado en 10 segundos o menos.

- **Interfaz:** Celdas (actualización automática cada 10 s)
- **API:** `(efecto de POST /api/v1/movimientos y POST /api/v1/movimientos/:id/salida)`

### HU-24 — Consultar la disponibilidad en tiempo real

**Como** Visitante, Cliente u Operador  
**quiero** ver cuántas celdas libres hay por tipo de vehículo  
**para** decidir si ir al parqueadero y orientar a los conductores en la entrada

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 2 pts | Inferida (ficha §Alcance — Control de disponibilidad de espacios en tiempo real) | Inferida de la ficha del proyecto | RF-CLD-22, RF-CLD-23 |

**Criterios de aceptación**

1. **Dado** que abro la página pública de disponibilidad, **cuando** carga, **entonces** veo por parqueadero el número de celdas disponibles y totales para carros y para motos, con la hora de actualización.
2. **Dado** que no quedan celdas de moto disponibles, **cuando** consulto, **entonces** el indicador de motos muestra «Lleno».
3. **Dado** la página pública, **cuando** consulto, **entonces** no se muestra ninguna placa ni dato personal.

- **Interfaz:** Página pública de disponibilidad; Tablero del operador (indicadores)
- **API:** `GET /api/v1/disponibilidad`

## Épica 5: Vehículos

> Proceso: Usuarios · Spec: `specs/005-vehiculos/spec.md` · SRS §4.5 · Actores: Administrador, Operador, Cliente

Registra los vehículos (carros y motos) con su placa, color, marca y modelo, y los asocia a su propietario registrado. La placa es la llave con la que se controlan entradas, salidas, restricciones, membresías e incidencias.

### HU-25 — Registrar un vehículo

**Como** Administrador u Operador  
**quiero** registrar un vehículo con placa, tipo, color, marca y modelo  
**para** tenerlo disponible para asociarlo a un usuario y controlar sus entradas

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 3 pts | Excel + completada | HU-VEH-001 (3 CA) | RF-VEH-01, RF-VEH-02, RF-VEH-03 |

**Criterios de aceptación**

1. **Dado** que ingreso la placa «abc 123», tipo carro, color rojo, marca Chevrolet y modelo 2018, **cuando** confirmo, **entonces** el sistema guarda la placa como ABC123 y muestra «Vehículo registrado».
2. **Dado** que la placa ABC123 ya existe, **cuando** intento registrarla de nuevo, **entonces** el sistema rechaza el registro con «La placa ya está registrada» (409).
3. **Dado** que ingreso la placa «AB1234» para un carro, **cuando** confirmo, **entonces** el sistema responde «Formato de placa inválido para carro (AAA123)» (422).
4. **Dado** el vehículo registrado, **cuando** consulto los vehículos sin propietario, **entonces** aparece disponible para asociarlo a un usuario.

- **Datos:** placa (carro: 3 letras + 3 dígitos; moto: 3 letras + 2 dígitos + letra opcional); tipo (carro | moto); color (2–30); marca (2–40); modelo (año entre 1950 y el año actual + 1)
- **Interfaz:** Vehículos › Nuevo vehículo
- **API:** `POST /api/v1/vehiculos`

### HU-26 — Asociar un vehículo a su propietario

**Como** Administrador u Operador  
**quiero** asignar a un usuario un vehículo de su propiedad  
**para** saber a quién pertenece cada vehículo para membresías, facturas e incidencias

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 2 pts | Matriz Excel | HU-UM-005 (3 CA) | RF-VEH-04, RF-VEH-05, RF-VEH-06 |

**Criterios de aceptación**

1. **Dado** un vehículo registrado sin propietario y un usuario activo, **cuando** asocio el vehículo al usuario, **entonces** el vehículo aparece en el detalle del usuario y en «Mis vehículos» del cliente.
2. **Dado** una placa que no está registrada, **cuando** intento asociarla, **entonces** el sistema responde «Registre primero el vehículo» (404) y ofrece el formulario de registro.
3. **Dado** un documento que no corresponde a un usuario registrado y activo, **cuando** intento asociarle un vehículo, **entonces** el sistema rechaza la asociación (404/409).
4. **Dado** un vehículo que ya tiene propietario, **cuando** un Operador intenta asociarlo a otro usuario, **entonces** el sistema responde que solo el Administrador puede reasignarlo (403).

- **Interfaz:** Vehículos › Detalle (Asociar propietario); Usuarios › Detalle (Agregar vehículo)
- **API:** `PATCH /api/v1/vehiculos/:id/propietario`

### HU-27 — Actualizar o reasignar un vehículo

**Como** Administrador  
**quiero** actualizar los datos de un vehículo o reasignarlo a otro usuario  
**para** mantener correcta la información de propiedad de cada vehículo

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 3 pts | Matriz Excel | HU-VEH-002 (3 CA) | RF-VEH-07, RF-VEH-08, RF-VEH-09 |

**Criterios de aceptación**

1. **Dado** un vehículo, **cuando** cambio su color y confirmo, **entonces** el sistema guarda el cambio y lo registra en la bitácora.
2. **Dado** un vehículo de Ana, **cuando** lo reasigno a Luis (usuario activo) y confirmo, **entonces** el vehículo pasa a Luis y desaparece de «Mis vehículos» de Ana; los movimientos anteriores siguen asociados a Ana.
3. **Dado** que soy Operador o Cliente, **cuando** intento actualizar o reasignar un vehículo, **entonces** el sistema responde 403.
4. **Dado** que cambio la placa por una ya registrada, **cuando** confirmo, **entonces** el sistema responde 409.

- **Interfaz:** Vehículos › Editar
- **API:** `PUT /api/v1/vehiculos/:id`; `PATCH /api/v1/vehiculos/:id/propietario`

### HU-28 — Consultar vehículos

**Como** Administrador, Operador o Cliente  
**quiero** buscar vehículos por placa o propietario y ver su detalle  
**para** verificar datos en la caseta y, como cliente, ver mis vehículos

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 2 pts | Inferida (consulta necesaria para HU-26, HU-31 y REQ-REP-02) | Inferida de la ficha del proyecto | RF-VEH-10, RF-VEH-11, RF-VEH-12 |

**Criterios de aceptación**

1. **Dado** que soy Operador, **cuando** busco «ABC1», **entonces** veo los vehículos cuya placa contiene ese texto con tipo, color, marca, propietario y si está dentro del parqueadero.
2. **Dado** un vehículo, **cuando** abro su detalle, **entonces** veo sus datos, su propietario y sus últimos 10 movimientos.
3. **Dado** que soy Cliente, **cuando** abro Mis vehículos, **entonces** solo veo los vehículos asociados a mi cuenta.

- **Interfaz:** Vehículos (listado); Vehículos › Detalle; Panel del cliente › Mis vehículos
- **API:** `GET /api/v1/vehiculos?page&limit&q&tipo&propietario&dentro`; `GET /api/v1/vehiculos/:id`; `GET /api/v1/usuarios/me/vehiculos`

## Épica 6: Restricción de pico y placa

> Proceso: Control de ingreso y salida · Spec: `specs/006-pico-y-placa/spec.md` · SRS §4.6 · Actores: Administrador, Operador

Permite configurar, por día de la semana, tipo de vehículo y franja horaria, los dígitos de placa que tienen restricción, para que el registro de entrada niegue el ingreso a los vehículos restringidos tal como lo pidió el cliente.

### HU-29 — Configurar la restricción de pico y placa

**Como** Administrador  
**quiero** definir para cada día de la semana y tipo de vehículo los dígitos de placa restringidos y su horario  
**para** que el sistema bloquee automáticamente el ingreso de los vehículos que incumplan la restricción vigente

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 5 pts | Excel + completada | HU-RES-001 (3 CA) | RF-PYP-01, RF-PYP-02, RF-PYP-03, RF-PYP-04 |

**Criterios de aceptación**

1. **Dado** que defino para el lunes, tipo carro, los dígitos 6 y 9 de 05:00 a 20:00, **cuando** guardo, **entonces** la restricción queda activa y aparece en la tabla semanal.
2. **Dado** que ya existe una restricción activa para el lunes y tipo carro en la misma vigencia, **cuando** intento crear otra, **entonces** el sistema responde «Ya existe una restricción para ese día y tipo» (409) y ofrece editarla.
3. **Dado** una restricción, **cuando** ingreso el dígito 12 o una hora fin anterior a la de inicio, **entonces** el sistema señala el error (422).
4. **Dado** una restricción configurada, **cuando** la edito o la elimino, **entonces** el cambio aplica a las entradas registradas desde ese momento y queda en la bitácora.
5. **Dado** que soy Operador, **cuando** intento crear o modificar restricciones, **entonces** el sistema responde 403.

- **Datos:** dia_semana (1–7); tipo_vehiculo (carro | moto); digitos (1–5 dígitos 0–9 sin repetir); posicion_digito (último | primero); hora_inicio y hora_fin (HH:MM, fin > inicio); vigente_desde / vigente_hasta (fechas, hasta ≥ desde)
- **Interfaz:** Configuración › Pico y placa (tabla semanal por tipo de vehículo)
- **API:** `GET /api/v1/restricciones-placa`; `POST /api/v1/restricciones-placa`; `PUT /api/v1/restricciones-placa/:id`; `DELETE /api/v1/restricciones-placa/:id`

### HU-30 — Consultar la restricción vigente

**Como** Operador o Cliente  
**quiero** ver qué dígitos tienen restricción hoy y en qué horario  
**para** informar a los conductores y prever rechazos en la entrada

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 1 pts | Inferida (apoyo a HU-31 en la caseta) | Inferida de la ficha del proyecto | RF-PYP-05 |

**Criterios de aceptación**

1. **Dado** que hay restricción activa hoy, **cuando** abro Movimientos, **entonces** veo un aviso con los dígitos restringidos por tipo de vehículo y la franja horaria.
2. **Dado** que hoy no hay restricción configurada, **cuando** consulto, **entonces** el aviso indica «Sin restricción hoy».

- **Interfaz:** Movimientos (aviso de pico y placa); Panel del cliente
- **API:** `GET /api/v1/restricciones-placa/hoy`

## Épica 7: Control de ingreso y salida

> Proceso: Control de ingreso y salida · Spec: `specs/007-control-ingreso-salida/spec.md` · SRS §4.7 · Actores: Operador, Administrador

Es el proceso central del parqueadero: registra la entrada de cada vehículo (puerta, placa, fecha y hora, celda), valida la restricción de pico y placa, genera el ticket, registra la salida calculando el tiempo de estadía y deja el movimiento listo para facturar.

### HU-31 — Registrar la entrada de un vehículo

**Como** Operador  
**quiero** registrar la entrada de un vehículo indicando puerta y placa, con fecha y hora automáticas  
**para** dejar constancia del ingreso y comenzar el conteo del tiempo de estadía

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 5 pts | Excel + completada | HU-ACC-001 (4 CA) | RF-MOV-01, RF-MOV-02, RF-MOV-03, RF-MOV-04, RF-MOV-05 |

**Criterios de aceptación**

1. **Dado** la placa ABC123 sin restricción hoy y una celda de carro disponible, **cuando** registro la entrada por la puerta «Carrera 43», **entonces** el sistema crea el movimiento abierto con la fecha y hora del servidor, asigna la celda disponible de menor código (o la que yo elija) y muestra celda y ticket.
2. **Dado** que hoy, en la franja de 05:00 a 20:00, los carros con placa terminada en 3 tienen restricción, **cuando** registro la entrada de ABC123 a las 08:00, **entonces** el sistema rechaza la entrada con «Vehículo con restricción de pico y placa hoy (dígito 3)» (409) y no ocupa ninguna celda.
3. **Dado** que ABC123 ya tiene un movimiento abierto, **cuando** intento registrar otra entrada, **entonces** el sistema responde «El vehículo ya se encuentra dentro (celda A-07)» (409).
4. **Dado** una placa no registrada, **cuando** registro la entrada indicando su tipo, **entonces** el sistema crea el vehículo como ocasional (sin propietario) y registra la entrada.
5. **Dado** que no hay celdas disponibles para motos, **cuando** intento registrar la entrada de una moto, **entonces** el sistema responde «Sin celdas disponibles para moto» (409).

- **Datos:** placa (normalizada y validada por tipo); tipo (si la placa no existe); id_puerta (activa, tipo entrada o mixta); id_celda (opcional; disponible y del tipo del vehículo)
- **Interfaz:** Movimientos › Registrar entrada (pantalla de caseta)
- **API:** `POST /api/v1/movimientos`

### HU-32 — Generar el ticket de ingreso

**Como** Operador  
**quiero** que al registrar la entrada el sistema genere un ticket electrónico o imprimible  
**para** entregar al conductor un comprobante con el que se identifica su vehículo a la salida

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 3 pts | Excel (criterio CA04 de HU-ACC-001) + ficha §Alcance — Subproceso de generación de tickets | HU-ACC-001 (4 CA) | RF-MOV-06, RF-MOV-07, RF-MOV-08 |

**Criterios de aceptación**

1. **Dado** que registré la entrada de ABC123, **cuando** el sistema la confirma, **entonces** genera un ticket con código único consecutivo (T-000123), placa, tipo, celda, puerta, fecha y hora de entrada y el nombre del parqueadero.
2. **Dado** un ticket generado, **cuando** selecciono Imprimir, **entonces** se abre la vista de impresión en formato de 80 mm; si el vehículo tiene propietario con correo, puedo enviarlo por correo.
3. **Dado** el código de un ticket, **cuando** lo consulto (digitado o leído con lector), **entonces** el sistema muestra el movimiento abierto asociado; si el código no existe, responde 404.

- **Interfaz:** Movimientos › Ticket (vista de impresión)
- **API:** `GET /api/v1/tickets/:codigo`; `POST /api/v1/tickets/:codigo/envio`

### HU-33 — Registrar la salida de un vehículo

**Como** Operador  
**quiero** registrar la salida de un vehículo por placa o ticket  
**para** calcular el tiempo de estadía y habilitar el cobro del servicio

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 5 pts | Excel + completada | HU-ACC-002 (2 CA) | RF-MOV-09, RF-MOV-10, RF-MOV-11, RF-MOV-12 |

**Criterios de aceptación**

1. **Dado** que ABC123 entró a las 08:10, **cuando** registro su salida a las 10:25 por la puerta «Carrera 43», **entonces** el sistema cierra el movimiento con la hora del servidor, calcula 135 minutos de estadía y muestra la liquidación del valor a pagar.
2. **Dado** la salida registrada, **cuando** se confirma, **entonces** la salida queda asociada al mismo vehículo, celda y movimiento de la entrada y la celda pasa a disponible.
3. **Dado** una placa sin movimiento abierto, **cuando** intento registrar su salida, **entonces** el sistema responde «El vehículo no tiene una entrada registrada» (404).
4. **Dado** que el conductor perdió el ticket, **cuando** busco por placa y registro la salida, **entonces** el sistema permite la salida y marca el ticket como extraviado.

- **Interfaz:** Movimientos › Registrar salida (pantalla de caseta)
- **API:** `POST /api/v1/movimientos/:id/salida`; `GET /api/v1/movimientos?placa&estado=abierto`

### HU-34 — Consultar los vehículos dentro del parqueadero

**Como** Operador o Administrador  
**quiero** ver la lista de vehículos que están dentro con su celda y tiempo transcurrido  
**para** controlar la ocupación y ubicar rápidamente un vehículo

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 2 pts | Inferida (REQ-INEX-3 conteo de tiempo; apoyo a la operación) | Inferida de la ficha del proyecto | RF-MOV-13, RF-MOV-14 |

**Criterios de aceptación**

1. **Dado** vehículos dentro, **cuando** abro Movimientos › Dentro, **entonces** veo placa, tipo, celda, hora de entrada y tiempo transcurrido, ordenados del más antiguo al más reciente.
2. **Dado** el listado, **cuando** busco una placa, **entonces** veo su movimiento abierto o «El vehículo no está dentro».
3. **Dado** un vehículo con más de 24 horas dentro, **cuando** aparece en el listado, **entonces** se resalta para revisión.

- **Interfaz:** Movimientos › Vehículos dentro
- **API:** `GET /api/v1/movimientos?estado=abierto&q`

### HU-35 — Anular un registro de entrada erróneo

**Como** Operador o Administrador  
**quiero** anular una entrada registrada por error indicando el motivo  
**para** corregir equivocaciones sin borrar información ni dejar celdas ocupadas

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 2 pts | Inferida (RNF-SAF-02: los movimientos no se eliminan) | Inferida de la ficha del proyecto | RF-MOV-15, RF-MOV-16, RF-MOV-17 |

**Criterios de aceptación**

1. **Dado** una entrada registrada hace 5 minutos sin pagos, **cuando** la anulo como Operador con el motivo «Placa mal digitada», **entonces** el movimiento queda anulado, la celda vuelve a disponible y el ticket queda inválido.
2. **Dado** una entrada de hace más de 15 minutos, **cuando** un Operador intenta anularla, **entonces** el sistema responde que solo el Administrador puede hacerlo (403).
3. **Dado** que no escribo el motivo, **cuando** confirmo, **entonces** el sistema exige un motivo de 10 a 200 caracteres (422).

- **Interfaz:** Movimientos › Detalle (acción Anular)
- **API:** `PATCH /api/v1/movimientos/:id/anulacion`

## Épica 8: Tarifas

> Proceso: Tarifas y pagos · Spec: `specs/008-tarifas/spec.md` · SRS §4.8 · Actores: Administrador, Operador, Cliente

Define cuánto se cobra: tarifas por tipo de vehículo y tipo de cliente, con valor de la primera hora, valor por fracción, tope diario y tiempo de gracia, con vigencia, para que la liquidación sea automática y sin discusiones.

### HU-36 — Configurar una tarifa

**Como** Administrador  
**quiero** crear tarifas por tipo de vehículo y tipo de cliente con primera hora, fracción, tope diario y tiempo de gracia  
**para** cobrar de forma diferenciada según el tiempo y el tipo de cliente

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 5 pts | Inferida (ficha §Alcance — Configuración de tarifas diferenciadas según tiempo y tipo de cliente) | Inferida de la ficha del proyecto | RF-TAR-01, RF-TAR-02, RF-TAR-03 |

**Criterios de aceptación**

1. **Dado** que creo la tarifa «Carro ocasional» con primera hora $ 4.000, fracción de 15 minutos a $ 1.000, tope diario $ 30.000 y 10 minutos de gracia, vigente desde mañana, **cuando** guardo, **entonces** queda programada y se activa en la fecha indicada.
2. **Dado** que ya existe una tarifa activa para carro ocasional en ese periodo, **cuando** creo otra superpuesta, **entonces** el sistema pide definir el fin de vigencia de la anterior o responde 409.
3. **Dado** que ingreso un valor de primera hora de 0 o un tope diario menor que la primera hora, **cuando** guardo, **entonces** el sistema señala el error (422).
4. **Dado** que soy Operador, **cuando** intento crear una tarifa, **entonces** el sistema responde 403.

- **Datos:** nombre (3–60); tipo_vehiculo; tipo_cliente; valor_primera_hora (> 0); minutos_fraccion (1–60); valor_fraccion (≥ 0); tope_diario (opcional, ≥ primera hora); minutos_gracia (0–30); vigente_desde (obligatoria); vigente_hasta (opcional, > desde)
- **Interfaz:** Configuración › Tarifas › Nueva tarifa
- **API:** `POST /api/v1/tarifas`

### HU-37 — Actualizar o inactivar una tarifa

**Como** Administrador  
**quiero** modificar o inactivar una tarifa  
**para** ajustar los precios sin afectar los cobros ya liquidados

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 3 pts | Inferida (gestión de tarifas) | Inferida de la ficha del proyecto | RF-TAR-04, RF-TAR-05, RF-TAR-06 |

**Criterios de aceptación**

1. **Dado** una tarifa sin liquidaciones asociadas, **cuando** cambio su valor de fracción, **entonces** el sistema guarda el cambio y lo registra en la bitácora.
2. **Dado** una tarifa ya usada en liquidaciones, **cuando** intento modificar sus valores, **entonces** el sistema me pide crear una tarifa nueva con vigencia y cerrar la actual, para no alterar los cobros históricos.
3. **Dado** una tarifa activa, **cuando** la inactivo y no queda otra vigente para ese tipo de vehículo y cliente, **entonces** el sistema advierte que las salidas de ese tipo no podrán liquidarse y pide confirmación.

- **Interfaz:** Configuración › Tarifas › Editar
- **API:** `PUT /api/v1/tarifas/:id`; `PATCH /api/v1/tarifas/:id/estado`

### HU-38 — Consultar las tarifas vigentes

**Como** Cliente, Operador o Visitante  
**quiero** ver las tarifas vigentes por tipo de vehículo  
**para** conocer el costo del servicio antes de usarlo

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 1 pts | Inferida (transparencia en el cobro — ficha §Justificación) | Inferida de la ficha del proyecto | RF-TAR-07 |

**Criterios de aceptación**

1. **Dado** tarifas vigentes, **cuando** abro Tarifas, **entonces** veo por tipo de vehículo y tipo de cliente el valor de la primera hora, la fracción, el tope diario y el tiempo de gracia.
2. **Dado** una tarifa programada para el futuro, **cuando** consulto, **entonces** aparece con la fecha desde la que aplicará.

- **Interfaz:** Página pública de tarifas; Configuración › Tarifas (listado)
- **API:** `GET /api/v1/tarifas?vigentes=true`

## Épica 9: Facturación y pagos

> Proceso: Tarifas y pagos · Spec: `specs/009-facturacion-pagos/spec.md` · SRS §4.9 · Actores: Operador, Administrador, Cliente

Convierte cada salida en un cobro correcto: liquida el valor según tarifa, membresía y descuentos, registra el pago con el método usado, emite el comprobante o factura electrónica y permite cuadrar la caja de cada turno.

### HU-39 — Liquidar el valor del servicio

**Como** Operador  
**quiero** que al registrar la salida el sistema calcule automáticamente el valor a pagar  
**para** cobrar sin errores ni discusiones con el cliente

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 5 pts | Inferida (ficha §Problemas 3 — facturación manual con errores; §Alcance — tarifas según tiempo) | Inferida de la ficha del proyecto | RF-FAC-01, RF-FAC-02, RF-FAC-03, RF-FAC-04 |

**Criterios de aceptación**

1. **Dado** la tarifa carro ocasional (primera hora $ 4.000, fracción de 15 min a $ 1.000, gracia 10 min) y una estadía de 135 minutos, **cuando** se registra la salida, **entonces** el sistema liquida $ 4.000 + 5 fracciones × $ 1.000 = $ 9.000 y muestra el detalle del cálculo.
2. **Dado** una estadía de 8 minutos con 10 minutos de gracia, **cuando** se liquida, **entonces** el valor es $ 0 y el movimiento se cierra sin cobro.
3. **Dado** un vehículo con membresía activa vigente, **cuando** se liquida, **entonces** el valor es $ 0 y el detalle indica «Cubierto por membresía».
4. **Dado** una estadía que supera el tope diario, **cuando** se liquida, **entonces** el valor no excede el tope por cada 24 horas.
5. **Dado** que no existe tarifa vigente para el tipo de vehículo, **cuando** se intenta liquidar, **entonces** el sistema responde «No hay tarifa vigente para moto» (409) y alerta al Administrador.

- **Interfaz:** Movimientos › Registrar salida (panel de liquidación)
- **API:** `GET /api/v1/movimientos/:id/liquidacion`

### HU-40 — Registrar el pago del servicio

**Como** Operador  
**quiero** registrar el pago indicando el método (efectivo, tarjeta, transferencia o QR)  
**para** dejar constancia del recaudo y entregar el cambio correcto

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 3 pts | Inferida (ficha §Alcance — facturación con integración a diferentes métodos de pago) | Inferida de la ficha del proyecto | RF-FAC-05, RF-FAC-06, RF-FAC-07, RF-FAC-08 |

**Criterios de aceptación**

1. **Dado** una liquidación de $ 9.000, **cuando** registro pago en efectivo con $ 10.000 recibidos, **entonces** el sistema registra el pago, calcula $ 1.000 de cambio y habilita la emisión del comprobante.
2. **Dado** un pago con tarjeta o transferencia, **cuando** confirmo, **entonces** el sistema exige el número de referencia o autorización.
3. **Dado** un valor recibido en efectivo menor que el total, **cuando** intento confirmar, **entonces** el sistema muestra el faltante y no registra el pago (422).
4. **Dado** un movimiento ya pagado, **cuando** intento registrar otro pago, **entonces** el sistema responde «El servicio ya fue pagado» (409).

- **Datos:** metodo (efectivo | tarjeta | transferencia | qr); valor_recibido (efectivo, ≥ total); referencia (4–40, obligatoria salvo efectivo)
- **Interfaz:** Movimientos › Registrar salida (cobro)
- **API:** `POST /api/v1/pagos`

### HU-41 — Emitir el comprobante o factura

**Como** Operador  
**quiero** emitir el comprobante de pago con numeración consecutiva  
**para** entregar al cliente un soporte válido de lo que pagó

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 3 pts | Inferida (ficha §Alcance — generar facturas electrónicas) | Inferida de la ficha del proyecto | RF-FAC-09, RF-FAC-10, RF-FAC-11, RF-FAC-12 |

**Criterios de aceptación**

1. **Dado** un pago registrado, **cuando** emito el comprobante, **entonces** el sistema genera la factura con número consecutivo (FV-000245), datos del parqueadero, placa, entrada, salida, tiempo, tarifa, descuentos, total y método de pago.
2. **Dado** una factura emitida, **cuando** el cliente tiene correo registrado, **entonces** el sistema la envía en PDF a su correo; en todo caso puedo imprimirla en 80 mm.
3. **Dado** que el cliente pide factura a nombre de una empresa, **cuando** ingreso NIT y razón social, **entonces** la factura sale a ese nombre.
4. **Dado** que el proveedor de facturación electrónica no responde, **cuando** emito, **entonces** el sistema emite el comprobante interno y marca la factura como pendiente de envío electrónico (TBD-02).

- **Interfaz:** Facturación › Comprobante (vista de impresión)
- **API:** `POST /api/v1/facturas`; `GET /api/v1/facturas/:id`; `GET /api/v1/facturas/:id/pdf`

### HU-42 — Anular una factura

**Como** Administrador  
**quiero** anular una factura emitida indicando el motivo  
**para** corregir cobros equivocados sin perder la trazabilidad

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 3 pts | Inferida (control financiero — ficha §Problemas 5) | Inferida de la ficha del proyecto | RF-FAC-13, RF-FAC-14 |

**Criterios de aceptación**

1. **Dado** una factura emitida, **cuando** la anulo con el motivo «Cobro duplicado» y confirmo, **entonces** queda en estado anulada con motivo, usuario y fecha, y su valor deja de sumar en reportes y cuadre de caja.
2. **Dado** una factura ya anulada, **cuando** intento anularla de nuevo, **entonces** el sistema responde 409.
3. **Dado** que soy Operador, **cuando** intento anular una factura, **entonces** el sistema responde 403.

- **Interfaz:** Facturación (listado, acción Anular)
- **API:** `PATCH /api/v1/facturas/:id/anulacion`

### HU-43 — Consultar facturas

**Como** Administrador o Cliente  
**quiero** buscar facturas por número, placa, cliente o fecha  
**para** atender reclamos y, como cliente, descargar mis comprobantes

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 2 pts | Inferida (consulta de facturación) | Inferida de la ficha del proyecto | RF-FAC-15, RF-FAC-16 |

**Criterios de aceptación**

1. **Dado** facturas emitidas, **cuando** el Administrador filtra por rango de fechas y método de pago, **entonces** ve las facturas con número, fecha, placa, cliente, total y estado, con el total del filtro.
2. **Dado** que soy Cliente, **cuando** abro Mis facturas, **entonces** solo veo mis facturas y puedo descargar cada una en PDF.
3. **Dado** un número de factura de otro cliente, **cuando** un Cliente intenta descargarla, **entonces** el sistema responde 403.

- **Interfaz:** Facturación (listado); Panel del cliente › Mis facturas
- **API:** `GET /api/v1/facturas?page&limit&q&desde&hasta&metodo&estado`; `GET /api/v1/usuarios/me/facturas`

### HU-44 — Cuadrar la caja del turno

**Como** Operador  
**quiero** generar el cuadre de caja de mi turno comparando lo registrado con el efectivo contado  
**para** entregar el turno con las cuentas claras

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 3 pts | Inferida (ficha §Consecuencias — falta de control de ingresos y egresos) | Inferida de la ficha del proyecto | RF-FAC-17, RF-FAC-18, RF-FAC-19 |

**Criterios de aceptación**

1. **Dado** pagos registrados en mi turno, **cuando** genero el cuadre, **entonces** el sistema muestra el total por método de pago, el número de servicios y el efectivo esperado.
2. **Dado** que ingreso el efectivo contado, **cuando** confirmo el cierre, **entonces** el sistema registra el cierre con la diferencia (sobrante o faltante) y no permite registrar más pagos en ese turno.
3. **Dado** un cierre registrado, **cuando** el Administrador lo consulta, **entonces** ve el detalle y las facturas incluidas.

- **Interfaz:** Facturación › Cierre de caja
- **API:** `GET /api/v1/caja/turno-actual`; `POST /api/v1/caja/cierres`; `GET /api/v1/caja/cierres`

## Épica 10: Membresías

> Proceso: Reservas y suscripciones · Spec: `specs/010-membresias/spec.md` · SRS §4.10 · Actores: Administrador, Operador, Cliente

Ofrece planes de pago mensual a clientes recurrentes: el Administrador define planes, el operador suscribe al cliente con su vehículo y, mientras la membresía esté vigente, el vehículo entra y sale sin pago por evento.

### HU-45 — Configurar planes de membresía

**Como** Administrador  
**quiero** crear planes mensuales por tipo de vehículo con su valor y beneficios  
**para** ofrecer opciones de pago recurrente a los clientes frecuentes

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 3 pts | Inferida (ficha §Alcance — Membresías o suscripciones: planes de pago mensuales) | Inferida de la ficha del proyecto | RF-MEM-01, RF-MEM-02 |

**Criterios de aceptación**

1. **Dado** que creo el plan «Mensual carro» de $ 180.000 para carros con 30 días de vigencia, **cuando** guardo, **entonces** el plan queda activo y disponible para suscripciones.
2. **Dado** un plan con el mismo nombre, **cuando** intento crearlo, **entonces** el sistema responde 409.
3. **Dado** un plan con membresías activas, **cuando** lo inactivo, **entonces** deja de ofrecerse para nuevas suscripciones pero las vigentes se mantienen hasta su fin.

- **Interfaz:** Configuración › Planes de membresía
- **API:** `GET /api/v1/planes-membresia`; `POST /api/v1/planes-membresia`; `PUT /api/v1/planes-membresia/:id`; `PATCH /api/v1/planes-membresia/:id/estado`

### HU-46 — Suscribir un cliente a un plan

**Como** Operador o Cliente  
**quiero** suscribir un vehículo de un cliente a un plan de membresía y pagarlo  
**para** que el cliente use el parqueadero sin pagar cada vez durante el mes

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 3 pts | Inferida (ficha §Objetivos 14 — módulo de membresías y mensualidades) | Inferida de la ficha del proyecto | RF-MEM-03, RF-MEM-04, RF-MEM-05 |

**Criterios de aceptación**

1. **Dado** un cliente con el carro ABC123 sin membresía activa, **cuando** lo suscribo al plan «Mensual carro» y registro el pago, **entonces** el sistema crea la membresía activa por 30 días, emite la factura y la muestra en el detalle del cliente.
2. **Dado** que ABC123 ya tiene una membresía activa, **cuando** intento suscribirlo de nuevo, **entonces** el sistema responde «El vehículo ya tiene una membresía activa hasta 15/12/2026» (409).
3. **Dado** un plan para carros, **cuando** intento suscribir una moto, **entonces** el sistema rechaza la suscripción (422).
4. **Dado** que el pago no se completa, **cuando** cierro el formulario, **entonces** la membresía no queda activa.

- **Interfaz:** Membresías › Nueva suscripción
- **API:** `POST /api/v1/membresias`

### HU-47 — Renovar o cancelar una membresía

**Como** Operador o Administrador  
**quiero** renovar una membresía o cancelarla  
**para** mantener al cliente sin interrupciones o terminar el servicio cuando lo pida

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 3 pts | Inferida (gestión de membresías) | Inferida de la ficha del proyecto | RF-MEM-06, RF-MEM-07, RF-MEM-08 |

**Criterios de aceptación**

1. **Dado** una membresía que vence el 15/12/2026, **cuando** la renuevo y registro el pago, **entonces** la nueva vigencia va del 16/12/2026 al 14/01/2027.
2. **Dado** una membresía activa, **cuando** la cancelo con motivo, **entonces** pasa a cancelada y las siguientes salidas del vehículo se liquidan con tarifa normal.
3. **Dado** la fecha de fin cumplida, **cuando** el proceso diario se ejecuta, **entonces** la membresía pasa a vencida automáticamente.

- **Interfaz:** Membresías › Detalle (Renovar / Cancelar)
- **API:** `POST /api/v1/membresias/:id/renovacion`; `PATCH /api/v1/membresias/:id/cancelacion`

### HU-48 — Consultar mi membresía

**Como** Cliente  
**quiero** ver mi membresía, su vigencia y mi historial de pagos  
**para** saber hasta cuándo puedo usar el servicio sin pagar por evento

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Baja | 2 pts | Inferida (panel del cliente) | Inferida de la ficha del proyecto | RF-MEM-09, RF-MEM-10 |

**Criterios de aceptación**

1. **Dado** que tengo una membresía activa, **cuando** abro Mi membresía, **entonces** veo plan, vehículo, fecha de inicio, fecha de fin y días restantes.
2. **Dado** que no tengo membresía, **cuando** abro la sección, **entonces** veo los planes disponibles.
3. **Dado** que faltan 5 días para el vencimiento, **cuando** abro mi panel, **entonces** veo el aviso de renovación.

- **Interfaz:** Panel del cliente › Mi membresía
- **API:** `GET /api/v1/usuarios/me/membresias`

## Épica 11: Beneficios y descuentos

> Proceso: Reservas y suscripciones · Spec: `specs/011-descuentos/spec.md` · SRS §4.11 · Actores: Administrador, Operador

Permite al Administrador definir promociones y descuentos (porcentaje o valor fijo) según el tipo de cliente o de vehículo y una vigencia, y los aplica automáticamente en la liquidación.

### HU-49 — Configurar un descuento o promoción

**Como** Administrador  
**quiero** crear descuentos por porcentaje o valor fijo para un tipo de cliente o de vehículo con vigencia  
**para** atraer y fidelizar clientes con promociones

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 3 pts | Inferida (ficha §Alcance — Beneficios y descuentos según el tipo de usuario) | Inferida de la ficha del proyecto | RF-DES-01, RF-DES-02 |

**Criterios de aceptación**

1. **Dado** que creo «Motos fin de semana» de 20 % para motos, vigente del 1 al 31 de diciembre, **cuando** guardo, **entonces** el descuento queda activo en ese periodo.
2. **Dado** que ingreso un porcentaje de 120, **cuando** guardo, **entonces** el sistema responde que debe estar entre 1 y 100 (422).
3. **Dado** que soy Operador, **cuando** intento crear un descuento, **entonces** el sistema responde 403.

- **Interfaz:** Configuración › Descuentos
- **API:** `GET /api/v1/descuentos`; `POST /api/v1/descuentos`; `PUT /api/v1/descuentos/:id`

### HU-50 — Aplicar el descuento en la liquidación

**Como** Operador  
**quiero** que la liquidación aplique automáticamente el descuento vigente que corresponda  
**para** cobrar el valor correcto sin calcular promociones a mano

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 3 pts | Inferida (ficha §Objetivos 15 — descuentos y beneficios personalizados) | Inferida de la ficha del proyecto | RF-DES-03, RF-DES-04 |

**Criterios de aceptación**

1. **Dado** una liquidación bruta de $ 9.000 de una moto en diciembre con el descuento de 20 % vigente, **cuando** se registra la salida, **entonces** el total es $ 7.200 y el detalle muestra el descuento aplicado.
2. **Dado** dos descuentos aplicables de 10 % y $ 2.000 sobre $ 9.000, **cuando** se liquida, **entonces** se aplica solo el de $ 2.000 por ser mayor.
3. **Dado** un vehículo con membresía vigente, **cuando** se liquida, **entonces** no se aplica descuento porque el total ya es $ 0.

- **Interfaz:** Movimientos › Registrar salida (detalle del descuento)
- **API:** `(parte de GET /api/v1/movimientos/:id/liquidacion)`

### HU-51 — Activar o inactivar un descuento

**Como** Administrador  
**quiero** activar o inactivar un descuento antes de su fin de vigencia  
**para** terminar una promoción cuando el negocio lo decida

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Baja | 1 pts | Inferida (gestión de descuentos) | Inferida de la ficha del proyecto | RF-DES-05 |

**Criterios de aceptación**

1. **Dado** un descuento activo, **cuando** lo inactivo y confirmo, **entonces** deja de aplicarse a las liquidaciones siguientes; las ya facturadas no cambian.
2. **Dado** un descuento con vigencia vencida, **cuando** intento activarlo, **entonces** el sistema pide ampliar la vigencia (422).

- **Interfaz:** Configuración › Descuentos (acción Cambiar estado)
- **API:** `PATCH /api/v1/descuentos/:id/estado`

## Épica 12: Reservas

> Proceso: Reservas y suscripciones · Spec: `specs/012-reservas/spec.md` · SRS §4.12 · Actores: Cliente, Operador

Permite a los clientes registrados apartar una celda para una fecha y hora futuras; el sistema la bloquea para otros, la libera si el cliente no llega a tiempo y la convierte en entrada cuando llega.

### HU-52 — Reservar una celda

**Como** Cliente  
**quiero** reservar una celda para una fecha y hora con uno de mis vehículos  
**para** tener asegurado mi espacio cuando llegue

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 5 pts | Inferida (ficha §Alcance — Reservas para clientes frecuentes) | Inferida de la ficha del proyecto | RF-RES-01, RF-RES-02, RF-RES-03 |

**Criterios de aceptación**

1. **Dado** que tengo el carro ABC123 registrado, **cuando** elijo mañana a las 08:00 y una celda de carro libre, **entonces** el sistema crea la reserva confirmada con un código y me la notifica por correo.
2. **Dado** una celda ya reservada en esa franja, **cuando** intento reservarla, **entonces** el sistema responde «La celda no está disponible en ese horario» (409) y sugiere otra.
3. **Dado** que elijo una fecha pasada o a más de 7 días, **cuando** confirmo, **entonces** el sistema rechaza la reserva (422).
4. **Dado** que no tengo vehículos asociados, **cuando** abro Reservar, **entonces** el sistema me indica que debo tener un vehículo registrado.

- **Datos:** id_vehiculo (propio); fecha_hora_inicio (futura, ≤ 7 días); id_celda (opcional: si no se elige, el sistema asigna una libre del tipo)
- **Interfaz:** Panel del cliente › Reservar
- **API:** `POST /api/v1/reservas`; `GET /api/v1/celdas/disponibles?fecha&tipo`

### HU-53 — Cancelar mi reserva

**Como** Cliente  
**quiero** cancelar una reserva que ya no voy a usar  
**para** liberar la celda para otros clientes

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 2 pts | Inferida (gestión de reservas) | Inferida de la ficha del proyecto | RF-RES-04, RF-RES-05 |

**Criterios de aceptación**

1. **Dado** una reserva confirmada que aún no inicia, **cuando** la cancelo, **entonces** queda cancelada, la celda queda libre en esa franja y recibo la confirmación.
2. **Dado** una reserva ya cumplida o vencida, **cuando** intento cancelarla, **entonces** el sistema responde 409.
3. **Dado** una reserva de otro cliente, **cuando** intento cancelarla, **entonces** el sistema responde 403.

- **Interfaz:** Panel del cliente › Mis reservas
- **API:** `PATCH /api/v1/reservas/:id/cancelacion`; `GET /api/v1/usuarios/me/reservas`

### HU-54 — Consultar las reservas del día

**Como** Operador  
**quiero** ver las reservas del día con su hora, celda y placa  
**para** preparar las celdas y atender a los clientes que llegan con reserva

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 2 pts | Inferida (operación en caseta) | Inferida de la ficha del proyecto | RF-RES-06 |

**Criterios de aceptación**

1. **Dado** reservas para hoy, **cuando** abro Reservas, **entonces** veo código, hora, placa, cliente, celda y estado, ordenadas por hora.
2. **Dado** el listado, **cuando** filtro por estado confirmada, **entonces** solo veo las pendientes de llegada.

- **Interfaz:** Reservas (listado del día)
- **API:** `GET /api/v1/reservas?fecha&estado`

### HU-55 — Cumplir o vencer una reserva

**Como** Operador  
**quiero** que la entrada de un vehículo con reserva use la celda reservada y que las reservas no usadas se liberen solas  
**para** respetar las reservas sin perder celdas por inasistencias

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 3 pts | Inferida (reglas de reserva) | Inferida de la ficha del proyecto | RF-RES-07, RF-RES-08, RF-RES-09 |

**Criterios de aceptación**

1. **Dado** una reserva confirmada de ABC123 para las 08:00, **cuando** registro la entrada de ABC123 a las 08:10, **entonces** el sistema usa la celda reservada y marca la reserva como cumplida.
2. **Dado** que ABC123 no llega antes de las 08:30 (30 minutos de espera), **cuando** el proceso de control se ejecuta, **entonces** la reserva pasa a vencida, la celda se libera y el cliente recibe una notificación.
3. **Dado** que la celda está reservada desde las 08:00, **cuando** otro vehículo intenta entrar a esa celda, **entonces** el sistema no la ofrece.

- **Interfaz:** Reservas (estado); Movimientos › Registrar entrada (aviso de reserva)
- **API:** `(efecto de POST /api/v1/movimientos)`; `tarea programada cada minuto`

## Épica 13: Incidencias

> Proceso: Seguridad y monitoreo · Spec: `specs/013-incidencias/spec.md` · SRS §4.13 · Actores: Operador, Administrador

Deja constancia formal de los incidentes que afectan a los vehículos dentro del parqueadero (rayones, choques, atropellamientos, golpes contra muros), con código único, vehículo, fecha y hora, para responder reclamos y hacerles seguimiento hasta cerrarlos.

### HU-56 — Registrar una incidencia

**Como** Operador  
**quiero** registrar una incidencia con su tipo, vehículo afectado, fecha y hora  
**para** dejar constancia formal ante un eventual reclamo del cliente

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 3 pts | Excel + completada | HU-INC-001 (3 CA) | RF-INC-01, RF-INC-02, RF-INC-03, RF-INC-04 |

**Criterios de aceptación**

1. **Dado** que selecciono el tipo «Rayón», la placa ABC123, la fecha y hora del evento y escribo la descripción, **cuando** confirmo, **entonces** el sistema registra la incidencia abierta con código único (INC-000031) y alerta al Administrador.
2. **Dado** que no selecciono tipo o vehículo, **cuando** intento guardar, **entonces** el sistema señala los campos obligatorios (422).
3. **Dado** que ingreso una fecha y hora futura, **cuando** confirmo, **entonces** el sistema rechaza el registro (422).
4. **Dado** que adjunto una foto JPG de evidencia de hasta 5 MB, **cuando** confirmo, **entonces** queda asociada a la incidencia.

- **Datos:** tipo (rayon | choque | atropellamiento | golpe_muro); placa (registrada u ocasional); fecha_hora_evento (≤ ahora); descripcion (10–500); evidencia (JPG/PNG ≤5 MB, opcional)
- **Interfaz:** Incidencias › Nueva incidencia
- **API:** `POST /api/v1/incidencias`

### HU-57 — Consultar incidencias

**Como** Operador o Administrador  
**quiero** buscar incidencias por código, placa, tipo, estado o fecha  
**para** responder reclamos con la información registrada

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 2 pts | Inferida (ficha §Alcance — gestionar reportes de incidentes) | Inferida de la ficha del proyecto | RF-INC-05, RF-INC-06 |

**Criterios de aceptación**

1. **Dado** incidencias registradas, **cuando** filtro por placa ABC123, **entonces** veo sus incidencias con código, tipo, fecha, estado y operador.
2. **Dado** una incidencia, **cuando** abro su detalle, **entonces** veo la descripción, la evidencia y el historial de seguimiento.

- **Interfaz:** Incidencias (listado); Incidencias › Detalle
- **API:** `GET /api/v1/incidencias?page&limit&q&tipo&estado&desde&hasta`; `GET /api/v1/incidencias/:id`

### HU-58 — Dar seguimiento y cerrar una incidencia

**Como** Administrador  
**quiero** registrar notas de seguimiento y cerrar la incidencia con su solución  
**para** saber qué se hizo con cada caso y cuándo terminó

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 3 pts | Inferida (ficha §Alcance — gestionar reportes de incidentes) | Inferida de la ficha del proyecto | RF-INC-07, RF-INC-08 |

**Criterios de aceptación**

1. **Dado** una incidencia abierta, **cuando** agrego una nota de seguimiento, **entonces** queda con fecha y usuario y la incidencia pasa a en seguimiento.
2. **Dado** una incidencia en seguimiento, **cuando** la cierro escribiendo la solución, **entonces** pasa a cerrada y ya no admite cambios.
3. **Dado** que intento cerrar sin escribir la solución, **cuando** confirmo, **entonces** el sistema la exige (422).

- **Interfaz:** Incidencias › Detalle (Seguimiento y Cierre)
- **API:** `POST /api/v1/incidencias/:id/seguimientos`; `PATCH /api/v1/incidencias/:id/cierre`

## Épica 14: Monitoreo, placas y alertas

> Proceso: Seguridad y monitoreo · Spec: `specs/014-monitoreo-alertas/spec.md` · SRS §4.14 · Actores: Administrador, Operador, Cliente, Servicio de reconocimiento de placas

Agrupa las capacidades de seguridad y monitoreo de la ficha: recibir la placa leída por un sistema de reconocimiento para agilizar el acceso, generar alertas a los administradores ante eventos de riesgo y notificar a los clientes los eventos que les interesan.

### HU-59 — Recibir la placa leída por reconocimiento automático

**Como** Operador  
**quiero** que la placa leída por la cámara llegue precargada a la pantalla de entrada o salida  
**para** agilizar el acceso y evitar errores de digitación

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Baja | 8 pts | Inferida (ficha §Alcance — Subproceso de reconocimiento de placa) | Inferida de la ficha del proyecto | RF-MON-01, RF-MON-02, RF-MON-03 |

**Criterios de aceptación**

1. **Dado** que el servicio de reconocimiento envía la placa ABC123 con 95 % de confianza por la puerta «Carrera 43», **cuando** la recibe el sistema, **entonces** la pantalla de esa puerta muestra la placa precargada para confirmar la entrada o la salida.
2. **Dado** una lectura con 70 % de confianza, **cuando** llega, **entonces** el sistema la marca como dudosa y exige que el operador la corrija o confirme.
3. **Dado** una petición sin la clave de integración válida, **cuando** llega al endpoint de lecturas, **entonces** el sistema la rechaza (401).

- **Interfaz:** Movimientos › Registrar entrada/salida (placa precargada)
- **API:** `POST /api/v1/lecturas-placa`; `GET /api/v1/lecturas-placa?puerta&estado=pendiente`

### HU-60 — Generar alertas para el administrador

**Como** Administrador  
**quiero** recibir alertas de eventos relevantes de la operación  
**para** reaccionar a tiempo ante riesgos y problemas

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 3 pts | Inferida (ficha §Alcance — Generación de alertas a administradores) | Inferida de la ficha del proyecto | RF-MON-04, RF-MON-05 |

**Criterios de aceptación**

1. **Dado** que se rechaza una entrada por pico y placa, se registra una incidencia, la ocupación de un tipo supera el 90 % o un vehículo cumple 24 horas dentro, **cuando** ocurre el evento, **entonces** el sistema crea una alerta visible en el icono de alertas del Administrador.
2. **Dado** alertas no leídas, **cuando** abro la bandeja de alertas, **entonces** las veo de la más reciente a la más antigua y puedo marcarlas como leídas.
3. **Dado** una alerta de incidencia, **cuando** la selecciono, **entonces** el sistema me lleva al detalle de la incidencia.

- **Interfaz:** Barra superior › Alertas
- **API:** `GET /api/v1/alertas?leida`; `PATCH /api/v1/alertas/:id/lectura`

### HU-61 — Notificar a los clientes

**Como** Cliente  
**quiero** recibir notificaciones por correo y en la aplicación sobre mis reservas, membresía y facturas  
**para** estar al tanto de lo que pasa con mis servicios

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 3 pts | Inferida (ficha §Alcance — enviar notificaciones a los clientes) | Inferida de la ficha del proyecto | RF-MON-06, RF-MON-07 |

**Criterios de aceptación**

1. **Dado** que se confirma, vence o cancela mi reserva, **cuando** ocurre el evento, **entonces** recibo un correo y una notificación en la aplicación.
2. **Dado** que mi membresía vence en 5 días, **cuando** corre el proceso diario, **entonces** recibo el aviso de renovación.
3. **Dado** que se emite una factura a mi nombre, **cuando** se genera, **entonces** recibo la factura en PDF por correo.
4. **Dado** que el envío de correo falla, **cuando** el sistema reintenta 3 veces sin éxito, **entonces** la notificación queda solo en la aplicación y se registra el fallo.

- **Interfaz:** (correo) Plantillas de notificación
- **API:** `(servicio interno de notificaciones)`

### HU-62 — Consultar mis notificaciones

**Como** Cliente  
**quiero** ver mis notificaciones en la aplicación  
**para** revisar avisos que no vi en el correo

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Baja | 2 pts | Inferida (bandeja de notificaciones) | Inferida de la ficha del proyecto | RF-MON-08 |

**Criterios de aceptación**

1. **Dado** notificaciones recibidas, **cuando** abro Notificaciones, **entonces** las veo de la más reciente a la más antigua con indicador de no leídas.
2. **Dado** una notificación, **cuando** la abro, **entonces** queda marcada como leída.

- **Interfaz:** Panel del cliente › Notificaciones
- **API:** `GET /api/v1/usuarios/me/notificaciones`; `PATCH /api/v1/notificaciones/:id/lectura`

## Épica 15: Reportes e indicadores

> Proceso: Generación de reportes y consultas · Spec: `specs/015-reportes-indicadores/spec.md` · SRS §4.15 · Actores: Administrador

Entrega al Administrador la información para decidir: listados operativos, reportes de ocupación y uso, ingresos por periodo y un tablero de indicadores, con filtros por fechas y exportación.

### HU-63 — Generar reportes operativos

**Como** Administrador  
**quiero** generar los listados de usuarios, vehículos con propietario, entradas, salidas e incidencias  
**para** conocer el estado general de la operación y tomar decisiones

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 5 pts | Excel + completada | HU-REP-001 (5 CA) | RF-REP-01, RF-REP-02, RF-REP-03, RF-REP-04, RF-REP-05 |

**Criterios de aceptación**

1. **Dado** que abro Reportes › Operativos y elijo «Usuarios», **cuando** genero, **entonces** veo todos los usuarios con todos sus datos (excepto la contraseña) y puedo exportarlos a CSV y PDF.
2. **Dado** el reporte «Vehículos», **cuando** genero, **entonces** veo cada vehículo con sus datos y su propietario.
3. **Dado** los reportes «Entradas» y «Salidas» con un rango de fechas, **cuando** genero, **entonces** veo fecha, hora, placa, puerta y celda de cada registro del periodo.
4. **Dado** el reporte «Incidencias» con un rango de fechas, **cuando** genero, **entonces** veo código, tipo, vehículo, fecha y estado.
5. **Dado** que soy Operador o Cliente, **cuando** intento acceder a Reportes, **entonces** el sistema responde 403.

- **Interfaz:** Reportes › Operativos
- **API:** `GET /api/v1/reportes/usuarios`; `GET /api/v1/reportes/vehiculos`; `GET /api/v1/reportes/entradas?desde&hasta`; `GET /api/v1/reportes/salidas?desde&hasta`; `GET /api/v1/reportes/incidencias?desde&hasta`; `(parámetro formato=csv|pdf)`

### HU-64 — Generar reportes de ocupación y uso

**Como** Administrador  
**quiero** generar reportes de pico y placa, ocupación diaria, celdas más usadas, vehículos frecuentes y horas pico  
**para** identificar patrones de uso y optimizar la operación

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 5 pts | Matriz Excel | HU-REP-002 (4 CA) | RF-REP-06, RF-REP-07, RF-REP-08, RF-REP-09 |

**Criterios de aceptación**

1. **Dado** una fecha, **cuando** genero «Vehículos restringidos», **entonces** veo el total y la lista de vehículos registrados cuya placa tiene restricción ese día y los intentos de ingreso rechazados.
2. **Dado** una fecha, **cuando** genero «Celdas ocupadas por día», **entonces** veo cuántas celdas se ocuparon por tipo de vehículo y el porcentaje de ocupación.
3. **Dado** un rango de fechas, **cuando** genero «Celdas más usadas» y «Vehículos frecuentes», **entonces** veo el top 10 por número de movimientos y horas acumuladas.
4. **Dado** un rango de fechas, **cuando** genero «Horas y días pico», **entonces** veo la ocupación promedio por día de la semana y por hora en una tabla de calor.

- **Interfaz:** Reportes › Ocupación y uso
- **API:** `GET /api/v1/reportes/restringidos?fecha`; `GET /api/v1/reportes/ocupacion-diaria?fecha`; `GET /api/v1/reportes/celdas-top?desde&hasta`; `GET /api/v1/reportes/vehiculos-top?desde&hasta`; `GET /api/v1/reportes/horas-pico?desde&hasta`

### HU-65 — Generar el reporte financiero

**Como** Administrador  
**quiero** ver los ingresos por periodo, método de pago, tipo de vehículo y concepto (servicio o membresía)  
**para** analizar el rendimiento financiero del parqueadero

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Alta | 5 pts | Inferida (ficha §Problemas 5 — falta de reportes financieros automáticos) | Inferida de la ficha del proyecto | RF-REP-10, RF-REP-11, RF-REP-12 |

**Criterios de aceptación**

1. **Dado** un rango de fechas, **cuando** genero el reporte financiero, **entonces** veo el total de ingresos, el número de servicios, el ticket promedio y la distribución por método de pago, tipo de vehículo y concepto.
2. **Dado** facturas anuladas en el periodo, **cuando** genero el reporte, **entonces** no suman al total y se listan aparte.
3. **Dado** el reporte, **cuando** lo exporto a CSV, **entonces** el archivo contiene una fila por factura con número, fecha, concepto, método y valor.

- **Interfaz:** Reportes › Financiero
- **API:** `GET /api/v1/reportes/ingresos?desde&hasta&formato`

### HU-66 — Consultar el tablero de indicadores

**Como** Administrador  
**quiero** ver en un tablero los indicadores clave del día y del mes  
**para** medir el desempeño de la operación de un vistazo

| Prioridad | Estimación | Origen | Excel | Requerimientos |
|---|---|---|---|---|
| Media | 5 pts | Inferida (ficha §Objetivos 20 — medición y desempeño de los procesos) | Inferida de la ficha del proyecto | RF-REP-13, RF-REP-14 |

**Criterios de aceptación**

1. **Dado** que abro Inicio como Administrador, **cuando** carga el tablero, **entonces** veo ocupación actual por tipo, entradas y salidas del día, ingresos del día y del mes, tiempo promedio de estadía, membresías activas e incidencias abiertas.
2. **Dado** el tablero, **cuando** cambio el periodo a «mes anterior», **entonces** los indicadores se recalculan para ese periodo.
3. **Dado** que no hay movimientos en el periodo, **cuando** consulto, **entonces** los indicadores muestran 0 sin errores.

- **Interfaz:** Inicio › Tablero del administrador
- **API:** `GET /api/v1/indicadores?periodo`

## Anexo A. Cobertura RF → HU

| RF | Historia | Prioridad |
|---|---|---|
| RF-ROL-01 | HU-01 | Alta |
| RF-ROL-02 | HU-01 | Alta |
| RF-ROL-03 | HU-01 | Alta |
| RF-ROL-04 | HU-02 | Media |
| RF-ROL-05 | HU-02 | Media |
| RF-ROL-06 | HU-02 | Media |
| RF-ROL-07 | HU-03 | Media |
| RF-ROL-08 | HU-03 | Media |
| RF-ROL-09 | HU-04 | Media |
| RF-ROL-10 | HU-04 | Media |
| RF-ROL-11 | HU-04 | Media |
| RF-ROL-12 | HU-05 | Media |
| RF-ROL-13 | HU-05 | Media |
| RF-ROL-14 | HU-05 | Media |
| RF-ROL-15 | HU-06 | Baja |
| RF-USR-01 | HU-07 | Alta |
| RF-USR-02 | HU-07 | Alta |
| RF-USR-03 | HU-07 | Alta |
| RF-USR-04 | HU-07 | Alta |
| RF-USR-05 | HU-07 | Alta |
| RF-USR-06 | HU-08 | Alta |
| RF-USR-07 | HU-08 | Alta |
| RF-USR-08 | HU-08 | Alta |
| RF-USR-09 | HU-09 | Media |
| RF-USR-10 | HU-09 | Media |
| RF-USR-11 | HU-09 | Media |
| RF-USR-12 | HU-10 | Alta |
| RF-USR-13 | HU-10 | Alta |
| RF-USR-14 | HU-10 | Alta |
| RF-USR-15 | HU-11 | Media |
| RF-USR-16 | HU-11 | Media |
| RF-USR-17 | HU-11 | Media |
| RF-ACC-01 | HU-12 | Alta |
| RF-ACC-02 | HU-12 | Alta |
| RF-ACC-03 | HU-12 | Alta |
| RF-ACC-04 | HU-12 | Alta |
| RF-ACC-05 | HU-13 | Alta |
| RF-ACC-06 | HU-13 | Alta |
| RF-ACC-07 | HU-14 | Media |
| RF-ACC-08 | HU-14 | Media |
| RF-ACC-09 | HU-14 | Media |
| RF-ACC-10 | HU-15 | Alta |
| RF-ACC-11 | HU-15 | Alta |
| RF-ACC-12 | HU-15 | Alta |
| RF-ACC-13 | HU-16 | Alta |
| RF-CLD-01 | HU-17 | Alta |
| RF-CLD-02 | HU-17 | Alta |
| RF-CLD-03 | HU-17 | Alta |
| RF-CLD-04 | HU-18 | Media |
| RF-CLD-05 | HU-18 | Media |
| RF-CLD-06 | HU-18 | Media |
| RF-CLD-07 | HU-19 | Media |
| RF-CLD-08 | HU-19 | Media |
| RF-CLD-09 | HU-20 | Alta |
| RF-CLD-10 | HU-20 | Alta |
| RF-CLD-11 | HU-20 | Alta |
| RF-CLD-12 | HU-20 | Alta |
| RF-CLD-13 | HU-21 | Media |
| RF-CLD-14 | HU-21 | Media |
| RF-CLD-15 | HU-21 | Media |
| RF-CLD-16 | HU-22 | Alta |
| RF-CLD-17 | HU-22 | Alta |
| RF-CLD-18 | HU-22 | Alta |
| RF-CLD-19 | HU-23 | Alta |
| RF-CLD-20 | HU-23 | Alta |
| RF-CLD-21 | HU-23 | Alta |
| RF-CLD-22 | HU-24 | Alta |
| RF-CLD-23 | HU-24 | Alta |
| RF-VEH-01 | HU-25 | Alta |
| RF-VEH-02 | HU-25 | Alta |
| RF-VEH-03 | HU-25 | Alta |
| RF-VEH-04 | HU-26 | Alta |
| RF-VEH-05 | HU-26 | Alta |
| RF-VEH-06 | HU-26 | Alta |
| RF-VEH-07 | HU-27 | Media |
| RF-VEH-08 | HU-27 | Media |
| RF-VEH-09 | HU-27 | Media |
| RF-VEH-10 | HU-28 | Alta |
| RF-VEH-11 | HU-28 | Alta |
| RF-VEH-12 | HU-28 | Alta |
| RF-PYP-01 | HU-29 | Alta |
| RF-PYP-02 | HU-29 | Alta |
| RF-PYP-03 | HU-29 | Alta |
| RF-PYP-04 | HU-29 | Alta |
| RF-PYP-05 | HU-30 | Media |
| RF-MOV-01 | HU-31 | Alta |
| RF-MOV-02 | HU-31 | Alta |
| RF-MOV-03 | HU-31 | Alta |
| RF-MOV-04 | HU-31 | Alta |
| RF-MOV-05 | HU-31 | Alta |
| RF-MOV-06 | HU-32 | Alta |
| RF-MOV-07 | HU-32 | Alta |
| RF-MOV-08 | HU-32 | Alta |
| RF-MOV-09 | HU-33 | Alta |
| RF-MOV-10 | HU-33 | Alta |
| RF-MOV-11 | HU-33 | Alta |
| RF-MOV-12 | HU-33 | Alta |
| RF-MOV-13 | HU-34 | Media |
| RF-MOV-14 | HU-34 | Media |
| RF-MOV-15 | HU-35 | Media |
| RF-MOV-16 | HU-35 | Media |
| RF-MOV-17 | HU-35 | Media |
| RF-TAR-01 | HU-36 | Alta |
| RF-TAR-02 | HU-36 | Alta |
| RF-TAR-03 | HU-36 | Alta |
| RF-TAR-04 | HU-37 | Media |
| RF-TAR-05 | HU-37 | Media |
| RF-TAR-06 | HU-37 | Media |
| RF-TAR-07 | HU-38 | Media |
| RF-FAC-01 | HU-39 | Alta |
| RF-FAC-02 | HU-39 | Alta |
| RF-FAC-03 | HU-39 | Alta |
| RF-FAC-04 | HU-39 | Alta |
| RF-FAC-05 | HU-40 | Alta |
| RF-FAC-06 | HU-40 | Alta |
| RF-FAC-07 | HU-40 | Alta |
| RF-FAC-08 | HU-40 | Alta |
| RF-FAC-09 | HU-41 | Alta |
| RF-FAC-10 | HU-41 | Alta |
| RF-FAC-11 | HU-41 | Alta |
| RF-FAC-12 | HU-41 | Alta |
| RF-FAC-13 | HU-42 | Media |
| RF-FAC-14 | HU-42 | Media |
| RF-FAC-15 | HU-43 | Media |
| RF-FAC-16 | HU-43 | Media |
| RF-FAC-17 | HU-44 | Media |
| RF-FAC-18 | HU-44 | Media |
| RF-FAC-19 | HU-44 | Media |
| RF-MEM-01 | HU-45 | Media |
| RF-MEM-02 | HU-45 | Media |
| RF-MEM-03 | HU-46 | Media |
| RF-MEM-04 | HU-46 | Media |
| RF-MEM-05 | HU-46 | Media |
| RF-MEM-06 | HU-47 | Media |
| RF-MEM-07 | HU-47 | Media |
| RF-MEM-08 | HU-47 | Media |
| RF-MEM-09 | HU-48 | Baja |
| RF-MEM-10 | HU-48 | Baja |
| RF-DES-01 | HU-49 | Media |
| RF-DES-02 | HU-49 | Media |
| RF-DES-03 | HU-50 | Media |
| RF-DES-04 | HU-50 | Media |
| RF-DES-05 | HU-51 | Baja |
| RF-RES-01 | HU-52 | Media |
| RF-RES-02 | HU-52 | Media |
| RF-RES-03 | HU-52 | Media |
| RF-RES-04 | HU-53 | Media |
| RF-RES-05 | HU-53 | Media |
| RF-RES-06 | HU-54 | Media |
| RF-RES-07 | HU-55 | Media |
| RF-RES-08 | HU-55 | Media |
| RF-RES-09 | HU-55 | Media |
| RF-INC-01 | HU-56 | Alta |
| RF-INC-02 | HU-56 | Alta |
| RF-INC-03 | HU-56 | Alta |
| RF-INC-04 | HU-56 | Alta |
| RF-INC-05 | HU-57 | Media |
| RF-INC-06 | HU-57 | Media |
| RF-INC-07 | HU-58 | Media |
| RF-INC-08 | HU-58 | Media |
| RF-MON-01 | HU-59 | Baja |
| RF-MON-02 | HU-59 | Baja |
| RF-MON-03 | HU-59 | Baja |
| RF-MON-04 | HU-60 | Media |
| RF-MON-05 | HU-60 | Media |
| RF-MON-06 | HU-61 | Media |
| RF-MON-07 | HU-61 | Media |
| RF-MON-08 | HU-62 | Baja |
| RF-REP-01 | HU-63 | Alta |
| RF-REP-02 | HU-63 | Alta |
| RF-REP-03 | HU-63 | Alta |
| RF-REP-04 | HU-63 | Alta |
| RF-REP-05 | HU-63 | Alta |
| RF-REP-06 | HU-64 | Media |
| RF-REP-07 | HU-64 | Media |
| RF-REP-08 | HU-64 | Media |
| RF-REP-09 | HU-64 | Media |
| RF-REP-10 | HU-65 | Alta |
| RF-REP-11 | HU-65 | Alta |
| RF-REP-12 | HU-65 | Alta |
| RF-REP-13 | HU-66 | Media |
| RF-REP-14 | HU-66 | Media |

## Anexo B. Trazabilidad con la matriz Excel

| Código en la matriz Excel | Historia v2.0 |
|---|---|
| HU-CONFIG-001 | HU-01 |
| HU-UM-001 | HU-07 |
| HU-UM-002 | HU-10 |
| HU-UM-003 | HU-11 |
| HU-UM-004 | HU-09 |
| HU-UM-005 | HU-26 |
| HU-UM-006 | HU-12 |
| HU-UM-007 | HU-13 |
| HU-USER-CREATE-01 | HU-07 |
| HU-USER-STATUS-01 | HU-10 |
| HU-VEH-001 | HU-25 |
| HU-VEH-002 | HU-27 |
| HU-RES-001 | HU-29 |
| HU-ACC-001 | HU-31, HU-32 |
| HU-ACC-002 | HU-33 |
| HU-CLD-001 | HU-22 |
| HU-CLD-002 | HU-23 |
| HU-INC-001 | HU-56 |
| HU-REP-001 | HU-63 |
| HU-REP-002 | HU-64 |

**Historias inferidas de la ficha (no estaban en la matriz):** HU-02 Registrar un rol con sus permisos, HU-03 Consultar y buscar roles, HU-04 Actualizar un rol y sus permisos, HU-05 Activar o inactivar un rol, HU-06 Consultar el catálogo de permisos, HU-08 Consultar y buscar usuarios, HU-14 Registrarme como cliente, HU-15 Recuperar mi contraseña, HU-16 Cerrar sesión, HU-17 Registrar un parqueadero, HU-18 Actualizar o inactivar un parqueadero, HU-19 Configurar las puertas de acceso, HU-20 Registrar celdas de parqueo, HU-21 Actualizar o inhabilitar una celda, HU-24 Consultar la disponibilidad en tiempo real, HU-28 Consultar vehículos, HU-30 Consultar la restricción vigente, HU-34 Consultar los vehículos dentro del parqueadero, HU-35 Anular un registro de entrada erróneo, HU-36 Configurar una tarifa, HU-37 Actualizar o inactivar una tarifa, HU-38 Consultar las tarifas vigentes, HU-39 Liquidar el valor del servicio, HU-40 Registrar el pago del servicio, HU-41 Emitir el comprobante o factura, HU-42 Anular una factura, HU-43 Consultar facturas, HU-44 Cuadrar la caja del turno, HU-45 Configurar planes de membresía, HU-46 Suscribir un cliente a un plan, HU-47 Renovar o cancelar una membresía, HU-48 Consultar mi membresía, HU-49 Configurar un descuento o promoción, HU-50 Aplicar el descuento en la liquidación, HU-51 Activar o inactivar un descuento, HU-52 Reservar una celda, HU-53 Cancelar mi reserva, HU-54 Consultar las reservas del día, HU-55 Cumplir o vencer una reserva, HU-57 Consultar incidencias, HU-58 Dar seguimiento y cerrar una incidencia, HU-59 Recibir la placa leída por reconocimiento automático, HU-60 Generar alertas para el administrador, HU-61 Notificar a los clientes, HU-62 Consultar mis notificaciones, HU-65 Generar el reporte financiero, HU-66 Consultar el tablero de indicadores.

## Anexo C. Equivalencias v1.0 → v2.0

Las rúbricas de las evidencias 2 y 3 citan los IDs de la v1.0; esta tabla los ubica en la v2.0.

| HU v1.0 | Título v1.0 | HU v2.0 |
|---|---|---|
| HU-01 | Definir los perfiles del sistema | HU-01 |
| HU-02 | Registrar un usuario nuevo | HU-07 |
| HU-03 | Gestionar el estado y los datos de usuarios | HU-09, HU-10 |
| HU-04 | Actualizar mis propios datos | HU-11 |
| HU-05 | Iniciar sesión según mi perfil | HU-12, HU-13 |
| HU-06 | Registrar y asignar un vehículo | HU-25, HU-26 |
| HU-07 | Actualizar o reasignar un vehículo | HU-27 |
| HU-08 | Configurar restricciones de pico y placa | HU-29 |
| HU-09 | Registrar el ingreso de un vehículo | HU-31, HU-32 |
| HU-10 | Bloquear el ingreso por pico y placa | HU-31 (criterio 2) |
| HU-11 | Ver la disponibilidad de celdas | HU-22, HU-24 |
| HU-12 | Actualizar el estado de una celda | HU-21, HU-23 |
| HU-13 | Registrar una incidencia | HU-56 |
| HU-14 | Configurar tarifas diferenciadas | HU-36, HU-37 |
| HU-15 | Facturar la salida de un vehículo | HU-39, HU-40, HU-41 |
| HU-16 | Reservar una celda con anticipación | HU-52 |
| HU-17 | Suscribirme a una membresía | HU-46 |
| HU-18 | Consultar reportes operativos y financieros | HU-63, HU-64, HU-65 |

