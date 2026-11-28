# Especificación de la funcionalidad: Restricción de pico y placa

**Rama**: `006-pico-y-placa`

**Creada**: 2026-11-27

**Estado**: Borrador

**Entrada**: descripción de la usuaria: "006-pico-y-placa — Módulo Restricción de pico y placa del Sistema de Gestión de Parqueadero (Parking Lot ABC), según SRS v2.0 §4.6, Apéndice B.1 §4.6, modelo 6.1 §4.6 e historias HU-29..HU-30."

**Fuentes de verdad**: SRS v2.0 §4.6 (RF-PYP-01 … RF-PYP-05), §5.3 (RNF-SEG-04, RNF-SEG-07), §5.5 (RN-02, RN-13, RN-14), Apéndice B.1 §4.6, modelo 6.1 §4.6 (*RestriccionPlaca*), Apéndice C (TBD-03); historias HU-29 y HU-30.

**Depende de**: `001-roles-permisos` (permisos `restricciones.*`), `005-vehiculos` (placa y tipo). **La usan**: `007-control-ingreso-salida` (validar la placa antes de registrar la entrada, RF-MOV-02), `016-festivos-pico-placa` (excepción en festivos).

## Aclaraciones

### Sesión 2026-11-27

La usuaria indicó resolver cada pregunta según los documentos entregados. Cada respuesta cita su fuente.

- P: ¿Qué es «el dígito evaluado» de cada tipo? → R: `ultimo` toma el último carácter numérico de la placa (carro ABC123 → 3); `primero` toma el primer carácter numérico (moto QWE45A → 4). Por defecto `ultimo` para carro y `primero` para moto. *Fuente:* 6.1 (`posicion_digito`), CLAUDE.md §7 («carros por último dígito, motos por primer dígito numérico»).
- P: ¿Qué cuenta como superposición (RN-14)? → R: Dos restricciones **activas** con el mismo día y tipo de vehículo cuyas vigencias (`vigente_desde`..`vigente_hasta`, sin fin = indefinida) se cruzan, sin importar la franja horaria. Respuesta 409 `RESTRICCION_SUPERPUESTA` «Ya existe una restricción para ese día y tipo» con el id de la existente para ofrecer editarla. *Fuente:* RN-14, RF-PYP-03 y criterio 2 de HU-29.
- P: ¿Cómo aplica una edición «a partir de ese momento» (RF-PYP-04)? → R: La restricción se actualiza en su lugar y queda en la bitácora con el valor anterior y el nuevo. Las entradas ya registradas (y sus rechazos, spec 007) no se recalculan: cada evaluación usa la configuración vigente en la fecha y hora de la entrada. `DELETE` es una eliminación lógica (estado `inactivo`); reactivar vuelve a revisar la superposición. *Fuente:* RF-PYP-04, B.1 («eliminación lógica») y criterio 4 de HU-29.
- P: ¿Cuándo está restringido un vehículo (RN-13)? → R: Si existe una restricción activa con su tipo, el día de la semana de la fecha de entrada (hora de Bogotá), la fecha dentro de la vigencia, la hora en `[hora_inicio, hora_fin)` y el dígito evaluado en la lista. Esta spec ofrece la operación de dominio `evaluar(placa, tipo, fechaHora)` → `{ restringido, motivo }`, que la spec 007 llama antes de registrar la entrada. *Fuente:* RN-13, RF-MOV-02.
- P: ¿Qué devuelve «la restricción vigente hoy» y quién la ve? → R: `GET /restricciones-placa/hoy` (permiso `restricciones.ver`: Operador, Cliente y Administrador) devuelve la fecha, el día y, por tipo de vehículo, los dígitos, la posición y la franja vigentes, o `null` con el mensaje «Sin restricción hoy». *Fuente:* RF-PYP-05 y criterios 1 y 2 de HU-30.
- P: ¿Se tienen en cuenta los festivos? → R: No en esta spec. El calendario de excepciones (TBD-03) lo resuelve la spec `016-festivos-pico-placa` con la API externa Nager.Date; aquí la evaluación solo usa el día de la semana. La semilla carga el calendario de ejemplo de Medellín (lunes a viernes, 05:00–20:00) que el Administrador puede editar. *Fuente:* Apéndice C (TBD-03), CLAUDE.md §0 (spec 016) y §7.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Configurar la restricción de pico y placa (Prioridad: P1) — HU-29

Como Administrador, quiero definir para cada día de la semana y tipo de vehículo los dígitos de placa restringidos y su horario, para que el sistema bloquee automáticamente el ingreso de los vehículos que incumplan la restricción vigente.

**Por qué esta prioridad**: el cliente pidió que la entrada niegue el ingreso a los vehículos restringidos; sin configuración no hay control.

**Prueba independiente**: se crea la restricción del sábado para carros con los dígitos 6 y 9 de 05:00 a 20:00 y aparece en la tabla semanal; la superpuesta, el dígito 12 y la hora fin anterior se rechazan; se edita y se elimina con bitácora; el Operador recibe 403.

**Escenarios de aceptación**:

1. **Dado** que defino para un día, tipo carro, los dígitos 6 y 9 de 05:00 a 20:00, **cuando** guardo, **entonces** la restricción queda activa y aparece en la tabla semanal. *(RF-PYP-01)*
2. **Dado** que ya existe una restricción activa para ese día y tipo en la misma vigencia, **cuando** intento crear otra, **entonces** el sistema responde «Ya existe una restricción para ese día y tipo» (409) e indica cuál es para editarla. *(RF-PYP-03, RN-14)*
3. **Dado** una restricción, **cuando** ingreso el dígito 12, dígitos repetidos o una hora fin anterior a la de inicio, **entonces** el sistema señala el error en el campo (422). *(RF-PYP-02)*
4. **Dado** una restricción configurada, **cuando** la edito o la elimino, **entonces** el cambio aplica a las entradas registradas desde ese momento y queda en la bitácora. *(RF-PYP-04)*
5. **Dado** que soy Operador, **cuando** intento crear o modificar restricciones, **entonces** el sistema responde 403. *(RN-02)*

---

### Historia de usuario 2 - Consultar la restricción vigente (Prioridad: P2) — HU-30

Como Operador o Cliente, quiero ver qué dígitos tienen restricción hoy y en qué horario, para informar a los conductores y prever rechazos en la entrada.

**Por qué esta prioridad**: apoyo a la caseta y al cliente; la validación real ocurre en la entrada.

**Prueba independiente**: con una restricción del día de hoy, la consulta muestra los dígitos por tipo y la franja; sin restricción, «Sin restricción hoy». La evaluación de una placa a una fecha y hora dadas dice si está restringida y por qué.

**Escenarios de aceptación**:

1. **Dado** que hay restricción activa hoy, **cuando** abro la pantalla de la caseta (o mi panel de cliente), **entonces** veo un aviso con los dígitos restringidos por tipo de vehículo y la franja horaria. *(RF-PYP-05)*
2. **Dado** que hoy no hay restricción configurada para un tipo, **cuando** consulto, **entonces** el aviso indica «Sin restricción hoy». *(RF-PYP-05)*
3. **Dado** la placa ABC126 (carro) y una restricción del lunes para los dígitos 6 y 9 de 05:00 a 20:00, **cuando** se evalúa un lunes a las 07:30, **entonces** el resultado es «restringido» con el motivo; a las 20:00 o un martes, no. *(RN-13, base de RF-MOV-02)*

---

### Casos borde

- **Dígitos**: de 1 a 5 dígitos distintos entre 0 y 9; se aceptan como lista (`[6, 9]`) y se guardan ordenados como texto `'6,9'`.
- **Franja**: `HH:MM` en 24 h; `hora_fin > hora_inicio` (no cruza la medianoche); el minuto final no está restringido (20:00 ya puede entrar).
- **Vigencia**: `vigenteDesde` por defecto la fecha de hoy (Bogotá); `vigenteHasta` opcional y ≥ `vigenteDesde`. Una vigencia vencida no cuenta para hoy ni para la evaluación.
- **Restricción inactiva**: no cuenta para la superposición ni para la evaluación; se puede reactivar con `PUT` (`estado: activo`) si no se superpone.
- **Placa sin dígitos** (no debería existir por RN-11): no está restringida.
- **Hoy**: el día y la hora se toman en America/Bogota, no en la zona del servidor.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001** (RF-PYP-01): El sistema DEBE permitir al Administrador registrar restricciones con día de la semana (1–7), tipo de vehículo, dígitos, posición del dígito evaluado, franja horaria y vigencia.
- **FR-002** (RF-PYP-02): El sistema DEBE validar que los dígitos estén entre 0 y 9 sin repetir (1–5) y que la hora final sea posterior a la inicial, y la vigencia (hasta ≥ desde).
- **FR-003** (RF-PYP-03, RN-14): El sistema DEBE impedir dos restricciones activas para el mismo día y tipo con vigencias superpuestas (409), también al editar o reactivar.
- **FR-004** (RF-PYP-04): El sistema DEBE permitir al Administrador editar restricciones y eliminarlas lógicamente, con bitácora; el cambio aplica desde ese momento.
- **FR-005** (RF-PYP-05): El sistema DEBE mostrar las restricciones vigentes hoy por tipo de vehículo (o «Sin restricción hoy»).
- **FR-006** (RN-13): El sistema DEBE ofrecer la evaluación de una placa y tipo a una fecha y hora (restringido sí/no y motivo), para que la entrada la use (RF-MOV-02).
- **FR-007** (RF-PYP-01): El sistema DEBE listar las restricciones con filtros por tipo, día y estado, para la tabla semanal.
- **FR-008** (RNF-SEG-04): Permisos `restricciones.ver` (listado y hoy), `restricciones.crear`, `restricciones.editar`, `restricciones.cambiar_estado` (eliminar); sin el permiso → 403.

### Entidades clave

- **Restricción de placa** (6.1 *RestriccionPlaca*): día de la semana, tipo de vehículo, dígitos, posición del dígito, franja horaria, vigencia y estado.
- **Vehículo** (spec 005): su placa y tipo se evalúan.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El Administrador configura la semana completa de un tipo de vehículo (5 días) en menos de 3 minutos.
- **SC-002**: El 100 % de las evaluaciones de prueba (límites de franja, días, vigencias y posiciones) da el resultado de RN-13.
- **SC-003**: Ningún escenario de prueba consigue dos restricciones activas superpuestas para el mismo día y tipo.
- **SC-004**: La consulta de hoy responde en ≤ 1 s p95 (RNF-REN-02).
- **SC-005**: Cada escenario de aceptación de HU-29 y HU-30 tiene su prueba automatizada y su caso en la colección de pruebas (RNF-CAL-03).

## Supuestos

- **Semilla**: calendario de ejemplo de Medellín, lunes a viernes de 05:00 a 20:00, igual para carros (último dígito) y motos (primer dígito): lunes 6 y 9, martes 5 y 7, miércoles 1 y 8, jueves 0 y 2, viernes 3 y 4; vigentes desde el 1 de enero de 2026 sin fecha de fin (TBD-03: el Administrador carga el calendario oficial).
- **Pantallas**: Configuración › Pico y placa (tabla semanal por tipo, nueva, editar, eliminar) y el aviso «Pico y placa hoy» en las pantallas de la caseta (Celdas; Movimientos cuando exista la spec 007) y del Cliente (Disponibilidad y Mis vehículos).
