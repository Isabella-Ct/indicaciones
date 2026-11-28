# Especificación de la funcionalidad: Beneficios y descuentos

**Rama**: `011-descuentos`

**Creada**: 2026-11-27

**Estado**: Borrador

**Entrada**: descripción de la usuaria: "011-descuentos — Módulo Beneficios y descuentos del Sistema de Gestión de Parqueadero (Parking Lot ABC), según SRS v2.0 §4.11, Apéndice B.1 §4.11, modelo 6.1 §4.11 e historias HU-49..HU-51."

**Fuentes de verdad**: SRS v2.0 §4.11 (RF-DES-01 … RF-DES-05), §5.3 (RNF-SEG-04, RNF-SEG-07), §5.5 (RN-02, RN-21, RN-25), Apéndice B.1 §4.11, modelo 6.1 §4.11 (*Descuento*) y §4.9 (*Liquidacion.id_descuento*, *Liquidacion.valor_descuento*); historias HU-49 … HU-51.

**Depende de**: `009-facturacion-pagos` (liquidación, factura y comprobante), `010-membresias` (la membresía deja el total en $ 0). **La usan**: `015-reportes-indicadores` (descuentos otorgados).

## Aclaraciones

### Sesión 2026-11-27

La usuaria indicó resolver cada pregunta según los documentos entregados. Cada respuesta cita su fuente.

- P: ¿En qué momento debe estar vigente el descuento para aplicarse? → R: En el momento de la **salida** (la hora en que se liquida); en la vista previa de un vehículo que sigue dentro, en la hora actual. Debe estar **activo** al liquidar: el inactivado deja de aplicarse a las liquidaciones siguientes y las ya guardadas conservan su valor. *Fuente:* criterio 1 de HU-50 («cuando se registra la salida»), criterio 1 de HU-51, RF-DES-05.
- P: ¿Cómo se compara un porcentaje con un valor fijo para elegir «el de mayor valor»? → R: Se calcula cuánto descuenta cada uno sobre el valor bruto de esa liquidación (porcentaje: bruto × % redondeado al peso; valor fijo: el valor, sin pasar del bruto) y se aplica solo el que más descuenta; si empatan, el más antiguo. El total nunca es negativo. *Fuente:* RF-DES-03, RN-25, criterio 2 de HU-50 (10 % = $ 900 frente a $ 2.000 sobre $ 9.000).
- P: ¿Cuándo un descuento «corresponde» a una liquidación? → R: Cuando su tipo de cliente es «todos» o coincide (ocasional = vehículo sin propietario, registrado = con propietario, como en la tarifa), su tipo de vehículo es «todos» o coincide, y la estadía dura al menos sus minutos mínimos (si los tiene). Sin cobro (membresía, tiempo de gracia o valor bruto $ 0) no se aplica ninguno. *Fuente:* RF-DES-01, RF-DES-03, RN-19, RN-21, criterio 3 de HU-50.
- P: ¿Cómo se interpreta una vigencia «del 1 al 31 de diciembre»? → R: Con fechas sin hora, el inicio es las 00:00 del primer día y el fin las 23:59:59 del último (ambos incluidos, hora de Bogotá); también se aceptan fecha y hora. El fin es obligatorio y posterior al inicio. *Fuente:* criterio 1 de HU-49, modelo 6.1 (`vigente_hasta` obligatorio).
- P: ¿Qué valida el registro? → R: Nombre único de 3 a 60 caracteres (409 si se repite); porcentaje de 1 a 100 o valor fijo mayor que 0 (422 «El porcentaje debe estar entre 1 y 100»); minutos mínimos opcionales de 1 a 10.080 (una semana). Se puede editar todo; la edición no cambia liquidaciones ya guardadas. *Fuente:* RF-DES-01, RF-DES-02, criterio 2 de HU-49, RF-DES-05.
- P: ¿Qué pasa al activar un descuento cuya vigencia ya terminó? → R: 422 en `vigenteHasta` «Amplíe la vigencia del descuento antes de activarlo». Inactivar se confirma en la interfaz y no tiene restricciones. *Fuente:* criterio 2 de HU-51.
- P: ¿Quién ve los descuentos? → R: El Administrador los configura (RN-02); el Operador los consulta en modo de solo lectura (`descuentos.ver`) para explicarle el cobro al cliente. El Cliente no los ve. *Fuente:* RN-02, actores de §4.11 (Administrador, Operador), semilla de permisos.
- P: ¿Dónde se muestra el descuento aplicado? → R: En la liquidación (nombre, tipo, valor configurado y valor descontado, también en la explicación del cálculo), en el cobro de la caseta, en el comprobante y en el PDF de la factura. *Fuente:* RF-DES-04, RF-FAC-03, HU-41.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Configurar un descuento o promoción (Prioridad: P1) — HU-49

Como Administrador, quiero crear descuentos por porcentaje o valor fijo para un tipo de cliente o de vehículo con vigencia, para atraer y fidelizar clientes con promociones.

**Por qué esta prioridad**: sin descuentos configurados no hay nada que aplicar.

**Prueba independiente**: se crea «Motos fin de semana» de 20 % para motos del 1 al 31 de diciembre y queda activo en ese periodo; un porcentaje de 120 da 422; el Operador recibe 403.

**Escenarios de aceptación**:

1. **Dado** que creo «Motos fin de semana» de 20 % para motos, vigente del 1 al 31 de diciembre, **cuando** guardo, **entonces** el descuento queda activo en ese periodo. *(RF-DES-01)*
2. **Dado** que ingreso un porcentaje de 120, **cuando** guardo, **entonces** el sistema responde que debe estar entre 1 y 100 (422). *(RF-DES-02)*
3. **Dado** que soy Operador, **cuando** intento crear un descuento, **entonces** el sistema responde 403. *(RN-02)*
4. **Dado** un nombre repetido, un valor fijo de 0 o un fin anterior al inicio, **cuando** guardo, **entonces** el sistema responde 409 o 422; puedo editar un descuento existente. *(RF-DES-01, RF-DES-02)*

---

### Historia de usuario 2 - Aplicar el descuento en la liquidación (Prioridad: P1) — HU-50

Como Operador, quiero que la liquidación aplique automáticamente el descuento vigente que corresponda, para cobrar el valor correcto sin calcular promociones a mano.

**Por qué esta prioridad**: es el beneficio que recibe el cliente.

**Prueba independiente**: una moto con valor bruto de $ 9.000 y el 20 % vigente paga $ 7.200 y el detalle muestra el descuento; con 10 % y $ 2.000 aplicables se aplica solo el de $ 2.000; con membresía no se aplica ninguno.

**Escenarios de aceptación**:

1. **Dado** una liquidación bruta de $ 9.000 de una moto con el descuento de 20 % vigente, **cuando** se registra la salida, **entonces** el total es $ 7.200 y el detalle muestra el descuento aplicado. *(RF-DES-03, RF-DES-04)*
2. **Dado** dos descuentos aplicables de 10 % y $ 2.000 sobre $ 9.000, **cuando** se liquida, **entonces** se aplica solo el de $ 2.000 por ser mayor. *(RF-DES-03, RN-25)*
3. **Dado** un vehículo con membresía vigente, **cuando** se liquida, **entonces** no se aplica descuento porque el total ya es $ 0. *(RN-21)*
4. **Dado** un descuento de otro tipo de vehículo o de cliente, o con más minutos mínimos que la estadía, **cuando** se liquida, **entonces** no se aplica; la factura y su PDF muestran el nombre y el valor del descuento aplicado. *(RF-DES-03, RF-DES-04)*

---

### Historia de usuario 3 - Activar o inactivar un descuento (Prioridad: P2) — HU-51

Como Administrador, quiero activar o inactivar un descuento antes de su fin de vigencia, para terminar una promoción cuando el negocio lo decida.

**Por qué esta prioridad**: control de la promoción.

**Prueba independiente**: al inactivar el descuento, la siguiente salida se liquida sin él y la liquidación anterior conserva su descuento; activar uno vencido da 422.

**Escenarios de aceptación**:

1. **Dado** un descuento activo, **cuando** lo inactivo y confirmo, **entonces** deja de aplicarse a las liquidaciones siguientes; las ya facturadas no cambian. *(RF-DES-05)*
2. **Dado** un descuento con vigencia vencida, **cuando** intento activarlo, **entonces** el sistema pide ampliar la vigencia (422). *(RF-DES-05)*

---

### Casos borde

- **Fijo mayor que el bruto**: un descuento de $ 2.000 sobre $ 1.500 descuenta $ 1.500 y el total es $ 0 (nunca negativo).
- **Redondeo**: el porcentaje se redondea al peso (15 % de $ 4.333 = $ 650).
- **Tiempo de gracia**: sin valor bruto no hay descuento (el total ya es $ 0).
- **Vigencia**: se evalúa con la hora de la salida; un descuento programado para mañana no aplica hoy.
- **Liquidación ya guardada**: se muestra con el descuento guardado, aunque luego el descuento se edite o se inactive.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001** (RF-DES-01): El sistema DEBE permitir al Administrador registrar y editar descuentos con nombre único, tipo (porcentaje o valor fijo), valor, tipo de cliente y de vehículo aplicables, minutos mínimos opcionales y vigencia.
- **FR-002** (RF-DES-02): El sistema DEBE validar porcentaje de 1 a 100 y valor fijo mayor que 0.
- **FR-003** (RF-DES-03, RN-25): El sistema DEBE aplicar en la liquidación, como máximo, el descuento activo y vigente a la hora de salida que más descuente entre los que correspondan al tipo de cliente, tipo de vehículo y minutos de estadía; el total nunca es negativo.
- **FR-004** (RN-21): El sistema NO DEBE aplicar descuentos cuando el total ya es $ 0 (membresía, tiempo de gracia).
- **FR-005** (RF-DES-04): El sistema DEBE mostrar el nombre y el valor del descuento aplicado en la liquidación, el cobro, el comprobante y el PDF de la factura.
- **FR-006** (RF-DES-05): El sistema DEBE permitir al Administrador activar e inactivar descuentos sin afectar las liquidaciones ya guardadas; activar uno con la vigencia terminada responde 422.
- **FR-007** (RNF-SEG-04, RNF-SEG-07): Permisos `descuentos.ver` (Administrador y Operador), `descuentos.crear`, `descuentos.editar` y `descuentos.cambiar_estado` (Administrador); bitácora de creación, edición y cambio de estado.

### Entidades clave

- **Descuento** (6.1 *Descuento*): nombre, tipo, valor, tipo de cliente y de vehículo aplicables, minutos mínimos, vigencia (desde, hasta) y estado.
- **Liquidación** (spec 009): guarda el descuento aplicado y el valor descontado.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El Administrador configura un descuento en menos de 1 minuto.
- **SC-002**: En el 100 % de las liquidaciones de prueba se aplica como máximo un descuento, el de mayor valor, y el total nunca es negativo.
- **SC-003**: Ninguna liquidación ya guardada cambia de valor al editar o inactivar un descuento.
- **SC-004**: Cada escenario de aceptación de HU-49 a HU-51 tiene su prueba automatizada y su caso en la colección de pruebas (RNF-CAL-03).

## Supuestos

- **Semilla**: 3 descuentos — «Motos fin de semana» (20 %, motos, todos los clientes, del 1 al 31 de diciembre de 2026, activo), «Navidad clientes registrados» (10 %, todos los vehículos, clientes registrados, del 15 al 31 de diciembre de 2026, activo) y «Promoción de apertura» ($ 1.000, todos, enero de 2026, inactivo).
- **Días de la semana**: el modelo 6.1 no tiene días de la semana en el descuento; «fin de semana» es solo el nombre de la promoción.
- **Pantallas**: Configuración › Descuentos y el detalle del descuento en Movimientos › Registrar salida y en el comprobante.
