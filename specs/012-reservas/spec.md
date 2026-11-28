# Especificación de la funcionalidad: Reservas

**Rama**: `012-reservas`

**Creada**: 2026-11-27

**Estado**: Borrador

**Entrada**: descripción de la usuaria: "012-reservas — Módulo Reservas del Sistema de Gestión de Parqueadero (Parking Lot ABC), según SRS v2.0 §4.12, Apéndice B.1 §4.12, modelo 6.1 §4.12 e historias HU-52..HU-55."

**Fuentes de verdad**: SRS v2.0 §4.12 (RF-RES-01 … RF-RES-09), §5.3 (RNF-SEG-04, RNF-SEG-07, RNF-SAF-01), §5.5 (RN-26, RN-27), Apéndice B.1 §4.12, modelo 6.1 §4.12 (*Reserva*), TBD-07; historias HU-52 … HU-55.

**Depende de**: `004-parqueaderos-celdas` (celdas y su estado `reservada`), `005-vehiculos` (vehículo con propietario), `007-control-ingreso-salida` (la entrada cumple la reserva). **La usan**: `014-monitoreo-alertas` (bandeja de notificaciones), `015-reportes-indicadores`.

## Aclaraciones

### Sesión 2026-11-27

La usuaria indicó resolver cada pregunta según los documentos entregados. Cada respuesta cita su fuente.

- P: ¿Cuál es la franja de una reserva y cuándo se cruzan dos? → R: La franja va desde la hora de inicio hasta el fin de la espera (inicio + minutos de espera, 30 por defecto). Dos reservas confirmadas se cruzan si sus franjas se tocan, sobre la misma celda o para el mismo vehículo. *Fuente:* RF-RES-02, RN-26, RN-27, criterio 2 de HU-55 (08:00 + 30 min).
- P: ¿Qué anticipación y qué espera se usan mientras TBD-07 no se decide? → R: La hora de inicio debe ser futura y estar a no más de **7 días** (criterio 3 de HU-52); la espera es de **30 minutos** (modelo 6.1). Ambos valores son parámetros del servidor que se pueden cambiar sin tocar el código, y cada reserva guarda sus minutos de espera. *Fuente:* HU-52, modelo 6.1 (`minutos_espera` por defecto 30), TBD-07.
- P: ¿Quién puede reservar y para qué vehículo? → R: El Cliente reserva para sus vehículos; el Operador puede reservar para el vehículo de un cliente (el propietario queda como cliente de la reserva). El vehículo debe estar activo y tener propietario; sin vehículos, el Cliente ve el aviso «Registre primero un vehículo». *Fuente:* RN-26, criterio 4 de HU-52, semilla de permisos (`reservas.crear` Operador y Cliente).
- P: ¿Cómo se elige la celda? → R: Es opcional: si se indica, debe ser del tipo del vehículo, no estar inhabilitada y estar libre en la franja (si no, 409 «La celda no está disponible en ese horario» con una celda sugerida); si no se indica, el sistema asigna la libre de menor código del tipo. `GET /celdas/disponibles?fecha&tipo` lista las libres en la franja. *Fuente:* criterio 2 de HU-52, datos de HU-52 («id_celda opcional»), B.1 §4.12.
- P: ¿Cuándo pasa la celda a reservada y qué pasa si en ese momento está ocupada? → R: Un proceso de control que corre cada minuto marca la celda como reservada desde la hora de inicio (así la asignación de entradas ya no la ofrece). Si en ese momento la celda está ocupada o inhabilitada, la reserva pasa a otra celda libre del mismo tipo y parqueadero y se avisa al cliente; si no hay ninguna, sigue confirmada y la entrada usará cualquier celda libre. *Fuente:* RF-RES-08, RN-27, criterio 3 de HU-55, B.1 (tarea programada cada minuto).
- P: ¿Cuándo se cumple y cuándo vence? → R: Se cumple cuando el vehículo entra dentro de su franja: la entrada usa la celda reservada (o, si no se puede, otra libre) y la reserva queda `cumplida` con su movimiento. Si el vehículo no entra antes del fin de la espera, el proceso de control la marca `vencida`, libera la celda y notifica al cliente. Una entrada antes del inicio es una entrada normal. *Fuente:* RF-RES-07, RF-RES-09, criterios 1 y 2 de HU-55.
- P: ¿Qué se puede cancelar? → R: Solo reservas `confirmadas` cuya hora de inicio no ha llegado (409 si está cumplida, vencida, cancelada o ya inició). El Cliente solo cancela las suyas (403 con las de otros); el personal con `reservas.ver` puede cancelar cualquiera. *Fuente:* RF-RES-04, RF-RES-05, criterios de HU-53.
- P: ¿Cómo se avisa al cliente? → R: Con una notificación interna (tipo «reserva») y un correo al crear, cancelar, reasignar y vencer la reserva. El código es consecutivo: `R-000001`. *Fuente:* RF-RES-03, criterio 1 de HU-53, RF-RES-09, consecutivo `reserva` de la semilla.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Reservar una celda (Prioridad: P1) — HU-52

Como Cliente, quiero reservar una celda para una fecha y hora con uno de mis vehículos, para tener asegurado mi espacio cuando llegue.

**Por qué esta prioridad**: es la función principal del módulo.

**Prueba independiente**: con ABC123 se reserva mañana a las 08:00 y queda confirmada con código y correo; la misma celda en esa franja da 409 con una sugerida; una fecha pasada o a más de 7 días da 422.

**Escenarios de aceptación**:

1. **Dado** que tengo el carro ABC123 registrado, **cuando** elijo mañana a las 08:00 y una celda de carro libre, **entonces** el sistema crea la reserva confirmada con un código y me la notifica por correo. *(RF-RES-01, RF-RES-03)*
2. **Dado** una celda ya reservada en esa franja, **cuando** intento reservarla, **entonces** el sistema responde «La celda no está disponible en ese horario» (409) y sugiere otra. *(RF-RES-02)*
3. **Dado** que elijo una fecha pasada o a más de 7 días, **cuando** confirmo, **entonces** el sistema rechaza la reserva (422). *(RF-RES-01)*
4. **Dado** que no tengo vehículos asociados, **cuando** abro Reservar, **entonces** el sistema me indica que debo tener un vehículo registrado. *(RN-26)*
5. **Dado** un vehículo ajeno, sin propietario o con otra reserva que se cruza, o una celda de otro tipo, **cuando** reservo, **entonces** el sistema responde 403, 422 o 409. *(RN-26, RF-RES-02)*

---

### Historia de usuario 2 - Cancelar mi reserva (Prioridad: P1) — HU-53

Como Cliente, quiero cancelar una reserva que ya no voy a usar, para liberar la celda para otros clientes.

**Por qué esta prioridad**: evita celdas apartadas sin uso.

**Prueba independiente**: la reserva confirmada de mañana se cancela, la celda queda libre en esa franja y llega el correo; una cumplida o vencida da 409; la de otro cliente da 403.

**Escenarios de aceptación**:

1. **Dado** una reserva confirmada que aún no inicia, **cuando** la cancelo, **entonces** queda cancelada, la celda queda libre en esa franja y recibo la confirmación. *(RF-RES-04)*
2. **Dado** una reserva ya cumplida o vencida, **cuando** intento cancelarla, **entonces** el sistema responde 409. *(RF-RES-05)*
3. **Dado** una reserva de otro cliente, **cuando** intento cancelarla, **entonces** el sistema responde 403. *(RF-RES-05)*

---

### Historia de usuario 3 - Consultar las reservas del día (Prioridad: P2) — HU-54

Como Operador, quiero ver las reservas del día con su hora, celda y placa, para preparar las celdas y atender a los clientes que llegan con reserva.

**Por qué esta prioridad**: apoya la operación de la caseta.

**Prueba independiente**: las reservas de hoy salen ordenadas por hora con código, placa, cliente, celda y estado; con el filtro «confirmada» solo las pendientes.

**Escenarios de aceptación**:

1. **Dado** reservas para hoy, **cuando** abro Reservas, **entonces** veo código, hora, placa, cliente, celda y estado, ordenadas por hora. *(RF-RES-06)*
2. **Dado** el listado, **cuando** filtro por estado confirmada, **entonces** solo veo las pendientes de llegada. *(RF-RES-06)*

---

### Historia de usuario 4 - Cumplir o vencer una reserva (Prioridad: P2) — HU-55

Como Operador, quiero que la entrada de un vehículo con reserva use la celda reservada y que las reservas no usadas se liberen solas, para respetar las reservas sin perder celdas por inasistencias.

**Por qué esta prioridad**: cierra el ciclo de la reserva.

**Prueba independiente**: ABC123 con reserva de las 08:00 entra a las 08:10 a la celda reservada y la reserva queda cumplida; sin llegada, a las 08:31 queda vencida, la celda libre y el cliente notificado; desde las 08:00 la celda no se ofrece a otros.

**Escenarios de aceptación**:

1. **Dado** una reserva confirmada de ABC123 para las 08:00, **cuando** registro la entrada de ABC123 a las 08:10, **entonces** el sistema usa la celda reservada y marca la reserva como cumplida. *(RF-RES-07)*
2. **Dado** que ABC123 no llega antes de las 08:30 (30 minutos de espera), **cuando** el proceso de control se ejecuta, **entonces** la reserva pasa a vencida, la celda se libera y el cliente recibe una notificación. *(RF-RES-09)*
3. **Dado** que la celda está reservada desde las 08:00, **cuando** otro vehículo intenta entrar a esa celda, **entonces** el sistema no la ofrece. *(RF-RES-08)*

---

### Casos borde

- **Celda ocupada al iniciar la franja**: la reserva pasa a otra celda libre del tipo (y se avisa); si no hay, sigue confirmada.
- **Llegada temprana**: antes de la hora de inicio la entrada es normal y no cumple la reserva.
- **Franjas que se tocan**: una reserva a las 08:00 (espera de 30 min) y otra a las 08:30 sobre la misma celda se cruzan; a las 08:31, no.
- **Concurrencia**: dos reservas de la misma celda a la vez → la celda se bloquea durante la creación y la segunda recibe 409.
- **Cancelación**: una reserva cancelada no aparece como ocupando la celda en `GET /celdas/disponibles`.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001** (RF-RES-01, RN-26): El sistema DEBE permitir reservar una celda del tipo del vehículo (propio para el Cliente; con propietario) para una hora futura a no más de la anticipación máxima (7 días).
- **FR-002** (RF-RES-02): El sistema DEBE impedir reservas confirmadas cuyas franjas se crucen en la misma celda o para el mismo vehículo, y sugerir otra celda libre.
- **FR-003** (RF-RES-03): El sistema DEBE asignar un código consecutivo (`R-000001`) y notificar al cliente (notificación interna y correo).
- **FR-004** (RF-RES-04, RF-RES-05): El sistema DEBE permitir cancelar reservas confirmadas que aún no inician, solo al cliente dueño o al personal, y rechazar las cumplidas, vencidas, canceladas o ya iniciadas (409).
- **FR-005** (RF-RES-06): El sistema DEBE listar las reservas de una fecha (hoy por defecto) ordenadas por hora, con código, hora, placa, cliente, celda y estado, filtrables por estado; y las del Cliente en «Mis reservas».
- **FR-006** (RF-RES-07): El sistema DEBE usar la celda reservada y marcar la reserva como cumplida cuando el vehículo entra dentro de su franja.
- **FR-007** (RF-RES-08, RN-27): El sistema DEBE marcar la celda como reservada desde la hora de inicio y excluirla de la asignación a otros vehículos.
- **FR-008** (RF-RES-09): El sistema DEBE vencer las reservas no cumplidas al terminar la espera, liberar la celda y notificar al cliente.
- **FR-009** (RNF-SEG-04, RNF-SEG-07): Permisos `reservas.ver` (listado del personal), `reservas.crear` (reservar), `reservas.editar` (cancelar), `perfil.ver` (mis reservas), `celdas.ver` (celdas disponibles); bitácora de creación, cancelación, cumplimiento y vencimiento.

### Entidades clave

- **Reserva** (6.1 *Reserva*): código, cliente, vehículo, celda, hora de inicio, minutos de espera, estado (confirmada, cumplida, cancelada, vencida) y movimiento al cumplirse.
- **Celda** (spec 004): pasa a `reservada` durante la franja.
- **Notificación** (modelo 6.1): aviso de tipo «reserva» al cliente.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El Cliente reserva una celda en menos de 1 minuto.
- **SC-002**: Ningún escenario de prueba consigue dos reservas confirmadas cruzadas sobre la misma celda o el mismo vehículo.
- **SC-003**: El 100 % de las reservas no usadas de prueba quedan vencidas y su celda libre en la siguiente ejecución del control (a más tardar 1 minuto después del fin de la espera).
- **SC-004**: Cada escenario de aceptación de HU-52 a HU-55 tiene su prueba automatizada y su caso en la colección de pruebas (RNF-CAL-03).

## Supuestos

- **Parámetros (TBD-07)**: anticipación máxima de 7 días y espera de 30 minutos, configurables en el servidor.
- **Parqueadero**: si no se indica, la reserva es en el parqueadero principal (el activo de menor id).
- **Semilla**: sin reservas (la operación empieza vacía); el consecutivo `reserva` ya existe.
- **Pantallas**: Panel del cliente › Reservar y Mis reservas; Reservas (listado del día del personal); aviso de reserva en Movimientos › Registrar entrada.
