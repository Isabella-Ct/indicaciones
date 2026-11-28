# Especificación de la funcionalidad: Facturación y pagos

**Rama**: `009-facturacion-pagos`

**Creada**: 2026-11-27

**Estado**: Borrador

**Entrada**: descripción de la usuaria: "009-facturacion-pagos — Módulo Facturación y pagos del Sistema de Gestión de Parqueadero (Parking Lot ABC), según SRS v2.0 §4.9, Apéndice B.1 §4.9, modelo 6.1 §4.9 e historias HU-39..HU-44."

**Fuentes de verdad**: SRS v2.0 §4.9 (RF-FAC-01 … RF-FAC-19), §5.1 (RNF-REN-01), §5.2 (RNF-SAF-02), §5.3 (RNF-SEG-04, RNF-SEG-07, RNF-PRI-02), §5.5 (RN-02, RN-19, RN-20, RN-21, RN-22), Apéndice B.1 §4.9, modelo 6.1 §4.9 (*Liquidacion*, *Factura*, *Pago*, *CierreCaja*), Apéndice C (TBD-02); historias HU-39 … HU-44.

**Depende de**: `007-control-ingreso-salida` (movimiento cerrado con sus minutos), `008-tarifas` (`vigenteEn`, tipo de cliente). **La usan**: `010-membresias` (cobertura en cero y factura del plan), `011-descuentos` (descuento dentro de la liquidación), `014-monitoreo-alertas` (alerta «sin tarifa»), `015-reportes-indicadores` (ingresos).

## Aclaraciones

### Sesión 2026-11-27

La usuaria indicó resolver cada pregunta según los documentos entregados. Cada respuesta cita su fuente.

- P: ¿Cuándo se liquida y qué devuelve `GET /movimientos/:id/liquidacion`? → R: Para un movimiento **cerrado**, la primera consulta guarda la liquidación (una por movimiento) y las siguientes devuelven la guardada; para uno **abierto**, devuelve una vista previa con la hora del servidor, sin guardarla (el valor «en vivo» de la caseta); para uno anulado → 409. La salida (spec 007) incluye esta liquidación en su respuesta. *Fuente:* B.1 («Liquidar el valor del servicio» → HU-39), criterio 1 de HU-39, RF-MOV-11, RN-19.
- P: ¿Cómo se calcula el valor (RN-20)? → R: Con la tarifa vigente a la hora de **entrada** para el tipo de vehículo y el tipo de cliente (registrado = vehículo con propietario): si los minutos no superan la gracia → $ 0; si no, se separa la estadía en bloques de 24 horas; cada bloque completo cuesta lo que da la fórmula para 1 440 minutos, con el tope diario como máximo; el resto se cobra con la primera hora más cada fracción iniciada después de los primeros 60 minutos, con el tope como máximo. Sin tope, la fórmula se aplica a toda la estadía. Ejemplo: 135 min → $ 4.000 + ⌈75/15⌉ = 5 × $ 1.000 = $ 9.000. *Fuente:* RN-19, RN-20, criterios 1, 2 y 4 de HU-39.
- P: ¿Qué membresía cubre la estadía (RF-FAC-02, RN-21)? → R: Una membresía `activa` del vehículo cuya vigencia (`fecha_inicio`..`fecha_fin`) incluye la fecha de entrada → total $ 0 con «Cubierto por membresía». Las membresías las crea la spec 010; aquí solo se consultan. El descuento (RN-21, RN-25) lo agrega la spec 011 dentro de esta misma liquidación; en esta spec el descuento es siempre $ 0. *Fuente:* RF-FAC-02, RN-21, B.1 (HU-50 «parte de GET /movimientos/:id/liquidacion»).
- P: ¿Cómo se relacionan el pago y la factura, si en 6.1 el pago apunta a la factura? → R: `POST /pagos` registra el pago y, en la misma transacción, crea la factura con su número consecutivo `FV-000001` (RF-FAC-09: una factura por cada pago; RN-22: sin huecos). `POST /facturas` **emite el comprobante** de ese pago: guarda los datos de un tercero si el cliente los pide (RF-FAC-11, solo antes de enviarlo) y envía el PDF al correo del cliente registrado (RF-FAC-10). Una liquidación en $ 0 no exige pago; si el cliente pide soporte, se registra un pago de $ 0 en efectivo. *Fuente:* modelo 6.1 (`pago.id_factura` obligatorio, `factura.id_liquidacion` único), RF-FAC-05..11, criterio 2 de HU-39.
- P: ¿Qué es «pendiente de envío electrónico» (RF-FAC-12)? → R: El equipo decidió no integrar la facturación electrónica DIAN (TBD-02): la factura es un comprobante interno en PDF y, como no tiene CUFE, la API la muestra con `electronica: { estado: 'pendiente', cufe: null }`. Si en el futuro se integra un proveedor, ese estado cambia sin tocar la numeración. *Fuente:* RF-FAC-12, criterio 4 de HU-41, TBD-02, `CAMBIOS.md` 2.0.0 («`factura.cufe` opcional y sin uso»).
- P: ¿Qué es «el turno» de un operador y qué impide el cierre (RF-FAC-17, RF-FAC-18)? → R: El turno abierto son los pagos del operador que todavía no pertenecen a un cierre (`pago.id_cierre` nulo). El cierre los asigna a ese cierre de forma definitiva: ningún pago nuevo entra en un turno cerrado (los nuevos abren el turno siguiente). El cuadre suma solo las facturas emitidas (no las anuladas). Cerrar un turno sin pagos → 409. *Fuente:* modelo (`pago.id_cierre`, «NULL = turno abierto»), criterios 1 y 2 de HU-44, RF-FAC-14.
- P: ¿Quién consulta qué? → R: Facturas: el listado y el detalle con `facturas.ver` (Operador y Administrador); el Cliente usa `GET /usuarios/me/facturas` y solo puede descargar el PDF de sus propias facturas (otra → 403). Anular: solo `facturas.anular` (Administrador). Cierres: el Administrador ve todos; los demás, solo los suyos. *Fuente:* RF-FAC-13, RF-FAC-16, RF-FAC-19, criterio 3 de HU-43, RNF-PRI-02.
- P: ¿Qué alerta se genera cuando no hay tarifa (RF-FAC-04)? → R: Una fila en `alerta` de tipo `sin_tarifa` con el mensaje y la referencia del movimiento (una sola sin leer por movimiento); la bandeja de alertas es de la spec 014. *Fuente:* RF-FAC-04, criterio 5 de HU-39, tabla `alerta` 2.0.0.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Liquidar el valor del servicio (Prioridad: P1) — HU-39

Como Operador, quiero que al registrar la salida el sistema calcule automáticamente el valor a pagar, para cobrar sin errores ni discusiones con el cliente.

**Por qué esta prioridad**: sin liquidación no hay cobro.

**Prueba independiente**: 135 minutos con la tarifa de carro ocasional dan $ 9.000 con su detalle; 8 minutos con 10 de gracia dan $ 0; con membresía activa $ 0 «Cubierto por membresía»; una estadía de 30 horas no supera el tope por cada 24 horas; sin tarifa vigente → 409 y alerta.

**Escenarios de aceptación**:

1. **Dado** la tarifa carro ocasional (primera hora $ 4.000, fracción de 15 min a $ 1.000, gracia 10 min) y una estadía de 135 minutos, **cuando** se registra la salida, **entonces** el sistema liquida $ 4.000 + 5 fracciones × $ 1.000 = $ 9.000 y muestra el detalle del cálculo. *(RF-FAC-01, RF-FAC-03)*
2. **Dado** una estadía de 8 minutos con 10 minutos de gracia, **cuando** se liquida, **entonces** el valor es $ 0 y el movimiento se cierra sin cobro. *(RF-FAC-01)*
3. **Dado** un vehículo con membresía activa vigente, **cuando** se liquida, **entonces** el valor es $ 0 y el detalle indica «Cubierto por membresía». *(RF-FAC-02, RN-21)*
4. **Dado** una estadía que supera el tope diario, **cuando** se liquida, **entonces** el valor no excede el tope por cada 24 horas. *(RF-FAC-01, RN-20)*
5. **Dado** que no existe tarifa vigente para el tipo de vehículo, **cuando** se intenta liquidar, **entonces** el sistema responde «No hay tarifa vigente para moto» (409) y alerta al Administrador. *(RF-FAC-04)*
6. **Dado** un movimiento abierto, **cuando** consulto su liquidación, **entonces** veo el valor a la hora actual sin que quede guardado; un movimiento anulado → 409.

---

### Historia de usuario 2 - Registrar el pago del servicio (Prioridad: P1) — HU-40

Como Operador, quiero registrar el pago indicando el método (efectivo, tarjeta, transferencia o QR), para dejar constancia del recaudo y entregar el cambio correcto.

**Por qué esta prioridad**: es el recaudo.

**Prueba independiente**: un pago en efectivo de $ 10.000 sobre $ 9.000 da $ 1.000 de cambio y crea la factura FV-; la tarjeta sin referencia y el efectivo insuficiente dan 422; el segundo pago da 409.

**Escenarios de aceptación**:

1. **Dado** una liquidación de $ 9.000, **cuando** registro pago en efectivo con $ 10.000 recibidos, **entonces** el sistema registra el pago, calcula $ 1.000 de cambio y habilita la emisión del comprobante (la factura queda numerada). *(RF-FAC-05, RF-FAC-06, RF-FAC-09)*
2. **Dado** un pago con tarjeta, transferencia o QR, **cuando** confirmo, **entonces** el sistema exige el número de referencia o autorización (4–40 caracteres). *(RF-FAC-07)*
3. **Dado** un valor recibido en efectivo menor que el total, **cuando** intento confirmar, **entonces** el sistema muestra el faltante y no registra el pago (422). *(RF-FAC-06)*
4. **Dado** un movimiento ya pagado, **cuando** intento registrar otro pago, **entonces** el sistema responde «El servicio ya fue pagado» (409). *(RF-FAC-08)*
5. **Dado** un movimiento abierto o anulado, o sin tarifa vigente, **cuando** intento pagar, **entonces** el sistema lo rechaza (409). Sin `facturas.crear` → 403.

---

### Historia de usuario 3 - Emitir el comprobante o factura (Prioridad: P1) — HU-41

Como Operador, quiero emitir el comprobante de pago con numeración consecutiva, para entregar al cliente un soporte válido de lo que pagó.

**Por qué esta prioridad**: el soporte del cobro.

**Prueba independiente**: la factura tiene número consecutivo y el detalle del servicio; se envía en PDF al correo del cliente registrado; sale a nombre de un tercero si se pide; queda pendiente de envío electrónico.

**Escenarios de aceptación**:

1. **Dado** un pago registrado, **cuando** emito el comprobante, **entonces** la factura tiene número consecutivo (FV-000245), datos del parqueadero, placa, entrada, salida, tiempo, tarifa, descuentos, total y método de pago. *(RF-FAC-09)*
2. **Dado** una factura emitida, **cuando** el cliente tiene correo registrado, **entonces** el sistema la envía en PDF a su correo; en todo caso se puede imprimir en 80 mm y descargar en PDF. *(RF-FAC-10)*
3. **Dado** que el cliente pide factura a nombre de una empresa, **cuando** ingreso NIT y razón social, **entonces** la factura sale a ese nombre. *(RF-FAC-11)*
4. **Dado** que no hay proveedor de facturación electrónica (TBD-02), **cuando** emito, **entonces** el sistema emite el comprobante interno y marca la factura como pendiente de envío electrónico. *(RF-FAC-12)*

---

### Historia de usuario 4 - Anular una factura (Prioridad: P2) — HU-42

Como Administrador, quiero anular una factura emitida indicando el motivo, para corregir cobros equivocados sin perder la trazabilidad.

**Por qué esta prioridad**: control financiero; no bloquea la operación.

**Prueba independiente**: la factura queda anulada con motivo, usuario y fecha y deja de sumar; la anulada otra vez da 409; el Operador recibe 403.

**Escenarios de aceptación**:

1. **Dado** una factura emitida, **cuando** la anulo con el motivo «Cobro duplicado» y confirmo, **entonces** queda en estado anulada con motivo, usuario y fecha, y su valor deja de sumar en los totales y en el cuadre de caja. *(RF-FAC-13, RF-FAC-14, RN-22)*
2. **Dado** una factura ya anulada, **cuando** intento anularla de nuevo, **entonces** el sistema responde 409.
3. **Dado** que soy Operador, **cuando** intento anular una factura, **entonces** el sistema responde 403. *(RN-02)*

---

### Historia de usuario 5 - Consultar facturas (Prioridad: P2) — HU-43

Como Administrador o Cliente, quiero buscar facturas por número, placa, cliente o fecha, para atender reclamos y, como cliente, descargar mis comprobantes.

**Por qué esta prioridad**: consulta; no bloquea la operación.

**Prueba independiente**: el filtro por fechas y método devuelve las facturas con su total filtrado (sin las anuladas); el Cliente solo ve y descarga las suyas.

**Escenarios de aceptación**:

1. **Dado** facturas emitidas, **cuando** el Administrador filtra por rango de fechas y método de pago, **entonces** ve las facturas con número, fecha, placa, cliente, total y estado, con el total del filtro. *(RF-FAC-15)*
2. **Dado** que soy Cliente, **cuando** abro Mis facturas, **entonces** solo veo mis facturas y puedo descargar cada una en PDF. *(RF-FAC-16)*
3. **Dado** un número de factura de otro cliente, **cuando** un Cliente intenta descargarla, **entonces** el sistema responde 403. *(RF-FAC-16, RNF-PRI-02)*

---

### Historia de usuario 6 - Cuadrar la caja del turno (Prioridad: P2) — HU-44

Como Operador, quiero generar el cuadre de caja de mi turno comparando lo registrado con el efectivo contado, para entregar el turno con las cuentas claras.

**Por qué esta prioridad**: control del recaudo al final del turno.

**Prueba independiente**: el cuadre muestra totales por método, servicios y efectivo esperado; el cierre guarda la diferencia y deja los pagos en ese cierre; el Administrador ve el detalle con las facturas.

**Escenarios de aceptación**:

1. **Dado** pagos registrados en mi turno, **cuando** genero el cuadre, **entonces** el sistema muestra el total por método de pago, el número de servicios y el efectivo esperado (sin las facturas anuladas). *(RF-FAC-17)*
2. **Dado** que ingreso el efectivo contado, **cuando** confirmo el cierre, **entonces** el sistema registra el cierre con la diferencia (sobrante o faltante) y ningún pago nuevo entra en ese turno. *(RF-FAC-18)*
3. **Dado** un cierre registrado, **cuando** el Administrador lo consulta, **entonces** ve el detalle y las facturas incluidas; el Operador solo ve sus cierres. *(RF-FAC-19)*
4. **Dado** un turno sin pagos, **cuando** intento cerrarlo, **entonces** el sistema responde 409.

---

### Casos borde

- **Fracciones**: se cuenta cada fracción iniciada (`⌈(minutos − 60) / minutosFraccion⌉`); en los primeros 60 minutos solo se cobra la primera hora.
- **Varios días**: 30 horas con tope de $ 30.000 → $ 30.000 por el primer bloque de 24 h + el valor de las 6 horas restantes (máximo $ 30.000).
- **Redondeo**: los valores se guardan con 2 decimales; en pantalla se muestran sin decimales.
- **Pagos concurrentes**: dos pagos de la misma liquidación a la vez → el segundo falla por el `UNIQUE` de la factura de la liquidación (409).
- **Numeración**: el número se toma en la transacción del pago; si el pago falla, no se consume (sin huecos).
- **Factura anulada**: se conserva con su número (nunca se borra) y no suma en listados, reportes ni cuadre.
- **Tercero**: NIT o documento (5–20) y razón social (3–100); solo antes de enviar el comprobante.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Liquidación (HU-39)**

- **FR-001** (RF-FAC-01, RN-19, RN-20): El sistema DEBE liquidar cada movimiento cerrado con la tarifa vigente a la hora de entrada según gracia, primera hora, fracciones iniciadas y tope diario por cada 24 horas, una sola vez por movimiento.
- **FR-002** (RF-FAC-02, RN-21): El sistema DEBE liquidar en cero las estadías cubiertas por una membresía activa del vehículo.
- **FR-003** (RF-FAC-03): El sistema DEBE mostrar el detalle: minutos, tarifa, primera hora, fracciones, valor bruto, descuento, membresía, total y la explicación del cálculo.
- **FR-004** (RF-FAC-04): El sistema DEBE rechazar la liquidación sin tarifa vigente (409) y generar una alerta al Administrador.

**Pago (HU-40)**

- **FR-005** (RF-FAC-05): El sistema DEBE registrar el pago de una liquidación con método, valor, operador y fecha del servidor.
- **FR-006** (RF-FAC-06): El sistema DEBE calcular el cambio en efectivo y rechazar valores recibidos menores que el total (422 con el faltante).
- **FR-007** (RF-FAC-07): El sistema DEBE exigir referencia (4–40) para tarjeta, transferencia y QR.
- **FR-008** (RF-FAC-08): El sistema DEBE impedir un segundo pago de la misma liquidación (409).

**Factura (HU-41, HU-42, HU-43)**

- **FR-009** (RF-FAC-09, RN-22): El sistema DEBE emitir una factura por cada pago, con numeración consecutiva sin huecos y el detalle del servicio.
- **FR-010** (RF-FAC-10): El sistema DEBE generar el PDF de la factura (80 mm), enviarlo al correo del cliente registrado y permitir imprimirlo.
- **FR-011** (RF-FAC-11): El sistema DEBE permitir emitir la factura a nombre de un tercero con documento y razón social.
- **FR-012** (RF-FAC-12): El sistema DEBE marcar las facturas sin envío electrónico como pendientes (TBD-02).
- **FR-013** (RF-FAC-13, RF-FAC-14): El sistema DEBE permitir solo al Administrador anular facturas con motivo (10–200), conservarlas con motivo, usuario y fecha y excluirlas de los totales.
- **FR-014** (RF-FAC-15): El sistema DEBE listar facturas con filtros por texto (número, placa, cliente), rango de fechas, método y estado, con el total filtrado de las emitidas.
- **FR-015** (RF-FAC-16): El sistema DEBE permitir al Cliente consultar y descargar solo sus facturas.

**Caja (HU-44)**

- **FR-016** (RF-FAC-17): El sistema DEBE mostrar el cuadre del turno abierto del operador con totales por método, número de servicios y efectivo esperado.
- **FR-017** (RF-FAC-18): El sistema DEBE registrar el cierre con el efectivo contado y la diferencia, y dejar sus pagos en ese cierre.
- **FR-018** (RF-FAC-19): El sistema DEBE permitir al Administrador consultar todos los cierres con su detalle y facturas; los demás, solo los suyos.

**Transversales**

- **FR-019** (RNF-SEG-04, RNF-SEG-07): Permisos `movimientos.ver` (liquidación), `facturas.ver`, `facturas.crear` (pagos y emisión), `facturas.anular`, `caja.ver`, `caja.crear`, `perfil.ver` (mis facturas); bitácora de liquidación, pago, emisión, anulación y cierre.

### Entidades clave

- **Liquidación** (6.1): minutos cobrados, tarifa, valor bruto, descuento, cobertura por membresía y total; una por movimiento.
- **Factura** (6.1): número consecutivo, liquidación (o membresía, spec 010), cliente, tercero, total, fecha, estado y anulación.
- **Pago** (6.1): método, valor, recibido, cambio, referencia, operador, fecha y cierre.
- **Cierre de caja** (6.1): operador, inicio y fin del turno, totales por método, efectivo contado, diferencia.
- **Alerta** (spec 014): se inserta la de tipo `sin_tarifa`.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: La salida con su liquidación responde en ≤ 2 s p95 (RNF-REN-01); el cobro completo (liquidar, pagar y emitir) toma menos de 30 segundos al operador.
- **SC-002**: El 100 % de las liquidaciones de prueba (gracia, fracción exacta, fracción iniciada, tope, varios días, membresía) coincide con RN-20.
- **SC-003**: Ningún escenario de prueba consigue dos pagos de la misma liquidación ni un hueco en la numeración.
- **SC-004**: Ninguna factura anulada suma en los totales del listado ni en el cuadre de caja.
- **SC-005**: Ningún Cliente obtiene facturas de otro cliente.
- **SC-006**: Cada escenario de aceptación de HU-39 a HU-44 tiene su prueba automatizada y su caso en la colección de pruebas (RNF-CAL-03).

## Supuestos

- **Semilla**: sin liquidaciones, facturas ni pagos (la operación empieza vacía); el consecutivo `factura` (FV-, 6 dígitos) ya existe.
- **Facturación electrónica**: no se integra (TBD-02); el comprobante es interno en PDF.
- **Pantallas**: Movimientos › Registrar salida (liquidación y cobro), Facturación (listado, anular), Facturación › Comprobante (vista de 80 mm, PDF y envío), Facturación › Cierre de caja, Panel del cliente › Mis facturas.
