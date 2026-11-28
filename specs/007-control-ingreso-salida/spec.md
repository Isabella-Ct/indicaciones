# Especificación de la funcionalidad: Control de ingreso y salida

**Rama**: `007-control-ingreso-salida`

**Creada**: 2026-11-27

**Estado**: Borrador

**Entrada**: descripción de la usuaria: "007-control-ingreso-salida — Módulo Control de ingreso y salida del Sistema de Gestión de Parqueadero (Parking Lot ABC), según SRS v2.0 §4.7, Apéndice B.1 §4.7, modelo 6.1 §4.7 e historias HU-31..HU-35."

**Fuentes de verdad**: SRS v2.0 §4.7 (RF-MOV-01 … RF-MOV-17), §5.1 (RNF-REN-01), §5.2 (RNF-SAF-01, RNF-SAF-02), §5.3 (RNF-SEG-04, RNF-SEG-07, RNF-PRI-02), §5.5 (RN-13, RN-15, RN-16), Apéndice B.1 §4.7, modelo 6.1 §4.7 (*Movimiento*, *Ticket*); historias HU-31 … HU-35.

**Depende de**: `004-parqueaderos-celdas` (puertas, `ocupar`, `liberar`, `sugerir`), `005-vehiculos` (vehículo y propietario), `006-pico-y-placa` (`evaluar`). **La usan**: `009-facturacion-pagos` (liquidación del movimiento cerrado), `010-membresias`, `012-reservas` (entrada a una celda reservada), `013-incidencias`, `014-monitoreo-alertas` (rechazos por pico y placa, permanencias de más de 24 h), `015-reportes-indicadores`.

## Aclaraciones

### Sesión 2026-11-27

La usuaria indicó resolver cada pregunta según los documentos entregados. Cada respuesta cita su fuente.

- P: ¿Qué incluye «muestra la liquidación del valor a pagar» al registrar la salida (criterio 1 de HU-33)? → R: Esta spec cierra el movimiento y calcula los minutos de estadía (RF-MOV-10, RN-16), y deja el movimiento listo para liquidar (RF-MOV-11). El valor a pagar lo calcula `GET /movimientos/:id/liquidacion` de la spec 009 (HU-39, con las tarifas de la spec 008). Hasta entonces la respuesta de la salida trae `liquidacion: null` y la pantalla muestra el tiempo de estadía. *Fuente:* B.1 §4.9 (`/movimientos/:id/liquidacion` → HU-39), RF-MOV-11, RF-FAC-01.
- P: ¿Cómo se marca el «ticket extraviado» (criterio 4 de HU-33)? → R: La salida recibe `ticketExtraviado: true` cuando el operador buscó por placa porque el conductor no tiene el ticket. El ticket queda marcado como extraviado (columna nueva `ticket.extraviado` `[Propuesta]`, esquema 2.2.0) y la salida se registra igual. *Fuente:* criterio 4 de HU-33; 6.1 no tiene el dato.
- P: ¿Se guardan los intentos rechazados por pico y placa? → R: Sí. Cada rechazo queda en la tabla nueva `ingreso_rechazado` `[Propuesta]` (placa, tipo, puerta, fecha y hora, motivo, operador), aunque la entrada no se cree. La usan el reporte RF-REP-06 («intentos de ingreso rechazados», spec 015) y las alertas RF-MON-04 (spec 014). *Fuente:* RF-REP-06, RF-MON-04; `CAMBIOS.md` lo reservaba para la 007.
- P: ¿Qué celda se asigna y cuál puede elegir el operador (RF-MOV-04)? → R: Si el operador no elige, la disponible de menor código del tipo del vehículo en el parqueadero de la puerta (`sugerir`). Si elige, debe ser una celda `disponible` de ese parqueadero y del tipo del vehículo. Las celdas `reservada` las asigna la spec 012 cuando el vehículo tiene la reserva. Sin celdas → 409 «Sin celdas disponibles para moto». *Fuente:* RF-MOV-04, criterios 1 y 5 de HU-31, RN-15.
- P: ¿Qué se puede anular y con qué límite (RF-MOV-15, RF-MOV-16)? → R: Solo un movimiento `abierto`: un movimiento cerrado ya pasó a la liquidación y su corrección es la anulación de la factura (spec 009). El Operador (`movimientos.anular`) puede anular dentro de los 15 minutos siguientes a la entrada; después → 403 «Solo el Administrador puede anular esta entrada». El Administrador puede hacerlo en cualquier momento. El motivo es obligatorio (10–200 caracteres). Al anular: celda liberada, ticket inválido, y motivo, usuario y fecha guardados (RNF-SAF-02). Un movimiento abierto no tiene pagos, así que la condición «sin pagos» se cumple siempre en esta spec. *Fuente:* RF-MOV-15..17, criterios de HU-35, RNF-SAF-02, RN-02.
- P: ¿Qué responde la salida de una placa sin movimiento abierto (criterio 3 de HU-33)? → R: La pantalla busca el movimiento abierto con `GET /movimientos?placa=…&estado=abierto` o `GET /tickets/:codigo`; si no hay, muestra «El vehículo no tiene una entrada registrada». `POST /movimientos/:id/salida` sobre un movimiento inexistente o que no está abierto responde 404 `MOVIMIENTO_NO_ABIERTO` con ese mismo mensaje. *Fuente:* criterio 3 de HU-33, RF-MOV-12, B.1.
- P: ¿Cómo se prueban la hora del servidor y el pico y placa sin depender del día real? → R: Los servicios toman la hora de un reloj único del servidor (`utils/reloj.js`); las pruebas automáticas lo fijan (p. ej. un lunes a las 07:30 en Bogotá) y la colección Postman calcula, antes de cada petición, una placa libre o restringida según la restricción de hoy. *Fuente:* RN-16 (la hora la pone el servidor), constitución §VI.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Registrar la entrada de un vehículo (Prioridad: P1) — HU-31

Como Operador, quiero registrar la entrada de un vehículo indicando puerta y placa, con fecha y hora automáticas, para dejar constancia del ingreso y comenzar el conteo del tiempo de estadía.

**Por qué esta prioridad**: es el proceso central del parqueadero.

**Prueba independiente**: entra ABC123 por «Carrera 43» y queda en la celda de menor código con su ticket; se rechazan la placa restringida (sin ocupar celda y con el intento guardado), la placa que ya está dentro y la moto sin celdas; una placa nueva se crea como ocasional.

**Escenarios de aceptación**:

1. **Dado** la placa ABC123 sin restricción y una celda de carro disponible, **cuando** registro la entrada por la puerta «Carrera 43», **entonces** el sistema crea el movimiento abierto con la fecha y hora del servidor, asigna la celda disponible de menor código (o la que yo elija) y muestra celda y ticket. *(RF-MOV-01, RF-MOV-04, RN-16)*
2. **Dado** que hoy, de 05:00 a 20:00, los carros con placa terminada en 3 tienen restricción, **cuando** registro la entrada de ABC123 a las 08:00, **entonces** el sistema rechaza la entrada con «Vehículo con restricción de pico y placa hoy (dígito 3)» (409), no ocupa ninguna celda y guarda el intento rechazado. *(RF-MOV-02, RN-13)*
3. **Dado** que ABC123 ya tiene un movimiento abierto, **cuando** intento registrar otra entrada, **entonces** el sistema responde «El vehículo ya se encuentra dentro (celda A-07)» (409). *(RF-MOV-03, RN-15)*
4. **Dado** una placa no registrada, **cuando** registro la entrada indicando su tipo, **entonces** el sistema crea el vehículo como ocasional (sin propietario) y registra la entrada; sin el tipo → 422. *(RF-MOV-05)*
5. **Dado** que no hay celdas disponibles para motos, **cuando** intento registrar la entrada de una moto, **entonces** el sistema responde «Sin celdas disponibles para moto» (409). *(RF-MOV-04)*
6. **Dado** una puerta de solo salida o inactiva, una celda elegida ocupada o de otro tipo, **cuando** registro la entrada, **entonces** el sistema la rechaza (409/422) y nada cambia. Sin `movimientos.crear` → 403.

---

### Historia de usuario 2 - Generar el ticket de ingreso (Prioridad: P1) — HU-32

Como Operador, quiero que al registrar la entrada el sistema genere un ticket electrónico o imprimible, para entregar al conductor un comprobante con el que se identifica su vehículo a la salida.

**Por qué esta prioridad**: el ticket identifica el vehículo a la salida.

**Prueba independiente**: la entrada genera T-000001, T-000002…; el ticket se consulta por su código, se imprime en 80 mm y se envía al correo del propietario; el código inexistente da 404.

**Escenarios de aceptación**:

1. **Dado** que registré la entrada de ABC123, **cuando** el sistema la confirma, **entonces** genera un ticket con código único consecutivo (T-000123), placa, tipo, celda, puerta, fecha y hora de entrada y el nombre del parqueadero. *(RF-MOV-06)*
2. **Dado** un ticket generado, **cuando** selecciono Imprimir, **entonces** se abre la vista de impresión en formato de 80 mm; si el vehículo tiene propietario con correo, puedo enviarlo por correo (sin correo → 409). *(RF-MOV-07)*
3. **Dado** el código de un ticket, **cuando** lo consulto (digitado o leído con lector), **entonces** el sistema muestra el movimiento asociado; si el código no existe, responde 404. *(RF-MOV-08)*

---

### Historia de usuario 3 - Registrar la salida de un vehículo (Prioridad: P1) — HU-33

Como Operador, quiero registrar la salida de un vehículo por placa o ticket, para calcular el tiempo de estadía y habilitar el cobro del servicio.

**Por qué esta prioridad**: sin salida no hay cobro ni celda libre.

**Prueba independiente**: ABC123 entra a las 08:10 y sale a las 10:25: el movimiento queda cerrado con 135 minutos, la celda queda disponible y el movimiento queda listo para liquidar; la placa sin entrada da 404; sin ticket se marca extraviado.

**Escenarios de aceptación**:

1. **Dado** que ABC123 entró a las 08:10, **cuando** registro su salida a las 10:25 por la puerta «Carrera 43», **entonces** el sistema cierra el movimiento con la hora del servidor y calcula 135 minutos de estadía; el movimiento queda listo para la liquidación (spec 009). *(RF-MOV-09, RF-MOV-10, RF-MOV-11, RN-16)*
2. **Dado** la salida registrada, **cuando** se confirma, **entonces** la salida queda asociada al mismo vehículo, celda y movimiento de la entrada, y la celda pasa a disponible. *(RF-MOV-10, RF-MOV-11)*
3. **Dado** una placa sin movimiento abierto, **cuando** intento registrar su salida, **entonces** el sistema responde «El vehículo no tiene una entrada registrada» (404). *(RF-MOV-12)*
4. **Dado** que el conductor perdió el ticket, **cuando** busco por placa y registro la salida, **entonces** el sistema permite la salida y marca el ticket como extraviado. *(RF-MOV-09)*
5. **Dado** una puerta de solo entrada o de otro parqueadero, **cuando** registro la salida, **entonces** el sistema la rechaza (409) y nada cambia.

---

### Historia de usuario 4 - Consultar los vehículos dentro del parqueadero (Prioridad: P2) — HU-34

Como Operador o Administrador, quiero ver la lista de vehículos que están dentro con su celda y tiempo transcurrido, para controlar la ocupación y ubicar rápidamente un vehículo.

**Por qué esta prioridad**: apoyo a la operación; las entradas y salidas funcionan sin ella.

**Prueba independiente**: el listado de abiertos sale del más antiguo al más reciente con su tiempo; la búsqueda por placa encuentra el movimiento o queda vacía; el de más de 24 horas viene marcado.

**Escenarios de aceptación**:

1. **Dado** vehículos dentro, **cuando** abro Movimientos › Dentro, **entonces** veo placa, tipo, celda, hora de entrada y tiempo transcurrido, ordenados del más antiguo al más reciente. *(RF-MOV-13)*
2. **Dado** el listado, **cuando** busco una placa, **entonces** veo su movimiento abierto o «El vehículo no está dentro». *(RF-MOV-13)*
3. **Dado** un vehículo con más de 24 horas dentro, **cuando** aparece en el listado, **entonces** se resalta para revisión. *(RF-MOV-14)*

---

### Historia de usuario 5 - Anular un registro de entrada erróneo (Prioridad: P2) — HU-35

Como Operador o Administrador, quiero anular una entrada registrada por error indicando el motivo, para corregir equivocaciones sin borrar información ni dejar celdas ocupadas.

**Por qué esta prioridad**: corrige errores; no bloquea la operación.

**Prueba independiente**: el Operador anula una entrada de hace 5 minutos y la celda queda libre y el ticket inválido; a los 16 minutos solo puede el Administrador; sin motivo → 422.

**Escenarios de aceptación**:

1. **Dado** una entrada registrada hace 5 minutos, **cuando** la anulo como Operador con el motivo «Placa mal digitada», **entonces** el movimiento queda anulado, la celda vuelve a disponible y el ticket queda inválido; se conservan el motivo, el usuario y la fecha. *(RF-MOV-15, RF-MOV-17, RNF-SAF-02)*
2. **Dado** una entrada de hace más de 15 minutos, **cuando** un Operador intenta anularla, **entonces** el sistema responde que solo el Administrador puede hacerlo (403); el Administrador sí puede. *(RF-MOV-16)*
3. **Dado** que no escribo el motivo, **cuando** confirmo, **entonces** el sistema exige un motivo de 10 a 200 caracteres (422). *(RF-MOV-15)*
4. **Dado** un movimiento cerrado o ya anulado, **cuando** intento anularlo, **entonces** el sistema responde 409.

---

### Casos borde

- **Placa**: se normaliza como en la spec 005; si ya existe, se usa su tipo registrado (si se envía otro tipo → 422 «La placa ABC123 está registrada como carro»).
- **Carrera**: dos entradas de la misma placa a la vez → la segunda falla por el `UNIQUE` del movimiento abierto (409); dos entradas a la misma celda → la segunda toma otra celda o falla (bloqueo de fila y `SKIP LOCKED`).
- **Rechazo por pico y placa**: el intento se guarda en su propia transacción, así queda aunque la entrada falle.
- **Minutos de estadía**: minutos completos entre entrada y salida (`floor`), nunca negativos.
- **Más de 24 horas**: `minutosTranscurridos ≥ 1440` → `masDe24h: true`.
- **Ticket**: consecutivo sin huecos `T-` + 6 dígitos; inválido al anular; consultable aunque el movimiento esté cerrado o anulado (se muestra su estado).
- **Correo del ticket**: solo al propietario del vehículo; nunca se devuelve el correo en la respuesta (RNF-PRI-02).

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Entrada (HU-31)**

- **FR-001** (RF-MOV-01, RN-16): El sistema DEBE registrar la entrada con puerta (activa, de entrada o mixta, de un parqueadero activo) y placa, con la fecha y hora del servidor y el operador de la sesión.
- **FR-002** (RF-MOV-02, RN-13): El sistema DEBE evaluar la placa contra el pico y placa vigente antes de registrar, rechazar con el motivo (409) y guardar el intento rechazado.
- **FR-003** (RF-MOV-03, RN-15): El sistema DEBE rechazar la entrada de una placa con un movimiento abierto, indicando su celda (409).
- **FR-004** (RF-MOV-04): El sistema DEBE asignar la celda elegida (disponible, del tipo y del parqueadero) o la sugerida (menor código), y rechazar si no hay celdas del tipo (409).
- **FR-005** (RF-MOV-05): El sistema DEBE registrar como vehículo ocasional (sin propietario) una placa no registrada, con el tipo indicado.

**Ticket (HU-32)**

- **FR-006** (RF-MOV-06): El sistema DEBE generar en la misma transacción un ticket con código consecutivo único y los datos del movimiento.
- **FR-007** (RF-MOV-07): El sistema DEBE ofrecer la vista de impresión de 80 mm y el envío del ticket al correo del propietario.
- **FR-008** (RF-MOV-08): El sistema DEBE permitir consultar un movimiento por el código de su ticket (404 si no existe).

**Salida (HU-33)**

- **FR-009** (RF-MOV-09): El sistema DEBE registrar la salida de un movimiento abierto con puerta (de salida o mixta, del parqueadero de la celda) y la fecha y hora del servidor, y marcar el ticket como extraviado cuando se indique.
- **FR-010** (RF-MOV-10, RN-16): El sistema DEBE calcular los minutos de estadía y asociar la salida al mismo movimiento.
- **FR-011** (RF-MOV-11): El sistema DEBE liberar la celda en la misma transacción y dejar el movimiento cerrado listo para liquidar.
- **FR-012** (RF-MOV-12): El sistema DEBE rechazar la salida de un movimiento que no está abierto (404).

**Dentro y anulación (HU-34, HU-35)**

- **FR-013** (RF-MOV-13): El sistema DEBE listar los movimientos (por defecto los abiertos) con placa, tipo, celda, hora de entrada y tiempo transcurrido, del más antiguo al más reciente, con búsqueda por placa.
- **FR-014** (RF-MOV-14): El sistema DEBE marcar los movimientos abiertos con más de 24 horas.
- **FR-015** (RF-MOV-15): El sistema DEBE permitir anular un movimiento abierto con motivo (10–200), liberando la celda e invalidando el ticket.
- **FR-016** (RF-MOV-16): El sistema DEBE limitar al Operador la anulación a los primeros 15 minutos y permitirla al Administrador en cualquier momento.
- **FR-017** (RF-MOV-17, RNF-SAF-02): El sistema DEBE conservar los movimientos anulados con motivo, usuario y fecha; ningún movimiento se borra.

**Transversales**

- **FR-018** (RNF-SEG-04): Permisos `movimientos.ver` (listado, detalle y ticket), `movimientos.crear` (entrada, salida y envío del ticket), `movimientos.anular`; sin el permiso → 403.
- **FR-019** (RNF-SEG-07): El sistema DEBE registrar en la bitácora la entrada, la salida y la anulación.

### Entidades clave

- **Movimiento** (6.1): estadía de un vehículo: celda, puerta y operador de entrada; puerta, operador y fecha de salida; minutos; estado (abierto, cerrado, anulado) y datos de la anulación.
- **Ticket** (6.1): comprobante con código consecutivo; impreso, válido y extraviado `[Propuesta]`.
- **Ingreso rechazado** `[Propuesta]`: intento de entrada negado por pico y placa (placa, tipo, puerta, fecha y hora, motivo, operador).
- **Vehículo**, **Celda**, **Puerta**, **Restricción de placa** (specs 004–006).

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El Operador registra una entrada (placa, puerta y confirmación) en menos de 20 segundos y una salida en menos de 15.
- **SC-002**: La entrada y la salida responden en ≤ 2 s p95 (RNF-REN-01).
- **SC-003**: Ningún escenario de prueba deja dos movimientos abiertos para una placa, dos vehículos en una celda o una celda ocupada sin movimiento abierto (RNF-SAF-01).
- **SC-004**: El 100 % de los rechazos por pico y placa queda guardado con su motivo.
- **SC-005**: Ningún movimiento se elimina; los anulados conservan motivo, usuario y fecha (RNF-SAF-02).
- **SC-006**: Cada escenario de aceptación de HU-31 a HU-35 tiene su prueba automatizada y su caso en la colección de pruebas (RNF-CAL-03).

## Supuestos

- **Semilla**: sin movimientos (la operación empieza vacía); el consecutivo `ticket` ya existe (T-, 6 dígitos).
- **Liquidación**: la calcula la spec 009; esta spec deja el movimiento cerrado con sus minutos.
- **Pantallas**: Movimientos (caseta: registrar entrada con el aviso de pico y placa, registrar salida por placa o ticket, vehículos dentro con anular), Ticket (vista de impresión de 80 mm con «Enviar por correo»).
