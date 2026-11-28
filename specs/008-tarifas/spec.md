# Especificación de la funcionalidad: Tarifas

**Rama**: `008-tarifas`

**Creada**: 2026-11-27

**Estado**: Borrador

**Entrada**: descripción de la usuaria: "008-tarifas — Módulo Tarifas del Sistema de Gestión de Parqueadero (Parking Lot ABC), según SRS v2.0 §4.8, Apéndice B.1 §4.8, modelo 6.1 §4.8 e historias HU-36..HU-38."

**Fuentes de verdad**: SRS v2.0 §4.8 (RF-TAR-01 … RF-TAR-07), §5.3 (RNF-SEG-03, RNF-SEG-04, RNF-SEG-07), §5.5 (RN-02, RN-18, RN-19, RN-20), Apéndice B.1 §4.8, modelo 6.1 §4.8 (*Tarifa*); historias HU-36 … HU-38.

**Depende de**: `001-roles-permisos` (permisos `tarifas.*`). **La usan**: `009-facturacion-pagos` (la liquidación usa la tarifa vigente a la hora de la entrada, RN-19, y calcula el valor con RN-20), `014-monitoreo-alertas` (salidas sin tarifa vigente).

## Aclaraciones

### Sesión 2026-11-27

La usuaria indicó resolver cada pregunta según los documentos entregados. Cada respuesta cita su fuente.

- P: ¿Qué es el «tipo de cliente» de una tarifa? → R: `registrado` si el vehículo tiene propietario (un usuario registrado, §2.3 «Cliente: persona registrada»); `ocasional` si el vehículo no tiene propietario (visitante, el vehículo ocasional de la spec 007). La spec 009 elige la tarifa con ese criterio; la membresía (RN-21, cobro 0) es aparte. *Fuente:* 6.1 (`tipo_cliente` ocasional | registrado), SRS §2.3, RF-MOV-05.
- P: ¿Cuándo se superponen dos tarifas (RF-TAR-03, RN-18)? → R: Cuando están **activas**, tienen el mismo tipo de vehículo y tipo de cliente y sus vigencias `[vigente_desde, vigente_hasta)` se cruzan (sin fin = indefinida). Se responde 409 `TARIFA_SUPERPUESTA` con el id de la existente. Si se envía `cerrarAnterior: true` y la existente empieza antes que la nueva, el sistema cierra la vigencia de la existente en el inicio de la nueva, en la misma transacción. *Fuente:* RN-18, RF-TAR-03, RF-TAR-05 y criterio 2 de HU-36 («pide definir el fin de vigencia de la anterior o responde 409»).
- P: ¿Qué se puede editar de una tarifa ya usada en liquidaciones (RF-TAR-04, RF-TAR-05)? → R: Solo el nombre y el cierre de su vigencia (`vigenteHasta`). Cambiar valores, tipos o el inicio responde 409 `TARIFA_USADA` «La tarifa ya se usó en liquidaciones: cree una tarifa nueva con vigencia y cierre la actual». Una tarifa se considera usada si alguna liquidación la referencia (las liquidaciones las crea la spec 009). *Fuente:* RF-TAR-04, RF-TAR-05, criterio 2 de HU-37.
- P: ¿Cómo es la advertencia al inactivar la única tarifa vigente (RF-TAR-06)? → R: `PATCH /tarifas/:id/estado` con `estado: inactivo` sobre la única tarifa vigente ahora para su tipo de vehículo y cliente responde 409 `UNICA_TARIFA_VIGENTE` «Las salidas de carro ocasional no podrán liquidarse»; con `confirmar: true` se inactiva igual. *Fuente:* RF-TAR-06 y criterio 3 de HU-37.
- P: ¿Quién ve las tarifas vigentes (RF-TAR-07)? → R: Cualquiera, sin sesión: `GET /tarifas?vigentes=true` es público y devuelve las vigentes ahora y las programadas (activas, que empiezan en el futuro) con su fecha de inicio, sin datos internos. El listado completo para la administración (todas, con filtros) exige `tarifas.ver`. *Fuente:* RF-TAR-07, criterios de HU-38 («Visitante», «Página pública de tarifas»), RNF-SEG-03.
- P: ¿Cómo encuentra la spec 009 la tarifa de un movimiento (RN-19)? → R: Esta spec ofrece la operación de dominio `vigenteEn({ tipoVehiculo, tipoCliente, fechaHora })` → la tarifa activa cuya vigencia contiene esa fecha y hora (la de entrada del vehículo), o `null`. El cálculo del valor (RN-20) lo hace la spec 009. *Fuente:* RN-19, RF-FAC-01..04.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Configurar una tarifa (Prioridad: P1) — HU-36

Como Administrador, quiero crear tarifas por tipo de vehículo y tipo de cliente con primera hora, fracción, tope diario y tiempo de gracia, para cobrar de forma diferenciada según el tiempo y el tipo de cliente.

**Por qué esta prioridad**: sin tarifa vigente no se puede liquidar ninguna salida.

**Prueba independiente**: se crea «Carro ocasional» vigente desde mañana y queda programada; la superpuesta da 409 (o cierra la anterior si se pide); los valores incoherentes dan 422; el Operador recibe 403.

**Escenarios de aceptación**:

1. **Dado** que creo la tarifa «Carro ocasional» con primera hora $ 4.000, fracción de 15 minutos a $ 1.000, tope diario $ 30.000 y 10 minutos de gracia, vigente desde mañana, **cuando** guardo, **entonces** queda programada y se activa en la fecha indicada. *(RF-TAR-01)*
2. **Dado** que ya existe una tarifa activa para carro ocasional en ese periodo, **cuando** creo otra superpuesta, **entonces** el sistema responde 409 con la tarifa existente; si pido cerrar la anterior, la vigencia de la anterior termina donde empieza la nueva. *(RF-TAR-03, RF-TAR-05, RN-18)*
3. **Dado** que ingreso un valor de primera hora de 0, un tope diario menor que la primera hora, una fracción fuera de 1–60 minutos o más de 30 minutos de gracia, **cuando** guardo, **entonces** el sistema señala el error (422). *(RF-TAR-02)*
4. **Dado** que soy Operador, **cuando** intento crear una tarifa, **entonces** el sistema responde 403. *(RN-02)*

---

### Historia de usuario 2 - Actualizar o inactivar una tarifa (Prioridad: P2) — HU-37

Como Administrador, quiero modificar o inactivar una tarifa, para ajustar los precios sin afectar los cobros ya liquidados.

**Por qué esta prioridad**: mantenimiento de precios; la operación sigue con las tarifas vigentes.

**Prueba independiente**: se cambia la fracción de una tarifa sin uso y queda en la bitácora; la tarifa usada en una liquidación solo admite nombre y cierre; inactivar la única vigente pide confirmación.

**Escenarios de aceptación**:

1. **Dado** una tarifa sin liquidaciones asociadas, **cuando** cambio su valor de fracción, **entonces** el sistema guarda el cambio y lo registra en la bitácora. *(RF-TAR-04)*
2. **Dado** una tarifa ya usada en liquidaciones, **cuando** intento modificar sus valores, **entonces** el sistema pide crear una tarifa nueva con vigencia y cerrar la actual (409); cerrar su vigencia o cambiar el nombre sí se permite. *(RF-TAR-04, RF-TAR-05)*
3. **Dado** una tarifa activa, **cuando** la inactivo y no queda otra vigente para ese tipo de vehículo y cliente, **entonces** el sistema advierte que las salidas de ese tipo no podrán liquidarse y pide confirmación; al confirmar, la inactiva. *(RF-TAR-06)*
4. **Dado** una edición que la superpone con otra tarifa activa, valores inválidos o una tarifa inexistente, **cuando** guardo, **entonces** el sistema responde 409, 422 o 404.

---

### Historia de usuario 3 - Consultar las tarifas vigentes (Prioridad: P2) — HU-38

Como Cliente, Operador o Visitante, quiero ver las tarifas vigentes por tipo de vehículo, para conocer el costo del servicio antes de usarlo.

**Por qué esta prioridad**: transparencia en el cobro; no bloquea la operación.

**Prueba independiente**: sin sesión se consultan las tarifas vigentes por tipo de vehículo y cliente con sus valores; la programada aparece con su fecha de inicio; las inactivas no aparecen.

**Escenarios de aceptación**:

1. **Dado** tarifas vigentes, **cuando** abro Tarifas (sin iniciar sesión), **entonces** veo por tipo de vehículo y tipo de cliente el valor de la primera hora, la fracción, el tope diario y el tiempo de gracia. *(RF-TAR-07)*
2. **Dado** una tarifa programada para el futuro, **cuando** consulto, **entonces** aparece con la fecha desde la que aplicará. *(RF-TAR-07)*
3. **Dado** un instante de entrada, **cuando** la liquidación busca la tarifa vigente para un tipo de vehículo y de cliente, **entonces** obtiene la activa cuya vigencia contiene ese instante, o ninguna. *(RN-19, base de la spec 009)*

---

### Casos borde

- **Valores**: en pesos (COP), números ≥ 0 con hasta 2 decimales; primera hora > 0; tope opcional y ≥ primera hora.
- **Vigencia**: `vigenteDesde` obligatoria (`AAAA-MM-DD` = 00:00 de ese día, o `AAAA-MM-DDTHH:MM`), hora de Bogotá; `vigenteHasta` opcional y posterior; la vigencia es `[desde, hasta)`.
- **Nombre**: 3–60 caracteres; no necesita ser único (puede haber «Carro ocasional» de 2026 y de 2027).
- **Inactiva**: no cuenta para la superposición, la consulta pública ni la liquidación; se puede reactivar si no se superpone.
- **Ya inactiva** → `PATCH` con `inactivo` responde 200 sin cambios.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001** (RF-TAR-01): El sistema DEBE permitir al Administrador registrar tarifas por tipo de vehículo y tipo de cliente con nombre, valor de primera hora, minutos y valor de fracción, tope diario opcional, minutos de gracia y vigencia.
- **FR-002** (RF-TAR-02): El sistema DEBE validar primera hora > 0, fracción de 1–60 minutos con valor ≥ 0, tope ≥ primera hora, gracia 0–30 y vigencia hasta > desde (422 en el campo).
- **FR-003** (RF-TAR-03, RN-18): El sistema DEBE impedir dos tarifas activas superpuestas para el mismo tipo de vehículo y tipo de cliente (409), al crear, editar o reactivar.
- **FR-004** (RF-TAR-05): El sistema DEBE permitir, al crear, cerrar la vigencia de la tarifa anterior en el inicio de la nueva.
- **FR-005** (RF-TAR-04): El sistema DEBE permitir al Administrador actualizar una tarifa sin liquidaciones; de una usada, solo el nombre y el cierre de la vigencia.
- **FR-006** (RF-TAR-06): El sistema DEBE advertir (409) al inactivar la única tarifa vigente de su tipo de vehículo y cliente, e inactivarla solo con confirmación.
- **FR-007** (RF-TAR-07, RNF-SEG-03): El sistema DEBE mostrar sin autenticación las tarifas vigentes y las programadas con su fecha de inicio.
- **FR-008** (RN-19): El sistema DEBE ofrecer la búsqueda de la tarifa vigente para un tipo de vehículo, un tipo de cliente y un instante.
- **FR-009** (RNF-SEG-04, RNF-SEG-07): Permisos `tarifas.ver` (listado completo), `tarifas.crear`, `tarifas.editar`, `tarifas.cambiar_estado`; sin el permiso → 403. Bitácora de crear, editar, cerrar y cambiar estado.

### Entidades clave

- **Tarifa** (6.1): nombre, tipo de vehículo, tipo de cliente, primera hora, minutos y valor de fracción, tope diario, minutos de gracia, vigencia y estado.
- **Liquidación** (spec 009): solo se cuenta para saber si una tarifa ya se usó.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El Administrador configura las cuatro tarifas (carro y moto × ocasional y registrado) en menos de 4 minutos.
- **SC-002**: Ningún escenario de prueba consigue dos tarifas activas superpuestas para el mismo tipo de vehículo y cliente.
- **SC-003**: Ninguna edición altera los valores de una tarifa ya usada en liquidaciones.
- **SC-004**: La consulta pública de tarifas responde en ≤ 1 s p95 (RNF-REN-02) y no expone datos internos.
- **SC-005**: Cada escenario de aceptación de HU-36 a HU-38 tiene su prueba automatizada y su caso en la colección de pruebas (RNF-CAL-03).

## Supuestos

- **Semilla**: cuatro tarifas vigentes desde el 1 de enero de 2026 sin fecha de fin — carro ocasional ($ 4.000 la primera hora, fracción de 15 min a $ 1.000, tope $ 30.000, 10 min de gracia), carro registrado ($ 3.500 / $ 900 / $ 27.000), moto ocasional ($ 2.000 / $ 500 / $ 12.000) y moto registrado ($ 1.800 / $ 450 / $ 10.000) — y una tarifa inactiva de 2025 como historial.
- **Pantallas**: Configuración › Tarifas (listado con filtros, nueva, editar, cambiar estado) y la sección «Tarifas» de la página pública (vigentes y programadas).
