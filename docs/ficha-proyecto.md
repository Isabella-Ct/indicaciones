# Proyecto: Sistema de Gestión de Parqueadero ("Parking Lot ABC")

Carpeta: `Parking_Lot` — el proyecto mejor documentado del conjunto (2 versiones de ficha, requisitos formales, 3 diagramas de casos de uso, script SQL + modelo MySQL Workbench, y wireframes funcionales).

## 1. Ficha del Proyecto (2 versiones)

**Cliente:** Parqueadero ABC, Carrera 43 # 47-53, Medellín; 15 años de operación; servicio de estacionamiento de carros y motos, 24 horas.

**Problema:** congestión en accesos por gestión manual; registro impreciso de entradas/salidas; facturación manual propensa a errores; sin visibilidad en tiempo real de disponibilidad; sin reportes financieros automáticos; sin reconocimiento de placas (riesgo de fraude); sin gestión de tarifas diferenciadas ni membresías.

**Objetivo general (v2, más completa):** desarrollar una aplicación web/móvil que gestione ingreso y salida de vehículos, tarifas/pagos, reservas/suscripciones, procesos operativos y financieros, y seguridad/monitoreo.

**Alcance — procesos y subprocesos (v2):**
- **Configuración:** Roles (con roles sugeridos: administrador, operario, cliente), Permisos.
- **Usuarios:** Gestión de Usuarios, Gestión de Acceso (login, registro, recuperar contraseña, logout).
- **Control de Ingreso y Salida de Vehículos:** Registro de Entrada/Salida con reconocimiento de placas; Generación de Tickets electrónicos/físicos; Control de Disponibilidad de Espacios en tiempo real.
- **Tarifas y Pagos:** Configuración de Tarifas (diferenciadas por tiempo/tipo de cliente); Facturación electrónica con múltiples métodos de pago.
- **Reservas y Suscripciones:** Reservas para clientes frecuentes; Membresías/Suscripciones mensuales con beneficios; Beneficios y Descuentos personalizados.
- **Seguridad y Monitoreo:** Incidentes/Novedades; Reconocimiento de Placa; Generación de Alertas y notificaciones.

**Antecedentes de mercado citados:** Parknet (control de acceso y facturación), Parkopedia (información global de parqueaderos), EasyPark (reservas y pagos en línea).

## 2. Requisitos formales (`Requerimientos Parking Lot.docx` — presente tanto en la carpeta de Casos de Uso como en la de Matriz HU, mismo archivo duplicado)

Especificación funcional detallada en 37 requisitos con formato REQ-XXX-N, más granular que el resto de proyectos del programa:

- **Usuario (REQ-USR-1 a 8):** 3 perfiles iniciales (Administrador, Operador, Usuario); solo admin/operador crean usuarios (documento, nombre, correo, celular obligatorios, foto opcional; código autoincremental); solo admin cambia estado activo/inactivo; el usuario edita sus propios datos (notifica al admin); admin edita datos de cualquier usuario; admin/operador asignan vehículo a usuario; admin/operador acceden con documento+contraseña; usuarios registrados acceden solo con documento.
- **Vehículo (REQ-CAR-1 a 4):** registro (placa, color, marca, modelo); solo admin actualiza y reasigna vehículo; tabla de restricciones de placa por día (pico y placa).
- **Accesos y salidas (REQ-INEX-1 a 4):** registro de entrada/salida por puerta con placa/fecha/hora; conteo automático de tiempo de estadía; bloqueo de entrada si la placa incumple pico y placa del día.
- **Incidencias (REQ-INCD-1):** registro de rayones, choques, atropellamientos, golpes contra muros, con código único, vehículo, fecha/hora y tipo.
- **Celdas de parqueo (REQ-CLD-01 a 03):** visualización de celdas por área/piso/nivel con estado, código único y tipo (moto/carro); vista individual para usuarios vía su cuenta; actualización de estado ocupado/disponible con vehículo asociado.
- **Reportes y consulta (REQ-REP-01 a 10, solo administrador):** listado de usuarios, de vehículos con propietario, de entradas, de salidas, de incidencias, de vehículos restringidos por pico y placa en un día, de celdas ocupadas por día, celdas más usadas, vehículos que más usan el parqueadero, horas/días de mayor ocupación.

## 3. Casos de Uso (3 diagramas UML en PNG)

- **Caso de Uso 1 — Gestión de Vehículos y Configuración de Restricciones:** actores Administrador y Operador → Registrar Vehículo, Actualizar Vehículo, Asignar Vehículo a Usuario, Configurar Restricciones de Placa.
- **Caso de Uso — Módulo de Accesos, Facturación e Incidencias:** Administrador → Generar Reportes, Emitir Ticket de Servicio; Administrador/Operador → Iniciar Conteo de Tiempo, Validar Restricción Pico y Placa, Gestión de Celdas y Parqueo, Registro de Incidentes, Generar Factura; Cliente → Consultar Celdas, Pagar Parqueadero, Recibir Factura.
- **Caso de Uso — Módulo de Tarifas, Pagos, Reservas y Suscripciones:** Administrador → Generar Reportes Financieros, Configurar Tarifas, Gestionar Suscripciones, Gestionar Beneficios y Descuentos; Operador → Registrar Pago; Cliente → Realizar Reserva, Pagar Parqueadero, Recibir Factura.

(El archivo `Documento.docx` de esta carpeta está vacío.)

## 4. Historias de Usuario

`Matriz Historias de Usuario Proyecto Parking Lot.xlsx` (hojas: Visión Proyecto, Epics, HU + Criterios Aceptación). La hoja de Épicas cubre los 7 procesos del alcance: Gestión de Usuarios, Gestión de Vehículos, Control de Acceso y Salida de Vehículos, Gestión de Celdas de Parqueo, Gestión de Restricciones de Acceso, Gestión de Incidencias, Generación de Reportes y Consultas.

La hoja "HU + Criterios Aceptación" está desarrollada en detalle (con trazabilidad directa a los REQ) solo para **Gestión de Usuarios**, con codificación propia (no correlativo HU_01, HU_02...):
- **HU-CONFIG-001** — perfiles iniciales Administrador/Operador/Usuario.
- **HU-UM-001** — crear usuarios (admin/operador).
- **HU-UM-002** — cambiar estado de usuario a inactivo (admin).
- **HU-UM-003** — usuario actualiza sus propios datos.
- **HU-UM-004** — admin actualiza datos de usuarios.
- **HU-UM-005** — asignar vehículo a usuario.
- **HU-UM-006** — acceso admin/operador con documento+contraseña.
- **HU-UM-007** — acceso de usuario registrado solo con documento.
- **HU-USER-CREATE-01** y **HU-USER-STATUS-01** — variantes de creación y cambio de estado de usuario, con múltiples criterios de aceptación cada una.

## 5. Base de Datos (dos versiones)

**Versión 1 — alineada a los REQ (`Script-SQL-ParkingLot.sql`, `modelo_parking_lot.mwb`, `Modelo-ER-ParkingLot.png`, `Base de datos SQL parqueadero.docx`):** 9 tablas.

| Tabla | Campos clave |
|---|---|
| PERFIL_USUARIO | id, perfil |
| USUARIO | id_usuario, tipo_documento, numero_documento, primer/segundo_nombre, primer/segundo_apellido, direccion_correo, numero_celular, foto_perfil, estado, clave, PERFIL_USUARIO_id (FK) |
| VEHICULO | id, placa, color, modelo, marca, tipo, USUARIO_id_usuario (FK) |
| PICO_PLACA | id, tipo_vehiculo, numero, dia |
| CELDA | id, tipo, estado |
| HISTORIAL_PARQUEO | CELDA_id (FK), VEHICULO_id (FK), fecha_hora |
| ACCESO_SALIDAS | id, movimiento, fecha_hora, puerta, tiempo_estadia, VEHICULO_id (FK) |
| INCIDENCIA | id, nombre |
| REPORTE_INCIDENCIA | VEHICULO_id (FK), INCIDENCIA_id (FK), fecha_hora |

**Versión 2 — ampliada con tarifas/pagos/reservas/roles (`parqueaderodb.sql`):** 16 tablas — `roles`, `roles_permisos`, `permisos`, `usuarios` (con rol_id), `vehiculos`, `espacios`, `parqueaderos`, `ingresos_salidas`, `reconocimiento_placa`, `incidentes`, `tarifas` (tipo_vehiculo, tiempo, precio), `facturas` (método de pago, total), `reservas` (usuario, parqueadero, espacio, estado pendiente/confirmada/cancelada), `membresias` (tipo mensual/anual, fecha inicio/fin), `descuentos`, `notificaciones`. Esta versión corresponde al alcance ampliado de la Ficha de Proyecto v2 (tarifas, reservas y suscripciones).

## 6. Wireframes (`WIREFRAME.pptx`, 10 pantallas, prototipo funcional en HTML/CSS)

Aplicación "Sistema de Gestión de Parqueadero" con barra de navegación superior fija: **Inicio, Registro, Movimientos, Facturación, Espacios, Incidentes, Membresías, Notificaciones, Descuentos, Historial** (una pantalla por módulo, 1:1 con la barra):
- **Inicio** — pantalla de Inicio de Sesión (usuario/correo + contraseña).
- **Registro** — alta de usuarios.
- **Movimientos** — registro de entradas/salidas de vehículos.
- **Facturación** — generación de facturas/pagos.
- **Espacios** — Gestión de Espacios: formulario con ID de espacio (ej. "A1", "M2"), Tipo (Auto/Moto) y Estado (Disponible/Ocupado), botón "Guardar Espacio".
- **Incidentes** — registro de incidencias del parqueadero.
- **Membresías** — gestión de suscripciones/membresías.
- **Notificaciones** — alertas al cliente/administrador.
- **Descuentos** — configuración de beneficios y descuentos.
- **Historial** — consulta de movimientos e historial de parqueo.

## 7. Documentos fuente
- `Ficha Proyecto/Proyecto Parqueadero.docx` (v1) y `Proyecto Parqueadero Version 2.docx` (v2, alcance ampliado)
- `Casos de Uso y Documentación CU/Requerimientos Parking Lot.docx`, `Documento.docx` (vacío), 3 diagramas PNG de casos de uso
- `Matriz Historias de Usuario/Matriz Historias de Usuario Proyecto Parking Lot.xlsx`, `Requerimientos Parking Lot.docx` (copia)
- `Base de Datos/Script-SQL-ParkingLot.sql`, `parqueaderodb.sql`, `modelo_parking_lot.mwb`, `Modelo-ER-ParkingLot.png`, `Base de datos SQL parqueadero.docx`
- `Wireframe/WIREFRAME.pptx`

## 8. Vacíos identificados
- La matriz de historias de usuario solo desarrolla en detalle el módulo de Usuarios; los otros 6 procesos de las Épicas (Vehículos, Accesos, Celdas, Restricciones, Incidencias, Reportes) no tienen HU redactadas con criterios de aceptación en el archivo actual.
- Existen dos versiones de ficha y dos versiones de base de datos sin una única versión "oficial" consolidada.
- No hay un plan SCRUM (backlog priorizado con sprints, story points, burndown).
