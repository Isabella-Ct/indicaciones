# Feature Specification: Roles y permisos

**Feature Branch**: `001-roles-permisos`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "001-roles-permisos — Módulo Roles y permisos del Sistema de Gestión de Parqueadero (Parking Lot ABC). Fuente: docs/SRS-Parking_Lot-v2.0.md §4.1 (RF-ROL-01..15), RN-01, RN-03, RN-04, Apéndice B.1 §4.1, modelo 6.1 §4.1 y docs/historias-usuario-Parking_Lot.md (HU-01..HU-06)."

**Fuentes de verdad**: SRS v2.0 §4.1 (RF-ROL-01 … RF-ROL-15), §5.3 (RNF-SEG-04, RNF-SEG-07), §5.5 (RN-01, RN-02, RN-03, RN-04), Apéndice B.1 §4.1, modelo lógico 6.1 §4.1; historias HU-01 … HU-06.

**Depende de**: ninguna spec (es la base del control de acceso). **La usan**: todas las demás specs, porque cada operación exige un permiso de este catálogo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Contar con los perfiles iniciales del sistema (Priority: P1) — HU-01

Como Administrador, quiero que el sistema arranque con los perfiles Administrador, Operador y Cliente y sus permisos base, para tener desde el primer día la estructura de seguridad y poder asignar un perfil a cada usuario.

**Why this priority**: sin roles y permisos no hay control de acceso. Todas las demás funcionalidades dependen de que cada operación pueda verificar el permiso del usuario.

**Independent Test**: se instala el sistema con los datos semilla y se consulta el listado de roles. Deben aparecer exactamente los tres roles base, activos, con sus permisos, y deben rechazarse los cambios prohibidos sobre ellos.

**Acceptance Scenarios**:

1. **Given** que el sistema se instala por primera vez con los datos semilla, **When** consulto los roles, **Then** existen únicamente Administrador, Operador y Cliente, todos activos y marcados como roles base. *(RF-ROL-01)*
2. **Given** el rol base Operador, **When** consulto su detalle, **Then** tiene los permisos de registrar usuarios, vehículos, movimientos, pagos, reservas e incidencias, y no tiene permisos de configuración ni de reportes financieros. *(RF-ROL-02)*
3. **Given** el rol base Administrador, **When** consulto su detalle, **Then** tiene todos los permisos del catálogo. *(RF-ROL-02)*
4. **Given** el rol base Cliente, **When** consulto su detalle, **Then** tiene solo permisos de consultas propias, reservas y actualización de sus datos. *(RF-ROL-02)*
5. **Given** un rol base, **When** intento inactivarlo o cambiarle el nombre, **Then** el sistema rechaza la acción con el mensaje «Los roles base no se pueden modificar» (conflicto, 409). *(RF-ROL-03, RN-01, RN-04)*

---

### User Story 2 - Registrar un rol con sus permisos (Priority: P2) — HU-02

Como Administrador, quiero crear un rol nuevo eligiendo sus permisos por módulo y acción, para darle a un nuevo tipo de empleado (por ejemplo, un supervisor de turno) solo el acceso que necesita.

**Why this priority**: amplía el modelo de seguridad más allá de los perfiles base. El sistema sigue siendo usable sin esto, pero con menos flexibilidad.

**Independent Test**: se crea el rol «Supervisor» con dos permisos y luego aparece en el listado como activo. Se intenta crear otro rol con el mismo nombre y otro sin permisos, y ambos se rechazan.

**Acceptance Scenarios**:

1. **Given** que ingreso un nombre único de 3 a 40 caracteres y marco al menos un permiso, **When** confirmo el registro, **Then** el sistema crea el rol en estado activo, no base, y lo muestra en el listado con el mensaje «Rol creado». *(RF-ROL-04)*
2. **Given** que ya existe el rol «Supervisor», **When** intento crear otro llamado « supervisor » (otras mayúsculas o espacios al inicio o al final), **Then** el sistema rechaza el registro con «Ya existe un rol con ese nombre» (409). *(RF-ROL-05)*
3. **Given** que no marco ningún permiso, **When** intento guardar, **Then** el formulario no se envía y muestra «Seleccione al menos un permiso» junto a la lista de permisos; si la petición llega igual al servidor, este la rechaza con «El rol debe tener al menos un permiso» (validación, 422). *(RF-ROL-06, RN-03)*
4. **Given** un nombre de menos de 3 o más de 40 caracteres, una descripción de más de 150, o un permiso que no existe en el catálogo, **When** intento guardar, **Then** el sistema rechaza la petición indicando el campo afectado (422). *(RF-ROL-04)*

---

### User Story 3 - Consultar y buscar roles (Priority: P2) — HU-03

Como Administrador, quiero ver la lista de roles con su estado, número de usuarios y permisos, para revisar quién tiene acceso a qué antes de hacer cambios.

**Why this priority**: es la puerta de entrada a la edición y al cambio de estado de los roles.

**Independent Test**: con los roles semilla y algunos creados, se abre el listado, se busca por texto, se filtra por estado y se abre un detalle. También se consulta un rol que no existe.

**Acceptance Scenarios**:

1. **Given** que existen roles registrados, **When** abro Configuración › Roles, **Then** veo una tabla paginada (10 por página por defecto) con nombre, descripción, número de usuarios asignados, estado y acciones, y el total de registros. *(RF-ROL-07)*
2. **Given** el listado de roles, **When** escribo «oper» en el buscador, **Then** la tabla muestra solo los roles cuyo nombre contiene ese texto, sin distinguir mayúsculas. *(RF-ROL-07)*
3. **Given** el listado de roles, **When** filtro por estado «inactivo», **Then** solo veo los roles inactivos. *(RF-ROL-07)*
4. **Given** un rol, **When** abro su detalle, **Then** veo sus permisos agrupados por módulo y la lista de usuarios que lo tienen. *(RF-ROL-08)*
5. **Given** un id de rol que no existe, **When** consulto su detalle, **Then** el sistema responde «Rol no encontrado» (404). *(RF-ROL-08)*

---

### User Story 4 - Actualizar un rol y sus permisos (Priority: P2) — HU-04

Como Administrador, quiero modificar el nombre, la descripción y los permisos de un rol, para ajustar el acceso cuando cambian las funciones de un tipo de usuario.

**Why this priority**: mantiene el modelo de seguridad al día sin tener que crear roles nuevos.

**Independent Test**: se edita un rol no base agregándole un permiso. Un usuario de ese rol que ya tenía sesión abierta no ve el permiso nuevo hasta que vuelve a iniciar sesión. Luego se prueban los rechazos.

**Acceptance Scenarios**:

1. **Given** un rol no base, **When** cambio su descripción, agrego el permiso «reportes.ver» y confirmo, **Then** el sistema guarda los cambios, registra el cambio en la bitácora y los usuarios con ese rol obtienen el permiso en su siguiente inicio de sesión (no en la sesión abierta). *(RF-ROL-09, RF-ROL-10, RNF-SEG-07)*
2. **Given** un rol, **When** intento cambiarle el nombre por uno que ya existe, **Then** el sistema rechaza el cambio con «Ya existe un rol con ese nombre» (409). *(RF-ROL-09)*
3. **Given** un rol, **When** intento quitarle todos los permisos, **Then** el sistema rechaza el cambio con «El rol debe tener al menos un permiso» (422). *(RN-03)*
4. **Given** el rol Administrador, **When** intento quitarle el permiso «roles.editar» o cualquier otro de gestión de roles y usuarios, **Then** el sistema lo impide con «El rol Administrador no puede perder los permisos de gestión de roles y usuarios» (409), porque el sistema quedaría sin administración. *(RF-ROL-11)*
5. **Given** un rol base, **When** cambio su descripción o sus permisos (sin cambiarle el nombre ni violar RF-ROL-11), **Then** el sistema guarda el cambio. *(RF-ROL-03, RF-ROL-09)*
6. **Given** un id de rol que no existe, **When** intento actualizarlo, **Then** el sistema responde «Rol no encontrado» (404).

---

### User Story 5 - Activar o inactivar un rol (Priority: P2) — HU-05

Como Administrador, quiero cambiar el estado de un rol entre activo e inactivo, para retirar de uso un perfil que ya no se necesita sin perder su historial.

**Why this priority**: permite retirar perfiles sin borrar datos. Depende de HU-02, porque solo se pueden inactivar los roles que no son base.

**Independent Test**: se inactiva un rol sin usuarios activos, se confirma que no aparece entre las opciones de asignación y se vuelve a activar. También se intenta inactivar un rol que tiene usuarios activos.

**Acceptance Scenarios**:

1. **Given** un rol no base sin usuarios activos, **When** lo inactivo y confirmo en el diálogo, **Then** el sistema cambia su estado a inactivo, lo registra en la bitácora y deja de ofrecerlo al crear o editar usuarios. *(RF-ROL-12, RF-ROL-14, RNF-SEG-07)*
2. **Given** un rol con usuarios activos asignados, **When** intento inactivarlo, **Then** el sistema rechaza la acción con «El rol tiene N usuarios activos» (409), donde N es la cantidad real. *(RF-ROL-13, RN-04)*
3. **Given** un rol base, **When** intento inactivarlo, **Then** el sistema rechaza la acción con «Los roles base no se pueden modificar» (409). *(RF-ROL-13, RN-01)*
4. **Given** un rol inactivo, **When** lo activo, **Then** vuelve a aparecer como opción al crear o editar usuarios. *(RF-ROL-12, RF-ROL-14)*
5. **Given** un estado distinto de «activo» o «inactivo», **When** intento aplicarlo, **Then** el sistema rechaza la petición indicando el campo (422).

---

### User Story 6 - Consultar el catálogo de permisos (Priority: P3) — HU-06

Como Administrador, quiero ver todos los permisos disponibles agrupados por módulo, para entender qué puedo habilitar al configurar un rol.

**Why this priority**: es informativo. La creación y la edición de roles ya muestran los permisos para elegirlos.

**Independent Test**: con el catálogo semilla cargado, se consultan los permisos y se verifica que vengan agrupados por módulo. Con un usuario sin permiso, la consulta se rechaza.

**Acceptance Scenarios**:

1. **Given** el catálogo de permisos cargado, **When** abro Configuración › Permisos, **Then** veo los permisos agrupados por módulo con su código y su descripción. *(RF-ROL-15)*
2. **Given** un usuario sin el permiso «roles.ver», **When** intenta consultar el catálogo o cualquier operación de roles, **Then** el sistema responde «No tiene permiso para esta acción» (403) y la opción no aparece en su menú. *(RNF-SEG-04)*
3. **Given** una petición sin sesión válida, **When** intenta consultar roles o permisos, **Then** el sistema responde «Sesión no válida o vencida» (401). *(RNF-SEG-03)*

---

### Edge Cases

- **Nombre con espacios o mayúsculas distintas**: « ADMINISTRADOR » choca con «Administrador». El nombre se guarda sin los espacios del inicio y del final, y la unicidad se compara sin distinguir mayúsculas (RF-ROL-05).
- **Permisos repetidos en la petición**: si el mismo permiso aparece dos veces, se guarda una sola vez y no se cuenta como error.
- **Usuarios inactivos con el rol**: un rol que solo tiene usuarios **inactivos** sí se puede inactivar (RF-ROL-13 habla de usuarios *activos*).
- **Rol inactivo con usuarios**: los usuarios que ya tienen un rol inactivo lo conservan. RF-ROL-14 solo impide asignarlo de nuevo.
- **Eliminar un rol**: no existe una operación de borrado. La única forma de retirar un rol es inactivarlo (eliminación lógica, constitución §II).
- **Rol que no existe en editar o cambiar estado**: 404 «Rol no encontrado».
- **Paginación fuera de rango**: `page` mayor que el número de páginas devuelve una lista vacía con el total real. `limit` mayor que 100 se rechaza con 422.
- **Cambio de estado sin efecto**: activar un rol que ya está activo responde con éxito sin modificar nada y sin escribir en la bitácora.
- **Sesiones abiertas**: los permisos de una sesión quedan fijos al iniciarla. Un cambio de permisos no afecta las sesiones abiertas hasta el siguiente inicio de sesión (RF-ROL-10).

## Requirements *(mandatory)*

### Functional Requirements

**Roles base (HU-01)**

- **FR-001** (RF-ROL-01): El sistema MUST crear en su parametrización inicial exactamente tres roles base activos: Administrador, Operador y Cliente.
- **FR-002** (RF-ROL-02): El sistema MUST asignar a cada rol base el conjunto de permisos de los datos semilla: Administrador tiene todos; Operador tiene la operación diaria (usuarios clientes, vehículos, movimientos, pagos y caja de su turno, reservas, incidencias, consulta de celdas, tarifas y restricciones); Cliente tiene sus consultas propias, las reservas y la actualización de sus datos.
- **FR-003** (RF-ROL-03, RN-01): El sistema MUST impedir inactivar o renombrar un rol base. No existe una operación para eliminar roles.

**Registro (HU-02)**

- **FR-004** (RF-ROL-04): El sistema MUST permitir al Administrador registrar un rol con nombre obligatorio (3–40 caracteres), descripción opcional (máximo 150) y uno o más permisos del catálogo. El rol nuevo queda activo y no base.
- **FR-005** (RF-ROL-05): El sistema MUST rechazar un nombre de rol ya registrado, comparando sin distinguir mayúsculas y sin los espacios del inicio y del final.
- **FR-006** (RF-ROL-06, RN-03): El sistema MUST rechazar el registro de un rol sin permisos.

**Consulta (HU-03)**

- **FR-007** (RF-ROL-07): El sistema MUST listar los roles con paginación (10 por defecto, máximo 100), búsqueda por nombre sin distinguir mayúsculas y filtro por estado, y mostrar nombre, descripción, número de usuarios asignados, estado, si es base y el total de registros.
- **FR-008** (RF-ROL-08): El sistema MUST mostrar el detalle de un rol con sus permisos agrupados por módulo y sus usuarios asignados (código, nombre y estado; sin datos de autenticación).

**Actualización (HU-04)**

- **FR-009** (RF-ROL-09): El sistema MUST permitir al Administrador actualizar el nombre, la descripción y los permisos de un rol, manteniendo el nombre único. A los roles base solo se les puede cambiar la descripción y los permisos.
- **FR-010** (RF-ROL-10): El sistema MUST aplicar los permisos actualizados a los usuarios del rol desde su siguiente inicio de sesión.
- **FR-011** (RF-ROL-11): El sistema MUST impedir retirar al rol Administrador los permisos de gestión de roles y de usuarios.

**Estado (HU-05)**

- **FR-012** (RF-ROL-12): El sistema MUST permitir al Administrador cambiar el estado de un rol entre activo e inactivo. La interfaz pide confirmación antes.
- **FR-013** (RF-ROL-13, RN-04): El sistema MUST rechazar la inactivación de un rol base y la de un rol con usuarios activos, informando cuántos usuarios activos tiene.
- **FR-014** (RF-ROL-14): El sistema MUST excluir los roles inactivos de las opciones para asignar a usuarios.

**Catálogo (HU-06)**

- **FR-015** (RF-ROL-15): El sistema MUST listar el catálogo de permisos agrupado por módulo, con código y descripción. El catálogo es fijo: lo cargan los datos semilla y no se edita desde la aplicación.

**Transversales**

- **FR-016** (RNF-SEG-04, RN-02): El sistema MUST verificar en el servidor, en cada operación de este módulo, el permiso correspondiente: `roles.ver` para consultar roles y permisos, `roles.crear` para registrar, `roles.editar` para actualizar y `roles.cambiar_estado` para activar o inactivar. Si falta el permiso, MUST responder «sin permiso» (403), aunque la opción esté oculta en la interfaz.
- **FR-017** (RNF-SEG-07): El sistema MUST registrar en la bitácora la creación, la actualización de permisos y los cambios de estado de los roles, con usuario, fecha y hora, acción, rol afectado, valor anterior y valor nuevo.
- **FR-018** (RNF-SEG-06): El sistema MUST validar toda entrada en el servidor y responder los errores de validación indicando el campo afectado y el motivo.
- **FR-019** (RNF-PRI-01): Los listados de usuarios asignados a un rol MUST mostrar solo los datos mínimos (código, nombre y estado), según la Ley 1581 de 2012.

### Key Entities *(include if feature involves data)*

- **Rol**: perfil de acceso que agrupa permisos. Atributos: código interno, nombre (único, 3–40), descripción (opcional, ≤150), indicador de rol base y estado (activo/inactivo). Un rol tiene muchos permisos y muchos usuarios.
- **Permiso**: acción permitida sobre un módulo, de un catálogo predefinido. Atributos: módulo (p. ej. «movimientos»), acción («ver», «crear», «editar», «cambiar_estado», «anular» o «exportar»), código único con la forma `modulo.accion` y descripción.
- **Asignación rol–permiso**: relación de muchos a muchos entre Rol y Permiso, sin datos propios.
- **Entrada de bitácora**: registro de auditoría de cada cambio. Guarda el usuario que actuó, la fecha y la hora, la acción, la entidad y el registro afectados, y el valor anterior y el nuevo. Es transversal: la usan también otras specs.
- **Usuario** (lo define la spec 002): aquí solo se lee su relación con el rol, para contar los usuarios asignados y los activos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una instalación nueva con los datos semilla tiene exactamente 3 roles base activos con sus permisos, y lo comprueba el 100 % de las pruebas de HU-01.
- **SC-002**: El 100 % de las operaciones de este módulo hechas por un usuario sin el permiso correspondiente se rechazan, aunque la opción esté oculta en la interfaz.
- **SC-003**: El Administrador crea un rol con sus permisos en menos de 2 minutos desde la pantalla de roles.
- **SC-004**: El listado y la búsqueda de roles responden en 1 segundo o menos en el 95 % de las consultas (RNF-REN-02).
- **SC-005**: Ningún rol base puede quedar renombrado o inactivo, y el rol Administrador nunca queda sin sus permisos de gestión de roles y usuarios. Ningún escenario de prueba lo consigue.
- **SC-006**: Cada criterio de aceptación de HU-01 a HU-06 tiene al menos una prueba automatizada y un caso en la colección de pruebas de la API, con un caso de éxito y uno de error por operación (RNF-CAL-03).

## Assumptions

- **Catálogo fijo de permisos**: el catálogo se crea con los datos semilla, con la forma `modulo.accion`, para los módulos de las 15 specs y las acciones de 6.1 (`ver`, `crear`, `editar`, `cambiar_estado`, `anular`, `exportar`), solo en las combinaciones que tienen sentido. El SRS no prevé crear permisos desde la aplicación.
- **Permisos protegidos del Administrador** (RF-ROL-11): son `roles.ver`, `roles.crear`, `roles.editar`, `roles.cambiar_estado`, `usuarios.ver`, `usuarios.crear`, `usuarios.editar` y `usuarios.cambiar_estado`.
- **Roles base editables en parte**: RF-ROL-03 prohíbe eliminar, inactivar y renombrar los roles base, pero no cambiar su descripción ni sus permisos. Se permite editar ambos, respetando RF-ROL-11.
- **Sin borrado**: el Apéndice B.1 no define borrar roles. Retirar un rol equivale a inactivarlo.
- **Permisos en la sesión**: los permisos del usuario quedan fijos al iniciar sesión (ver spec 003). Por eso RF-ROL-10 se cumple sin invalidar las sesiones abiertas.
- **Login mínimo**: para probar este módulo hace falta un inicio de sesión con documento y contraseña. Esta spec incluye una versión mínima solo para el Administrador y el Operador; la spec 003 la completa con bloqueo por intentos, cambio de contraseña, autorregistro, recuperación y cierre de sesión.
- **Usuarios**: la entidad Usuario y su CRUD son de la spec 002. Aquí solo se usan los usuarios semilla para contar asignaciones.
- **Interfaz**: las pantallas Configuración › Roles (listado, nuevo, detalle, editar, cambiar estado) y Configuración › Permisos forman parte de la rebanada vertical de esta spec (constitución §VII).
