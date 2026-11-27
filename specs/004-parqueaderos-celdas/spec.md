# Especificación de la funcionalidad: Parqueaderos y celdas

**Rama**: `004-parqueaderos-celdas`

**Creada**: 2026-11-27

**Estado**: Borrador

**Entrada**: descripción de la usuaria: "004-parqueaderos-celdas — Módulo Parqueaderos y celdas del Sistema de Gestión de Parqueadero (Parking Lot ABC), según SRS v2.0 §4.4, Apéndice B.1 §4.4, modelo 6.1 §4.4 e historias HU-17..HU-24."

**Fuentes de verdad**: SRS v2.0 §4.4 (RF-CLD-01 … RF-CLD-23), §3.4 (consulta periódica cada 10 s), §5.1 (RNF-REN-03), §5.2 (RNF-SAF-01), §5.3 (RNF-SEG-03, RNF-PRI-02), §5.5 (RN-09, RN-10), Apéndice B.1 §4.4, modelo 6.1 §4.4 (*Parqueadero*, *PuertaAcceso*, *Celda*); historias HU-17 … HU-24.

**Depende de**: `001-roles-permisos` (permisos `parqueaderos.*` y `celdas.*`). **La usan**: `007-control-ingreso-salida` (puertas, asignación, ocupar y liberar celdas), `012-reservas` (celdas reservadas), `014-monitoreo-alertas` (ocupación), `015-reportes-indicadores`.

## Aclaraciones

### Sesión 2026-11-27

La usuaria indicó resolver cada pregunta según los documentos entregados. Cada respuesta cita su fuente.

- P: ¿Cómo se cumple HU-23 si los movimientos son de la spec 007? → R: Esta spec construye y prueba las operaciones de dominio **ocupar** (celda disponible o reservada del mismo tipo → ocupada con el vehículo) y **liberar** (ocupada → disponible, sin vehículo), que se ejecutan dentro de la transacción de quien las llama y bloquean la fila de la celda. La spec 007 las invoca desde `POST /movimientos` y `POST /movimientos/:id/salida` (B.1: «efecto de…»). La actualización de las pantallas en ≤ 10 s se hace por consulta periódica cada 10 s. *Fuente:* HU-23 (API «efecto de»), RF-CLD-19..21, SRS §3.4 y RNF-REN-03.
- P: ¿Qué significa «dejando sus celdas fuera de servicio» al inactivar un parqueadero? → R: Sus celdas disponibles pasan a `inhabilitada` con el motivo «Parqueadero inactivo» y dejan de contar en la disponibilidad. Al reactivarlo, solo vuelven a `disponible` las celdas que tienen ese motivo; las inhabilitadas a mano siguen igual. *Fuente:* RF-CLD-05 y criterio 2 de HU-18.
- P: ¿Qué cambios de estado manuales se permiten en una celda? → R: Solo inhabilitar (con motivo obligatorio) una celda `disponible`, y habilitar una `inhabilitada`. Pedir `ocupada`, `reservada` o `disponible` sobre una celda ocupada o reservada → 409, indicando que la ocupación se registra con una entrada. `DELETE /celdas/:id` es una inhabilitación lógica con el motivo «Retirada por el administrador». *Fuente:* RN-09, RF-CLD-14/15, criterio 4 de HU-21 y B.1 («inhabilitación lógica»).
- P: ¿Quién ve la placa y la hora de entrada de una celda ocupada? → R: Quien tiene el permiso `movimientos.ver` (Operador y Administrador). El Cliente ve el código, el tipo y el estado, sin la placa ni la hora. *Fuente:* RF-CLD-18, criterio 3 de HU-22 y RNF-PRI-02.
- P: ¿Qué cuenta como «total» en la disponibilidad pública? → R: Las celdas en servicio (todas menos las inhabilitadas) de los parqueaderos activos, por tipo; «disponibles» son las que están en estado `disponible`. Si las disponibles de un tipo son 0 → «Lleno». *Fuente:* RF-CLD-22/23 y criterios 1 y 2 de HU-24.
- P: ¿Cómo se ofrecen las puertas «del tipo correspondiente» (RF-CLD-08)? → R: `GET /parqueaderos/:id/puertas?uso=entrada` devuelve las puertas activas de tipo `entrada` o `mixta`, y `uso=salida` las de tipo `salida` o `mixta`. Sin `uso` devuelve todas (para la configuración). *Fuente:* RF-CLD-08 y criterio 3 de HU-19.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Registrar un parqueadero (Prioridad: P1) — HU-17

Como Administrador, quiero registrar un parqueadero (sede o zona) con su dirección, pisos y horario, para organizar las celdas y las puertas por ubicación.

**Por qué esta prioridad**: sin parqueadero no hay celdas ni puertas; es la base de la operación.

**Prueba independiente**: se crea «Sede Norte» con 3 pisos y aparece en el listado con su total de celdas por tipo. El nombre repetido o los datos inválidos se rechazan.

**Escenarios de aceptación**:

1. **Dado** que ingreso nombre único, dirección, número de pisos entre 1 y 20 y horario, **cuando** confirmo, **entonces** el sistema crea el parqueadero activo y lo muestra en el listado. *(RF-CLD-01)*
2. **Dado** que ya existe el parqueadero «Sede Centro», **cuando** intento crear otro con el mismo nombre (sin distinguir mayúsculas), **entonces** el sistema responde «Ya existe un parqueadero con ese nombre» (409). *(RF-CLD-01)*
3. **Dado** que dejo vacía la dirección o ingreso 0 pisos, **cuando** intento guardar, **entonces** el sistema señala el error en el campo (422). *(RF-CLD-01)*
4. **Dado** que existen parqueaderos, **cuando** abro Configuración › Parqueaderos, **entonces** veo la lista paginada con nombre, dirección, pisos, total de celdas por tipo y estado, con búsqueda por nombre. *(RF-CLD-02)*
5. **Dado** un parqueadero, **cuando** abro su detalle, **entonces** veo sus datos, sus puertas y el resumen de sus celdas por piso y tipo. Si no existe → 404. *(RF-CLD-03)*

---

### Historia de usuario 2 - Actualizar o inactivar un parqueadero (Prioridad: P2) — HU-18

Como Administrador, quiero modificar los datos de un parqueadero o inactivarlo, para reflejar cambios de horario o el cierre de una zona.

**Por qué esta prioridad**: mantenimiento de la configuración; no bloquea la operación diaria.

**Prueba independiente**: se cambia el horario; se inactiva un parqueadero sin vehículos (sus celdas salen de servicio) y se reactiva; se rechazan el parqueadero con vehículos dentro y la reducción de pisos.

**Escenarios de aceptación**:

1. **Dado** un parqueadero, **cuando** cambio su horario y confirmo, **entonces** el sistema guarda el cambio y muestra «Parqueadero actualizado». *(RF-CLD-04)*
2. **Dado** un parqueadero sin vehículos dentro, **cuando** lo inactivo y confirmo, **entonces** sus celdas disponibles pasan a inhabilitadas con el motivo «Parqueadero inactivo» y dejan de ofrecerse; al reactivarlo vuelven a estar disponibles. *(RF-CLD-05)*
3. **Dado** un parqueadero con vehículos dentro, **cuando** intento inactivarlo, **entonces** el sistema rechaza la acción con «Hay N vehículos dentro del parqueadero» (409). *(RF-CLD-05, RN-10)*
4. **Dado** un parqueadero con celdas en el piso 3, **cuando** intento reducir los pisos a 2, **entonces** el sistema rechaza el cambio (409). *(RF-CLD-06)*
5. **Dado** el nombre de otro parqueadero o datos inválidos, **cuando** actualizo, **entonces** el sistema responde 409 o 422. Un parqueadero inexistente → 404.

---

### Historia de usuario 3 - Configurar las puertas de acceso (Prioridad: P2) — HU-19

Como Administrador, quiero registrar las puertas de entrada y salida de cada parqueadero, para que cada movimiento quede asociado a la puerta por donde ocurrió.

**Por qué esta prioridad**: la spec 007 la necesita, pero la semilla ya trae puertas para operar.

**Prueba independiente**: se agrega «Carrera 43» (mixta); el nombre repetido se rechaza; al consultar las puertas para entradas no aparece una de tipo salida.

**Escenarios de aceptación**:

1. **Dado** un parqueadero, **cuando** agrego la puerta «Carrera 43» de tipo mixta, **entonces** queda disponible para seleccionarla al registrar entradas y salidas. *(RF-CLD-07)*
2. **Dado** que el parqueadero ya tiene la puerta «Carrera 43», **cuando** intento crear otra con el mismo nombre, **entonces** el sistema responde 409. *(RF-CLD-07)*
3. **Dado** una puerta de tipo salida, **cuando** se consultan las puertas para registrar una entrada, **entonces** esa puerta no aparece entre las opciones; tampoco las inactivas. *(RF-CLD-08)*
4. **Dado** una puerta, **cuando** la edito (nombre, tipo) o la inactivo, **entonces** el sistema guarda el cambio. *(RF-CLD-07)*

---

### Historia de usuario 4 - Registrar celdas de parqueo (Prioridad: P1) — HU-20

Como Administrador, quiero registrar las celdas de un parqueadero con su código, tipo de vehículo, piso y área, para tener el inventario de espacios que el sistema asigna y controla.

**Por qué esta prioridad**: sin celdas no hay entradas ni disponibilidad.

**Prueba independiente**: se crea «A-01»; «a-01» se rechaza por duplicada; el piso fuera de rango se rechaza; un rango M-01..M-20 crea las nuevas e informa las omitidas.

**Escenarios de aceptación**:

1. **Dado** un parqueadero activo, **cuando** registro la celda «A-01» de tipo carro en el piso 1, **entonces** el sistema la crea en estado disponible. *(RF-CLD-09)*
2. **Dado** que ya existe la celda «A-01» en ese parqueadero, **cuando** intento registrarla otra vez (incluso como «a-01»), **entonces** el sistema responde «La celda ya existe en este parqueadero» (409). *(RF-CLD-10)*
3. **Dado** que indico el piso 5 en un parqueadero de 3 pisos, **cuando** confirmo, **entonces** el sistema rechaza el registro (422). *(RF-CLD-11)*
4. **Dado** que uso el registro por rango con prefijo «M-», desde 1 hasta 20, tipo moto y piso 1, **cuando** confirmo, **entonces** el sistema crea las celdas M-01 a M-20 y omite e informa las que ya existían. *(RF-CLD-12)*
5. **Dado** un parqueadero inactivo o inexistente, **cuando** registro celdas en él, **entonces** el sistema lo rechaza (409 o 422).

---

### Historia de usuario 5 - Actualizar o inhabilitar una celda (Prioridad: P2) — HU-21

Como Administrador, quiero editar los datos de una celda o inhabilitarla temporalmente, para sacar de servicio una celda en mantenimiento sin borrarla.

**Por qué esta prioridad**: mantenimiento del inventario; no bloquea la operación.

**Prueba independiente**: se inhabilita una celda con motivo y se habilita; se rechazan la edición y la inhabilitación de una celda ocupada, y el cambio manual a ocupada.

**Escenarios de aceptación**:

1. **Dado** una celda disponible, **cuando** la inhabilito con el motivo «Mantenimiento» y confirmo, **entonces** el sistema la marca inhabilitada y deja de asignarla. *(RF-CLD-14)*
2. **Dado** una celda ocupada, **cuando** intento inhabilitarla o cambiar su tipo, **entonces** el sistema rechaza la acción con «La celda está ocupada por ABC123» (409). *(RF-CLD-13, RF-CLD-14, RN-10)*
3. **Dado** una celda inhabilitada, **cuando** la habilito, **entonces** vuelve a estado disponible y se borra su motivo. *(RF-CLD-14)*
4. **Dado** una celda, **cuando** intento marcarla manualmente como ocupada (o reservada), **entonces** el sistema lo rechaza e indica que la ocupación se registra con una entrada (409). *(RF-CLD-15, RN-09)*
5. **Dado** una celda no ocupada, **cuando** edito su código, tipo, piso o área, **entonces** el sistema guarda el cambio, respetando el código único y el piso válido. *(RF-CLD-13)*
6. **Dado** `DELETE /celdas/:id` sobre una celda disponible, **cuando** confirmo, **entonces** queda inhabilitada (no se borra). *(RF-CLD-14)*

---

### Historia de usuario 6 - Ver el mapa de celdas y su estado (Prioridad: P1) — HU-22

Como Operador o Cliente, quiero ver las celdas del parqueadero con su código, tipo y estado, para saber dónde ubicar o encontrar un espacio disponible.

**Por qué esta prioridad**: el operador asigna celdas mirando el mapa.

**Prueba independiente**: se consulta por parqueadero y piso; se filtra por tipo y estado; el Operador ve la placa de una celda ocupada y el Cliente no.

**Escenarios de aceptación**:

1. **Dado** que abro Celdas, **cuando** selecciono el parqueadero y el piso, **entonces** veo cada celda con su código, tipo (carro o moto) y estado diferenciado por color y por texto (disponible, ocupada, reservada, inhabilitada). *(RF-CLD-16)*
2. **Dado** el mapa, **cuando** filtro por tipo moto y estado disponible, **entonces** solo se muestran las celdas que cumplen ambos filtros. *(RF-CLD-17)*
3. **Dado** que soy Operador, **cuando** consulto una celda ocupada, **entonces** veo la placa del vehículo y la hora de entrada; si soy Cliente, no veo la placa de otros vehículos. *(RF-CLD-18, RNF-PRI-02)*
4. **Dado** que soy Cliente, **cuando** abro Disponibilidad desde mi cuenta, **entonces** veo las celdas disponibles por piso y área en una vista individual. *(RF-CLD-16)*

---

### Historia de usuario 7 - Actualizar el estado de la celda con cada movimiento (Prioridad: P1) — HU-23

Como Operador, quiero que el sistema cambie el estado de la celda al registrar una entrada o una salida, para mantener la disponibilidad siempre correcta y en tiempo real.

**Por qué esta prioridad**: sin esto la disponibilidad miente y se cobran celdas equivocadas (RNF-SAF-01).

**Prueba independiente**: con las operaciones de dominio ocupar y liberar dentro de una transacción: la celda queda ocupada con el vehículo, se libera, y si la transacción se revierte conserva su estado. El mapa se refresca cada 10 s.

**Escenarios de aceptación**:

1. **Dado** una celda disponible, **cuando** se registra la entrada de ABC123 en esa celda, **entonces** la celda pasa a ocupada y queda asociada a ese vehículo en la misma transacción. *(RF-CLD-19)*
2. **Dado** una celda ocupada por ABC123, **cuando** se registra la salida de ABC123, **entonces** la celda pasa a disponible y se desasocia el vehículo. *(RF-CLD-20)*
3. **Dado** que el registro de la entrada falla por cualquier motivo, **cuando** la transacción se revierte, **entonces** la celda conserva su estado anterior. *(RF-CLD-19)*
4. **Dado** dos pantallas abiertas en el mapa de celdas, **cuando** se registra una entrada, **entonces** ambas reflejan el nuevo estado en 10 segundos o menos. *(RF-CLD-21, RNF-REN-03)*
5. **Dado** una celda ya ocupada, inhabilitada o de otro tipo, **cuando** se intenta ocuparla, **entonces** la operación se rechaza (409) y nada cambia; un vehículo no puede ocupar dos celdas. *(RNF-SAF-01, RN-15)*

---

### Historia de usuario 8 - Consultar la disponibilidad en tiempo real (Prioridad: P1) — HU-24

Como Visitante, Cliente u Operador, quiero ver cuántas celdas libres hay por tipo de vehículo, para decidir si ir al parqueadero y orientar a los conductores en la entrada.

**Por qué esta prioridad**: es la información pública principal del parqueadero.

**Prueba independiente**: sin sesión se consulta la disponibilidad por parqueadero y tipo, con la hora; cuando no quedan motos, aparece «Lleno»; no hay placas ni datos personales.

**Escenarios de aceptación**:

1. **Dado** que abro la página pública de disponibilidad, **cuando** carga, **entonces** veo por parqueadero el número de celdas disponibles y totales para carros y para motos, con la hora de actualización. *(RF-CLD-22)*
2. **Dado** que no quedan celdas de moto disponibles, **cuando** consulto, **entonces** el indicador de motos muestra «Lleno». *(RF-CLD-23)*
3. **Dado** la página pública, **cuando** consulto, **entonces** no se muestra ninguna placa ni dato personal. *(RF-CLD-22, RNF-PRI-02)*

---

### Casos borde

- **Código de celda**: se guarda en mayúsculas y sin espacios extremos; 1–10 letras, dígitos o guion; único por parqueadero.
- **Rango**: máximo 200 celdas por lote; `desde ≤ hasta`; el número se rellena con ceros a la izquierda hasta 2 dígitos o hasta los dígitos de `hasta` (M-01…M-20, B-001…B-120). Si el código resultante supera 10 caracteres → 422.
- **Nombre de parqueadero y de puerta**: únicos sin distinguir mayúsculas ni espacios extremos (el de puerta, dentro de su parqueadero).
- **Parqueadero inactivo**: no admite celdas ni puertas nuevas, y sus celdas no cuentan en la disponibilidad pública.
- **Celda reservada**: no se puede inhabilitar ni pasar a disponible a mano (la libera la spec 012); sí se puede editar su área.
- **Carrera al ocupar**: dos entradas a la misma celda al mismo tiempo: la segunda falla (bloqueo de fila y `UNIQUE` del vehículo actual).
- **Consulta periódica**: la pantalla deja de consultar cuando la pestaña no está visible y retoma al volver.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Parqueaderos (HU-17, HU-18)**

- **FR-001** (RF-CLD-01): El sistema DEBE permitir al Administrador registrar parqueaderos con nombre único (3–60), dirección (5–120), número de pisos (1–20) y horario (≤ 60, por defecto «24 horas»).
- **FR-002** (RF-CLD-02): El sistema DEBE listar los parqueaderos con paginación, búsqueda por nombre, filtro por estado y el total de celdas por tipo de vehículo.
- **FR-003** (RF-CLD-03): El sistema DEBE mostrar el detalle de un parqueadero con sus puertas y el resumen de sus celdas.
- **FR-004** (RF-CLD-04): El sistema DEBE permitir al Administrador actualizar el nombre, la dirección, los pisos, el horario y el estado de un parqueadero.
- **FR-005** (RF-CLD-05, RN-10): El sistema DEBE permitir inactivar un parqueadero solo si no tiene vehículos dentro, dejando sus celdas disponibles fuera de servicio; y reactivarlo devolviéndolas a servicio.
- **FR-006** (RF-CLD-06): El sistema DEBE impedir reducir los pisos por debajo del piso más alto con celdas registradas.

**Puertas (HU-19)**

- **FR-007** (RF-CLD-07): El sistema DEBE permitir registrar, editar e inactivar puertas por parqueadero con nombre único dentro del parqueadero y tipo (entrada, salida o mixta).
- **FR-008** (RF-CLD-08): El sistema DEBE ofrecer, para cada tipo de movimiento, solo las puertas activas del tipo correspondiente (o mixtas).

**Celdas (HU-20, HU-21)**

- **FR-009** (RF-CLD-09): El sistema DEBE permitir al Administrador registrar celdas con código único por parqueadero, tipo de vehículo (carro o moto), piso y área opcional, en estado disponible.
- **FR-010** (RF-CLD-10): El sistema DEBE normalizar el código en mayúsculas y rechazar duplicados dentro del mismo parqueadero.
- **FR-011** (RF-CLD-11): El sistema DEBE validar que el piso exista en el parqueadero (1..pisos).
- **FR-012** (RF-CLD-12): El sistema DEBE permitir registrar celdas por rango (prefijo, número inicial y final) informando las creadas y las omitidas por duplicadas.
- **FR-013** (RF-CLD-13): El sistema DEBE permitir al Administrador editar el código, el tipo, el piso y el área de una celda que no esté ocupada.
- **FR-014** (RF-CLD-14): El sistema DEBE permitir inhabilitar con motivo y habilitar una celda que no esté ocupada ni reservada.
- **FR-015** (RF-CLD-15, RN-09): El sistema DEBE impedir cambiar manualmente una celda a ocupada, a reservada, o a disponible cuando tenga un vehículo dentro o una reserva.

**Mapa, movimientos y disponibilidad (HU-22, HU-23, HU-24)**

- **FR-016** (RF-CLD-16): El sistema DEBE mostrar las celdas por parqueadero, piso y área con código, tipo y estado, diferenciando el estado por color y por texto.
- **FR-017** (RF-CLD-17): El sistema DEBE permitir filtrar las celdas por tipo de vehículo y estado.
- **FR-018** (RF-CLD-18, RNF-PRI-02): El sistema DEBE mostrar la placa y la hora de entrada de una celda ocupada solo a quien tenga `movimientos.ver`.
- **FR-019** (RF-CLD-19): El sistema DEBE ofrecer la operación de ocupar una celda (disponible o reservada, del tipo del vehículo) asociándole el vehículo dentro de la transacción de la entrada.
- **FR-020** (RF-CLD-20): El sistema DEBE ofrecer la operación de liberar una celda (disponible, sin vehículo) dentro de la transacción de la salida o de la anulación.
- **FR-021** (RF-CLD-21, RNF-REN-03): Las pantallas de celdas y disponibilidad DEBEN reflejar el estado actualizado en 10 s o menos (consulta periódica).
- **FR-022** (RF-CLD-22, RNF-SEG-03): El sistema DEBE exponer sin autenticación el resumen de celdas disponibles y totales por parqueadero activo y tipo de vehículo, con la hora de actualización y sin datos personales.
- **FR-023** (RF-CLD-23): El sistema DEBE indicar «Lleno» cuando no haya celdas disponibles de un tipo.

**Transversales**

- **FR-024** (RNF-SEG-04): Permisos: `parqueaderos.ver/crear/editar/cambiar_estado` (parqueaderos y puertas) y `celdas.ver/crear/editar/cambiar_estado`; sin el permiso → 403.
- **FR-025** (RNF-SEG-07): El sistema DEBE registrar en la bitácora la creación, la edición y los cambios de estado de parqueaderos, puertas y celdas.

### Entidades clave

- **Parqueadero** (6.1): sede o zona; nombre único, dirección, pisos (1–20), horario, estado.
- **Puerta de acceso** (6.1 *PuertaAcceso*): pertenece a un parqueadero; nombre único en él, tipo (entrada, salida, mixta), estado.
- **Celda** (6.1): pertenece a un parqueadero; código único en él, tipo de vehículo, piso, área, estado (disponible, ocupada, reservada, inhabilitada), motivo de inhabilitación y vehículo actual cuando está ocupada.
- **Vehículo** y **Movimiento** (specs 005 y 007): solo se leen para mostrar la placa y la hora de entrada.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El Administrador registra un piso completo de 20 celdas en menos de 1 minuto con el registro por rango.
- **SC-002**: La disponibilidad que ve el usuario no tiene un retraso mayor de 10 s respecto al último cambio (RNF-REN-03).
- **SC-003**: Ningún escenario de prueba consigue dos vehículos en la misma celda, ni un vehículo en dos celdas (RNF-SAF-01).
- **SC-004**: El mapa de un piso y la disponibilidad pública responden en ≤ 1 s p95 (RNF-REN-02).
- **SC-005**: La disponibilidad pública y la vista del Cliente no exponen placas ni datos personales en el 100 % de las respuestas.
- **SC-006**: Cada escenario de aceptación de HU-17 a HU-24 tiene su prueba automatizada y su caso en la colección de pruebas (RNF-CAL-03).

## Supuestos

- **Semilla**: el Parqueadero ABC (Carrera 43 # 47-53, 2 pisos, 24 horas, activo) con 3 puertas (Carrera 43 mixta, Calle 47 entrada, Calle 48 salida) y sus celdas: piso 1 con A-01..A-12 (carro) y M-01..M-12 (moto), piso 2 con B-01..B-12 (carro). También una zona anexa inactiva para probar la inactivación. El SRS §2.7 habla de una sola sede, así que 5 parqueaderos no serían realistas (ver research).
- **Mapa**: las celdas se agrupan por piso y área. Si no tienen área, se agrupan por la letra inicial del código.
- **Pantallas**: Configuración › Parqueaderos (listado, nuevo, detalle con puertas), Celdas (mapa con filtros, nueva, por rango, editar e inhabilitar), Panel del cliente › Disponibilidad y la disponibilidad pública en la página de inicio.
