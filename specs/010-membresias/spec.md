# Especificación de la funcionalidad: Membresías

**Rama**: `010-membresias`

**Creada**: 2026-11-27

**Estado**: Borrador

**Entrada**: descripción de la usuaria: "010-membresias — Módulo Membresías del Sistema de Gestión de Parqueadero (Parking Lot ABC), según SRS v2.0 §4.10, Apéndice B.1 §4.10, modelo 6.1 §4.10 e historias HU-45..HU-48."

**Fuentes de verdad**: SRS v2.0 §4.10 (RF-MEM-01 … RF-MEM-10), §5.3 (RNF-SEG-04, RNF-SEG-07, RNF-PRI-02), §5.5 (RN-02, RN-21, RN-23, RN-24), Apéndice B.1 §4.10, modelo 6.1 §4.10 (*PlanMembresia*, *Membresia*); historias HU-45 … HU-48.

**Depende de**: `005-vehiculos` (vehículo con propietario), `009-facturacion-pagos` (factura numerada, pago y cobertura en $ 0 de la liquidación). **La usan**: `012-reservas` (beneficios), `014-monitoreo-alertas` (aviso de vencimiento por correo, RF-MON-06), `015-reportes-indicadores`.

## Aclaraciones

### Sesión 2026-11-27

La usuaria indicó resolver cada pregunta según los documentos entregados. Cada respuesta cita su fuente.

- P: ¿Cómo se «activa solo con el pago» (RF-MEM-03, RN-24)? → R: `POST /membresias` recibe el vehículo, el plan y el pago (método, valor recibido o referencia) y en **una transacción** crea la membresía `activa`, la factura del plan (`factura.id_membresia`, número `FV-` consecutivo) y su pago. Si el pago no es válido, nada se guarda (criterio 4 de HU-46). *Fuente:* RF-MEM-03, RF-MEM-05, RN-24, modelo 6.1 (`factura.id_membresia`), research de la spec 009.
- P: ¿Qué vigencia tiene? → R: Desde hoy (Bogotá) por los días del plan, contando el primer día: 30 días desde el 16/12/2026 terminan el 14/01/2027. La renovación de una membresía activa empieza el día siguiente al fin actual y alarga la misma membresía (con su propia factura); la de una vencida empieza hoy. *Fuente:* RF-MEM-05, RF-MEM-06, criterio 1 de HU-47 (16/12/2026 → 14/01/2027).
- P: ¿Quién es el cliente de la membresía? → R: El propietario del vehículo (spec 005). Un vehículo sin propietario no se puede suscribir (422 «Asocie primero el vehículo a un cliente»). El Operador suscribe cualquier vehículo con propietario; el Cliente solo los suyos. *Fuente:* RF-MEM-03 («vehículo de un cliente»), RN-26, alcance por permiso (`membresias.ver` = personal).
- P: ¿Qué pasa con las membresías de un plan que se inactiva (RF-MEM-02)? → R: Siguen vigentes hasta su fin; el plan inactivo no admite suscripciones ni renovaciones nuevas (409 `PLAN_INACTIVO`). *Fuente:* RF-MEM-02, criterio 3 de HU-45.
- P: ¿Cómo vence «una vez al día» (RF-MEM-08)? → R: Un proceso programado del servidor (con `setTimeout`, sin dependencias nuevas) marca como `vencida` cada día, poco después de la medianoche de Bogotá, las membresías activas cuya fecha de fin ya pasó; también corre al iniciar el servidor. Las pruebas llaman directamente a la operación `vencer(hoy)`. La cobertura de la liquidación (spec 009) ya exige que la fecha de entrada esté dentro de la vigencia, así que una membresía sin vencer todavía no cubre días fuera de su rango. *Fuente:* RF-MEM-08, criterio 3 de HU-47, constitución §VII (sin `node-cron`).
- P: ¿Qué ve el Cliente (RF-MEM-09, RF-MEM-10)? → R: `GET /usuarios/me/membresias` devuelve sus membresías (plan, vehículo, inicio, fin, días restantes, estado y sus facturas) y, si no tiene ninguna vigente, los planes activos. Con 5 días o menos para vencer, la membresía trae `avisoRenovacion: true`; el correo de aviso es de la spec 014. *Fuente:* RF-MEM-09, RF-MEM-10, criterios de HU-48, RF-MON-06.
- P: ¿Cómo encuentra el personal las membresías para renovarlas o cancelarlas? → R: Con `GET /membresias?q&estado&page&limit` `[Propuesta]` (permiso `membresias.ver`): búsqueda por placa, nombre o documento del cliente. B.1 no trae un listado, pero la pantalla «Membresías › Detalle (Renovar / Cancelar)» lo necesita. *Fuente:* interfaz de HU-47, constitución §I (propuestas marcadas).

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Configurar planes de membresía (Prioridad: P1) — HU-45

Como Administrador, quiero crear planes mensuales por tipo de vehículo con su valor y beneficios, para ofrecer opciones de pago recurrente a los clientes frecuentes.

**Por qué esta prioridad**: sin planes no hay suscripciones.

**Prueba independiente**: se crea «Mensual carro» de $ 180.000 por 30 días y queda activo; el nombre repetido da 409; el plan inactivado deja de ofrecerse, pero sus membresías siguen.

**Escenarios de aceptación**:

1. **Dado** que creo el plan «Mensual carro» de $ 180.000 para carros con 30 días de vigencia, **cuando** guardo, **entonces** el plan queda activo y disponible para suscripciones. *(RF-MEM-01)*
2. **Dado** un plan con el mismo nombre, **cuando** intento crearlo, **entonces** el sistema responde 409. *(RF-MEM-01)*
3. **Dado** un plan con membresías activas, **cuando** lo inactivo, **entonces** deja de ofrecerse para nuevas suscripciones, pero las vigentes se mantienen hasta su fin. *(RF-MEM-02)*
4. **Dado** valores inválidos (valor 0, 0 días) o que soy Operador, **cuando** guardo, **entonces** el sistema responde 422 o 403; puedo editar el valor, los días y los beneficios de un plan.

---

### Historia de usuario 2 - Suscribir un cliente a un plan (Prioridad: P1) — HU-46

Como Operador o Cliente, quiero suscribir un vehículo de un cliente a un plan de membresía y pagarlo, para que el cliente use el parqueadero sin pagar cada vez durante el mes.

**Por qué esta prioridad**: es el ingreso recurrente.

**Prueba independiente**: ABC123 se suscribe a «Mensual carro» con el pago y queda activa por 30 días con su factura; la segunda suscripción da 409 con la fecha de fin; la moto en un plan de carros da 422; con un pago inválido no queda nada.

**Escenarios de aceptación**:

1. **Dado** un cliente con el carro ABC123 sin membresía activa, **cuando** lo suscribo al plan «Mensual carro» y registro el pago, **entonces** el sistema crea la membresía activa por 30 días, emite la factura y la muestra en el detalle del cliente. *(RF-MEM-03, RF-MEM-05, RN-24)*
2. **Dado** que ABC123 ya tiene una membresía activa, **cuando** intento suscribirlo de nuevo, **entonces** el sistema responde «El vehículo ya tiene una membresía activa hasta 15/12/2026» (409). *(RF-MEM-04, RN-23)*
3. **Dado** un plan para carros, **cuando** intento suscribir una moto, **entonces** el sistema rechaza la suscripción (422). *(RN-23)*
4. **Dado** que el pago no se completa (efectivo insuficiente, sin referencia), **cuando** confirmo, **entonces** la membresía no queda activa ni se emite factura. *(RN-24)*
5. **Dado** un vehículo sin propietario o, siendo Cliente, un vehículo ajeno, **cuando** intento suscribirlo, **entonces** el sistema lo rechaza (422 o 403).

---

### Historia de usuario 3 - Renovar o cancelar una membresía (Prioridad: P2) — HU-47

Como Operador o Administrador, quiero renovar una membresía o cancelarla, para mantener al cliente sin interrupciones o terminar el servicio cuando lo pida.

**Por qué esta prioridad**: continuidad del servicio.

**Prueba independiente**: la membresía que vence el 15/12/2026 se renueva del 16/12/2026 al 14/01/2027 con su factura; la cancelada deja de cubrir; el proceso diario marca las vencidas.

**Escenarios de aceptación**:

1. **Dado** una membresía que vence el 15/12/2026, **cuando** la renuevo y registro el pago, **entonces** la nueva vigencia va del 16/12/2026 al 14/01/2027. *(RF-MEM-06)*
2. **Dado** una membresía activa, **cuando** la cancelo con motivo, **entonces** pasa a cancelada y las siguientes salidas del vehículo se liquidan con tarifa normal. *(RF-MEM-07)*
3. **Dado** la fecha de fin cumplida, **cuando** el proceso diario se ejecuta, **entonces** la membresía pasa a vencida automáticamente. *(RF-MEM-08)*
4. **Dado** una membresía cancelada, un plan inactivo o un motivo corto, **cuando** intento renovar o cancelar, **entonces** el sistema responde 409 o 422.

---

### Historia de usuario 4 - Consultar mi membresía (Prioridad: P3) — HU-48

Como Cliente, quiero ver mi membresía, su vigencia y mi historial de pagos, para saber hasta cuándo puedo usar el servicio sin pagar por evento.

**Por qué esta prioridad**: información para el cliente.

**Prueba independiente**: con membresía activa veo plan, vehículo, inicio, fin y días restantes con mis facturas; sin membresía veo los planes; a 5 días o menos, el aviso de renovación.

**Escenarios de aceptación**:

1. **Dado** que tengo una membresía activa, **cuando** abro Mi membresía, **entonces** veo plan, vehículo, fecha de inicio, fecha de fin, días restantes y mi historial de pagos. *(RF-MEM-09)*
2. **Dado** que no tengo membresía vigente, **cuando** abro la sección, **entonces** veo los planes disponibles. *(RF-MEM-10)*
3. **Dado** que faltan 5 días para el vencimiento, **cuando** abro mi panel, **entonces** veo el aviso de renovación. *(RF-MEM-09)*

---

### Casos borde

- **Días restantes**: `fin − hoy + 1` (el día de fin cuenta); 0 si ya venció.
- **Renovación de una vencida**: la nueva vigencia empieza hoy y la membresía vuelve a `activa`, salvo que el vehículo ya tenga otra activa (409).
- **Concurrencia**: dos suscripciones del mismo vehículo a la vez → la segunda falla por el `UNIQUE` de la membresía activa del vehículo (409).
- **Plan**: nombre único (3–60); valor mensual > 0; días de vigencia 1–366; beneficios hasta 300 caracteres.
- **Pago**: mismas reglas que el pago de la spec 009 (efectivo con cambio; tarjeta, transferencia o QR con referencia); el pago cuenta en el cuadre de caja de quien lo registra.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001** (RF-MEM-01): El sistema DEBE permitir al Administrador registrar, editar e inactivar planes con nombre único, tipo de vehículo, valor, días de vigencia y beneficios.
- **FR-002** (RF-MEM-02): El sistema DEBE mantener vigentes las membresías activas de un plan inactivo y no ofrecerlo para suscripciones ni renovaciones.
- **FR-003** (RF-MEM-03, RN-24): El sistema DEBE suscribir un vehículo con propietario a un plan activo de su tipo, activando la membresía solo con el pago registrado en la misma operación.
- **FR-004** (RF-MEM-04, RN-23): El sistema DEBE impedir más de una membresía activa por vehículo (409 con su fecha de fin).
- **FR-005** (RF-MEM-05): El sistema DEBE emitir la factura del plan y calcular la fecha de fin con los días de vigencia.
- **FR-006** (RF-MEM-06): El sistema DEBE renovar con pago, desde el día siguiente al fin actual (o desde hoy si ya venció).
- **FR-007** (RF-MEM-07): El sistema DEBE cancelar una membresía activa con motivo (10–200); desde entonces no cubre las salidas.
- **FR-008** (RF-MEM-08): El sistema DEBE marcar como vencidas, una vez al día, las membresías activas cuya fecha de fin pasó.
- **FR-009** (RF-MEM-09): El sistema DEBE mostrar al Cliente sus membresías con plan, vehículo, vigencia, días restantes, estado, facturas y el aviso de renovación (≤ 5 días).
- **FR-010** (RF-MEM-10): El sistema DEBE mostrar los planes activos al Cliente que no tenga membresía vigente.
- **FR-011** (RNF-SEG-04, RNF-SEG-07): Permisos `planes.ver/crear/editar/cambiar_estado` y `membresias.ver` (listado), `membresias.crear` (suscribir), `membresias.editar` (renovar y cancelar), `perfil.ver` (mi membresía); bitácora de planes, suscripciones, renovaciones, cancelaciones y vencimientos.

### Entidades clave

- **Plan de membresía** (6.1 *PlanMembresia*): nombre, tipo de vehículo, valor mensual, días de vigencia, beneficios, estado.
- **Membresía** (6.1): plan, cliente, vehículo, fecha de inicio y de fin, estado (activa, vencida, cancelada) y motivo de cancelación.
- **Factura** y **Pago** (spec 009): la factura del plan (`id_membresia`) y su pago.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El Operador suscribe un vehículo con su pago en menos de 1 minuto.
- **SC-002**: Ningún escenario de prueba consigue dos membresías activas para un vehículo ni una membresía activa sin factura pagada.
- **SC-003**: El 100 % de las vigencias de prueba (suscripción, renovación de activa y de vencida) coincide con RF-MEM-05 y RF-MEM-06.
- **SC-004**: Las membresías con fecha de fin pasada quedan vencidas en la siguiente ejecución diaria.
- **SC-005**: Cada escenario de aceptación de HU-45 a HU-48 tiene su prueba automatizada y su caso en la colección de pruebas (RNF-CAL-03).

## Supuestos

- **Semilla**: 5 planes — «Mensual carro» ($ 180.000, 30 días), «Mensual moto» ($ 70.000, 30 días), «Trimestral carro» ($ 480.000, 90 días), «Anual moto» ($ 700.000, 365 días) y «Mensual carro nocturno» (inactivo); sin membresías (la operación empieza vacía).
- **Pagos**: simulados como en la spec 009 (sin pasarela).
- **Pantallas**: Configuración › Planes de membresía, Membresías (listado, nueva suscripción, renovar, cancelar) y Panel del cliente › Mi membresía (con suscripción de sus vehículos).
