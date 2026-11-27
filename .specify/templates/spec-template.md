# Especificación de la funcionalidad: [NOMBRE DE LA FUNCIONALIDAD]

**Rama**: `[###-nombre-funcionalidad]`

**Creada**: [FECHA]

**Estado**: Borrador

**Entrada**: descripción de la usuaria: "$ARGUMENTS"

**Fuentes de verdad**: [SRS v2.0 §4.x (RF-XXX-##), §5 (RNF, RN), Apéndice B.1 §4.x, modelo 6.1 §4.x; historias HU-## … HU-##]

**Depende de**: [specs previas] · **La usan**: [specs posteriores]

## Aclaraciones

<!-- La completa /speckit-clarify: una línea "- P: … → R: … *Fuente:* …" por decisión. -->

## Escenarios de usuario y pruebas *(obligatorio)*

<!--
  IMPORTANTE: las historias van PRIORIZADAS como recorridos de usuario, de mayor a menor importancia.
  Cada historia debe poder PROBARSE DE FORMA INDEPENDIENTE: si solo se implementa una, el resultado
  sigue siendo un MVP útil. Prioridad de la HU: Alta = P1, Media = P2, Baja = P3.
-->

### Historia de usuario 1 - [Título breve] (Prioridad: P1) — HU-##

[Describa el recorrido del usuario en lenguaje sencillo]

**Por qué esta prioridad**: [valor que aporta y por qué tiene esta prioridad]

**Prueba independiente**: [cómo se prueba sola, p. ej. «se prueba haciendo X y entrega Y»]

**Escenarios de aceptación**:

1. **Dado** [estado inicial], **cuando** [acción], **entonces** [resultado esperado]. *(RF-XXX-##)*
2. **Dado** [estado inicial], **cuando** [acción], **entonces** [resultado esperado]. *(RF-XXX-##)*

---

### Historia de usuario 2 - [Título breve] (Prioridad: P2) — HU-##

[Describa el recorrido del usuario en lenguaje sencillo]

**Por qué esta prioridad**: [valor y prioridad]

**Prueba independiente**: [cómo se prueba sola]

**Escenarios de aceptación**:

1. **Dado** [estado inicial], **cuando** [acción], **entonces** [resultado esperado].

---

[Agregue tantas historias como haga falta, cada una con su prioridad]

### Casos borde

<!-- ACCIÓN REQUERIDA: reemplace por los casos borde reales de la funcionalidad. -->

- ¿Qué pasa cuando [condición límite]?
- ¿Cómo responde el sistema ante [escenario de error]?

## Requisitos *(obligatorio)*

### Requisitos funcionales

<!-- Cada FR indica entre paréntesis el RF/RN/RNF del SRS del que proviene (convención del SRS §1.2). -->

- **FR-001** (RF-XXX-##): El sistema DEBE [capacidad concreta].
- **FR-002** (RF-XXX-##): El sistema DEBE [validación concreta].
- **FR-003** (RN-##): Los usuarios DEBEN poder [interacción clave].

*Ejemplo de requisito sin resolver:*

- **FR-00X**: El sistema DEBE [NEEDS CLARIFICATION: qué falta definir].

### Entidades clave *(incluir si la funcionalidad maneja datos)*

- **[Entidad 1]**: [qué representa y sus atributos clave, sin detalles de implementación]
- **[Entidad 2]**: [qué representa y cómo se relaciona con otras entidades]

## Criterios de éxito *(obligatorio)*

<!-- Medibles e independientes de la tecnología. -->

### Resultados medibles

- **SC-001**: [métrica medible, p. ej. «el operador registra X en menos de 1 minuto»]
- **SC-002**: [métrica de rendimiento o seguridad, p. ej. «el 100 % de las operaciones sin permiso se rechazan»]
- **SC-003**: [cobertura de pruebas: cada escenario de aceptación con su prueba y su caso en la colección]

## Supuestos

<!-- Valores por defecto elegidos cuando las fuentes no los fijan. -->

- [Supuesto sobre los usuarios o el alcance]
- [Dependencia de otra spec o servicio]
