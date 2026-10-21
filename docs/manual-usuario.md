# PARKO · Manual de usuario

Guía corta para usar PARKO en el **Parqueadero ABC** (Carrera 43 # 47-53, Medellín). Hay tres roles: **administrador**, **operador** y **cliente**. Cada uno ve en el menú solo lo que puede usar.

## Para todos

**Entrar.** Abre `http://localhost:3000` y pulsa **Ingresar**. Elige el tipo de documento, escribe el número y la contraseña. Tras 5 intentos fallidos el documento se bloquea 15 minutos.

**Contraseña temporal.** Si te crearon la cuenta, la primera vez PARKO te pide cambiar la contraseña (mínimo 8 caracteres). No podrás usar nada más hasta hacerlo.

**¿Olvidaste tu contraseña?** No hay recuperación por correo: pídele al administrador que te asigne una temporal y cámbiala al entrar.

**Partes de la pantalla.**
- **Encabezado:** fecha y hora reales, el turno (puerta y usuario), la **campana** de notificaciones (el número son las no leídas, se actualiza solo) y tu menú: *Mi cuenta*, *Cambiar contraseña* y *Cerrar sesión*.
- **Menú amarillo** bajo el encabezado, con las secciones de tu rol. En el celular se abre con el botón ☰.
- **Mi cuenta:** cambia tus nombres, correo, celular y foto. Al guardar, el administrador recibe un aviso.

**Si algo falla.** Los mensajes de error explican qué corregir en cada campo. Si abres una dirección que tu rol no tiene, verás "Sin acceso" con un botón para volver al inicio.

## Operador

Es quien trabaja en la caseta. Su pantalla principal es **Celdas** (control de espacios).

### Registrar una entrada
1. En **Celdas** pulsa **Registrar ingreso**.
2. Elige la **puerta** y escribe la **placa** en el campo amarillo; se pone sola en mayúsculas.
3. Marca **Carro** o **Moto** y, si aplica, **Requiere celda accesible**.
4. Si la placa no existe, escribe **marca, modelo y color**: quedará registrada como vehículo de visitante.
5. PARKO detecta si es **Visitante** o **Mensualidad** y sugiere la celda: la de la reserva o la celda fija si la tiene; si no, la primera libre del tipo. Puedes cambiarla.
6. Escribe observaciones (daños visibles, objetos de valor), marca si **deja las llaves** y, si quieres, sube la **foto de la placa**.
7. Revisa el **ticket** de la derecha, que se arma mientras escribes, y pulsa **Generar ticket**. Puedes imprimirlo.

Si la placa tiene **pico y placa** a esa hora, PARKO rechaza la entrada, muestra el motivo y avisa al administrador.

### Registrar una salida y cobrar
1. Toca la celda ocupada en el mapa, o busca la **placa o el ticket** en el buscador de arriba.
2. El panel de detalle muestra el tiempo dentro, la tarifa, el tope del día, el valor a pagar y la nota del cálculo (ej. "157 min × $ 120 = $ 18.840").
3. Pulsa **Registrar salida y cobrar**, elige la puerta, el **método de pago** (efectivo, tarjeta o transferencia) y, si aplica, un **descuento**.
4. Pulsa **Cobrar**. Se genera la factura (`FAC-…`) para imprimir y la celda queda libre. Las mensualidades pagan $ 0, pero igual se registra su factura.

### Otras tareas
- **Celdas:** con el detalle de una celda puedes **ocuparla** con un vehículo, **liberarla** o ponerla **fuera de servicio** (con motivo).
- **Movimientos:** historial de entradas y salidas con filtros, PDF del ticket y exportación CSV.
- **Usuarios:** registrar clientes y operadores (no administradores) con una contraseña temporal.
- **Vehículos:** registrar vehículos y asignar dueño a los que no tienen.
- **Pico y placa:** crear, editar y activar o desactivar reglas.
- **Facturas:** facturas del día.
- **Reservas:** ver las reservas activas con su tiempo restante y cancelarlas. Con **Nueva reserva** se aparta una celda para el vehículo de un cliente: escribe la placa, pulsa *Buscar*, elige la celda libre y confirma. Solo se reserva para vehículos con dueño registrado.
- **Incidencias:** registrar un rayón, choque, etc. con placa, celda opcional y descripción. La fecha la pone el sistema y se avisa al dueño y al administrador.
- **Tarifas, membresías y descuentos:** solo consulta (en *Descuentos* ves los activos que puedes aplicar al cobrar).

## Administrador

Puede hacer todo lo del operador y además:

- **Inicio:** ocupación, ingresos de hoy frente a ayer, entradas, rechazos por pico y placa, incidencias y membresías por vencer.
- **Usuarios:** listado completo con filtros, **editar** cualquier usuario y **activar/inactivar** (un usuario inactivo no puede entrar).
- **Restablecer contraseña:** si alguien olvidó la suya, en *Usuarios* pulsa **Contraseña** en su fila. PARKO propone una contraseña temporal (puedes generar otra o escribirla). Entrégasela a la persona: al entrar, el sistema le pedirá crear una nueva. La persona también recibe un aviso en la campana.
- **Vehículos:** **editar** y **reasignar** un vehículo a otro dueño (queda en el historial).
- **Celdas → Gestionar celdas:** crear, editar y desactivar celdas (código, piso, área, tipo, accesible y posición en el mapa).
- **Celdas → Puertas:** crear puertas, cambiarles el nombre o el tipo (solo entrada, solo salida o mixta) y activarlas o desactivarlas. Siempre debe quedar al menos una activa.
- **Tarifas:** crear una tarifa nueva por tipo (valor por fracción, minutos por fracción, minutos de gracia y tope diario) y simular cobros. Las facturas anteriores no cambian.
- **Parámetros del negocio** (al final de *Tarifas*): minutos que dura una reserva, días de aviso antes de que venza una membresía, valores de mensualidad y anualidad, redondeo del total con descuento y texto al pie del ticket. Los cambios aplican de inmediato.
- **Descuentos:** crear, editar y desactivar (porcentaje de 0 a 100).
- **Membresías:** vender una mensualidad o anualidad (cliente + vehículo + celda fija opcional + método de pago). Se genera su factura y la celda fija queda reservada para el titular. También se pueden cancelar.
- **Incidencias:** además administra los tipos de incidencia.
- **Notificaciones:** enviar mensajes a un usuario, a un rol o a todos.
- **Reportes:** los 11 reportes (usuarios, vehículos, entradas, salidas, incidencias, pico y placa, celdas ocupadas, celdas más usadas, vehículos frecuentes, horas pico y financiero), con filtros, exportación a CSV e impresión.

## Cliente

- **Inicio:** tus vehículos, tu membresía activa, tu reserva y tus últimas facturas.
- **Disponibilidad:** el mapa de celdas en vivo (no se ven placas de otros). Tus reservas y tu celda fija aparecen resaltadas. Para **reservar**:
  1. Toca una celda **libre** del tipo de tu vehículo.
  2. Pulsa **Reservar**, elige el vehículo y confirma.
  3. Tienes el tiempo que muestra la **cuenta regresiva** (30 minutos por defecto) para llegar. Si no llegas, la reserva expira, la celda se libera y recibes un aviso.

  Para **cancelar** la reserva, toca tu celda resaltada en *Disponibilidad* y pulsa *Cancelar reserva*.

  No puedes reservar si el vehículo ya está dentro, si ya tiene una reserva activa, si tiene celda fija o si tiene **pico y placa** en ese momento.
- **Mis movimientos:** pestañas de **Estadías**, **Facturas** (descarga en PDF), **Membresías**, **Reservas** e **Incidencias** de tus vehículos.
- **Mi cuenta:** tus datos, contraseña, tus vehículos y tus últimas notificaciones.

## Página pública

En `http://localhost:3000`, sin iniciar sesión: cupos libres de carros y motos **en vivo**, tarifas y mensualidades vigentes, servicios, **pico y placa de hoy**, ubicación con mapa y el acceso a **Ingresar**.
