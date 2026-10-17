# Requerimientos — Parking Lot ABC

Fuente: `Requerimientos Parking Lot.docx` (transcrito textualmente) + requerimientos derivados del alcance ampliado de la Ficha de Proyecto v2 (`ficha-proyecto.md`).
Cuando un requerimiento original fue ajustado por decisión del cliente, se indica con **[AJUSTADO]**.

---

## A. Requerimientos originales (30)

### Usuario
- **REQ-USR-1:** El sistema debe tener solo 3 perfiles de usuario en su parametrización inicial: Administrador, Operador, Usuario.
- **REQ-USR-2:** El sistema debe permitir solo al administrador y a los operadores crear nuevos usuarios, usando como parámetro de entrada y registro los siguientes datos: tipo de documento (obligatorio), número de documento (obligatorio), nombre completo (obligatorio), dirección de correo electrónico (obligatorio), número de celular (obligatorio), fotografía (opcional), tipo de usuario (administrador, operador o usuario). El sistema asignará un código único y autoincremental al momento del registro y este identificará de manera única al usuario.
- **REQ-USR-3:** El sistema debe permitir solo al administrador actualizar el estado de un usuario de activo a inactivo.
- **REQ-USR-4:** El sistema debe permitir a cada usuario actualizar sus datos personales y al hacerlo se le debe enviar una notificación al administrador.
- **REQ-USR-5:** El sistema debe permitir al administrador actualizar los datos de los usuarios.
- **REQ-USR-6:** El sistema debe permitir al administrador o al operador asignar a un usuario un vehículo de su propiedad.
- **REQ-USR-7:** El sistema debe permitir al administrador y al operador acceder al sistema usando su número de documento y contraseña.
- **REQ-USR-8 [AJUSTADO]:** ~~Los usuarios registrados acceden solo con su número de documento.~~ → **Todos los roles (incluido Usuario/cliente) acceden con número de documento + contraseña.** Motivo: acceder solo con el documento permitiría a cualquiera entrar a la cuenta de otra persona.

### Vehículo
- **REQ-CAR-1:** El sistema debe permitir al administrador o al operador crear un vehículo usando como datos de registro: placa, color, marca y modelo. (Se agrega tipo: moto/carro, necesario para celdas, tarifas y pico y placa.)
- **REQ-CAR-2:** El sistema debe permitir solo al administrador actualizar la información de un vehículo.
- **REQ-CAR-3:** El sistema debe permitir solo al administrador asignar un vehículo a otro usuario.
- **REQ-CAR-4:** El sistema debe permitir al administrador o al operador crear una tabla de restricciones de placa por día para evitar el ingreso de un vehículo que cumpla con el criterio de restricciones (pico y placa).

### Accesos y salidas
- **REQ-INEX-1:** El sistema debe permitir al operador o al administrador registrar la entrada de un vehículo en la puerta de cualquiera de los accesos, usando como parámetro de entrada la puerta de acceso, la placa del vehículo, la fecha y la hora de entrada.
- **REQ-INEX-2:** El sistema debe permitir al operador o al administrador registrar la salida de un vehículo en la puerta de cualquiera de los accesos, usando como parámetro de entrada la puerta de acceso, la placa del vehículo, la fecha y la hora de salida.
- **REQ-INEX-3:** El sistema debe iniciar un conteo de tiempo una vez un vehículo ingrese al parqueadero, y debe finalizar el conteo una vez salga. El lapso de tiempo debe registrarse en el sistema con fecha y hora.
- **REQ-INEX-4:** El sistema debe negar el acceso o evitar el registro de entrada de un vehículo cuya placa incumpla la tabla de restricciones por día (pico y placa).

### Incidencias
- **REQ-INCD-1:** El sistema debe permitir registrar incidencias ocurridas dentro del parqueadero: rayones, choques, atropellamientos, golpes contra muros. Deben registrarse con un código único autogenerado, el vehículo afectado, la fecha, la hora y el tipo de incidencia.

### Celdas de parqueo
- **REQ-CLD-01:** El sistema debe permitir al operador, al administrador y a los usuarios visualizar todas las celdas disponibles u ocupadas por área, piso o nivel. Cada celda tiene estado (ocupado o disponible), código único, tipo (moto o carro) y el área a la que pertenece.
- **REQ-CLD-02:** El sistema debe permitir visualizar todas las celdas disponibles y ocupadas a los usuarios por medio de una interfaz individual accesible desde su cuenta.
- **REQ-CLD-03:** El sistema debe permitir actualizar el estado de cada celda de ocupado a disponible o viceversa en cualquier momento. Cuando está ocupada se debe asociar el vehículo que la ocupa.

### Reportes y consulta (solo administrador)
- **REQ-REP-01:** Listado de todos los usuarios con todos sus datos.
- **REQ-REP-02:** Listado de todos los vehículos con sus datos y el usuario propietario asociado.
- **REQ-REP-03:** Listado de todas las entradas con fecha, hora y vehículo.
- **REQ-REP-04:** Listado de todas las salidas con fecha, hora y vehículo.
- **REQ-REP-05:** Listado de todas las incidencias.
- **REQ-REP-06:** Total de vehículos que no ingresarán en un día determinado por pico y placa.
- **REQ-REP-07:** Total de celdas ocupadas en un día determinado.
- **REQ-REP-08:** Celdas más usadas en un lapso de tiempo.
- **REQ-REP-09:** Vehículos que más usan el parqueadero.
- **REQ-REP-10:** Horas y días de mayor ocupación del parqueadero.

---

## B. Requerimientos derivados del alcance v2 (casos de uso y ficha de proyecto)

- **REQ-TAR-1:** El administrador configura tarifas por tipo de vehículo (moto/carro).
- **REQ-TAR-2:** Al registrar la salida, el sistema calcula automáticamente el valor a pagar según la tarifa vigente, el tiempo de estadía, la membresía activa y el descuento aplicado.
- **REQ-FAC-1:** El operador o el administrador registran el pago con método efectivo, tarjeta o transferencia (simulado, sin pasarela real).
- **REQ-FAC-2:** El sistema genera una factura/recibo con número consecutivo, descargable en PDF, que el cliente puede consultar desde su cuenta. (No es facturación electrónica DIAN.)
- **REQ-TCK-1:** Al registrar una entrada, el sistema genera un ticket con código único, imprimible (vista de impresión / PDF).
- **REQ-MEM-1:** El administrador gestiona membresías mensuales o anuales asociadas a un usuario y a un vehículo.
- **REQ-DES-1:** El administrador gestiona descuentos (descripción + porcentaje 0–100) que se pueden aplicar al facturar.
- **REQ-RES-1:** El cliente puede reservar una celda disponible del tipo de su vehículo; el administrador gestiona las reservas.
- **REQ-NOT-1:** El sistema genera notificaciones internas (campana en la interfaz) para eventos relevantes y el administrador puede enviar mensajes manuales a un usuario.
- **REQ-PLA-1:** El sistema registra la "lectura de placa" (simulada: placa digitada y, opcionalmente, foto subida) en cada entrada.
- **REQ-REP-11:** Reporte financiero: ingresos por día/rango, por método de pago y por tipo de vehículo.
- **REQ-WEB-1:** Página web pública (sin login) con información del parqueadero, tarifas vigentes, disponibilidad de celdas en tiempo real por tipo y acceso al login.

---

## C. Notas sobre los wireframes (`docs/wireframes/`)

Los wireframes solo indican **qué campos lleva cada pantalla**. Su estilo visual (azul) fue **reemplazado** por el sistema de diseño PARKO (`docs/diseno-parko/`). Tampoco son la lista completa de pantallas. Correcciones conocidas:

| Wireframe | Corrección |
|---|---|
| 01-login | Campo "Usuario" debe ser **número de documento**, no correo. |
| 02-registro-vehiculo | Faltan color, marca, modelo; "Propietario" debe ser un buscador de usuario (por documento), no texto libre. |
| 03-ingreso-salida | Debe separarse en Entrada y Salida; falta "Puerta"; fecha/hora las pone el servidor; "Parqueadero" y "Espacio" se seleccionan, no se escriben. |
| 04-facturacion | El total lo **calcula** el sistema; se agrega selector de descuento. (La pestaña resaltada "Notificaciones" es un error del wireframe.) |
| 05-espacios | Faltan área y piso; debe existir además un **mapa visual** de celdas. |
| 06-incidentes | Faltan tipo de incidencia y vehículo afectado; la fecha incluye hora. |
| Faltan | Usuarios, Pico y placa, Tarifas, Reservas, Reportes, Dashboard, Mi cuenta (cliente), Página pública. |
