# SRS — Sistema de Gestión de Parqueadero

## 1. Introducción

### 1.1 Propósito

Esta Especificación de Requerimientos de Software define el comportamiento funcional y las restricciones no funcionales del **Sistema de Gestión de Parqueadero** para el Parqueadero ABC (Carrera 43 # 47-53, Medellín; servicio 24 horas para carros y motos, 15 años de operación). Cubre el sistema completo: roles y permisos, usuarios, acceso, parqueaderos y celdas, vehículos, restricción de pico y placa, control de ingreso y salida con tickets, tarifas, facturación y pagos, membresías, descuentos, reservas, incidencias, monitoreo con alertas y reportes.

Esta es la **versión 2.0**. Sustituye a la v1.0 (2026-08-06), que solo recogía una parte de la matriz de historias de usuario. La v2.0 cubre el total del sistema: 15 características, 66 historias de usuario y 182 requerimientos funcionales, y sirve de insumo directo para el Desarrollo Guiado por Especificaciones (Spec-Driven Development) con GitHub spec-kit.

### 1.2 Convenciones del documento

- `RF-<CAR>-##` — requerimiento funcional; `<CAR>` es el código de la característica (tabla de la sección 4). La numeración es correlativa dentro de cada característica y no se reutiliza.
- `RNF-<CAT>-##` — requerimiento no funcional, con categorías fijas: `REN` rendimiento, `SEG` seguridad informática, `PRI` privacidad y datos personales, `SAF` seguridad física/safety, `USA` usabilidad, `CAL` otros atributos de calidad, `TEC` restricción tecnológica.
- `RN-##` — regla de negocio; `HU-##` — historia de usuario (`historias-usuario-Parking_Lot.md`); `TBD-##` — asunto pendiente (Apéndice C).
- `FR-###` — numeración de requerimientos dentro de cada spec de spec-kit; cada FR indica entre paréntesis el `RF-` del que proviene.
- Prioridad: **Alta** (sin esto el sistema no cumple su propósito), **Media** (el sistema es utilizable con trabajo manual adicional), **Baja** (mejora postergable). La prioridad del RF es la de su historia.
- «Debe» expresa una obligación vinculante. *Fuente* indica la historia v2.0 y el código de la matriz Excel del que proviene, o «inferida» si se dedujo de la ficha.
- La característica (sección 4) equivale a un **módulo**, a una **épica** del archivo de historias y a una **spec** (`specs/NNN-modulo/spec.md`).

### 1.3 Audiencia objetivo y sugerencias de lectura

- **Aprendices / equipo de desarrollo:** secciones 2.5, 3, 4 y 5 completas; luego la spec del módulo asignado y `constitution.md`.
- **QA / pruebas:** sección 4 (columna Verificación), sección 5 y los criterios Given-When-Then del archivo de historias.
- **Cliente (Parking Lot ABC):** secciones 1 y 2 para validar alcance y objetivos.
- **Instructores / Product Owner:** sección 4 (trazabilidad), Apéndice C (TBD) y Apéndice D (trazabilidad HU → RF → spec).

### 1.4 Alcance del producto

El sistema es una **aplicación web responsive** que reemplaza el control manual de entradas y salidas, la facturación en papel y la falta de información sobre la ocupación. Objetivos de negocio: reducir las filas en los accesos, eliminar los errores y disputas de cobro, conocer la disponibilidad de celdas en tiempo real, aplicar tarifas diferenciadas y membresías, y contar con reportes operativos y financieros para decidir.

El alcance sigue los procesos de la ficha del proyecto (versión 2): Configuración (roles y permisos), Usuarios (gestión de usuarios y acceso), Control de ingreso y salida (registro, tickets, disponibilidad), Tarifas y pagos (tarifas, facturación), Reservas y suscripciones (reservas, membresías, beneficios y descuentos) y Seguridad y monitoreo (incidentes, reconocimiento de placa, alertas), más los reportes de la matriz de historias.

**Fuera de alcance de esta versión:**

- Aplicación móvil nativa (la web responsive cubre el uso desde el celular).
- Control de barreras físicas, talanqueras o semáforos de ocupación (el sistema registra; no acciona hardware).
- Integración directa con la DIAN y con pasarelas de pago: el sistema genera el comprobante y registra el pago; la conexión con un proveedor tecnológico de facturación electrónica y de pagos con tarjeta queda pendiente (TBD-02).
- Contabilidad, nómina e inventario del parqueadero.

### 1.5 Referencias

- Ficha del proyecto — `Ficha Proyecto/Proyecto Parqueadero Version 2.docx` (fuente principal) y `Proyecto Parqueadero.docx` (versión 1).
- Matriz de historias de usuario — `Matriz Historias de Usuario/Matriz Historias de Usuario Proyecto Parking Lot.xlsx` (16 historias únicas en 32 filas).
- Requerimientos de usuario del cliente — `Matriz Historias de Usuario/Requerimientos Parking Lot.docx` (REQ-USR, REQ-CAR, REQ-INEX, REQ-INCD, REQ-CLD, REQ-REP).
- SRS v1.0 e historias v1.0 — `Requisitos (SRS)/v1.0/`.
- IEEE Std 830-1998, *Recommended Practice for Software Requirements Specifications*.
- Ley 1581 de 2012 y Decreto 1377 de 2013 (Colombia) — protección de datos personales.
- GitHub spec-kit — https://github.com/github/spec-kit (estructura de `spec.md` y `constitution.md`).

## 2. Descripción general

### 2.1 Perspectiva del producto

Producto nuevo y autocontenido que reemplaza procesos manuales (registro en papel, cálculo manual del cobro). Es un monolito web: un servidor Node.js/Express que expone una API REST y sirve el frontend, sobre una base de datos MySQL. Se relaciona con tres sistemas externos opcionales: un servicio de correo para notificaciones, un proveedor de facturación electrónica/pagos (TBD-02) y un servicio de reconocimiento de placas (TBD-01).

### 2.2 Funciones del producto

- **Roles y permisos** — perfiles iniciales del sistema, creación de roles y asignación de permisos por módulo y acción.
- **Gestión de usuarios** — registro, consulta, actualización y cambio de estado de usuarios (administradores, operadores y clientes).
- **Gestión de acceso** — inicio y cierre de sesión, autorregistro de clientes y recuperación de contraseña.
- **Parqueaderos y celdas** — sedes o zonas del parqueadero, puertas de acceso, celdas por tipo y disponibilidad en tiempo real.
- **Vehículos** — registro de vehículos, asociación con su propietario, actualización y reasignación.
- **Restricción de pico y placa** — configuración de la restricción de placas por día de la semana y tipo de vehículo.
- **Control de ingreso y salida** — registro de entradas con validación de pico y placa, tickets, registro de salidas con tiempo de estadía y vehículos dentro.
- **Tarifas** — tarifas diferenciadas por tipo de vehículo y tipo de cliente con hora, fracción, tope diario y tiempo de gracia.
- **Facturación y pagos** — liquidación del servicio, registro de pagos con varios métodos, comprobante/factura, anulación y cuadre de caja.
- **Membresías** — planes mensuales, suscripción de clientes, renovación, cancelación y vencimientos.
- **Beneficios y descuentos** — promociones y descuentos por tipo de cliente o vehículo aplicados en la liquidación.
- **Reservas** — reservas anticipadas de celdas para clientes frecuentes, cancelación, uso y vencimiento.
- **Incidencias** — registro, consulta y seguimiento de incidentes ocurridos dentro del parqueadero.
- **Monitoreo, placas y alertas** — recepción de placas leídas automáticamente, alertas a administradores y notificaciones a clientes.
- **Reportes e indicadores** — reportes operativos, de ocupación y financieros, y tablero de indicadores.

### 2.3 Clases de usuario y características

| Clase | Descripción | Frecuencia de uso | Privilegios | Importancia |
|---|---|---|---|---|
| Administrador | Dueño o administrador del parqueadero; configura el sistema y analiza el negocio | Diaria | Acceso total: roles, usuarios, parqueaderos, tarifas, descuentos, membresías, anulaciones y reportes | Alta |
| Operador | Empleado de la caseta de acceso; atiende entradas, salidas y cobros en su turno | Diaria, todo el turno | Registrar usuarios y vehículos, entradas, salidas, pagos, reservas e incidencias; consultar celdas; cuadre de su caja | Alta |
| Cliente | Persona registrada que estaciona con frecuencia (usuario registrado) | Semanal o diaria | Consultar disponibilidad, sus vehículos, reservas, membresía, facturas y notificaciones; actualizar sus datos | Media |

### 2.4 Ambiente de operación

Navegadores Chrome, Edge, Firefox y Safari en sus dos últimas versiones mayores, en computador o tableta en la caseta de acceso (operador), computador de escritorio (administrador) y celular (cliente). Servidor con Node.js 20 LTS y MySQL 8, disponible 24 horas porque el parqueadero opera las 24 horas.

### 2.5 Restricciones de diseño e implementación

El stack es una restricción del programa de formación (no una preferencia de diseño) y se detalla en `constitution.md`:

| ID | Requerimiento | Prioridad | Verificación |
|---|---|---|---|
| RNF-TEC-01 | El backend debe ser un monolito en Node.js 20 LTS con Express, organizado por capas (rutas, controladores, servicios, repositorios). | Alta | Inspección |
| RNF-TEC-02 | La base de datos debe ser MySQL 8, accedida con `mysql2/promise` mediante pool y consultas parametrizadas, sin ORM. | Alta | Inspección |
| RNF-TEC-03 | El frontend debe construirse con HTML5, CSS3 y JavaScript vanilla (ES2020, módulos ES), sin frameworks ni librerías. | Alta | Inspección |
| RNF-TEC-04 | La comunicación debe hacerse mediante una API REST JSON versionada en `/api/v1` con autenticación JWT. | Alta | Inspección |

### 2.6 Documentación de usuario

Manual de usuario por rol (Administrador, Operador, Cliente) y manual técnico (instalación, variables de entorno, scripts de base de datos y colección de pruebas de la API), en PDF, entregados con el aplicativo según los resultados esperados de la ficha.

### 2.7 Supuestos y dependencias

- **Supuesto:** El parqueadero tiene una sola sede física (Carrera 43 # 47-53), pero el modelo admite registrar más de un parqueadero/zona para no rehacer el sistema si se abre otra sede.
- **Supuesto:** En esta versión la placa se digita en la caseta; el reconocimiento automático se integra cuando exista el servicio (HU-59, TBD-01). Si el supuesto cambia, cambian HU-31 y HU-33.
- **Supuesto:** Los valores de tarifas, fracciones, tiempo de gracia, descuentos y reglas de pico y placa los configura el Administrador; el documento no fija cifras de negocio.
- **Supuesto:** El cliente (usuario registrado) accede con número de documento y contraseña. La ficha v2 pide recuperación de contraseña para todos los usuarios; el requerimiento REQ-USR-8 (acceso solo con documento) se reemplaza por seguridad (TBD-05).
- **Dependencia:** Servicio de correo SMTP para recuperación de contraseña y notificaciones (TBD-09).
- **Dependencia:** Proveedor de facturación electrónica y pasarela de pagos (TBD-02); sin él, el sistema emite comprobantes internos y registra pagos en efectivo, datáfono y transferencia.

## 3. Requerimientos de interfaz externa

### 3.1 Interfaces de usuario

Interfaz web en español con barra de navegación según el rol: Inicio (tablero), Movimientos, Celdas, Vehículos, Usuarios, Facturación, Reservas, Membresías, Incidencias, Reportes y Configuración (roles, tarifas, descuentos, pico y placa, parqueaderos). La pantalla de la caseta prioriza la captura de placa con el teclado: campo de placa con foco inicial, botones grandes de Entrada y Salida, y el resultado (celda asignada, ticket o valor a pagar) visible sin desplazarse.

Estándares comunes: tablas con búsqueda, paginación y acciones (ver, editar, cambiar estado); formularios con validación en línea y mensajes junto al campo; confirmación con `<dialog>` antes de anular, inactivar o eliminar; mensajes de éxito no bloqueantes; formatos colombianos (fecha dd/mm/aaaa, hora de 12 h con a. m./p. m., moneda `$ 12.500`).

### 3.2 Interfaces de hardware

No hay interfaces de hardware obligatorias en esta versión: el sistema corre en un computador o tableta con navegador. La impresión del ticket y de la factura usa la impresora configurada en el sistema operativo (impresora térmica opcional). Lectores de código de barras o QR funcionan como teclado y no requieren integración. Las cámaras de reconocimiento de placas se integrarán por software (TBD-01).

### 3.3 Interfaces de software

- **MySQL 8** — almacenamiento de todas las entidades del sistema (sección 6.1).
- **Servicio de correo (SMTP)** — envío de enlaces de recuperación de contraseña, notificaciones a clientes y alertas a administradores (TBD-09).
- **Proveedor de facturación electrónica y pagos** — opcional en esta versión (TBD-02).
- **Servicio de reconocimiento de placas** — opcional; enviará al sistema la placa leída y la puerta mediante `POST /api/v1/lecturas-placa` (HU-59, TBD-01).

### 3.4 Interfaces de comunicaciones

Comunicación cliente–servidor por HTTPS (TLS 1.2 o superior) con mensajes JSON sobre la API REST `/api/v1`. Autenticación por token JWT en el encabezado `Authorization: Bearer`. Correo saliente por SMTP con TLS. La disponibilidad de celdas se actualiza en la pantalla por consulta periódica a la API (cada 10 s), sin requerir WebSockets.

## 4. Características del sistema

Códigos de característica: `ROL` Roles y permisos, `USR` Gestión de usuarios, `ACC` Gestión de acceso, `CLD` Parqueaderos y celdas, `VEH` Vehículos, `PYP` Restricción de pico y placa, `MOV` Control de ingreso y salida, `TAR` Tarifas, `FAC` Facturación y pagos, `MEM` Membresías, `DES` Beneficios y descuentos, `RES` Reservas, `INC` Incidencias, `MON` Monitoreo, placas y alertas, `REP` Reportes e indicadores.

| § | Característica | Código | Prioridad | HU | RF | Spec |
|---|---|---|---|---|---|---|
| 4.1 | Roles y permisos | ROL | Alta | 6 | 15 | `001-roles-permisos` |
| 4.2 | Gestión de usuarios | USR | Alta | 5 | 17 | `002-gestion-usuarios` |
| 4.3 | Gestión de acceso | ACC | Alta | 5 | 13 | `003-gestion-acceso` |
| 4.4 | Parqueaderos y celdas | CLD | Alta | 8 | 23 | `004-parqueaderos-celdas` |
| 4.5 | Vehículos | VEH | Alta | 4 | 12 | `005-vehiculos` |
| 4.6 | Restricción de pico y placa | PYP | Alta | 2 | 5 | `006-pico-y-placa` |
| 4.7 | Control de ingreso y salida | MOV | Alta | 5 | 17 | `007-control-ingreso-salida` |
| 4.8 | Tarifas | TAR | Alta | 3 | 7 | `008-tarifas` |
| 4.9 | Facturación y pagos | FAC | Alta | 6 | 19 | `009-facturacion-pagos` |
| 4.10 | Membresías | MEM | Media | 4 | 10 | `010-membresias` |
| 4.11 | Beneficios y descuentos | DES | Media | 3 | 5 | `011-descuentos` |
| 4.12 | Reservas | RES | Media | 4 | 9 | `012-reservas` |
| 4.13 | Incidencias | INC | Alta | 3 | 8 | `013-incidencias` |
| 4.14 | Monitoreo, placas y alertas | MON | Media | 4 | 8 | `014-monitoreo-alertas` |
| 4.15 | Reportes e indicadores | REP | Alta | 4 | 14 | `015-reportes-indicadores` |

### 4.1 Roles y permisos

**4.1.1 Descripción y prioridad**

Administra los roles del sistema y los permisos que cada rol tiene sobre los módulos. Sin roles y permisos no hay control de acceso, por lo que es la base de todas las demás características. **Prioridad: Alta.**

Actores: Administrador. Historias: HU-01, HU-02, HU-03, HU-04, HU-05, HU-06. Spec: `specs/001-roles-permisos/spec.md`.

**4.1.2 Secuencias de estímulo/respuesta**

| HU | Estímulo del actor | Respuesta del sistema |
|---|---|---|
| HU-01 | Administrador solicita que el sistema arranque con los perfiles Administrador, Operador y Cliente con sus permisos base | Existen únicamente Administrador, Operador y Cliente, todos activos y marcados como roles base. |
| HU-02 | Administrador solicita crear un rol nuevo eligiendo sus permisos por módulo y acción | El sistema crea el rol en estado activo y lo muestra en el listado con el mensaje «Rol creado». |
| HU-03 | Administrador solicita ver la lista de roles con su estado, número de usuarios y permisos | Veo una tabla paginada (10 por página) con nombre, descripción, número de usuarios asignados, estado y acciones. |
| HU-04 | Administrador solicita modificar el nombre, la descripción y los permisos de un rol | El sistema guarda los cambios y los usuarios con ese rol obtienen el permiso en su siguiente inicio de sesión. |
| HU-05 | Administrador solicita cambiar el estado de un rol entre activo e inactivo | El sistema cambia su estado a inactivo y deja de ofrecerlo al crear usuarios. |
| HU-06 | Administrador solicita ver todos los permisos disponibles agrupados por módulo | Veo los permisos agrupados por módulo con su código y descripción. |

**4.1.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-ROL-01 | El sistema debe crear en su parametrización inicial exactamente tres roles base activos: Administrador, Operador y Cliente. | Alta | HU-01 · HU-CONFIG-001 | Prueba funcional (API) |
| RF-ROL-02 | El sistema debe asignar a cada rol base el conjunto de permisos definido en los datos semilla (Administrador: todos; Operador: operación diaria; Cliente: consultas propias, reservas y actualización de datos). | Alta | HU-01 · HU-CONFIG-001 | Prueba funcional (API) |
| RF-ROL-03 | El sistema debe impedir eliminar, inactivar o renombrar un rol base. | Alta | HU-01 · HU-CONFIG-001 | Prueba funcional (API) |
| RF-ROL-04 | El sistema debe permitir al Administrador registrar un rol con nombre, descripción opcional y uno o más permisos del catálogo. | Media | HU-02 · Inferida (ficha) | Prueba funcional (API) |
| RF-ROL-05 | El sistema debe rechazar un nombre de rol ya registrado, comparando sin distinguir mayúsculas ni espacios extremos. | Media | HU-02 · Inferida (ficha) | Prueba funcional (API) |
| RF-ROL-06 | El sistema debe rechazar el registro de un rol sin permisos. | Media | HU-02 · Inferida (ficha) | Prueba funcional (API) |
| RF-ROL-07 | El sistema debe listar los roles con paginación, búsqueda por nombre y filtro por estado, mostrando nombre, descripción, número de usuarios asignados y estado. | Media | HU-03 · Inferida (ficha) | Prueba funcional (API) |
| RF-ROL-08 | El sistema debe mostrar el detalle de un rol con sus permisos agrupados por módulo y sus usuarios asignados. | Media | HU-03 · Inferida (ficha) | Prueba de interfaz + API |
| RF-ROL-09 | El sistema debe permitir al Administrador actualizar nombre, descripción y permisos de un rol, manteniendo el nombre único. | Media | HU-04 · Inferida (ficha) | Prueba funcional (API) |
| RF-ROL-10 | El sistema debe aplicar los permisos actualizados a los usuarios del rol a partir de su siguiente inicio de sesión. | Media | HU-04 · Inferida (ficha) | Prueba funcional (API) |
| RF-ROL-11 | El sistema debe impedir retirar al rol Administrador los permisos de gestión de roles y usuarios. | Media | HU-04 · Inferida (ficha) | Prueba funcional (API) |
| RF-ROL-12 | El sistema debe permitir al Administrador cambiar el estado de un rol, previa confirmación. | Media | HU-05 · Inferida (ficha) | Prueba funcional (API) |
| RF-ROL-13 | El sistema debe rechazar la inactivación de un rol con usuarios activos asignados o de un rol base. | Media | HU-05 · Inferida (ficha) | Prueba funcional (API) |
| RF-ROL-14 | El sistema debe excluir los roles inactivos de las opciones de asignación a usuarios. | Media | HU-05 · Inferida (ficha) | Prueba funcional (API) |
| RF-ROL-15 | El sistema debe listar el catálogo de permisos agrupado por módulo, con código y descripción. | Baja | HU-06 · Inferida (ficha) | Prueba funcional (API) |

### 4.2 Gestión de usuarios

**4.2.1 Descripción y prioridad**

Administra las cuentas de las personas que usan el sistema: administradores, operadores y clientes registrados. El cliente registrado es además el propietario de vehículos, de reservas y de membresías. **Prioridad: Alta.**

Actores: Administrador, Operador, Cliente. Historias: HU-07, HU-08, HU-09, HU-10, HU-11. Depende de: 001-roles-permisos. Spec: `specs/002-gestion-usuarios/spec.md`.

**4.2.2 Secuencias de estímulo/respuesta**

| HU | Estímulo del actor | Respuesta del sistema |
|---|---|---|
| HU-07 | Administrador u Operador solicita registrar un usuario nuevo con sus datos de identificación y su tipo de usuario | El sistema crea el usuario activo, le asigna un código único autoincremental y muestra «Usuario registrado — código 1025». |
| HU-08 | Administrador u Operador solicita buscar usuarios por documento, nombre o correo y ver su detalle | Veo una tabla paginada con código, documento, nombre, correo, celular, rol y estado. |
| HU-09 | Administrador solicita corregir o modificar la información de cualquier usuario | El sistema guarda los cambios, registra la modificación en la bitácora y muestra «Usuario actualizado». |
| HU-10 | Administrador solicita cambiar el estado de un usuario entre activo e inactivo | El sistema cambia su estado a inactivo y muestra «Estado actualizado». |
| HU-11 | Cliente (usuario registrado) solicita actualizar mis datos de contacto desde mi cuenta | Veo mis datos y puedo editar nombre, correo, celular y foto; documento y código son de solo lectura. |

**4.2.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-USR-01 | El sistema debe permitir al Administrador y al Operador registrar usuarios con tipo de documento, número de documento, nombre completo, correo y celular como datos obligatorios, fotografía opcional y rol. | Alta | HU-07 · HU-UM-001, HU-USER-CREATE-01 | Prueba funcional (API) |
| RF-USR-02 | El sistema debe asignar a cada usuario un código único autoincremental que no se puede modificar. | Alta | HU-07 · HU-UM-001, HU-USER-CREATE-01 | Prueba funcional (API) |
| RF-USR-03 | El sistema debe rechazar el registro cuando el documento (tipo + número) o el correo ya existan. | Alta | HU-07 · HU-UM-001, HU-USER-CREATE-01 | Prueba funcional (API) |
| RF-USR-04 | El sistema debe restringir al Operador a registrar usuarios con rol Cliente. | Alta | HU-07 · HU-UM-001, HU-USER-CREATE-01 | Prueba funcional (API) |
| RF-USR-05 | El sistema debe generar una contraseña temporal para el usuario creado y enviarla a su correo, exigiendo cambiarla en el primer inicio de sesión. | Alta | HU-07 · HU-UM-001, HU-USER-CREATE-01 | Prueba funcional (entorno de pruebas de correo) |
| RF-USR-06 | El sistema debe listar usuarios con paginación, búsqueda por documento, nombre o correo y filtros por rol y estado. | Alta | HU-08 · Inferida (ficha) | Prueba funcional (API) |
| RF-USR-07 | El sistema debe mostrar el detalle de un usuario con sus vehículos y su membresía vigente, sin exponer datos de autenticación. | Alta | HU-08 · Inferida (ficha) | Prueba de interfaz + API |
| RF-USR-08 | El sistema debe limitar al Operador la consulta a usuarios con rol Cliente. | Alta | HU-08 · Inferida (ficha) | Prueba funcional (API) |
| RF-USR-09 | El sistema debe permitir solo al Administrador actualizar tipo y número de documento, nombre, correo, celular, foto y rol de cualquier usuario. | Media | HU-09 · HU-UM-004 | Prueba funcional (API) |
| RF-USR-10 | El sistema debe validar la unicidad de documento y correo al actualizar. | Media | HU-09 · HU-UM-004 | Prueba funcional (API) |
| RF-USR-11 | El sistema debe registrar en la bitácora el valor anterior y el nuevo de cada dato modificado. | Media | HU-09 · HU-UM-004 | Inspección + prueba funcional |
| RF-USR-12 | El sistema debe permitir solo al Administrador cambiar el estado de un usuario entre activo e inactivo, previa confirmación. | Alta | HU-10 · HU-UM-002, HU-USER-STATUS-01 | Prueba funcional (API) |
| RF-USR-13 | El sistema debe impedir el inicio de sesión de usuarios inactivos e invalidar sus sesiones abiertas. | Alta | HU-10 · HU-UM-002, HU-USER-STATUS-01 | Prueba funcional (API) |
| RF-USR-14 | El sistema debe impedir que un Administrador inactive su propia cuenta. | Alta | HU-10 · HU-UM-002, HU-USER-STATUS-01 | Prueba funcional (API) |
| RF-USR-15 | El sistema debe permitir a cada usuario actualizar su nombre, correo, celular y foto desde su perfil. | Media | HU-11 · HU-UM-003 | Prueba funcional (API) |
| RF-USR-16 | El sistema debe notificar al Administrador cada actualización de datos personales hecha por un usuario. | Media | HU-11 · HU-UM-003 | Prueba funcional (entorno de pruebas de correo) |
| RF-USR-17 | El sistema debe impedir que un usuario modifique datos de otra cuenta o su propio documento, código o rol. | Media | HU-11 · HU-UM-003 | Prueba funcional (API) |

### 4.3 Gestión de acceso

**4.3.1 Descripción y prioridad**

Autentica a los usuarios y entrega el token con el que la API autoriza cada operación según el rol. Incluye el autorregistro de clientes y la recuperación de contraseña por correo. **Prioridad: Alta.**

Actores: Administrador, Operador, Cliente. Historias: HU-12, HU-13, HU-14, HU-15, HU-16. Depende de: 002-gestion-usuarios. Spec: `specs/003-gestion-acceso/spec.md`.

**4.3.2 Secuencias de estímulo/respuesta**

| HU | Estímulo del actor | Respuesta del sistema |
|---|---|---|
| HU-12 | Administrador u Operador solicita ingresar con mi número de documento y contraseña | El sistema me autentica, entrega el token y me lleva a la pantalla de Movimientos con el menú de mi rol. |
| HU-13 | Cliente (usuario registrado) solicita ingresar al sistema con mi número de documento y mi contraseña | El sistema me lleva a mi panel con la disponibilidad de celdas, mis vehículos y mi membresía. |
| HU-14 | Visitante solicita crear mi cuenta de cliente desde la página de inicio | El sistema crea mi cuenta con rol Cliente activo y me permite iniciar sesión. |
| HU-15 | Usuario registrado solicita restablecer mi contraseña mediante un enlace enviado a mi correo | El sistema envía a mi correo registrado un enlace válido por 30 minutos y muestra «Si el documento está registrado, recibirá un correo». |
| HU-16 | Usuario autenticado solicita cerrar mi sesión | El sistema elimina el token del navegador, lo invalida en el servidor y me lleva al inicio de sesión. |

**4.3.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-ACC-01 | El sistema debe autenticar a Administradores y Operadores con número de documento y contraseña y entregar un token JWT con su rol y permisos. | Alta | HU-12 · HU-UM-006 | Prueba funcional (API) |
| RF-ACC-02 | El sistema debe responder con un mensaje genérico cuando las credenciales sean incorrectas. | Alta | HU-12 · HU-UM-006 | Prueba funcional (API) |
| RF-ACC-03 | El sistema debe bloquear temporalmente un documento tras 5 intentos fallidos en 15 minutos. | Alta | HU-12 · HU-UM-006 | Prueba funcional (API) |
| RF-ACC-04 | El sistema debe exigir el cambio de la contraseña temporal en el primer inicio de sesión. | Alta | HU-12 · HU-UM-006 | Prueba funcional (API) |
| RF-ACC-05 | El sistema debe autenticar a los Clientes con número de documento y contraseña. | Alta | HU-13 · HU-UM-007 | Prueba funcional (API) |
| RF-ACC-06 | El sistema debe dirigir al Cliente a su panel y limitar su menú a las opciones de su rol. | Alta | HU-13 · HU-UM-007 | Prueba funcional (API) |
| RF-ACC-07 | El sistema debe permitir el autorregistro de clientes con los mismos datos obligatorios del registro de usuarios más una contraseña. | Media | HU-14 · Inferida (ficha) | Prueba funcional (API) |
| RF-ACC-08 | El sistema debe asignar siempre el rol Cliente a las cuentas creadas por autorregistro. | Media | HU-14 · Inferida (ficha) | Prueba funcional (API) |
| RF-ACC-09 | El sistema debe exigir la aceptación de la autorización de tratamiento de datos para crear la cuenta. | Media | HU-14 · Inferida (ficha) | Prueba funcional (API) |
| RF-ACC-10 | El sistema debe enviar al correo registrado un enlace de recuperación de un solo uso con vigencia de 30 minutos. | Alta | HU-15 · Inferida (ficha) | Prueba funcional (entorno de pruebas de correo) |
| RF-ACC-11 | El sistema debe responder lo mismo exista o no el documento consultado. | Alta | HU-15 · Inferida (ficha) | Prueba funcional (API) |
| RF-ACC-12 | El sistema debe permitir definir una nueva contraseña con un enlace vigente e invalidarlo después de usarlo. | Alta | HU-15 · Inferida (ficha) | Prueba funcional (API) |
| RF-ACC-13 | El sistema debe invalidar el token de la sesión al cerrar sesión y rechazar peticiones posteriores con ese token. | Alta | HU-16 · Inferida (ficha) | Prueba funcional (API) |

### 4.4 Parqueaderos y celdas

**4.4.1 Descripción y prioridad**

Registra la infraestructura física —parqueaderos (sedes o zonas), sus puertas de acceso y sus celdas para carros y motos— y mantiene el estado de cada celda en tiempo real para que operadores y clientes sepan dónde hay espacio. **Prioridad: Alta.**

Actores: Administrador, Operador, Cliente, Visitante. Historias: HU-17, HU-18, HU-19, HU-20, HU-21, HU-22, HU-23, HU-24. Depende de: 001-roles-permisos. Spec: `specs/004-parqueaderos-celdas/spec.md`.

**4.4.2 Secuencias de estímulo/respuesta**

| HU | Estímulo del actor | Respuesta del sistema |
|---|---|---|
| HU-17 | Administrador solicita registrar un parqueadero (sede o zona) con su dirección, pisos y horario | El sistema crea el parqueadero activo y lo muestra en el listado. |
| HU-18 | Administrador solicita modificar los datos de un parqueadero o inactivarlo | El sistema guarda el cambio y muestra «Parqueadero actualizado». |
| HU-19 | Administrador solicita registrar las puertas de entrada y salida de cada parqueadero | Queda disponible para seleccionarla al registrar entradas y salidas. |
| HU-20 | Administrador solicita registrar las celdas de un parqueadero con su código, tipo de vehículo, piso y área | El sistema la crea en estado disponible. |
| HU-21 | Administrador solicita editar los datos de una celda o inhabilitarla temporalmente | El sistema la marca inhabilitada y deja de asignarla. |
| HU-22 | Operador o Cliente solicita ver las celdas del parqueadero con su código, tipo y estado | Veo cada celda con su código, tipo (carro o moto) y estado diferenciado por color y por texto (disponible, ocupada, reservada, inhabilitada). |
| HU-23 | Operador solicita que el sistema cambie el estado de la celda al registrar una entrada o una salida | La celda pasa a ocupada y queda asociada a ese vehículo en la misma transacción. |
| HU-24 | Visitante, Cliente u Operador solicita ver cuántas celdas libres hay por tipo de vehículo | Veo por parqueadero el número de celdas disponibles y totales para carros y para motos, con la hora de actualización. |

**4.4.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-CLD-01 | El sistema debe permitir al Administrador registrar parqueaderos con nombre único, dirección, número de pisos (1–20) y horario. | Alta | HU-17 · Inferida (ficha) | Prueba funcional (API) |
| RF-CLD-02 | El sistema debe listar los parqueaderos con paginación, búsqueda por nombre y el total de celdas por tipo de vehículo. | Alta | HU-17 · Inferida (ficha) | Prueba funcional (API) |
| RF-CLD-03 | El sistema debe mostrar el detalle de un parqueadero con sus puertas y celdas. | Alta | HU-17 · Inferida (ficha) | Prueba de interfaz + API |
| RF-CLD-04 | El sistema debe permitir al Administrador actualizar nombre, dirección, pisos y horario de un parqueadero. | Media | HU-18 · Inferida (ficha) | Prueba funcional (API) |
| RF-CLD-05 | El sistema debe permitir inactivar un parqueadero solo si no tiene vehículos dentro, dejando sus celdas fuera de servicio. | Media | HU-18 · Inferida (ficha) | Prueba funcional (API) |
| RF-CLD-06 | El sistema debe impedir reducir los pisos por debajo del piso más alto con celdas registradas. | Media | HU-18 · Inferida (ficha) | Prueba funcional (API) |
| RF-CLD-07 | El sistema debe permitir registrar, editar e inactivar puertas de acceso por parqueadero con nombre único y tipo (entrada, salida o mixta). | Media | HU-19 · Inferida (ficha) | Prueba funcional (API) |
| RF-CLD-08 | El sistema debe ofrecer en cada registro de movimiento solo las puertas activas del tipo correspondiente. | Media | HU-19 · Inferida (ficha) | Prueba funcional (API) |
| RF-CLD-09 | El sistema debe permitir al Administrador registrar celdas con código único por parqueadero, tipo de vehículo (carro o moto), piso y área. | Alta | HU-20 · Inferida (ficha) | Prueba funcional (API) |
| RF-CLD-10 | El sistema debe normalizar el código de la celda en mayúsculas y rechazar duplicados dentro del mismo parqueadero. | Alta | HU-20 · Inferida (ficha) | Prueba funcional (API) |
| RF-CLD-11 | El sistema debe validar que el piso de la celda exista en el parqueadero. | Alta | HU-20 · Inferida (ficha) | Prueba funcional (API) |
| RF-CLD-12 | El sistema debe permitir registrar celdas por rango (prefijo, número inicial y final) informando las omitidas por duplicadas. | Alta | HU-20 · Inferida (ficha) | Prueba funcional (API) |
| RF-CLD-13 | El sistema debe permitir al Administrador editar código, tipo, piso y área de una celda que no esté ocupada. | Media | HU-21 · Inferida (ficha) | Prueba funcional (API) |
| RF-CLD-14 | El sistema debe permitir inhabilitar con motivo y habilitar una celda que no esté ocupada ni reservada. | Media | HU-21 · Inferida (ficha) | Prueba funcional (API) |
| RF-CLD-15 | El sistema debe impedir cambiar manualmente una celda a ocupada o a disponible cuando tenga un vehículo dentro. | Media | HU-21 · Inferida (ficha) | Prueba funcional (API) |
| RF-CLD-16 | El sistema debe mostrar las celdas por parqueadero, piso y área con código, tipo y estado, diferenciando el estado por color y texto. | Alta | HU-22 · HU-CLD-001 | Prueba de interfaz + API |
| RF-CLD-17 | El sistema debe permitir filtrar las celdas por tipo de vehículo y estado. | Alta | HU-22 · HU-CLD-001 | Prueba funcional (API) |
| RF-CLD-18 | El sistema debe mostrar al Operador la placa y la hora de entrada del vehículo de una celda ocupada y ocultar esa información a los Clientes. | Alta | HU-22 · HU-CLD-001 | Prueba de interfaz + API |
| RF-CLD-19 | El sistema debe marcar la celda como ocupada y asociarle el vehículo al registrar la entrada, dentro de la misma transacción. | Alta | HU-23 · HU-CLD-002 | Prueba funcional (API) |
| RF-CLD-20 | El sistema debe marcar la celda como disponible y desasociar el vehículo al registrar la salida o anular la entrada. | Alta | HU-23 · HU-CLD-002 | Prueba funcional (API) |
| RF-CLD-21 | El sistema debe reflejar en las pantallas abiertas el estado actualizado de las celdas en 10 segundos o menos. | Alta | HU-23 · HU-CLD-002 | Prueba de interfaz + API |
| RF-CLD-22 | El sistema debe exponer sin autenticación el resumen de celdas disponibles y totales por parqueadero y tipo de vehículo. | Alta | HU-24 · Inferida (ficha) | Prueba funcional (API) |
| RF-CLD-23 | El sistema debe mostrar «Lleno» cuando no haya celdas disponibles de un tipo. | Alta | HU-24 · Inferida (ficha) | Prueba de interfaz + API |

### 4.5 Vehículos

**4.5.1 Descripción y prioridad**

Registra los vehículos (carros y motos) con su placa, color, marca y modelo, y los asocia a su propietario registrado. La placa es la llave con la que se controlan entradas, salidas, restricciones, membresías e incidencias. **Prioridad: Alta.**

Actores: Administrador, Operador, Cliente. Historias: HU-25, HU-26, HU-27, HU-28. Depende de: 002-gestion-usuarios. Spec: `specs/005-vehiculos/spec.md`.

**4.5.2 Secuencias de estímulo/respuesta**

| HU | Estímulo del actor | Respuesta del sistema |
|---|---|---|
| HU-25 | Administrador u Operador solicita registrar un vehículo con placa, tipo, color, marca y modelo | El sistema guarda la placa como ABC123 y muestra «Vehículo registrado». |
| HU-26 | Administrador u Operador solicita asignar a un usuario un vehículo de su propiedad | El vehículo aparece en el detalle del usuario y en «Mis vehículos» del cliente. |
| HU-27 | Administrador solicita actualizar los datos de un vehículo o reasignarlo a otro usuario | El sistema guarda el cambio y lo registra en la bitácora. |
| HU-28 | Administrador, Operador o Cliente solicita buscar vehículos por placa o propietario y ver su detalle | Veo los vehículos cuya placa contiene ese texto con tipo, color, marca, propietario y si está dentro del parqueadero. |

**4.5.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-VEH-01 | El sistema debe permitir al Administrador y al Operador registrar vehículos con placa, tipo, color, marca y modelo. | Alta | HU-25 · HU-VEH-001 | Prueba funcional (API) |
| RF-VEH-02 | El sistema debe normalizar la placa (mayúsculas, sin espacios ni guiones) y validar su formato según el tipo de vehículo. | Alta | HU-25 · HU-VEH-001 | Prueba funcional (API) |
| RF-VEH-03 | El sistema debe rechazar el registro de una placa existente. | Alta | HU-25 · HU-VEH-001 | Prueba funcional (API) |
| RF-VEH-04 | El sistema debe permitir al Administrador y al Operador asociar un vehículo registrado y sin propietario a un usuario registrado y activo. | Alta | HU-26 · HU-UM-005 | Prueba funcional (API) |
| RF-VEH-05 | El sistema debe rechazar la asociación de vehículos o usuarios no registrados. | Alta | HU-26 · HU-UM-005 | Prueba funcional (API) |
| RF-VEH-06 | El sistema debe impedir que el Operador cambie el propietario de un vehículo que ya tiene uno. | Alta | HU-26 · HU-UM-005 | Prueba funcional (API) |
| RF-VEH-07 | El sistema debe permitir solo al Administrador actualizar placa, tipo, color, marca y modelo de un vehículo. | Media | HU-27 · HU-VEH-002 | Prueba funcional (API) |
| RF-VEH-08 | El sistema debe permitir solo al Administrador reasignar un vehículo a otro usuario registrado y activo, conservando el historial con el propietario anterior. | Media | HU-27 · HU-VEH-002 | Prueba funcional (API) |
| RF-VEH-09 | El sistema debe registrar en la bitácora cada actualización y reasignación de vehículos. | Media | HU-27 · HU-VEH-002 | Inspección + prueba funcional |
| RF-VEH-10 | El sistema debe listar vehículos con paginación, búsqueda por placa y filtros por tipo, propietario y presencia en el parqueadero. | Alta | HU-28 · Inferida (ficha) | Prueba funcional (API) |
| RF-VEH-11 | El sistema debe mostrar el detalle de un vehículo con su propietario y sus últimos movimientos. | Alta | HU-28 · Inferida (ficha) | Prueba de interfaz + API |
| RF-VEH-12 | El sistema debe limitar al Cliente la consulta a sus propios vehículos. | Alta | HU-28 · Inferida (ficha) | Prueba funcional (API) |

### 4.6 Restricción de pico y placa

**4.6.1 Descripción y prioridad**

Permite configurar, por día de la semana, tipo de vehículo y franja horaria, los dígitos de placa que tienen restricción, para que el registro de entrada niegue el ingreso a los vehículos restringidos tal como lo pidió el cliente. **Prioridad: Alta.**

Actores: Administrador, Operador. Historias: HU-29, HU-30. Depende de: 005-vehiculos. Spec: `specs/006-pico-y-placa/spec.md`.

**4.6.2 Secuencias de estímulo/respuesta**

| HU | Estímulo del actor | Respuesta del sistema |
|---|---|---|
| HU-29 | Administrador solicita definir para cada día de la semana y tipo de vehículo los dígitos de placa restringidos y su horario | La restricción queda activa y aparece en la tabla semanal. |
| HU-30 | Operador o Cliente solicita ver qué dígitos tienen restricción hoy y en qué horario | Veo un aviso con los dígitos restringidos por tipo de vehículo y la franja horaria. |

**4.6.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-PYP-01 | El sistema debe permitir al Administrador registrar restricciones de placa por día de la semana, tipo de vehículo, dígitos restringidos, posición del dígito evaluado y franja horaria. | Alta | HU-29 · HU-RES-001 | Prueba funcional (API) |
| RF-PYP-02 | El sistema debe validar que los dígitos estén entre 0 y 9 sin repetir y que la hora final sea posterior a la inicial. | Alta | HU-29 · HU-RES-001 | Prueba funcional (API) |
| RF-PYP-03 | El sistema debe impedir restricciones activas superpuestas para el mismo día y tipo de vehículo. | Alta | HU-29 · HU-RES-001 | Prueba funcional (API) |
| RF-PYP-04 | El sistema debe permitir al Administrador editar y eliminar restricciones, aplicando el cambio a partir de ese momento. | Alta | HU-29 · HU-RES-001 | Prueba funcional (API) |
| RF-PYP-05 | El sistema debe mostrar la restricción de placa vigente para la fecha actual por tipo de vehículo. | Media | HU-30 · Inferida (ficha) | Prueba de interfaz + API |

### 4.7 Control de ingreso y salida

**4.7.1 Descripción y prioridad**

Es el proceso central del parqueadero: registra la entrada de cada vehículo (puerta, placa, fecha y hora, celda), valida la restricción de pico y placa, genera el ticket, registra la salida calculando el tiempo de estadía y deja el movimiento listo para facturar. **Prioridad: Alta.**

Actores: Operador, Administrador. Historias: HU-31, HU-32, HU-33, HU-34, HU-35. Depende de: 004-parqueaderos-celdas, 005-vehiculos, 006-pico-y-placa. Spec: `specs/007-control-ingreso-salida/spec.md`.

**4.7.2 Secuencias de estímulo/respuesta**

| HU | Estímulo del actor | Respuesta del sistema |
|---|---|---|
| HU-31 | Operador solicita registrar la entrada de un vehículo indicando puerta y placa, con fecha y hora automáticas | El sistema crea el movimiento abierto con la fecha y hora del servidor, asigna la celda disponible de menor código (o la que yo elija) y muestra celda y ticket. |
| HU-32 | Operador solicita que al registrar la entrada el sistema genere un ticket electrónico o imprimible | Genera un ticket con código único consecutivo (T-000123), placa, tipo, celda, puerta, fecha y hora de entrada y el nombre del parqueadero. |
| HU-33 | Operador solicita registrar la salida de un vehículo por placa o ticket | El sistema cierra el movimiento con la hora del servidor, calcula 135 minutos de estadía y muestra la liquidación del valor a pagar. |
| HU-34 | Operador o Administrador solicita ver la lista de vehículos que están dentro con su celda y tiempo transcurrido | Veo placa, tipo, celda, hora de entrada y tiempo transcurrido, ordenados del más antiguo al más reciente. |
| HU-35 | Operador o Administrador solicita anular una entrada registrada por error indicando el motivo | El movimiento queda anulado, la celda vuelve a disponible y el ticket queda inválido. |

**4.7.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-MOV-01 | El sistema debe registrar la entrada de un vehículo con puerta de acceso y placa, tomando la fecha y hora del servidor. | Alta | HU-31 · HU-ACC-001 | Prueba funcional (API) |
| RF-MOV-02 | El sistema debe validar la placa contra la restricción de pico y placa vigente antes de registrar la entrada y rechazarla indicando el motivo cuando esté restringida. | Alta | HU-31 · HU-ACC-001 | Prueba funcional (API) |
| RF-MOV-03 | El sistema debe rechazar la entrada de una placa con un movimiento abierto. | Alta | HU-31 · HU-ACC-001 | Prueba funcional (API) |
| RF-MOV-04 | El sistema debe asignar una celda disponible del tipo del vehículo (sugerida o elegida por el operador) y rechazar la entrada si no hay celdas de ese tipo. | Alta | HU-31 · HU-ACC-001 | Prueba funcional (API) |
| RF-MOV-05 | El sistema debe registrar como vehículo ocasional una placa no registrada, con su tipo, al momento de la entrada. | Alta | HU-31 · HU-ACC-001 | Prueba funcional (API) |
| RF-MOV-06 | El sistema debe generar para cada entrada un ticket con código único consecutivo y los datos del movimiento. | Alta | HU-32 · HU-ACC-001 | Prueba funcional (API) |
| RF-MOV-07 | El sistema debe permitir imprimir el ticket en formato de 80 mm y enviarlo al correo del propietario. | Alta | HU-32 · HU-ACC-001 | Prueba funcional (entorno de pruebas de correo) |
| RF-MOV-08 | El sistema debe permitir consultar un movimiento abierto por el código del ticket. | Alta | HU-32 · HU-ACC-001 | Prueba funcional (API) |
| RF-MOV-09 | El sistema debe registrar la salida de un vehículo buscándolo por placa o por código de ticket, con la puerta y la fecha y hora del servidor. | Alta | HU-33 · HU-ACC-002 | Prueba funcional (API) |
| RF-MOV-10 | El sistema debe calcular el tiempo de estadía en minutos entre la entrada y la salida y asociar la salida al movimiento de la entrada. | Alta | HU-33 · HU-ACC-002 | Prueba funcional (API) |
| RF-MOV-11 | El sistema debe liberar la celda y pasar el movimiento a la liquidación del cobro al registrar la salida. | Alta | HU-33 · HU-ACC-002 | Prueba funcional (API) |
| RF-MOV-12 | El sistema debe rechazar la salida de una placa sin movimiento abierto. | Alta | HU-33 · HU-ACC-002 | Prueba funcional (API) |
| RF-MOV-13 | El sistema debe listar los movimientos abiertos con placa, tipo, celda, hora de entrada y tiempo transcurrido, con búsqueda por placa. | Media | HU-34 · Inferida (ficha) | Prueba funcional (API) |
| RF-MOV-14 | El sistema debe resaltar los vehículos con más de 24 horas de permanencia. | Media | HU-34 · Inferida (ficha) | Prueba de interfaz + API |
| RF-MOV-15 | El sistema debe permitir anular una entrada con motivo obligatorio, liberando la celda e invalidando el ticket. | Media | HU-35 · Inferida (ficha) | Prueba funcional (API) |
| RF-MOV-16 | El sistema debe limitar al Operador la anulación a entradas de los últimos 15 minutos sin pagos y permitirla al Administrador en cualquier momento. | Media | HU-35 · Inferida (ficha) | Prueba funcional (API) |
| RF-MOV-17 | El sistema debe conservar los movimientos anulados con su motivo, usuario y fecha. | Media | HU-35 · Inferida (ficha) | Prueba funcional (API) |

### 4.8 Tarifas

**4.8.1 Descripción y prioridad**

Define cuánto se cobra: tarifas por tipo de vehículo y tipo de cliente, con valor de la primera hora, valor por fracción, tope diario y tiempo de gracia, con vigencia, para que la liquidación sea automática y sin discusiones. **Prioridad: Alta.**

Actores: Administrador, Operador, Cliente. Historias: HU-36, HU-37, HU-38. Depende de: 001-roles-permisos. Spec: `specs/008-tarifas/spec.md`.

**4.8.2 Secuencias de estímulo/respuesta**

| HU | Estímulo del actor | Respuesta del sistema |
|---|---|---|
| HU-36 | Administrador solicita crear tarifas por tipo de vehículo y tipo de cliente con primera hora, fracción, tope diario y tiempo de gracia | Queda programada y se activa en la fecha indicada. |
| HU-37 | Administrador solicita modificar o inactivar una tarifa | El sistema guarda el cambio y lo registra en la bitácora. |
| HU-38 | Cliente, Operador o Visitante solicita ver las tarifas vigentes por tipo de vehículo | Veo por tipo de vehículo y tipo de cliente el valor de la primera hora, la fracción, el tope diario y el tiempo de gracia. |

**4.8.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-TAR-01 | El sistema debe permitir al Administrador registrar tarifas por tipo de vehículo y tipo de cliente con valor de primera hora, minutos y valor de fracción, tope diario, minutos de gracia y vigencia. | Alta | HU-36 · Inferida (ficha) | Prueba funcional (API) |
| RF-TAR-02 | El sistema debe validar que los valores sean coherentes (primera hora > 0, fracción ≥ 0, tope ≥ primera hora, gracia entre 0 y 30 minutos). | Alta | HU-36 · Inferida (ficha) | Prueba funcional (API) |
| RF-TAR-03 | El sistema debe impedir dos tarifas activas superpuestas para el mismo tipo de vehículo y tipo de cliente. | Alta | HU-36 · Inferida (ficha) | Prueba funcional (API) |
| RF-TAR-04 | El sistema debe permitir al Administrador actualizar una tarifa que no haya sido usada en liquidaciones. | Media | HU-37 · Inferida (ficha) | Prueba funcional (API) |
| RF-TAR-05 | El sistema debe exigir crear una nueva tarifa con vigencia para cambiar precios ya usados, cerrando la vigencia de la anterior. | Media | HU-37 · Inferida (ficha) | Prueba funcional (API) |
| RF-TAR-06 | El sistema debe advertir al inactivar la única tarifa vigente de un tipo de vehículo y cliente. | Media | HU-37 · Inferida (ficha) | Prueba funcional (API) |
| RF-TAR-07 | El sistema debe mostrar públicamente las tarifas vigentes y las programadas con su fecha de inicio. | Media | HU-38 · Inferida (ficha) | Prueba de interfaz + API |

### 4.9 Facturación y pagos

**4.9.1 Descripción y prioridad**

Convierte cada salida en un cobro correcto: liquida el valor según tarifa, membresía y descuentos, registra el pago con el método usado, emite el comprobante o factura electrónica y permite cuadrar la caja de cada turno. **Prioridad: Alta.**

Actores: Operador, Administrador, Cliente. Historias: HU-39, HU-40, HU-41, HU-42, HU-43, HU-44. Depende de: 007-control-ingreso-salida, 008-tarifas. Spec: `specs/009-facturacion-pagos/spec.md`.

**4.9.2 Secuencias de estímulo/respuesta**

| HU | Estímulo del actor | Respuesta del sistema |
|---|---|---|
| HU-39 | Operador solicita que al registrar la salida el sistema calcule automáticamente el valor a pagar | El sistema liquida $ 4.000 + 5 fracciones × $ 1.000 = $ 9.000 y muestra el detalle del cálculo. |
| HU-40 | Operador solicita registrar el pago indicando el método (efectivo, tarjeta, transferencia o QR) | El sistema registra el pago, calcula $ 1.000 de cambio y habilita la emisión del comprobante. |
| HU-41 | Operador solicita emitir el comprobante de pago con numeración consecutiva | El sistema genera la factura con número consecutivo (FV-000245), datos del parqueadero, placa, entrada, salida, tiempo, tarifa, descuentos, total y método de pago. |
| HU-42 | Administrador solicita anular una factura emitida indicando el motivo | Queda en estado anulada con motivo, usuario y fecha, y su valor deja de sumar en reportes y cuadre de caja. |
| HU-43 | Administrador o Cliente solicita buscar facturas por número, placa, cliente o fecha | Ve las facturas con número, fecha, placa, cliente, total y estado, con el total del filtro. |
| HU-44 | Operador solicita generar el cuadre de caja de mi turno comparando lo registrado con el efectivo contado | El sistema muestra el total por método de pago, el número de servicios y el efectivo esperado. |

**4.9.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-FAC-01 | El sistema debe liquidar cada salida con la tarifa vigente a la hora de entrada, según tiempo de gracia, primera hora, fracciones iniciadas y tope diario. | Alta | HU-39 · Inferida (ficha) | Prueba funcional (API) |
| RF-FAC-02 | El sistema debe liquidar en cero las estadías cubiertas por una membresía activa del vehículo. | Alta | HU-39 · Inferida (ficha) | Prueba funcional (API) |
| RF-FAC-03 | El sistema debe mostrar el detalle del cálculo: minutos, tarifa, valor bruto, descuento, membresía y total. | Alta | HU-39 · Inferida (ficha) | Prueba de interfaz + API |
| RF-FAC-04 | El sistema debe rechazar la liquidación cuando no exista tarifa vigente y generar una alerta al Administrador. | Alta | HU-39 · Inferida (ficha) | Prueba funcional (API) |
| RF-FAC-05 | El sistema debe registrar el pago de una liquidación con método (efectivo, tarjeta, transferencia o QR), valor y operador. | Alta | HU-40 · Inferida (ficha) | Prueba funcional (API) |
| RF-FAC-06 | El sistema debe calcular el cambio en pagos en efectivo y rechazar valores recibidos inferiores al total. | Alta | HU-40 · Inferida (ficha) | Prueba funcional (API) |
| RF-FAC-07 | El sistema debe exigir número de referencia para los pagos que no son en efectivo. | Alta | HU-40 · Inferida (ficha) | Prueba funcional (API) |
| RF-FAC-08 | El sistema debe impedir registrar más de un pago para la misma liquidación. | Alta | HU-40 · Inferida (ficha) | Prueba funcional (API) |
| RF-FAC-09 | El sistema debe emitir una factura por cada pago con numeración consecutiva sin huecos y el detalle del servicio. | Alta | HU-41 · Inferida (ficha) | Prueba funcional (API) |
| RF-FAC-10 | El sistema debe enviar la factura en PDF al correo del cliente registrado y permitir su impresión en 80 mm. | Alta | HU-41 · Inferida (ficha) | Prueba funcional (entorno de pruebas de correo) |
| RF-FAC-11 | El sistema debe permitir emitir la factura a nombre de un tercero con NIT o documento y razón social. | Alta | HU-41 · Inferida (ficha) | Prueba funcional (API) |
| RF-FAC-12 | El sistema debe marcar como pendientes de envío las facturas que el proveedor electrónico no haya recibido. | Alta | HU-41 · Inferida (ficha) | Prueba funcional (API) |
| RF-FAC-13 | El sistema debe permitir solo al Administrador anular facturas con motivo obligatorio. | Media | HU-42 · Inferida (ficha) | Prueba funcional (API) |
| RF-FAC-14 | El sistema debe conservar las facturas anuladas con su número, motivo, usuario y fecha, y excluirlas de los totales. | Media | HU-42 · Inferida (ficha) | Prueba funcional (API) |
| RF-FAC-15 | El sistema debe listar facturas con filtros por número, placa, cliente, rango de fechas, método de pago y estado, mostrando el total filtrado. | Media | HU-43 · Inferida (ficha) | Prueba funcional (API) |
| RF-FAC-16 | El sistema debe permitir a cada Cliente consultar y descargar solo sus facturas. | Media | HU-43 · Inferida (ficha) | Prueba funcional (API) |
| RF-FAC-17 | El sistema debe generar el cuadre del turno de un operador con totales por método de pago y número de servicios. | Media | HU-44 · Inferida (ficha) | Prueba funcional (API) |
| RF-FAC-18 | El sistema debe registrar el cierre de caja con el efectivo contado y la diferencia, e impedir nuevos pagos en ese turno cerrado. | Media | HU-44 · Inferida (ficha) | Prueba funcional (API) |
| RF-FAC-19 | El sistema debe permitir al Administrador consultar los cierres de caja con su detalle. | Media | HU-44 · Inferida (ficha) | Prueba funcional (API) |

### 4.10 Membresías

**4.10.1 Descripción y prioridad**

Ofrece planes de pago mensual a clientes recurrentes: el Administrador define planes, el operador suscribe al cliente con su vehículo y, mientras la membresía esté vigente, el vehículo entra y sale sin pago por evento. **Prioridad: Media.**

Actores: Administrador, Operador, Cliente. Historias: HU-45, HU-46, HU-47, HU-48. Depende de: 005-vehiculos, 009-facturacion-pagos. Spec: `specs/010-membresias/spec.md`.

**4.10.2 Secuencias de estímulo/respuesta**

| HU | Estímulo del actor | Respuesta del sistema |
|---|---|---|
| HU-45 | Administrador solicita crear planes mensuales por tipo de vehículo con su valor y beneficios | El plan queda activo y disponible para suscripciones. |
| HU-46 | Operador o Cliente solicita suscribir un vehículo de un cliente a un plan de membresía y pagarlo | El sistema crea la membresía activa por 30 días, emite la factura y la muestra en el detalle del cliente. |
| HU-47 | Operador o Administrador solicita renovar una membresía o cancelarla | La nueva vigencia va del 16/12/2026 al 14/01/2027. |
| HU-48 | Cliente solicita ver mi membresía, su vigencia y mi historial de pagos | Veo plan, vehículo, fecha de inicio, fecha de fin y días restantes. |

**4.10.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-MEM-01 | El sistema debe permitir al Administrador registrar, editar e inactivar planes de membresía con nombre único, tipo de vehículo, valor mensual, días de vigencia y beneficios. | Media | HU-45 · Inferida (ficha) | Prueba funcional (API) |
| RF-MEM-02 | El sistema debe mantener vigentes las membresías activas de un plan que se inactiva. | Media | HU-45 · Inferida (ficha) | Prueba funcional (API) |
| RF-MEM-03 | El sistema debe suscribir un vehículo de un cliente a un plan activo del mismo tipo de vehículo, activando la membresía solo con el pago registrado. | Media | HU-46 · Inferida (ficha) | Prueba funcional (API) |
| RF-MEM-04 | El sistema debe impedir más de una membresía activa por vehículo. | Media | HU-46 · Inferida (ficha) | Prueba funcional (API) |
| RF-MEM-05 | El sistema debe emitir la factura del plan y calcular la fecha de fin según los días de vigencia. | Media | HU-46 · Inferida (ficha) | Prueba funcional (API) |
| RF-MEM-06 | El sistema debe renovar una membresía con pago, iniciando la nueva vigencia al día siguiente del fin actual. | Media | HU-47 · Inferida (ficha) | Prueba funcional (API) |
| RF-MEM-07 | El sistema debe permitir cancelar una membresía con motivo. | Media | HU-47 · Inferida (ficha) | Prueba funcional (API) |
| RF-MEM-08 | El sistema debe marcar como vencidas, una vez al día, las membresías cuya fecha de fin ya pasó. | Media | HU-47 · Inferida (ficha) | Prueba funcional (API) |
| RF-MEM-09 | El sistema debe mostrar al Cliente sus membresías con plan, vehículo, vigencia, días restantes y estado. | Baja | HU-48 · Inferida (ficha) | Prueba de interfaz + API |
| RF-MEM-10 | El sistema debe mostrar los planes activos al Cliente que no tenga membresía vigente. | Baja | HU-48 · Inferida (ficha) | Prueba de interfaz + API |

### 4.11 Beneficios y descuentos

**4.11.1 Descripción y prioridad**

Permite al Administrador definir promociones y descuentos (porcentaje o valor fijo) según el tipo de cliente o de vehículo y una vigencia, y los aplica automáticamente en la liquidación. **Prioridad: Media.**

Actores: Administrador, Operador. Historias: HU-49, HU-50, HU-51. Depende de: 009-facturacion-pagos. Spec: `specs/011-descuentos/spec.md`.

**4.11.2 Secuencias de estímulo/respuesta**

| HU | Estímulo del actor | Respuesta del sistema |
|---|---|---|
| HU-49 | Administrador solicita crear descuentos por porcentaje o valor fijo para un tipo de cliente o de vehículo con vigencia | El descuento queda activo en ese periodo. |
| HU-50 | Operador solicita que la liquidación aplique automáticamente el descuento vigente que corresponda | El total es $ 7.200 y el detalle muestra el descuento aplicado. |
| HU-51 | Administrador solicita activar o inactivar un descuento antes de su fin de vigencia | Deja de aplicarse a las liquidaciones siguientes; las ya facturadas no cambian. |

**4.11.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-DES-01 | El sistema debe permitir al Administrador registrar y editar descuentos con nombre único, tipo (porcentaje o valor fijo), valor, tipo de cliente y de vehículo aplicables, tiempo mínimo de estadía opcional y vigencia. | Media | HU-49 · Inferida (ficha) | Prueba funcional (API) |
| RF-DES-02 | El sistema debe validar que el porcentaje esté entre 1 y 100 y que el valor fijo sea mayor que cero. | Media | HU-49 · Inferida (ficha) | Prueba funcional (API) |
| RF-DES-03 | El sistema debe aplicar en la liquidación el descuento vigente de mayor valor que corresponda al tipo de cliente, tipo de vehículo y tiempo de estadía. | Media | HU-50 · Inferida (ficha) | Prueba funcional (API) |
| RF-DES-04 | El sistema debe mostrar en la liquidación y en la factura el nombre y el valor del descuento aplicado. | Media | HU-50 · Inferida (ficha) | Prueba de interfaz + API |
| RF-DES-05 | El sistema debe permitir al Administrador activar e inactivar descuentos sin afectar liquidaciones ya facturadas. | Baja | HU-51 · Inferida (ficha) | Prueba funcional (API) |

### 4.12 Reservas

**4.12.1 Descripción y prioridad**

Permite a los clientes registrados apartar una celda para una fecha y hora futuras; el sistema la bloquea para otros, la libera si el cliente no llega a tiempo y la convierte en entrada cuando llega. **Prioridad: Media.**

Actores: Cliente, Operador. Historias: HU-52, HU-53, HU-54, HU-55. Depende de: 004-parqueaderos-celdas, 005-vehiculos. Spec: `specs/012-reservas/spec.md`.

**4.12.2 Secuencias de estímulo/respuesta**

| HU | Estímulo del actor | Respuesta del sistema |
|---|---|---|
| HU-52 | Cliente solicita reservar una celda para una fecha y hora con uno de mis vehículos | El sistema crea la reserva confirmada con un código y me la notifica por correo. |
| HU-53 | Cliente solicita cancelar una reserva que ya no voy a usar | Queda cancelada, la celda queda libre en esa franja y recibo la confirmación. |
| HU-54 | Operador solicita ver las reservas del día con su hora, celda y placa | Veo código, hora, placa, cliente, celda y estado, ordenadas por hora. |
| HU-55 | Operador solicita que la entrada de un vehículo con reserva use la celda reservada y que las reservas no usadas se liberen solas | El sistema usa la celda reservada y marca la reserva como cumplida. |

**4.12.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-RES-01 | El sistema debe permitir a un Cliente reservar una celda del tipo de su vehículo para una fecha y hora futuras dentro de la anticipación máxima. | Media | HU-52 · Inferida (ficha) | Prueba funcional (API) |
| RF-RES-02 | El sistema debe impedir reservas cruzadas sobre la misma celda o para el mismo vehículo. | Media | HU-52 · Inferida (ficha) | Prueba funcional (API) |
| RF-RES-03 | El sistema debe asignar un código a la reserva y notificarla al cliente. | Media | HU-52 · Inferida (ficha) | Prueba funcional (entorno de pruebas de correo) |
| RF-RES-04 | El sistema debe permitir al Cliente cancelar sus reservas confirmadas que aún no inician, liberando la celda. | Media | HU-53 · Inferida (ficha) | Prueba funcional (API) |
| RF-RES-05 | El sistema debe impedir cancelar reservas cumplidas, vencidas o de otros clientes. | Media | HU-53 · Inferida (ficha) | Prueba funcional (API) |
| RF-RES-06 | El sistema debe listar las reservas por fecha con código, hora, placa, cliente, celda y estado, con filtro por estado. | Media | HU-54 · Inferida (ficha) | Prueba funcional (API) |
| RF-RES-07 | El sistema debe usar la celda reservada y marcar la reserva como cumplida al registrar la entrada del vehículo reservado dentro de la franja. | Media | HU-55 · Inferida (ficha) | Prueba funcional (API) |
| RF-RES-08 | El sistema debe marcar como reservada la celda desde la hora de inicio y excluirla de la asignación a otros vehículos. | Media | HU-55 · Inferida (ficha) | Prueba funcional (API) |
| RF-RES-09 | El sistema debe vencer las reservas no cumplidas al terminar el tiempo de espera, liberar la celda y notificar al cliente. | Media | HU-55 · Inferida (ficha) | Prueba funcional (entorno de pruebas de correo) |

### 4.13 Incidencias

**4.13.1 Descripción y prioridad**

Deja constancia formal de los incidentes que afectan a los vehículos dentro del parqueadero (rayones, choques, atropellamientos, golpes contra muros), con código único, vehículo, fecha y hora, para responder reclamos y hacerles seguimiento hasta cerrarlos. **Prioridad: Alta.**

Actores: Operador, Administrador. Historias: HU-56, HU-57, HU-58. Depende de: 005-vehiculos. Spec: `specs/013-incidencias/spec.md`.

**4.13.2 Secuencias de estímulo/respuesta**

| HU | Estímulo del actor | Respuesta del sistema |
|---|---|---|
| HU-56 | Operador solicita registrar una incidencia con su tipo, vehículo afectado, fecha y hora | El sistema registra la incidencia abierta con código único (INC-000031) y alerta al Administrador. |
| HU-57 | Operador o Administrador solicita buscar incidencias por código, placa, tipo, estado o fecha | Veo sus incidencias con código, tipo, fecha, estado y operador. |
| HU-58 | Administrador solicita registrar notas de seguimiento y cerrar la incidencia con su solución | Queda con fecha y usuario y la incidencia pasa a en seguimiento. |

**4.13.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-INC-01 | El sistema debe registrar incidencias con tipo (rayón, choque, atropellamiento o golpe contra muro), vehículo afectado, fecha y hora del evento, descripción y evidencia opcional. | Alta | HU-56 · HU-INC-001 | Prueba funcional (API) |
| RF-INC-02 | El sistema debe asignar a cada incidencia un código único autogenerado. | Alta | HU-56 · HU-INC-001 | Prueba funcional (API) |
| RF-INC-03 | El sistema debe validar que la fecha y hora del evento no sea futura. | Alta | HU-56 · HU-INC-001 | Prueba funcional (API) |
| RF-INC-04 | El sistema debe generar una alerta al Administrador al registrar una incidencia. | Alta | HU-56 · HU-INC-001 | Prueba funcional (API) |
| RF-INC-05 | El sistema debe listar incidencias con filtros por código, placa, tipo, estado y rango de fechas. | Media | HU-57 · Inferida (ficha) | Prueba funcional (API) |
| RF-INC-06 | El sistema debe mostrar el detalle de una incidencia con evidencia y seguimiento. | Media | HU-57 · Inferida (ficha) | Prueba de interfaz + API |
| RF-INC-07 | El sistema debe permitir registrar notas de seguimiento con fecha y usuario sobre una incidencia abierta. | Media | HU-58 · Inferida (ficha) | Prueba funcional (API) |
| RF-INC-08 | El sistema debe permitir cerrar una incidencia con solución obligatoria e impedir cambios posteriores. | Media | HU-58 · Inferida (ficha) | Prueba funcional (API) |

### 4.14 Monitoreo, placas y alertas

**4.14.1 Descripción y prioridad**

Agrupa las capacidades de seguridad y monitoreo de la ficha: recibir la placa leída por un sistema de reconocimiento para agilizar el acceso, generar alertas a los administradores ante eventos de riesgo y notificar a los clientes los eventos que les interesan. **Prioridad: Media.**

Actores: Administrador, Operador, Cliente, Servicio de reconocimiento de placas. Historias: HU-59, HU-60, HU-61, HU-62. Depende de: 007-control-ingreso-salida. Spec: `specs/014-monitoreo-alertas/spec.md`.

**4.14.2 Secuencias de estímulo/respuesta**

| HU | Estímulo del actor | Respuesta del sistema |
|---|---|---|
| HU-59 | Operador solicita que la placa leída por la cámara llegue precargada a la pantalla de entrada o salida | La pantalla de esa puerta muestra la placa precargada para confirmar la entrada o la salida. |
| HU-60 | Administrador solicita recibir alertas de eventos relevantes de la operación | El sistema crea una alerta visible en el icono de alertas del Administrador. |
| HU-61 | Cliente solicita recibir notificaciones por correo y en la aplicación sobre mis reservas, membresía y facturas | Recibo un correo y una notificación en la aplicación. |
| HU-62 | Cliente solicita ver mis notificaciones en la aplicación | Las veo de la más reciente a la más antigua con indicador de no leídas. |

**4.14.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-MON-01 | El sistema debe recibir lecturas de placa (placa, confianza, puerta, fecha y hora, imagen) de un servicio de reconocimiento autenticado con una clave de integración. | Baja | HU-59 · Inferida (ficha) | Prueba funcional (API) |
| RF-MON-02 | El sistema debe precargar la placa leída en la pantalla de la puerta correspondiente para que el operador confirme el movimiento. | Baja | HU-59 · Inferida (ficha) | Prueba de interfaz + API |
| RF-MON-03 | El sistema debe exigir confirmación del operador para lecturas con confianza menor al umbral configurado. | Baja | HU-59 · Inferida (ficha) | Prueba funcional (API) |
| RF-MON-04 | El sistema debe generar alertas para el Administrador ante rechazos por pico y placa, incidencias, ocupación mayor al 90 % por tipo de vehículo, permanencias de más de 24 horas, salidas sin tarifa vigente y lecturas de placa dudosas. | Media | HU-60 · Inferida (ficha) | Prueba funcional (API) |
| RF-MON-05 | El sistema debe mostrar las alertas en una bandeja con indicador de no leídas y enlace al registro relacionado. | Media | HU-60 · Inferida (ficha) | Prueba de interfaz + API |
| RF-MON-06 | El sistema debe notificar al cliente por correo y en la aplicación la confirmación, vencimiento y cancelación de reservas, el vencimiento próximo de su membresía (5 días antes) y la emisión de facturas. | Media | HU-61 · Inferida (ficha) | Prueba funcional (entorno de pruebas de correo) |
| RF-MON-07 | El sistema debe reintentar hasta 3 veces el envío fallido de un correo y conservar la notificación en la aplicación. | Media | HU-61 · Inferida (ficha) | Prueba funcional (entorno de pruebas de correo) |
| RF-MON-08 | El sistema debe mostrar al usuario sus notificaciones ordenadas por fecha con indicador de no leídas y permitir marcarlas como leídas. | Baja | HU-62 · Inferida (ficha) | Prueba de interfaz + API |

### 4.15 Reportes e indicadores

**4.15.1 Descripción y prioridad**

Entrega al Administrador la información para decidir: listados operativos, reportes de ocupación y uso, ingresos por periodo y un tablero de indicadores, con filtros por fechas y exportación. **Prioridad: Alta.**

Actores: Administrador. Historias: HU-63, HU-64, HU-65, HU-66. Depende de: 007-control-ingreso-salida, 009-facturacion-pagos, 013-incidencias. Spec: `specs/015-reportes-indicadores/spec.md`.

**4.15.2 Secuencias de estímulo/respuesta**

| HU | Estímulo del actor | Respuesta del sistema |
|---|---|---|
| HU-63 | Administrador solicita generar los listados de usuarios, vehículos con propietario, entradas, salidas e incidencias | Veo todos los usuarios con todos sus datos (excepto la contraseña) y puedo exportarlos a CSV y PDF. |
| HU-64 | Administrador solicita generar reportes de pico y placa, ocupación diaria, celdas más usadas, vehículos frecuentes y horas pico | Veo el total y la lista de vehículos registrados cuya placa tiene restricción ese día y los intentos de ingreso rechazados. |
| HU-65 | Administrador solicita ver los ingresos por periodo, método de pago, tipo de vehículo y concepto (servicio o membresía) | Veo el total de ingresos, el número de servicios, el ticket promedio y la distribución por método de pago, tipo de vehículo y concepto. |
| HU-66 | Administrador solicita ver en un tablero los indicadores clave del día y del mes | Veo ocupación actual por tipo, entradas y salidas del día, ingresos del día y del mes, tiempo promedio de estadía, membresías activas e incidencias abiertas. |

**4.15.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-REP-01 | El sistema debe generar el listado de usuarios con todos sus datos excepto los de autenticación. | Alta | HU-63 · HU-REP-001 | Prueba de interfaz + API |
| RF-REP-02 | El sistema debe generar el listado de vehículos con sus datos y su propietario. | Alta | HU-63 · HU-REP-001 | Prueba de interfaz + API |
| RF-REP-03 | El sistema debe generar listados de entradas y de salidas por rango de fechas con fecha, hora, placa, puerta y celda. | Alta | HU-63 · HU-REP-001 | Prueba de interfaz + API |
| RF-REP-04 | El sistema debe generar el listado de incidencias por rango de fechas. | Alta | HU-63 · HU-REP-001 | Prueba de interfaz + API |
| RF-REP-05 | El sistema debe permitir exportar cada reporte a CSV y PDF y restringir el acceso al Administrador. | Alta | HU-63 · HU-REP-001 | Prueba funcional (API) |
| RF-REP-06 | El sistema debe generar el listado y total de vehículos restringidos por pico y placa en una fecha, con los intentos de ingreso rechazados. | Media | HU-64 · HU-REP-002 | Prueba de interfaz + API |
| RF-REP-07 | El sistema debe generar el total de celdas ocupadas por día y tipo de vehículo con el porcentaje de ocupación. | Media | HU-64 · HU-REP-002 | Prueba funcional (API) |
| RF-REP-08 | El sistema debe generar el top 10 de celdas más usadas y de vehículos que más usan el parqueadero en un rango de fechas. | Media | HU-64 · HU-REP-002 | Prueba funcional (API) |
| RF-REP-09 | El sistema debe generar la ocupación promedio por día de la semana y por hora en un rango de fechas. | Media | HU-64 · HU-REP-002 | Prueba funcional (API) |
| RF-REP-10 | El sistema debe generar el reporte de ingresos por rango de fechas con total, número de servicios, valor promedio y distribución por método de pago, tipo de vehículo y concepto. | Alta | HU-65 · Inferida (ficha) | Prueba funcional (API) |
| RF-REP-11 | El sistema debe excluir de los totales las facturas anuladas y listarlas por separado. | Alta | HU-65 · Inferida (ficha) | Prueba funcional (API) |
| RF-REP-12 | El sistema debe exportar el detalle del reporte financiero a CSV y PDF. | Alta | HU-65 · Inferida (ficha) | Prueba funcional (API) |
| RF-REP-13 | El sistema debe mostrar un tablero con ocupación actual por tipo de vehículo, entradas y salidas, ingresos, tiempo promedio de estadía, membresías activas e incidencias abiertas. | Media | HU-66 · Inferida (ficha) | Prueba de interfaz + API |
| RF-REP-14 | El sistema debe recalcular los indicadores para el periodo seleccionado (hoy, semana, mes actual o mes anterior). | Media | HU-66 · Inferida (ficha) | Prueba funcional (API) |

## 5. Otros requerimientos no funcionales

### 5.1 Requerimientos de rendimiento

| ID | Requerimiento | Prioridad | Verificación |
|---|---|---|---|
| RNF-REN-01 | El registro de entrada y el registro de salida con su liquidación deben responder en 2 s o menos en el percentil 95, con 20 usuarios concurrentes y 50 000 movimientos almacenados (valor de referencia, TBD-06). | Alta | Prueba de carga |
| RNF-REN-02 | Los listados paginados y las búsquedas deben responder en 1 s o menos (p95) con 50 000 registros en la tabla consultada. | Media | Prueba de carga |
| RNF-REN-03 | La disponibilidad de celdas que ve el usuario no debe tener un retraso mayor de 10 s respecto al último movimiento registrado. | Media | Prueba funcional |

### 5.2 Requerimientos de seguridad física / safety

| ID | Requerimiento | Prioridad | Verificación |
|---|---|---|---|
| RNF-SAF-01 | El sistema no debe permitir dos movimientos abiertos para la misma placa ni dos vehículos en la misma celda, para evitar cobros dobles y responsabilidades equivocadas sobre los vehículos. | Alta | Prueba funcional |
| RNF-SAF-02 | Los movimientos, pagos, facturas e incidencias no deben poder eliminarse; solo anularse con motivo, usuario y fecha, para conservar la evidencia ante reclamos. | Alta | Inspección + prueba |

### 5.3 Requerimientos de seguridad informática y privacidad

| ID | Requerimiento | Prioridad | Verificación |
|---|---|---|---|
| RNF-SEG-01 | Toda comunicación en producción debe usar HTTPS con TLS 1.2 o superior. | Alta | Inspección |
| RNF-SEG-02 | Las contraseñas deben almacenarse con bcrypt (costo 10 o mayor) y nunca devolverse en respuestas de la API ni escribirse en bitácoras. | Alta | Inspección + prueba |
| RNF-SEG-03 | Todo endpoint, salvo inicio de sesión, autorregistro, recuperación de contraseña y disponibilidad pública, debe exigir un token JWT válido; el token expira a las 8 horas. | Alta | Prueba funcional |
| RNF-SEG-04 | Cada operación debe verificar en el servidor el permiso del rol y responder 403 cuando no lo tenga, aunque la opción esté oculta en la interfaz. | Alta | Prueba funcional |
| RNF-SEG-05 | Tras 5 intentos fallidos de inicio de sesión en 15 minutos para un mismo documento, el sistema debe bloquear nuevos intentos de ese documento durante 15 minutos. | Alta | Prueba funcional |
| RNF-SEG-06 | Toda entrada debe validarse en el servidor y toda consulta SQL debe ser parametrizada. | Alta | Inspección de código |
| RNF-SEG-07 | El sistema debe registrar en bitácora (usuario, fecha y hora, acción, registro afectado, valor anterior y nuevo) las anulaciones, los cambios de tarifa y descuento, los cambios de estado de usuarios y roles y los cierres de caja. | Media | Inspección + prueba |
| RNF-PRI-01 | Los formularios que capturan datos personales (registro de usuario, autorregistro, actualización de datos) deben mostrar el aviso de privacidad y exigir la autorización de tratamiento de datos conforme a la Ley 1581 de 2012. | Alta | Prueba de interfaz |
| RNF-PRI-02 | Un Cliente solo puede consultar sus propios datos, vehículos, movimientos, reservas, membresías, facturas y notificaciones. | Alta | Prueba funcional |
| RNF-PRI-03 | La fotografía de usuario es opcional, en formato JPG o PNG y de 2 MB como máximo. | Media | Prueba funcional |

### 5.4 Atributos de calidad de software

| ID | Requerimiento | Prioridad | Verificación |
|---|---|---|---|
| RNF-USA-01 | La interfaz debe ser usable entre 360 px y 1920 px de ancho sin desplazamiento horizontal. | Alta | Prueba de interfaz |
| RNF-USA-02 | El operador debe poder registrar una entrada o una salida desde una sola pantalla, iniciando con el foco en el campo de placa y confirmando con la tecla Enter. | Alta | Prueba de interfaz |
| RNF-USA-03 | Los mensajes de error deben aparecer junto al campo afectado e indicar la causa y la acción correctiva. | Media | Prueba de interfaz |
| RNF-USA-04 | La interfaz debe cumplir criterios básicos de WCAG 2.1 AA: etiquetas asociadas, navegación con teclado, foco visible y contraste mínimo de 4.5:1. | Media | Inspección |
| RNF-CAL-01 | El sistema debe estar disponible el 99 % del tiempo mensual, porque el parqueadero opera 24 horas (valor de referencia, TBD-06). | Media | Monitoreo |
| RNF-CAL-02 | Debe existir una copia de seguridad diaria de la base de datos con retención de 30 días. | Media | Inspección |
| RNF-CAL-03 | Cada endpoint debe tener en la colección de pruebas al menos un caso de éxito y uno de error. | Alta | Inspección |

### 5.5 Reglas de negocio

| ID | Regla | Característica | RF que la hacen cumplir |
|---|---|---|---|
| RN-01 | El sistema arranca con tres roles base no eliminables: Administrador, Operador y Cliente. | ROL | RF-ROL-01, RF-ROL-02, RF-ROL-03, RF-ROL-12, RF-ROL-13, RF-ROL-14 |
| RN-02 | Solo el Administrador cambia estados de usuarios, actualiza o reasigna vehículos, configura tarifas, descuentos, planes y restricciones, y anula facturas. | DES, FAC, TAR, USR, VEH | RF-USR-12, RF-USR-13, RF-USR-14, RF-VEH-07, RF-VEH-08, RF-VEH-09, RF-TAR-01, RF-TAR-02, RF-TAR-03, RF-FAC-13, RF-FAC-14, RF-DES-01, RF-DES-02 |
| RN-03 | Un rol debe tener al menos un permiso asignado para quedar activo. | ROL | RF-ROL-04, RF-ROL-05, RF-ROL-06, RF-ROL-09, RF-ROL-10, RF-ROL-11 |
| RN-04 | No se puede inactivar un rol que tenga usuarios activos asignados; los roles base no se pueden inactivar ni renombrar. | ROL | RF-ROL-12, RF-ROL-13, RF-ROL-14 |
| RN-05 | El número de documento y el correo son únicos; el código del usuario lo asigna el sistema y no se puede modificar. | USR | RF-USR-01, RF-USR-02, RF-USR-03, RF-USR-04, RF-USR-05, RF-USR-09, RF-USR-10, RF-USR-11 |
| RN-06 | Un usuario inactivo no puede iniciar sesión, pero conserva su historial de movimientos, facturas y vehículos. | USR | RF-USR-12, RF-USR-13, RF-USR-14, RF-ACC-01, RF-ACC-02, RF-ACC-03, RF-ACC-04 |
| RN-07 | Tras 5 intentos fallidos en 15 minutos el documento queda bloqueado 15 minutos. | ACC | RF-ACC-01, RF-ACC-02, RF-ACC-03, RF-ACC-04, RF-ACC-05, RF-ACC-06 |
| RN-08 | El enlace de recuperación es de un solo uso y vence a los 30 minutos. | ACC | RF-ACC-10, RF-ACC-11, RF-ACC-12 |
| RN-09 | El estado de una celda cambia a ocupada solo con un registro de entrada y a disponible solo con un registro de salida o la anulación de la entrada; el cambio manual solo puede inhabilitar o habilitar celdas libres. | CLD | RF-CLD-13, RF-CLD-14, RF-CLD-15, RF-CLD-19, RF-CLD-20, RF-CLD-21 |
| RN-10 | No se puede inactivar un parqueadero ni inhabilitar una celda con vehículos dentro. | CLD | RF-CLD-04, RF-CLD-05, RF-CLD-06, RF-CLD-13, RF-CLD-14, RF-CLD-15 |
| RN-11 | La placa es única en el sistema y su formato depende del tipo: carro AAA123, moto AAA12 o AAA12A. | VEH | RF-VEH-01, RF-VEH-02, RF-VEH-03 |
| RN-12 | Solo se pueden asociar vehículos registrados a usuarios registrados y activos; un vehículo tiene un solo propietario a la vez. | VEH | RF-VEH-04, RF-VEH-05, RF-VEH-06, RF-VEH-07, RF-VEH-08, RF-VEH-09 |
| RN-13 | Un vehículo está restringido si el dígito evaluado de su placa está en la lista del día y tipo vigentes y la hora de entrada cae dentro de la franja configurada. | PYP | RF-PYP-01, RF-PYP-02, RF-PYP-03, RF-PYP-04, RF-MOV-01, RF-MOV-02, RF-MOV-03, RF-MOV-04, RF-MOV-05 |
| RN-14 | No puede haber dos restricciones activas para el mismo día y tipo de vehículo con vigencias superpuestas. | PYP | RF-PYP-01, RF-PYP-02, RF-PYP-03, RF-PYP-04 |
| RN-15 | Una placa solo puede tener un movimiento abierto; una celda ocupada no puede recibir otro vehículo. | MOV | RF-MOV-01, RF-MOV-02, RF-MOV-03, RF-MOV-04, RF-MOV-05 |
| RN-16 | La hora de entrada y de salida la toma el servidor; el tiempo de estadía es la diferencia en minutos entre ambas. | MOV | RF-MOV-01, RF-MOV-02, RF-MOV-03, RF-MOV-04, RF-MOV-05, RF-MOV-09, RF-MOV-10, RF-MOV-11, RF-MOV-12 |
| RN-17 | Un movimiento solo puede anularse dentro de los 15 minutos siguientes a la entrada y sin pago asociado; el Administrador puede anular en cualquier momento con motivo. | MOV | RF-MOV-15, RF-MOV-16, RF-MOV-17 |
| RN-18 | Solo puede haber una tarifa activa por tipo de vehículo y tipo de cliente en un mismo momento. | TAR | RF-TAR-01, RF-TAR-02, RF-TAR-03, RF-TAR-04, RF-TAR-05, RF-TAR-06 |
| RN-19 | La liquidación usa la tarifa vigente en la fecha y hora de entrada del vehículo. | TAR | RF-FAC-01, RF-FAC-02, RF-FAC-03, RF-FAC-04 |
| RN-20 | Liquidación: si la estadía no supera los minutos de gracia el valor es 0; si no, se cobra la primera hora y cada fracción iniciada después de ella, sin superar el tope diario por cada 24 horas. | FAC | RF-FAC-01, RF-FAC-02, RF-FAC-03, RF-FAC-04 |
| RN-21 | Si el vehículo tiene una membresía activa y vigente el valor del movimiento es 0; si no, se aplica como máximo un descuento (el de mayor valor). | FAC | RF-FAC-01, RF-FAC-02, RF-FAC-03, RF-FAC-04, RF-DES-03, RF-DES-04 |
| RN-22 | Las facturas tienen numeración consecutiva sin huecos y no se eliminan; la anulación la hace solo el Administrador con motivo. | FAC | RF-FAC-09, RF-FAC-10, RF-FAC-11, RF-FAC-12, RF-FAC-13, RF-FAC-14 |
| RN-23 | Un vehículo solo puede tener una membresía activa; el tipo de vehículo debe coincidir con el del plan. | MEM | RF-MEM-03, RF-MEM-04, RF-MEM-05 |
| RN-24 | La membresía se activa solo con el pago del plan y vence automáticamente al terminar su vigencia. | MEM | RF-MEM-03, RF-MEM-04, RF-MEM-05, RF-MEM-06, RF-MEM-07, RF-MEM-08 |
| RN-25 | A una liquidación se le aplica como máximo un descuento: el de mayor valor entre los aplicables; el total nunca es negativo. | DES | RF-DES-03, RF-DES-04 |
| RN-26 | Solo pueden reservar clientes registrados con un vehículo propio; la celda debe ser del tipo del vehículo y estar libre en esa franja; un vehículo no puede tener dos reservas confirmadas que se crucen. | RES | RF-RES-01, RF-RES-02, RF-RES-03 |
| RN-27 | La celda pasa a reservada desde la hora de inicio y se libera si el vehículo no ingresa dentro de los minutos de espera. | RES | RF-RES-07, RF-RES-08, RF-RES-09 |
| RN-28 | Las incidencias no se eliminan; se cierran con una solución escrita. | INC | RF-INC-07, RF-INC-08 |
| RN-29 | Una lectura con confianza inferior al umbral configurado (por defecto 85 %) requiere confirmación del operador antes de registrar el movimiento. | MON | RF-MON-01, RF-MON-02, RF-MON-03 |
| RN-30 | Solo el Administrador accede a los reportes; los reportes excluyen movimientos y facturas anulados. | REP | RF-REP-01, RF-REP-02, RF-REP-03, RF-REP-04, RF-REP-05, RF-REP-10, RF-REP-11, RF-REP-12 |

## 6. Otros requerimientos

### 6.1 Modelo lógico de datos

Entidades y atributos que se desprenden de las historias. Es un modelo **lógico** de referencia para `/speckit.plan` (data-model.md): nombres en snake_case, claves `id_<entidad>` y columnas de auditoría `created_at` / `updated_at` en todas las tablas. El equipo puede ajustarlo en su script SQL siempre que respete las reglas de negocio.

**4.1 Roles y permisos**

*Rol* — Perfil de acceso que agrupa permisos.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_rol | INT | PK, autoincremental |
| nombre | VARCHAR(40) | obligatorio, único, 3–40 caracteres |
| descripcion | VARCHAR(150) | opcional |
| es_base | BOOLEAN | verdadero para Administrador, Operador y Cliente |
| estado | ENUM('activo','inactivo') | por defecto 'activo' |

*Permiso* — Acción permitida sobre un módulo (catálogo predefinido).

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_permiso | INT | PK |
| modulo | VARCHAR(40) | obligatorio (p. ej. 'movimientos') |
| accion | ENUM('ver','crear','editar','cambiar_estado','anular','exportar') | obligatorio |
| codigo | VARCHAR(60) | único, p. ej. 'movimientos.crear' |
| descripcion | VARCHAR(150) |  |

*RolPermiso* — Asignación de permisos a roles (tabla intermedia).

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_rol | INT | FK → Rol |
| id_permiso | INT | FK → Permiso |
| PK compuesta (id_rol, id_permiso) |  |  |

**4.2 Gestión de usuarios**

*Usuario* — Persona con cuenta en el sistema (empleado o cliente).

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_usuario | INT | PK, autoincremental (código único del usuario) |
| tipo_documento | ENUM('CC','CE','TI','PAS','NIT') | obligatorio |
| numero_documento | VARCHAR(20) | obligatorio, único con tipo_documento, solo dígitos salvo PAS |
| nombre_completo | VARCHAR(100) | obligatorio |
| correo | VARCHAR(120) | obligatorio, único, formato de correo |
| celular | VARCHAR(10) | obligatorio, 10 dígitos iniciando en 3 |
| foto_url | VARCHAR(255) | opcional |
| id_rol | INT | FK → Rol, obligatorio |
| contrasena_hash | VARCHAR(255) | obligatorio |
| estado | ENUM('activo','inactivo') | por defecto 'activo' |
| acepta_tratamiento_datos | BOOLEAN | obligatorio verdadero |
| fecha_autorizacion | DATETIME |  |

**4.3 Gestión de acceso**

*TokenRecuperacion* — Enlace de un solo uso para restablecer la contraseña.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_token | INT | PK |
| id_usuario | INT | FK → Usuario |
| token_hash | VARCHAR(255) | obligatorio |
| expira_en | DATETIME | obligatorio (creación + 30 min) |
| usado | BOOLEAN | por defecto falso |

*IntentoAcceso* — Registro de intentos de inicio de sesión para el bloqueo temporal.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_intento | INT | PK |
| numero_documento | VARCHAR(20) |  |
| exitoso | BOOLEAN |  |
| ip | VARCHAR(45) |  |
| fecha | DATETIME |  |

**4.4 Parqueaderos y celdas**

*Parqueadero* — Sede o zona física que agrupa celdas y puertas.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_parqueadero | INT | PK |
| nombre | VARCHAR(60) | obligatorio, único |
| direccion | VARCHAR(120) | obligatorio |
| pisos | TINYINT | 1–20 |
| horario | VARCHAR(60) | por defecto '24 horas' |
| estado | ENUM('activo','inactivo') | por defecto 'activo' |

*PuertaAcceso* — Punto de entrada o salida de un parqueadero.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_puerta | INT | PK |
| id_parqueadero | INT | FK → Parqueadero |
| nombre | VARCHAR(40) | obligatorio, único por parqueadero |
| tipo | ENUM('entrada','salida','mixta') | obligatorio |
| estado | ENUM('activo','inactivo') |  |

*Celda* — Espacio de estacionamiento.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_celda | INT | PK |
| id_parqueadero | INT | FK → Parqueadero |
| codigo | VARCHAR(10) | obligatorio, único por parqueadero (p. ej. A-01) |
| tipo_vehiculo | ENUM('carro','moto') | obligatorio |
| piso | TINYINT | obligatorio |
| area | VARCHAR(20) | opcional |
| estado | ENUM('disponible','ocupada','reservada','inhabilitada') | por defecto 'disponible' |
| id_vehiculo_actual | INT | FK → Vehiculo, nulo si no está ocupada |

**4.5 Vehículos**

*Vehiculo* — Carro o moto identificado por su placa.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_vehiculo | INT | PK |
| placa | VARCHAR(7) | obligatorio, único, normalizada |
| tipo | ENUM('carro','moto') | obligatorio |
| color | VARCHAR(30) | obligatorio |
| marca | VARCHAR(40) | obligatorio |
| modelo | SMALLINT | obligatorio, año 1950..año actual + 1 |
| id_propietario | INT | FK → Usuario, nulo para vehículo ocasional |
| estado | ENUM('activo','inactivo') |  |

**4.6 Restricción de pico y placa**

*RestriccionPlaca* — Regla de pico y placa para un día.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_restriccion | INT | PK |
| dia_semana | TINYINT | 1 (lunes) a 7 (domingo) |
| tipo_vehiculo | ENUM('carro','moto') | obligatorio |
| digitos | VARCHAR(20) | lista de dígitos 0–9 sin repetir, p. ej. '6,9' |
| posicion_digito | ENUM('ultimo','primero') | por defecto 'ultimo' para carro y 'primero' para moto |
| hora_inicio | TIME | obligatorio |
| hora_fin | TIME | obligatorio, mayor que hora_inicio |
| vigente_desde | DATE |  |
| vigente_hasta | DATE | opcional |
| estado | ENUM('activo','inactivo') |  |

**4.7 Control de ingreso y salida**

*Movimiento* — Estadía de un vehículo.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_movimiento | INT | PK |
| id_vehiculo | INT | FK → Vehiculo |
| id_celda | INT | FK → Celda |
| id_puerta_entrada | INT | FK → PuertaAcceso |
| fecha_hora_entrada | DATETIME | obligatorio, hora del servidor |
| id_operador_entrada | INT | FK → Usuario |
| id_puerta_salida | INT | FK, nulo hasta la salida |
| fecha_hora_salida | DATETIME | nulo hasta la salida |
| minutos_estadia | INT | calculado |
| id_operador_salida | INT | FK |
| estado | ENUM('abierto','cerrado','anulado') |  |
| motivo_anulacion | VARCHAR(200) |  |

*Ticket* — Comprobante de ingreso.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_ticket | INT | PK |
| id_movimiento | INT | FK único |
| codigo | VARCHAR(12) | único, consecutivo legible (p. ej. T-000123) |
| fecha_emision | DATETIME |  |
| impreso | BOOLEAN |  |

**4.8 Tarifas**

*Tarifa* — Esquema de cobro vigente.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_tarifa | INT | PK |
| nombre | VARCHAR(60) | obligatorio |
| tipo_vehiculo | ENUM('carro','moto') | obligatorio |
| tipo_cliente | ENUM('ocasional','registrado') | obligatorio |
| valor_primera_hora | DECIMAL(12,2) | > 0 |
| minutos_fraccion | SMALLINT | 1–60 |
| valor_fraccion | DECIMAL(12,2) | ≥ 0 |
| tope_diario | DECIMAL(12,2) | opcional, ≥ valor_primera_hora |
| minutos_gracia | SMALLINT | 0–30 |
| vigente_desde | DATETIME | obligatorio |
| vigente_hasta | DATETIME | opcional |
| estado | ENUM('activo','inactivo') |  |

**4.9 Facturación y pagos**

*Liquidacion* — Cálculo del valor de un movimiento.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_liquidacion | INT | PK |
| id_movimiento | INT | FK único |
| id_tarifa | INT | FK |
| minutos_cobrados | INT |  |
| valor_bruto | DECIMAL(12,2) |  |
| id_descuento | INT | FK, opcional |
| valor_descuento | DECIMAL(12,2) |  |
| cubierto_por_membresia | BOOLEAN |  |
| valor_total | DECIMAL(12,2) | ≥ 0 |

*Factura* — Comprobante de pago.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_factura | INT | PK |
| numero | VARCHAR(20) | único, consecutivo sin huecos (p. ej. FV-000245) |
| id_liquidacion | INT | FK, opcional |
| id_membresia | INT | FK, opcional |
| id_cliente | INT | FK → Usuario, opcional |
| total | DECIMAL(12,2) |  |
| fecha_emision | DATETIME |  |
| estado | ENUM('emitida','anulada') |  |
| motivo_anulacion | VARCHAR(200) |  |
| cufe | VARCHAR(100) | opcional, si hay facturación electrónica |

*Pago* — Pago aplicado a una factura.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_pago | INT | PK |
| id_factura | INT | FK |
| metodo | ENUM('efectivo','tarjeta','transferencia','qr') | obligatorio |
| valor | DECIMAL(12,2) | > 0 |
| valor_recibido | DECIMAL(12,2) | solo efectivo |
| cambio | DECIMAL(12,2) |  |
| referencia | VARCHAR(40) | obligatoria salvo efectivo |
| id_operador | INT | FK |
| fecha | DATETIME |  |

*CierreCaja* — Cuadre del turno de un operador.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_cierre | INT | PK |
| id_operador | INT | FK |
| inicio_turno | DATETIME |  |
| fin_turno | DATETIME |  |
| total_sistema_por_metodo | JSON |  |
| efectivo_contado | DECIMAL(12,2) |  |
| diferencia | DECIMAL(12,2) |  |
| observaciones | VARCHAR(200) |  |

**4.10 Membresías**

*PlanMembresia* — Plan mensual ofrecido.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_plan | INT | PK |
| nombre | VARCHAR(60) | obligatorio, único |
| tipo_vehiculo | ENUM('carro','moto') |  |
| valor_mensual | DECIMAL(12,2) | > 0 |
| dias_vigencia | SMALLINT | por defecto 30 |
| beneficios | VARCHAR(300) |  |
| estado | ENUM('activo','inactivo') |  |

*Membresia* — Suscripción de un cliente para un vehículo.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_membresia | INT | PK |
| id_plan | INT | FK |
| id_cliente | INT | FK → Usuario |
| id_vehiculo | INT | FK → Vehiculo |
| fecha_inicio | DATE |  |
| fecha_fin | DATE |  |
| estado | ENUM('activa','vencida','cancelada') |  |
| id_factura | INT | FK |

**4.11 Beneficios y descuentos**

*Descuento* — Beneficio aplicable a la liquidación.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_descuento | INT | PK |
| nombre | VARCHAR(60) | obligatorio, único |
| tipo | ENUM('porcentaje','valor_fijo') |  |
| valor | DECIMAL(12,2) | porcentaje 1–100 o valor > 0 |
| aplica_tipo_cliente | ENUM('todos','ocasional','registrado') |  |
| aplica_tipo_vehiculo | ENUM('todos','carro','moto') |  |
| minutos_minimos | INT | opcional |
| vigente_desde | DATETIME |  |
| vigente_hasta | DATETIME |  |
| estado | ENUM('activo','inactivo') |  |

**4.12 Reservas**

*Reserva* — Apartado de una celda.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_reserva | INT | PK |
| codigo | VARCHAR(12) | único |
| id_cliente | INT | FK → Usuario |
| id_vehiculo | INT | FK → Vehiculo (del cliente) |
| id_celda | INT | FK → Celda |
| fecha_hora_inicio | DATETIME | futura |
| minutos_espera | SMALLINT | por defecto 30 (TBD-07) |
| estado | ENUM('confirmada','cumplida','cancelada','vencida') |  |
| id_movimiento | INT | FK, al cumplirse |

**4.13 Incidencias**

*Incidencia* — Evento que afecta un vehículo.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_incidencia | INT | PK |
| codigo | VARCHAR(12) | único, autogenerado (p. ej. INC-000031) |
| tipo | ENUM('rayon','choque','atropellamiento','golpe_muro') | obligatorio |
| id_vehiculo | INT | FK, obligatorio |
| id_celda | INT | FK, opcional |
| fecha_hora_evento | DATETIME | obligatorio, no futura |
| descripcion | VARCHAR(500) | obligatorio |
| evidencia_url | VARCHAR(255) | opcional |
| id_operador | INT | FK |
| estado | ENUM('abierta','en_seguimiento','cerrada') |  |
| solucion | VARCHAR(500) |  |

*SeguimientoIncidencia* — Anotación del seguimiento.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_seguimiento | INT | PK |
| id_incidencia | INT | FK |
| nota | VARCHAR(500) |  |
| id_usuario | INT | FK |
| fecha | DATETIME |  |

**4.14 Monitoreo, placas y alertas**

*LecturaPlaca* — Placa leída por el servicio de reconocimiento.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_lectura | INT | PK |
| placa_leida | VARCHAR(10) |  |
| confianza | DECIMAL(5,2) | 0–100 |
| id_puerta | INT | FK |
| fecha_hora | DATETIME |  |
| imagen_url | VARCHAR(255) |  |
| estado | ENUM('pendiente','confirmada','descartada') |  |
| id_movimiento | INT | FK, opcional |

*Alerta* — Aviso para administradores u operadores.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_alerta | INT | PK |
| tipo | ENUM('pico_y_placa','ocupacion_alta','incidencia','permanencia_larga','sin_tarifa','lectura_dudosa') |  |
| mensaje | VARCHAR(200) |  |
| referencia | VARCHAR(40) |  |
| fecha | DATETIME |  |
| leida | BOOLEAN |  |

*Notificacion* — Mensaje a un cliente.

| Atributo | Tipo | Restricciones |
|---|---|---|
| id_notificacion | INT | PK |
| id_usuario | INT | FK |
| tipo | ENUM('reserva','membresia','factura','incidencia','datos') |  |
| titulo | VARCHAR(80) |  |
| mensaje | VARCHAR(300) |  |
| canal | ENUM('app','correo','ambos') |  |
| enviada | BOOLEAN |  |
| leida | BOOLEAN |  |
| fecha | DATETIME |  |

### 6.2 Requerimientos legales

Tratamiento de datos personales conforme a la Ley 1581 de 2012 (autorización, finalidad, acceso del titular, rectificación). Los comprobantes de pago deben conservar numeración consecutiva sin huecos; las facturas anuladas no se eliminan.

### 6.3 Internacionalización

Solo español (Colombia). Moneda COP sin decimales en pantalla. Zona horaria America/Bogota.

## Apéndice A: Glosario

| Término | Definición |
|---|---|
| Celda | Espacio físico de estacionamiento para un vehículo, identificado por un código único (p. ej. A-01, M-12), de tipo carro o moto. |
| Parqueadero | Sede o zona del establecimiento que agrupa celdas y puertas de acceso (p. ej. «Sede Centro — Piso 1»). |
| Puerta de acceso | Punto por donde entran o salen los vehículos; se registra en cada movimiento. |
| Movimiento | Registro de la estadía de un vehículo: entrada (fecha, hora, puerta, celda) y salida. |
| Ticket | Comprobante de ingreso con código único que se entrega al conductor y se presenta a la salida. |
| Liquidación | Cálculo del valor a pagar según el tiempo de estadía, la tarifa vigente, la membresía y los descuentos. |
| Fracción | Unidad mínima de cobro después de la primera hora (p. ej. cada 15 minutos). |
| Tiempo de gracia | Minutos iniciales que no se cobran. |
| Pico y placa | Restricción de circulación por el dígito de la placa según el día; el cliente pidió que el sistema niegue el ingreso a los vehículos restringidos. |
| Membresía | Plan mensual que da derecho a estacionar sin pago por evento durante su vigencia. |
| Reserva | Apartado de una celda para una fecha y hora futura. |
| Incidencia | Evento ocurrido dentro del parqueadero que afecta un vehículo: rayón, choque, atropellamiento o golpe contra muro. |
| JWT | JSON Web Token; credencial firmada que el cliente envía en cada petición a la API. |
| Ley 1581 | Ley colombiana de protección de datos personales (Habeas Data). |
| Spec | Especificación de una funcionalidad en el formato de GitHub spec-kit (`specs/NNN-modulo/spec.md`). |

## Apéndice B: Modelos de análisis

**B.1 Contrato API REST sugerido.** Base `/api/v1`, JSON, sobre de respuesta `{ ok, data, meta, error }`, autenticación Bearer JWT salvo en los endpoints públicos de acceso. Listados con `?page=1&limit=10&q=texto` y filtros propios; `meta` devuelve `{ page, limit, total }`.

*4.1 Roles y permisos*

| Método | Ruta | Propósito | HU |
|---|---|---|---|
| GET | `/api/v1/roles` | Contar con los perfiles iniciales del sistema | HU-01 |
| POST | `/api/v1/roles` | Registrar un rol con sus permisos | HU-02 |
| GET | `/api/v1/roles?page&limit&q&estado` | Consultar y buscar roles | HU-03 |
| GET | `/api/v1/roles/:id` | Consultar detalle (roles) | HU-03 |
| PUT | `/api/v1/roles/:id` | Actualizar un rol y sus permisos | HU-04 |
| PATCH | `/api/v1/roles/:id/estado` | Activar o inactivar un rol | HU-05 |
| GET | `/api/v1/permisos` | Consultar el catálogo de permisos | HU-06 |

*4.2 Gestión de usuarios*

| Método | Ruta | Propósito | HU |
|---|---|---|---|
| POST | `/api/v1/usuarios` | Registrar un usuario | HU-07 |
| GET | `/api/v1/usuarios?page&limit&q&rol&estado` | Consultar y buscar usuarios | HU-08 |
| GET | `/api/v1/usuarios/:id` | Consultar detalle (usuarios) | HU-08 |
| PUT | `/api/v1/usuarios/:id` | Actualizar los datos de cualquier usuario | HU-09 |
| PATCH | `/api/v1/usuarios/:id/estado` | Activar o inactivar un usuario | HU-10 |
| GET | `/api/v1/usuarios/me` | Actualizar mis datos personales | HU-11 |
| PUT | `/api/v1/usuarios/me` | Actualizar (me) | HU-11 |

*4.3 Gestión de acceso*

| Método | Ruta | Propósito | HU |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Iniciar sesión como Administrador u Operador | HU-12, HU-13 |
| PUT | `/api/v1/auth/contrasena` | Actualizar (contrasena) | HU-12 |
| POST | `/api/v1/auth/registro` | Registrarme como cliente | HU-14 |
| POST | `/api/v1/auth/recuperar` | Recuperar mi contraseña | HU-15 |
| POST | `/api/v1/auth/restablecer` | Registrar (restablecer) | HU-15 |
| POST | `/api/v1/auth/logout` | Cerrar sesión | HU-16 |

*4.4 Parqueaderos y celdas*

| Método | Ruta | Propósito | HU |
|---|---|---|---|
| POST | `/api/v1/parqueaderos` | Registrar un parqueadero | HU-17 |
| GET | `/api/v1/parqueaderos?page&limit&q&estado` | Listar o consultar parqueaderos | HU-17 |
| GET | `/api/v1/parqueaderos/:id` | Consultar detalle (parqueaderos) | HU-17 |
| PUT | `/api/v1/parqueaderos/:id` | Actualizar o inactivar un parqueadero | HU-18 |
| DELETE | `/api/v1/parqueaderos/:id` | (inactivación lógica) | HU-18 |
| GET | `/api/v1/parqueaderos/:id/puertas` | Configurar las puertas de acceso | HU-19 |
| POST | `/api/v1/parqueaderos/:id/puertas` | Registrar (puertas) | HU-19 |
| PUT | `/api/v1/puertas/:id` | Actualizar (puertas) | HU-19 |
| POST | `/api/v1/celdas` | Registrar celdas de parqueo | HU-20 |
| POST | `/api/v1/celdas/lote` | Registrar (lote) | HU-20 |
| PUT | `/api/v1/celdas/:id` | Actualizar o inhabilitar una celda | HU-21 |
| PATCH | `/api/v1/celdas/:id/estado` | Actualizar estado | HU-21 |
| DELETE | `/api/v1/celdas/:id` | (inhabilitación lógica) | HU-21 |
| GET | `/api/v1/celdas?parqueadero&piso&tipo&estado` | Ver el mapa de celdas y su estado | HU-22 |
| GET | `/api/v1/celdas/:id` | Consultar detalle (celdas) | HU-22 |
| (efecto | `de` | POST /api/v1/movimientos y POST /api/v1/movimientos/:id/salida) | HU-23 |
| GET | `/api/v1/disponibilidad` | Consultar la disponibilidad en tiempo real | HU-24 |

*4.5 Vehículos*

| Método | Ruta | Propósito | HU |
|---|---|---|---|
| POST | `/api/v1/vehiculos` | Registrar un vehículo | HU-25 |
| PATCH | `/api/v1/vehiculos/:id/propietario` | Asociar un vehículo a su propietario | HU-26, HU-27 |
| PUT | `/api/v1/vehiculos/:id` | Actualizar o reasignar un vehículo | HU-27 |
| GET | `/api/v1/vehiculos?page&limit&q&tipo&propietario&dentro` | Consultar vehículos | HU-28 |
| GET | `/api/v1/vehiculos/:id` | Consultar detalle (vehiculos) | HU-28 |
| GET | `/api/v1/usuarios/me/vehiculos` | Listar o consultar vehiculos | HU-28 |

*4.6 Restricción de pico y placa*

| Método | Ruta | Propósito | HU |
|---|---|---|---|
| GET | `/api/v1/restricciones-placa` | Configurar la restricción de pico y placa | HU-29 |
| POST | `/api/v1/restricciones-placa` | Registrar (restricciones placa) | HU-29 |
| PUT | `/api/v1/restricciones-placa/:id` | Actualizar (restricciones placa) | HU-29 |
| DELETE | `/api/v1/restricciones-placa/:id` | Inactivar (eliminación lógica) | HU-29 |
| GET | `/api/v1/restricciones-placa/hoy` | Consultar la restricción vigente | HU-30 |

*4.7 Control de ingreso y salida*

| Método | Ruta | Propósito | HU |
|---|---|---|---|
| POST | `/api/v1/movimientos` | Registrar la entrada de un vehículo | HU-31 |
| GET | `/api/v1/tickets/:codigo` | Generar el ticket de ingreso | HU-32 |
| POST | `/api/v1/tickets/:codigo/envio` | Registrar (envio) | HU-32 |
| POST | `/api/v1/movimientos/:id/salida` | Registrar la salida de un vehículo | HU-33 |
| GET | `/api/v1/movimientos?placa&estado=abierto` | Listar o consultar movimientos | HU-33 |
| GET | `/api/v1/movimientos?estado=abierto&q` | Consultar los vehículos dentro del parqueadero | HU-34 |
| PATCH | `/api/v1/movimientos/:id/anulacion` | Anular un registro de entrada erróneo | HU-35 |

*4.8 Tarifas*

| Método | Ruta | Propósito | HU |
|---|---|---|---|
| POST | `/api/v1/tarifas` | Configurar una tarifa | HU-36 |
| PUT | `/api/v1/tarifas/:id` | Actualizar o inactivar una tarifa | HU-37 |
| PATCH | `/api/v1/tarifas/:id/estado` | Actualizar estado | HU-37 |
| GET | `/api/v1/tarifas?vigentes=true` | Consultar las tarifas vigentes | HU-38 |

*4.9 Facturación y pagos*

| Método | Ruta | Propósito | HU |
|---|---|---|---|
| GET | `/api/v1/movimientos/:id/liquidacion` | Liquidar el valor del servicio | HU-39 |
| POST | `/api/v1/pagos` | Registrar el pago del servicio | HU-40 |
| POST | `/api/v1/facturas` | Emitir el comprobante o factura | HU-41 |
| GET | `/api/v1/facturas/:id` | Consultar detalle (facturas) | HU-41 |
| GET | `/api/v1/facturas/:id/pdf` | Listar o consultar pdf | HU-41 |
| PATCH | `/api/v1/facturas/:id/anulacion` | Anular una factura | HU-42 |
| GET | `/api/v1/facturas?page&limit&q&desde&hasta&metodo&estado` | Consultar facturas | HU-43 |
| GET | `/api/v1/usuarios/me/facturas` | Listar o consultar facturas | HU-43 |
| GET | `/api/v1/caja/turno-actual` | Cuadrar la caja del turno | HU-44 |
| POST | `/api/v1/caja/cierres` | Registrar (cierres) | HU-44 |
| GET | `/api/v1/caja/cierres` | Listar o consultar cierres | HU-44 |

*4.10 Membresías*

| Método | Ruta | Propósito | HU |
|---|---|---|---|
| GET | `/api/v1/planes-membresia` | Configurar planes de membresía | HU-45 |
| POST | `/api/v1/planes-membresia` | Registrar (planes membresia) | HU-45 |
| PUT | `/api/v1/planes-membresia/:id` | Actualizar (planes membresia) | HU-45 |
| PATCH | `/api/v1/planes-membresia/:id/estado` | Actualizar estado | HU-45 |
| POST | `/api/v1/membresias` | Suscribir un cliente a un plan | HU-46 |
| POST | `/api/v1/membresias/:id/renovacion` | Renovar o cancelar una membresía | HU-47 |
| PATCH | `/api/v1/membresias/:id/cancelacion` | Actualizar cancelacion | HU-47 |
| GET | `/api/v1/usuarios/me/membresias` | Consultar mi membresía | HU-48 |

*4.11 Beneficios y descuentos*

| Método | Ruta | Propósito | HU |
|---|---|---|---|
| GET | `/api/v1/descuentos` | Configurar un descuento o promoción | HU-49 |
| POST | `/api/v1/descuentos` | Registrar (descuentos) | HU-49 |
| PUT | `/api/v1/descuentos/:id` | Actualizar (descuentos) | HU-49 |
| (parte | `de` | GET /api/v1/movimientos/:id/liquidacion) | HU-50 |
| PATCH | `/api/v1/descuentos/:id/estado` | Activar o inactivar un descuento | HU-51 |

*4.12 Reservas*

| Método | Ruta | Propósito | HU |
|---|---|---|---|
| POST | `/api/v1/reservas` | Reservar una celda | HU-52 |
| GET | `/api/v1/celdas/disponibles?fecha&tipo` | Listar o consultar disponibles | HU-52 |
| PATCH | `/api/v1/reservas/:id/cancelacion` | Cancelar mi reserva | HU-53 |
| GET | `/api/v1/usuarios/me/reservas` | Listar o consultar reservas | HU-53 |
| GET | `/api/v1/reservas?fecha&estado` | Consultar las reservas del día | HU-54 |
| (efecto | `de` | POST /api/v1/movimientos) | HU-55 |
| tarea | `programada` | cada minuto | HU-55 |

*4.13 Incidencias*

| Método | Ruta | Propósito | HU |
|---|---|---|---|
| POST | `/api/v1/incidencias` | Registrar una incidencia | HU-56 |
| GET | `/api/v1/incidencias?page&limit&q&tipo&estado&desde&hasta` | Consultar incidencias | HU-57 |
| GET | `/api/v1/incidencias/:id` | Consultar detalle (incidencias) | HU-57 |
| POST | `/api/v1/incidencias/:id/seguimientos` | Dar seguimiento y cerrar una incidencia | HU-58 |
| PATCH | `/api/v1/incidencias/:id/cierre` | Actualizar cierre | HU-58 |

*4.14 Monitoreo, placas y alertas*

| Método | Ruta | Propósito | HU |
|---|---|---|---|
| POST | `/api/v1/lecturas-placa` | Recibir la placa leída por reconocimiento automático | HU-59 |
| GET | `/api/v1/lecturas-placa?puerta&estado=pendiente` | Listar o consultar lecturas placa | HU-59 |
| GET | `/api/v1/alertas?leida` | Generar alertas para el administrador | HU-60 |
| PATCH | `/api/v1/alertas/:id/lectura` | Actualizar lectura | HU-60 |
| (servicio | `interno` | de notificaciones) | HU-61 |
| GET | `/api/v1/usuarios/me/notificaciones` | Consultar mis notificaciones | HU-62 |
| PATCH | `/api/v1/notificaciones/:id/lectura` | Actualizar lectura | HU-62 |

*4.15 Reportes e indicadores*

| Método | Ruta | Propósito | HU |
|---|---|---|---|
| GET | `/api/v1/reportes/usuarios` | Generar reportes operativos | HU-63 |
| GET | `/api/v1/reportes/vehiculos` | Listar o consultar vehiculos | HU-63 |
| GET | `/api/v1/reportes/entradas?desde&hasta` | Listar o consultar entradas | HU-63 |
| GET | `/api/v1/reportes/salidas?desde&hasta` | Listar o consultar salidas | HU-63 |
| GET | `/api/v1/reportes/incidencias?desde&hasta` | Listar o consultar incidencias | HU-63 |
| (parámetro | `formato=csv|pdf)` |  | HU-63 |
| GET | `/api/v1/reportes/restringidos?fecha` | Generar reportes de ocupación y uso | HU-64 |
| GET | `/api/v1/reportes/ocupacion-diaria?fecha` | Listar o consultar ocupacion diaria | HU-64 |
| GET | `/api/v1/reportes/celdas-top?desde&hasta` | Listar o consultar celdas top | HU-64 |
| GET | `/api/v1/reportes/vehiculos-top?desde&hasta` | Listar o consultar vehiculos top | HU-64 |
| GET | `/api/v1/reportes/horas-pico?desde&hasta` | Listar o consultar horas pico | HU-64 |
| GET | `/api/v1/reportes/ingresos?desde&hasta&formato` | Generar el reporte financiero | HU-65 |
| GET | `/api/v1/indicadores?periodo` | Consultar el tablero de indicadores | HU-66 |

**B.2 Mapa de pantallas.**

| Característica | Pantalla / componente | HU |
|---|---|---|
| ROL | Configuración › Roles (listado) | HU-01 |
| ROL | Configuración › Roles › Nuevo rol (formulario con permisos agrupados por módulo) | HU-02 |
| ROL | Configuración › Roles (listado); Configuración › Roles › Detalle | HU-03 |
| ROL | Configuración › Roles › Editar | HU-04 |
| ROL | Configuración › Roles (acción Cambiar estado con diálogo de confirmación) | HU-05 |
| ROL | Configuración › Permisos (solo lectura) | HU-06 |
| USR | Usuarios › Nuevo usuario | HU-07 |
| USR | Usuarios (listado); Usuarios › Detalle | HU-08 |
| USR | Usuarios › Editar | HU-09 |
| USR | Usuarios (acción Cambiar estado) | HU-10 |
| USR | Mi perfil | HU-11 |
| ACC | Inicio de sesión; Cambiar contraseña | HU-12 |
| ACC | Inicio de sesión; Panel del cliente | HU-13 |
| ACC | Registro de cliente | HU-14 |
| ACC | Recuperar contraseña; Restablecer contraseña | HU-15 |
| ACC | Menú de usuario › Cerrar sesión | HU-16 |
| CLD | Configuración › Parqueaderos (listado, nuevo, detalle) | HU-17 |
| CLD | Configuración › Parqueaderos › Editar | HU-18 |
| CLD | Configuración › Parqueaderos › Detalle › Puertas | HU-19 |
| CLD | Celdas › Nueva celda; Celdas › Registro por rango | HU-20 |
| CLD | Celdas › Editar; Celdas (acción Inhabilitar/Habilitar) | HU-21 |
| CLD | Celdas (mapa por piso); Panel del cliente › Disponibilidad | HU-22 |
| CLD | Celdas (actualización automática cada 10 s) | HU-23 |
| CLD | Página pública de disponibilidad; Tablero del operador (indicadores) | HU-24 |
| VEH | Vehículos › Nuevo vehículo | HU-25 |
| VEH | Vehículos › Detalle (Asociar propietario); Usuarios › Detalle (Agregar vehículo) | HU-26 |
| VEH | Vehículos › Editar | HU-27 |
| VEH | Vehículos (listado); Vehículos › Detalle; Panel del cliente › Mis vehículos | HU-28 |
| PYP | Configuración › Pico y placa (tabla semanal por tipo de vehículo) | HU-29 |
| PYP | Movimientos (aviso de pico y placa); Panel del cliente | HU-30 |
| MOV | Movimientos › Registrar entrada (pantalla de caseta) | HU-31 |
| MOV | Movimientos › Ticket (vista de impresión) | HU-32 |
| MOV | Movimientos › Registrar salida (pantalla de caseta) | HU-33 |
| MOV | Movimientos › Vehículos dentro | HU-34 |
| MOV | Movimientos › Detalle (acción Anular) | HU-35 |
| TAR | Configuración › Tarifas › Nueva tarifa | HU-36 |
| TAR | Configuración › Tarifas › Editar | HU-37 |
| TAR | Página pública de tarifas; Configuración › Tarifas (listado) | HU-38 |
| FAC | Movimientos › Registrar salida (panel de liquidación) | HU-39 |
| FAC | Movimientos › Registrar salida (cobro) | HU-40 |
| FAC | Facturación › Comprobante (vista de impresión) | HU-41 |
| FAC | Facturación (listado, acción Anular) | HU-42 |
| FAC | Facturación (listado); Panel del cliente › Mis facturas | HU-43 |
| FAC | Facturación › Cierre de caja | HU-44 |
| MEM | Configuración › Planes de membresía | HU-45 |
| MEM | Membresías › Nueva suscripción | HU-46 |
| MEM | Membresías › Detalle (Renovar / Cancelar) | HU-47 |
| MEM | Panel del cliente › Mi membresía | HU-48 |
| DES | Configuración › Descuentos | HU-49 |
| DES | Movimientos › Registrar salida (detalle del descuento) | HU-50 |
| DES | Configuración › Descuentos (acción Cambiar estado) | HU-51 |
| RES | Panel del cliente › Reservar | HU-52 |
| RES | Panel del cliente › Mis reservas | HU-53 |
| RES | Reservas (listado del día) | HU-54 |
| RES | Reservas (estado); Movimientos › Registrar entrada (aviso de reserva) | HU-55 |
| INC | Incidencias › Nueva incidencia | HU-56 |
| INC | Incidencias (listado); Incidencias › Detalle | HU-57 |
| INC | Incidencias › Detalle (Seguimiento y Cierre) | HU-58 |
| MON | Movimientos › Registrar entrada/salida (placa precargada) | HU-59 |
| MON | Barra superior › Alertas | HU-60 |
| MON | (correo) Plantillas de notificación | HU-61 |
| MON | Panel del cliente › Notificaciones | HU-62 |
| REP | Reportes › Operativos | HU-63 |
| REP | Reportes › Ocupación y uso | HU-64 |
| REP | Reportes › Financiero | HU-65 |
| REP | Inicio › Tablero del administrador | HU-66 |

## Apéndice C: Lista TBD

| ID | Sección | Qué falta | Quién debe decidir | Fecha límite |
|---|---|---|---|---|
| TBD-01 | 2.7, 4.14 | Hardware y servicio de reconocimiento automático de placas (cámara, proveedor OCR, formato de envío) | Administrador del parqueadero e instructor | Antes del sprint del módulo MON |
| TBD-02 | 1.4, 4.9 | Proveedor tecnológico de facturación electrónica (DIAN) y pasarela de pagos con tarjeta | Administrador del parqueadero | Antes de producción |
| TBD-03 | 4.6 | Calendario vigente de pico y placa en Medellín (dígitos por día, horario, excepciones) para cargar la configuración inicial | Administrador del parqueadero | Antes de la puesta en marcha |
| TBD-04 | 4.8 | Valores iniciales de tarifas, tamaño de fracción, tiempo de gracia y tope diario | Administrador del parqueadero | Sprint del módulo TAR |
| TBD-05 | 4.3 | Confirmar que el Cliente inicia sesión con documento y contraseña (REQ-USR-8 pedía solo documento, lo que expone datos personales) | Product Owner (instructor) | Sprint del módulo ACC |
| TBD-06 | 5.1, 5.4 | Confirmar las metas de rendimiento y disponibilidad (valores de referencia) | Cliente y Product Owner | Antes de las pruebas de aceptación |
| TBD-07 | 4.12 | Anticipación máxima de una reserva y minutos de espera antes de liberarla | Administrador del parqueadero | Sprint del módulo RES |
| TBD-08 | 1.1 | Nombre comercial del aplicativo («Por definir» en la ficha) | Cliente | Antes de la entrega final |
| TBD-09 | 3.3 | Servicio de correo transaccional (SMTP institucional o proveedor) y remitente | Instructor | Sprint del módulo ACC |

## Apéndice D: Matriz de trazabilidad HU → RF → spec

| HU | Historia | Prioridad | RF | Spec | Excel |
|---|---|---|---|---|---|
| HU-01 | Contar con los perfiles iniciales del sistema | Alta | RF-ROL-01, RF-ROL-02, RF-ROL-03 | `001-roles-permisos` | HU-CONFIG-001 |
| HU-02 | Registrar un rol con sus permisos | Media | RF-ROL-04, RF-ROL-05, RF-ROL-06 | `001-roles-permisos` | Inferida (ficha) |
| HU-03 | Consultar y buscar roles | Media | RF-ROL-07, RF-ROL-08 | `001-roles-permisos` | Inferida (ficha) |
| HU-04 | Actualizar un rol y sus permisos | Media | RF-ROL-09, RF-ROL-10, RF-ROL-11 | `001-roles-permisos` | Inferida (ficha) |
| HU-05 | Activar o inactivar un rol | Media | RF-ROL-12, RF-ROL-13, RF-ROL-14 | `001-roles-permisos` | Inferida (ficha) |
| HU-06 | Consultar el catálogo de permisos | Baja | RF-ROL-15 | `001-roles-permisos` | Inferida (ficha) |
| HU-07 | Registrar un usuario | Alta | RF-USR-01, RF-USR-02, RF-USR-03, RF-USR-04, RF-USR-05 | `002-gestion-usuarios` | HU-UM-001, HU-USER-CREATE-01 |
| HU-08 | Consultar y buscar usuarios | Alta | RF-USR-06, RF-USR-07, RF-USR-08 | `002-gestion-usuarios` | Inferida (ficha) |
| HU-09 | Actualizar los datos de cualquier usuario | Media | RF-USR-09, RF-USR-10, RF-USR-11 | `002-gestion-usuarios` | HU-UM-004 |
| HU-10 | Activar o inactivar un usuario | Alta | RF-USR-12, RF-USR-13, RF-USR-14 | `002-gestion-usuarios` | HU-UM-002, HU-USER-STATUS-01 |
| HU-11 | Actualizar mis datos personales | Media | RF-USR-15, RF-USR-16, RF-USR-17 | `002-gestion-usuarios` | HU-UM-003 |
| HU-12 | Iniciar sesión como Administrador u Operador | Alta | RF-ACC-01, RF-ACC-02, RF-ACC-03, RF-ACC-04 | `003-gestion-acceso` | HU-UM-006 |
| HU-13 | Iniciar sesión como Cliente | Alta | RF-ACC-05, RF-ACC-06 | `003-gestion-acceso` | HU-UM-007 |
| HU-14 | Registrarme como cliente | Media | RF-ACC-07, RF-ACC-08, RF-ACC-09 | `003-gestion-acceso` | Inferida (ficha) |
| HU-15 | Recuperar mi contraseña | Alta | RF-ACC-10, RF-ACC-11, RF-ACC-12 | `003-gestion-acceso` | Inferida (ficha) |
| HU-16 | Cerrar sesión | Alta | RF-ACC-13 | `003-gestion-acceso` | Inferida (ficha) |
| HU-17 | Registrar un parqueadero | Alta | RF-CLD-01, RF-CLD-02, RF-CLD-03 | `004-parqueaderos-celdas` | Inferida (ficha) |
| HU-18 | Actualizar o inactivar un parqueadero | Media | RF-CLD-04, RF-CLD-05, RF-CLD-06 | `004-parqueaderos-celdas` | Inferida (ficha) |
| HU-19 | Configurar las puertas de acceso | Media | RF-CLD-07, RF-CLD-08 | `004-parqueaderos-celdas` | Inferida (ficha) |
| HU-20 | Registrar celdas de parqueo | Alta | RF-CLD-09, RF-CLD-10, RF-CLD-11, RF-CLD-12 | `004-parqueaderos-celdas` | Inferida (ficha) |
| HU-21 | Actualizar o inhabilitar una celda | Media | RF-CLD-13, RF-CLD-14, RF-CLD-15 | `004-parqueaderos-celdas` | Inferida (ficha) |
| HU-22 | Ver el mapa de celdas y su estado | Alta | RF-CLD-16, RF-CLD-17, RF-CLD-18 | `004-parqueaderos-celdas` | HU-CLD-001 |
| HU-23 | Actualizar el estado de la celda con cada movimiento | Alta | RF-CLD-19, RF-CLD-20, RF-CLD-21 | `004-parqueaderos-celdas` | HU-CLD-002 |
| HU-24 | Consultar la disponibilidad en tiempo real | Alta | RF-CLD-22, RF-CLD-23 | `004-parqueaderos-celdas` | Inferida (ficha) |
| HU-25 | Registrar un vehículo | Alta | RF-VEH-01, RF-VEH-02, RF-VEH-03 | `005-vehiculos` | HU-VEH-001 |
| HU-26 | Asociar un vehículo a su propietario | Alta | RF-VEH-04, RF-VEH-05, RF-VEH-06 | `005-vehiculos` | HU-UM-005 |
| HU-27 | Actualizar o reasignar un vehículo | Media | RF-VEH-07, RF-VEH-08, RF-VEH-09 | `005-vehiculos` | HU-VEH-002 |
| HU-28 | Consultar vehículos | Alta | RF-VEH-10, RF-VEH-11, RF-VEH-12 | `005-vehiculos` | Inferida (ficha) |
| HU-29 | Configurar la restricción de pico y placa | Alta | RF-PYP-01, RF-PYP-02, RF-PYP-03, RF-PYP-04 | `006-pico-y-placa` | HU-RES-001 |
| HU-30 | Consultar la restricción vigente | Media | RF-PYP-05 | `006-pico-y-placa` | Inferida (ficha) |
| HU-31 | Registrar la entrada de un vehículo | Alta | RF-MOV-01, RF-MOV-02, RF-MOV-03, RF-MOV-04, RF-MOV-05 | `007-control-ingreso-salida` | HU-ACC-001 |
| HU-32 | Generar el ticket de ingreso | Alta | RF-MOV-06, RF-MOV-07, RF-MOV-08 | `007-control-ingreso-salida` | HU-ACC-001 |
| HU-33 | Registrar la salida de un vehículo | Alta | RF-MOV-09, RF-MOV-10, RF-MOV-11, RF-MOV-12 | `007-control-ingreso-salida` | HU-ACC-002 |
| HU-34 | Consultar los vehículos dentro del parqueadero | Media | RF-MOV-13, RF-MOV-14 | `007-control-ingreso-salida` | Inferida (ficha) |
| HU-35 | Anular un registro de entrada erróneo | Media | RF-MOV-15, RF-MOV-16, RF-MOV-17 | `007-control-ingreso-salida` | Inferida (ficha) |
| HU-36 | Configurar una tarifa | Alta | RF-TAR-01, RF-TAR-02, RF-TAR-03 | `008-tarifas` | Inferida (ficha) |
| HU-37 | Actualizar o inactivar una tarifa | Media | RF-TAR-04, RF-TAR-05, RF-TAR-06 | `008-tarifas` | Inferida (ficha) |
| HU-38 | Consultar las tarifas vigentes | Media | RF-TAR-07 | `008-tarifas` | Inferida (ficha) |
| HU-39 | Liquidar el valor del servicio | Alta | RF-FAC-01, RF-FAC-02, RF-FAC-03, RF-FAC-04 | `009-facturacion-pagos` | Inferida (ficha) |
| HU-40 | Registrar el pago del servicio | Alta | RF-FAC-05, RF-FAC-06, RF-FAC-07, RF-FAC-08 | `009-facturacion-pagos` | Inferida (ficha) |
| HU-41 | Emitir el comprobante o factura | Alta | RF-FAC-09, RF-FAC-10, RF-FAC-11, RF-FAC-12 | `009-facturacion-pagos` | Inferida (ficha) |
| HU-42 | Anular una factura | Media | RF-FAC-13, RF-FAC-14 | `009-facturacion-pagos` | Inferida (ficha) |
| HU-43 | Consultar facturas | Media | RF-FAC-15, RF-FAC-16 | `009-facturacion-pagos` | Inferida (ficha) |
| HU-44 | Cuadrar la caja del turno | Media | RF-FAC-17, RF-FAC-18, RF-FAC-19 | `009-facturacion-pagos` | Inferida (ficha) |
| HU-45 | Configurar planes de membresía | Media | RF-MEM-01, RF-MEM-02 | `010-membresias` | Inferida (ficha) |
| HU-46 | Suscribir un cliente a un plan | Media | RF-MEM-03, RF-MEM-04, RF-MEM-05 | `010-membresias` | Inferida (ficha) |
| HU-47 | Renovar o cancelar una membresía | Media | RF-MEM-06, RF-MEM-07, RF-MEM-08 | `010-membresias` | Inferida (ficha) |
| HU-48 | Consultar mi membresía | Baja | RF-MEM-09, RF-MEM-10 | `010-membresias` | Inferida (ficha) |
| HU-49 | Configurar un descuento o promoción | Media | RF-DES-01, RF-DES-02 | `011-descuentos` | Inferida (ficha) |
| HU-50 | Aplicar el descuento en la liquidación | Media | RF-DES-03, RF-DES-04 | `011-descuentos` | Inferida (ficha) |
| HU-51 | Activar o inactivar un descuento | Baja | RF-DES-05 | `011-descuentos` | Inferida (ficha) |
| HU-52 | Reservar una celda | Media | RF-RES-01, RF-RES-02, RF-RES-03 | `012-reservas` | Inferida (ficha) |
| HU-53 | Cancelar mi reserva | Media | RF-RES-04, RF-RES-05 | `012-reservas` | Inferida (ficha) |
| HU-54 | Consultar las reservas del día | Media | RF-RES-06 | `012-reservas` | Inferida (ficha) |
| HU-55 | Cumplir o vencer una reserva | Media | RF-RES-07, RF-RES-08, RF-RES-09 | `012-reservas` | Inferida (ficha) |
| HU-56 | Registrar una incidencia | Alta | RF-INC-01, RF-INC-02, RF-INC-03, RF-INC-04 | `013-incidencias` | HU-INC-001 |
| HU-57 | Consultar incidencias | Media | RF-INC-05, RF-INC-06 | `013-incidencias` | Inferida (ficha) |
| HU-58 | Dar seguimiento y cerrar una incidencia | Media | RF-INC-07, RF-INC-08 | `013-incidencias` | Inferida (ficha) |
| HU-59 | Recibir la placa leída por reconocimiento automático | Baja | RF-MON-01, RF-MON-02, RF-MON-03 | `014-monitoreo-alertas` | Inferida (ficha) |
| HU-60 | Generar alertas para el administrador | Media | RF-MON-04, RF-MON-05 | `014-monitoreo-alertas` | Inferida (ficha) |
| HU-61 | Notificar a los clientes | Media | RF-MON-06, RF-MON-07 | `014-monitoreo-alertas` | Inferida (ficha) |
| HU-62 | Consultar mis notificaciones | Baja | RF-MON-08 | `014-monitoreo-alertas` | Inferida (ficha) |
| HU-63 | Generar reportes operativos | Alta | RF-REP-01, RF-REP-02, RF-REP-03, RF-REP-04, RF-REP-05 | `015-reportes-indicadores` | HU-REP-001 |
| HU-64 | Generar reportes de ocupación y uso | Media | RF-REP-06, RF-REP-07, RF-REP-08, RF-REP-09 | `015-reportes-indicadores` | HU-REP-002 |
| HU-65 | Generar el reporte financiero | Alta | RF-REP-10, RF-REP-11, RF-REP-12 | `015-reportes-indicadores` | Inferida (ficha) |
| HU-66 | Consultar el tablero de indicadores | Media | RF-REP-13, RF-REP-14 | `015-reportes-indicadores` | Inferida (ficha) |

## Apéndice E: Equivalencias v1.0 → v2.0

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

