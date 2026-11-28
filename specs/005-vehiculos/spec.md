# Especificación de la funcionalidad: Vehículos

**Rama**: `005-vehiculos`

**Creada**: 2026-11-27

**Estado**: Borrador

**Entrada**: descripción de la usuaria: "005-vehiculos — Módulo Vehículos del Sistema de Gestión de Parqueadero (Parking Lot ABC), según SRS v2.0 §4.5, Apéndice B.1 §4.5, modelo 6.1 §4.5 e historias HU-25..HU-28."

**Fuentes de verdad**: SRS v2.0 §4.5 (RF-VEH-01 … RF-VEH-12), §5.3 (RNF-SEG-04, RNF-SEG-07, RNF-PRI-02), §5.5 (RN-02, RN-06, RN-11, RN-12), Apéndice B.1 §4.5, modelo 6.1 §4.5 (*Vehiculo*); historias HU-25 … HU-28.

**Depende de**: `001-roles-permisos` (permisos `vehiculos.*`), `002-gestion-usuarios` (propietarios). **La usan**: `006-pico-y-placa` (placa y tipo), `007-control-ingreso-salida` (registro del vehículo de un visitante en la entrada y movimientos), `010-membresias`, `012-reservas`, `013-incidencias`, `015-reportes-indicadores`.

## Aclaraciones

### Sesión 2026-11-27

La usuaria indicó resolver cada pregunta según los documentos entregados. Cada respuesta cita su fuente.

- P: ¿Cómo se conserva «el historial con el propietario anterior» (RF-VEH-08) si 6.1 solo tiene `vehiculo.id_propietario`? → R: Se agrega la tabla `historial_propietario` `[Propuesta]` con un periodo por cada propietario (vehículo, usuario, desde, hasta, quién lo registró). Al asociar se abre un periodo; al reasignar o quitar el propietario se cierra el anterior y se abre el nuevo. Así los movimientos anteriores siguen asociados a Ana: los movimientos de un propietario son los de sus vehículos dentro de sus periodos. *Fuente:* RF-VEH-08, criterio 2 de HU-27.
- P: ¿Quién puede asociar y quién reasignar? → R: Asociar un vehículo **sin propietario** exige `vehiculos.crear` (Operador y Administrador). Cambiar o quitar el propietario de un vehículo que **ya tiene uno** exige `vehiculos.editar` (solo Administrador); el Operador recibe 403 «Solo el Administrador puede reasignar el vehículo». *Fuente:* RF-VEH-04, RF-VEH-06, RF-VEH-08, RN-02 y criterio 4 de HU-26.
- P: ¿Cómo se identifica al usuario al asociar? → R: Por `idUsuario` o por `tipoDocumento` + `numeroDocumento` (la caseta pide el documento). Si no existe → 404 «El usuario no está registrado»; si está inactivo → 409 «El usuario está inactivo». El propietario puede tener cualquier rol, siempre que esté activo. *Fuente:* RF-VEH-04, RF-VEH-05, RN-12 y criterio 3 de HU-26.
- P: ¿Qué significa «dentro del parqueadero»? → R: Que el vehículo tiene un movimiento en estado `abierto` (spec 007). El listado lo muestra como `dentro` y lo filtra con `?dentro=true|false`. Mientras está dentro no se puede cambiar su placa ni su tipo (409), porque la celda y el ticket dependen de ellos. *Fuente:* RF-VEH-10, criterio 1 de HU-28 y RN-15.
- P: ¿Cómo consulta el Cliente sus vehículos? → R: Con `GET /usuarios/me/vehiculos` (permiso `perfil.ver`), que devuelve solo los vehículos de los que es propietario, con su estado `dentro`. El listado general y el detalle exigen `vehiculos.ver` (personal), así el Cliente nunca ve vehículos ajenos. *Fuente:* RF-VEH-12, criterio 3 de HU-28 y RNF-PRI-02.
- P: ¿Cómo se consultan los «vehículos sin propietario» (criterio 4 de HU-25)? → R: Con `GET /vehiculos?propietario=ninguno`; `propietario=<id>` lista los de un usuario (detalle del usuario). La búsqueda `q` encuentra por placa (normalizada), nombre o documento del propietario. *Fuente:* RF-VEH-10, B.1 (`propietario`) y criterio 4 de HU-25.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Registrar un vehículo (Prioridad: P1) — HU-25

Como Administrador u Operador, quiero registrar un vehículo con placa, tipo, color, marca y modelo, para tenerlo disponible para asociarlo a un usuario y controlar sus entradas.

**Por qué esta prioridad**: la placa es la llave de entradas, salidas, restricciones, membresías e incidencias.

**Prueba independiente**: se registra «abc 123» y queda como ABC123; la placa repetida y el formato inválido se rechazan; el vehículo aparece entre los que no tienen propietario.

**Escenarios de aceptación**:

1. **Dado** que ingreso la placa «abc 123», tipo carro, color rojo, marca Chevrolet y modelo 2018, **cuando** confirmo, **entonces** el sistema guarda la placa como ABC123 y muestra «Vehículo registrado». *(RF-VEH-01, RF-VEH-02)*
2. **Dado** que la placa ABC123 ya existe, **cuando** intento registrarla de nuevo, **entonces** el sistema responde «La placa ya está registrada» (409). *(RF-VEH-03, RN-11)*
3. **Dado** que ingreso la placa «AB1234» para un carro, **cuando** confirmo, **entonces** el sistema responde «Formato de placa inválido para carro (AAA123)» (422). *(RF-VEH-02, RN-11)*
4. **Dado** el vehículo registrado, **cuando** consulto los vehículos sin propietario, **entonces** aparece disponible para asociarlo a un usuario. *(RF-VEH-04)*
5. **Dado** el color, la marca o el modelo fuera de rango (modelo antes de 1950 o después del año siguiente), **cuando** confirmo, **entonces** el sistema señala el campo (422). Sin el permiso `vehiculos.crear` → 403.

---

### Historia de usuario 2 - Asociar un vehículo a su propietario (Prioridad: P1) — HU-26

Como Administrador u Operador, quiero asignar a un usuario un vehículo de su propiedad, para saber a quién pertenece cada vehículo para membresías, facturas e incidencias.

**Por qué esta prioridad**: membresías, reservas e incidencias necesitan el propietario.

**Prueba independiente**: se asocia un vehículo sin propietario a un Cliente activo y aparece en su detalle y en «Mis vehículos»; se rechazan el vehículo o el usuario inexistentes, el usuario inactivo y la reasignación por un Operador.

**Escenarios de aceptación**:

1. **Dado** un vehículo registrado sin propietario y un usuario activo, **cuando** asocio el vehículo al usuario, **entonces** el vehículo aparece en el detalle del usuario y en «Mis vehículos» del cliente. *(RF-VEH-04)*
2. **Dado** una placa que no está registrada, **cuando** intento asociarla, **entonces** el sistema responde «Registre primero el vehículo» (404) y la pantalla ofrece el formulario de registro. *(RF-VEH-05)*
3. **Dado** un documento que no corresponde a un usuario registrado (404) o un usuario inactivo (409), **cuando** intento asociarle un vehículo, **entonces** el sistema rechaza la asociación. *(RF-VEH-05, RN-12)*
4. **Dado** un vehículo que ya tiene propietario, **cuando** un Operador intenta asociarlo a otro usuario, **entonces** el sistema responde «Solo el Administrador puede reasignar el vehículo» (403). *(RF-VEH-06, RN-02)*

---

### Historia de usuario 3 - Actualizar o reasignar un vehículo (Prioridad: P2) — HU-27

Como Administrador, quiero actualizar los datos de un vehículo o reasignarlo a otro usuario, para mantener correcta la información de propiedad de cada vehículo.

**Por qué esta prioridad**: corrige errores de registro y cambios de dueño; no bloquea la operación diaria.

**Prueba independiente**: se cambia el color y queda en la bitácora; se reasigna de Ana a Luis y el historial conserva a Ana; el Operador y el Cliente reciben 403; la placa repetida, 409.

**Escenarios de aceptación**:

1. **Dado** un vehículo, **cuando** cambio su color y confirmo, **entonces** el sistema guarda el cambio y lo registra en la bitácora con el valor anterior y el nuevo. *(RF-VEH-07, RF-VEH-09)*
2. **Dado** un vehículo de Ana, **cuando** lo reasigno a Luis (usuario activo) y confirmo, **entonces** el vehículo pasa a Luis y desaparece de «Mis vehículos» de Ana; el historial conserva el periodo de Ana y sus movimientos anteriores siguen asociados a ella. *(RF-VEH-08, RF-VEH-09)*
3. **Dado** que soy Operador o Cliente, **cuando** intento actualizar o reasignar un vehículo, **entonces** el sistema responde 403. *(RF-VEH-07, RN-02)*
4. **Dado** que cambio la placa por una ya registrada, **cuando** confirmo, **entonces** el sistema responde 409. *(RF-VEH-03)*
5. **Dado** un vehículo que está dentro del parqueadero, **cuando** intento cambiar su placa o su tipo, **entonces** el sistema responde «El vehículo está dentro del parqueadero» (409); el color, la marca y el modelo sí se pueden cambiar.

---

### Historia de usuario 4 - Consultar vehículos (Prioridad: P1) — HU-28

Como Administrador, Operador o Cliente, quiero buscar vehículos por placa o propietario y ver su detalle, para verificar datos en la caseta y, como cliente, ver mis vehículos.

**Por qué esta prioridad**: la caseta consulta vehículos en cada entrada; el Cliente necesita ver los suyos.

**Prueba independiente**: el Operador busca «ABC1» y ve las coincidencias con su propietario y si están dentro; el detalle muestra el propietario, el historial y los últimos 10 movimientos; el Cliente solo ve los suyos.

**Escenarios de aceptación**:

1. **Dado** que soy Operador, **cuando** busco «ABC1», **entonces** veo los vehículos cuya placa contiene ese texto con tipo, color, marca, propietario y si está dentro del parqueadero; puedo filtrar por tipo, propietario y presencia. *(RF-VEH-10)*
2. **Dado** un vehículo, **cuando** abro su detalle, **entonces** veo sus datos, su propietario, el historial de propietarios y sus últimos 10 movimientos. Si no existe → 404. *(RF-VEH-11)*
3. **Dado** que soy Cliente, **cuando** abro Mis vehículos, **entonces** solo veo los vehículos asociados a mi cuenta; el listado general y el detalle me responden 403. *(RF-VEH-12)*

---

### Casos borde

- **Placa**: se quitan espacios y guiones y se pasa a mayúsculas antes de validar («abc-123» → ABC123). Carro: `AAA123`; moto: `AAA12` o `AAA12A`. Una placa válida para moto con un tipo carro (o al revés) → 422 con el mensaje del tipo.
- **Modelo**: entero entre 1950 y el año actual + 1 (zona America/Bogota).
- **Color y marca**: 2–30 y 2–40 caracteres; se guardan sin espacios extremos.
- **Asociar al mismo propietario** que ya tiene → 200 sin cambios ni nuevo periodo.
- **Quitar el propietario** (`idUsuario: null`, solo Administrador): cierra el periodo vigente; el vehículo vuelve a la lista sin propietario.
- **Usuario inactivo** (RN-06): conserva sus vehículos, pero no se le pueden asociar nuevos.
- **Concurrencia**: dos asociaciones del mismo vehículo al mismo tiempo: la segunda ve el propietario ya asignado (bloqueo de fila) y se trata como reasignación.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Registro (HU-25)**

- **FR-001** (RF-VEH-01): El sistema DEBE permitir al Administrador y al Operador registrar vehículos con placa, tipo (carro o moto), color, marca y modelo; opcionalmente con su propietario.
- **FR-002** (RF-VEH-02, RN-11): El sistema DEBE normalizar la placa (mayúsculas, sin espacios ni guiones) y validar su formato según el tipo.
- **FR-003** (RF-VEH-03, RN-11): El sistema DEBE rechazar una placa ya registrada (409), también al editar.

**Propietario (HU-26, HU-27)**

- **FR-004** (RF-VEH-04, RN-12): El sistema DEBE permitir asociar un vehículo sin propietario a un usuario registrado y activo, identificado por id o por documento.
- **FR-005** (RF-VEH-05): El sistema DEBE rechazar la asociación de un vehículo inexistente («Registre primero el vehículo», 404), de un usuario inexistente (404) o inactivo (409).
- **FR-006** (RF-VEH-06, RN-02): El sistema DEBE impedir que quien no tenga `vehiculos.editar` cambie el propietario de un vehículo que ya tiene uno (403).
- **FR-007** (RF-VEH-08, RN-12): El sistema DEBE permitir al Administrador reasignar o quitar el propietario, cerrando el periodo anterior en el historial de propietarios y abriendo el nuevo.

**Actualización (HU-27)**

- **FR-008** (RF-VEH-07, RN-02): El sistema DEBE permitir solo al Administrador actualizar placa, tipo, color, marca y modelo; la placa y el tipo no cambian mientras el vehículo está dentro (409).
- **FR-009** (RF-VEH-09, RNF-SEG-07): El sistema DEBE registrar en la bitácora la creación, cada actualización (valor anterior y nuevo) y cada cambio de propietario.

**Consulta (HU-28)**

- **FR-010** (RF-VEH-10): El sistema DEBE listar vehículos con paginación, búsqueda por placa o propietario, y filtros por tipo, propietario (`<id>` o `ninguno`) y presencia (`dentro`).
- **FR-011** (RF-VEH-11): El sistema DEBE mostrar el detalle con propietario, historial de propietarios y los últimos 10 movimientos.
- **FR-012** (RF-VEH-12, RNF-PRI-02): El sistema DEBE ofrecer al Cliente solo sus propios vehículos (`/usuarios/me/vehiculos`); el listado y el detalle generales exigen `vehiculos.ver`.

**Transversales**

- **FR-013** (RNF-SEG-04): Permisos: `vehiculos.ver` (listado y detalle), `vehiculos.crear` (registrar y asociar sin propietario), `vehiculos.editar` (actualizar, reasignar y quitar propietario), `perfil.ver` (mis vehículos); sin el permiso → 403.

### Entidades clave

- **Vehículo** (6.1): placa única normalizada, tipo, color, marca, modelo, propietario opcional (nulo para el vehículo ocasional de un visitante), estado.
- **Historial de propietario** `[Propuesta]`: periodo (desde, hasta) en que un usuario fue propietario de un vehículo, con quién lo registró.
- **Usuario** (spec 002): propietario; debe estar activo para recibir un vehículo.
- **Movimiento** (spec 007): solo se lee para `dentro` y los últimos 10 movimientos.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El Operador registra un vehículo y lo asocia a un cliente en menos de 1 minuto.
- **SC-002**: Ningún escenario de prueba consigue dos vehículos con la misma placa (con o sin espacios, guiones o minúsculas).
- **SC-003**: El 100 % de las reasignaciones conserva el periodo del propietario anterior y queda en la bitácora.
- **SC-004**: La búsqueda de vehículos responde en ≤ 1 s p95 (RNF-REN-02).
- **SC-005**: Ninguna respuesta da a un Cliente datos de vehículos que no son suyos.
- **SC-006**: Cada escenario de aceptación de HU-25 a HU-28 tiene su prueba automatizada y su caso en la colección de pruebas (RNF-CAL-03).

## Supuestos

- **Semilla**: 6 vehículos de ejemplo. Andrea Salcedo tiene un carro (ABC123) y una moto (QWE45A); Carlos Medina, un carro; Valentina Ospina, un carro; hay un carro sin propietario (visitante); Mateo Cardona, usuario inactivo, conserva un vehículo (RN-06). Cada uno con su periodo abierto en el historial.
- **Movimientos**: hasta la spec 007 la tabla `movimiento` está vacía; `dentro` y los últimos movimientos se prueban insertando movimientos por SQL.
- **Pantallas**: Vehículos (listado con filtros, nuevo), Vehículos › Detalle (datos, propietario con asociar o reasignar, historial y movimientos), Vehículos › Editar, la sección «Vehículos» en Usuarios › Detalle (con «Agregar vehículo» por placa) y Panel del cliente › Mis vehículos.
