# Especificación de la funcionalidad: Incidencias

**Rama**: `013-incidencias`

**Creada**: 2026-11-27

**Estado**: Borrador

**Entrada**: descripción de la usuaria: "013-incidencias — Módulo Incidencias del Sistema de Gestión de Parqueadero (Parking Lot ABC), según SRS v2.0 §4.13, Apéndice B.1 §4.13, modelo 6.1 §4.13 e historias HU-56..HU-58."

**Fuentes de verdad**: SRS v2.0 §4.13 (RF-INC-01 … RF-INC-08), §4.14 (RF-MON-04, alerta al Administrador), §5.3 (RNF-SEG-04, RNF-SEG-07, RNF-PRI-03), §5.5 (RN-28), Apéndice B.1 §4.13, modelo 6.1 §4.13 (*Incidencia*, *SeguimientoIncidencia*); historias HU-56 … HU-58.

**Depende de**: `005-vehiculos` (vehículo afectado), `004-parqueaderos-celdas` (celda opcional), `007-control-ingreso-salida` (celda actual del vehículo). **La usan**: `014-monitoreo-alertas` (bandeja de alertas), `015-reportes-indicadores`.

## Aclaraciones

### Sesión 2026-11-27

La usuaria indicó resolver cada pregunta según los documentos entregados. Cada respuesta cita su fuente.

- P: ¿Qué pasa si la placa no está registrada? → R: Se registra como vehículo ocasional (sin propietario), igual que en una entrada; en ese caso el tipo de vehículo es obligatorio (422 si falta). *Fuente:* datos de HU-56 («placa registrada u ocasional»), RF-MOV-05.
- P: ¿La celda es obligatoria? → R: Es opcional; si no se indica y el vehículo está dentro, se usa la celda que ocupa. *Fuente:* modelo 6.1 (`id_celda` opcional).
- P: ¿Qué valida el registro? → R: Tipo (rayón, choque, atropellamiento, golpe contra muro) y placa obligatorios; fecha y hora del evento no futura según el reloj del servidor; descripción de 10 a 500 caracteres; evidencia opcional JPG o PNG de hasta 5 MB, comprobada por su contenido. *Fuente:* RF-INC-01, RF-INC-03, criterios 2–4 de HU-56, RNF-PRI-03.
- P: ¿Cómo es el código? → R: Consecutivo sin huecos `INC-000001`, tomado en la misma transacción del registro. *Fuente:* RF-INC-02, criterio 1 de HU-56 (INC-000031), consecutivo `incidencia` de la semilla.
- P: ¿Cómo se alerta al Administrador? → R: Con una alerta de tipo «incidencia» (código, tipo y placa) que la bandeja de la spec 014 muestra con su enlace. *Fuente:* RF-INC-04, RF-MON-04, RF-MON-05.
- P: ¿Quién da seguimiento y cierra? → R: El Administrador (`incidencias.editar`). El Operador registra y consulta. La primera nota pasa la incidencia a «en seguimiento»; se puede cerrar desde «abierta» o «en seguimiento» con una solución de 10 a 500 caracteres (422 sin ella); una cerrada no admite notas ni otro cierre (409). Las incidencias no se eliminan. *Fuente:* actor de HU-58, RF-INC-07, RF-INC-08, RN-28, semilla de permisos.
- P: ¿Cómo se ve la evidencia? → R: Se guarda fuera de la carpeta pública con un nombre aleatorio y se descarga con `GET /incidencias/:id/evidencia` `[Propuesta]` (solo con `incidencias.ver`). *Fuente:* RF-INC-06, RNF-PRI-03, decisión de la spec 002 para las fotos.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Registrar una incidencia (Prioridad: P1) — HU-56

Como Operador, quiero registrar una incidencia con su tipo, vehículo afectado, fecha y hora, para dejar constancia formal ante un eventual reclamo del cliente.

**Por qué esta prioridad**: es la constancia que respalda al parqueadero.

**Prueba independiente**: un «Rayón» de ABC123 queda abierto con código `INC-` y alerta al Administrador; sin tipo o placa, o con fecha futura, da 422; con una foto JPG queda la evidencia.

**Escenarios de aceptación**:

1. **Dado** que selecciono el tipo «Rayón», la placa ABC123, la fecha y hora del evento y escribo la descripción, **cuando** confirmo, **entonces** el sistema registra la incidencia abierta con código único (INC-000031) y alerta al Administrador. *(RF-INC-01, RF-INC-02, RF-INC-04)*
2. **Dado** que no selecciono tipo o vehículo, **cuando** intento guardar, **entonces** el sistema señala los campos obligatorios (422). *(RF-INC-01)*
3. **Dado** que ingreso una fecha y hora futura, **cuando** confirmo, **entonces** el sistema rechaza el registro (422). *(RF-INC-03)*
4. **Dado** que adjunto una foto JPG de evidencia de hasta 5 MB, **cuando** confirmo, **entonces** queda asociada a la incidencia. *(RF-INC-01)*
5. **Dado** una placa no registrada sin tipo, un archivo que no es imagen o de más de 5 MB, o que soy Cliente, **cuando** confirmo, **entonces** el sistema responde 422 o 403.

---

### Historia de usuario 2 - Consultar incidencias (Prioridad: P2) — HU-57

Como Operador o Administrador, quiero buscar incidencias por código, placa, tipo, estado o fecha, para responder reclamos con la información registrada.

**Por qué esta prioridad**: sirve para atender reclamos.

**Prueba independiente**: por la placa ABC123 salen sus incidencias con código, tipo, fecha, estado y operador; el detalle trae la descripción, la evidencia y el seguimiento.

**Escenarios de aceptación**:

1. **Dado** incidencias registradas, **cuando** filtro por placa ABC123, **entonces** veo sus incidencias con código, tipo, fecha, estado y operador. *(RF-INC-05)*
2. **Dado** una incidencia, **cuando** abro su detalle, **entonces** veo la descripción, la evidencia y el historial de seguimiento. *(RF-INC-06)*

---

### Historia de usuario 3 - Dar seguimiento y cerrar una incidencia (Prioridad: P2) — HU-58

Como Administrador, quiero registrar notas de seguimiento y cerrar la incidencia con su solución, para saber qué se hizo con cada caso y cuándo terminó.

**Por qué esta prioridad**: cierra el ciclo del caso.

**Prueba independiente**: la primera nota la pasa a «en seguimiento» con fecha y usuario; el cierre con solución la deja cerrada y sin cambios; sin solución da 422.

**Escenarios de aceptación**:

1. **Dado** una incidencia abierta, **cuando** agrego una nota de seguimiento, **entonces** queda con fecha y usuario y la incidencia pasa a en seguimiento. *(RF-INC-07)*
2. **Dado** una incidencia en seguimiento, **cuando** la cierro escribiendo la solución, **entonces** pasa a cerrada y ya no admite cambios. *(RF-INC-08, RN-28)*
3. **Dado** que intento cerrar sin escribir la solución, **cuando** confirmo, **entonces** el sistema la exige (422). *(RF-INC-08)*

---

### Casos borde

- **Vehículo dentro**: sin celda indicada, la incidencia toma la celda que ocupa el vehículo.
- **Fecha del evento**: igual a la hora actual es válida; un minuto después, no.
- **Concurrencia**: el código se toma dentro de la transacción; si el registro falla, no se pierde el número.
- **Evidencia**: si la base de datos falla después de guardar el archivo, el archivo se borra.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001** (RF-INC-01, RF-INC-03): El sistema DEBE registrar incidencias con tipo, placa (registrada u ocasional), celda opcional, fecha y hora del evento no futura, descripción (10–500) y evidencia opcional (JPG/PNG ≤ 5 MB).
- **FR-002** (RF-INC-02): El sistema DEBE asignar un código consecutivo único `INC-000001`.
- **FR-003** (RF-INC-04): El sistema DEBE generar una alerta de tipo «incidencia» para el Administrador al registrarla.
- **FR-004** (RF-INC-05): El sistema DEBE listar incidencias con búsqueda por código o placa y filtros por tipo, estado y rango de fechas del evento, con código, tipo, fecha, estado, placa y operador.
- **FR-005** (RF-INC-06): El sistema DEBE mostrar el detalle con la descripción, la evidencia y el historial de seguimiento.
- **FR-006** (RF-INC-07): El sistema DEBE permitir al Administrador agregar notas (5–500) con fecha y usuario a una incidencia no cerrada; la primera nota la pasa a «en seguimiento».
- **FR-007** (RF-INC-08, RN-28): El sistema DEBE permitir al Administrador cerrar la incidencia con solución obligatoria (10–500) e impedir cambios posteriores (409); las incidencias no se eliminan.
- **FR-008** (RNF-SEG-04, RNF-SEG-07, RNF-PRI-03): Permisos `incidencias.ver` y `incidencias.crear` (Administrador y Operador), `incidencias.editar` (Administrador); evidencia privada; bitácora de registro, seguimiento y cierre.

### Entidades clave

- **Incidencia** (6.1): código, tipo, vehículo, celda, fecha y hora del evento, descripción, evidencia, operador, estado (abierta, en seguimiento, cerrada), solución y fecha de cierre.
- **Seguimiento de incidencia** (6.1): nota, usuario y fecha.
- **Alerta** (spec 014): aviso de tipo «incidencia» para el Administrador.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El Operador registra una incidencia en menos de 2 minutos.
- **SC-002**: El 100 % de las incidencias de prueba tienen un código único y una alerta para el Administrador.
- **SC-003**: Ninguna incidencia cerrada acepta notas ni otro cierre.
- **SC-004**: Cada escenario de aceptación de HU-56 a HU-58 tiene su prueba automatizada y su caso en la colección de pruebas (RNF-CAL-03).

## Supuestos

- **Semilla**: sin incidencias (la operación empieza vacía); el consecutivo `incidencia` ya existe.
- **Pantallas**: Incidencias (listado), Incidencias › Nueva incidencia e Incidencias › Detalle (seguimiento y cierre).
