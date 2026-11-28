---
description: "Plantilla de la lista de tareas de una funcionalidad"
---

# Tareas: [NOMBRE DE LA FUNCIONALIDAD]

**Entrada**: documentos de diseño de `specs/[###-nombre-funcionalidad]/`

**Prerrequisitos**: plan.md (obligatorio), spec.md (obligatorio, historias de usuario), research.md, data-model.md, contracts/

**Pruebas**: obligatorias en este proyecto (constitución §VI): una prueba Jest + Supertest por escenario de aceptación, nombrada `HU-xx Ey <descripción>`, y un caso de éxito y uno de error por endpoint en la colección Postman.

**Organización**: las tareas se agrupan por historia de usuario para que cada una se implemente y se pruebe de forma independiente.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (archivo distinto y sin depender de tareas pendientes)
- **[Historia]**: historia a la que pertenece (US1, US2, US3…)
- Cada descripción incluye la ruta exacta del archivo

## Convenciones de rutas

- Backend: `backend/src/modules/<modulo>/`, `backend/tests/{unit,integration}/`, `backend/database/`
- Frontend (Atomic Design dentro de la estructura de la constitución): `frontend/<pantalla>.html`, `frontend/css/<nivel>.css`, `frontend/js/components/{atomos,moleculas,organismos,plantillas}/`, `frontend/js/views/` (nivel página), `frontend/js/services/`

<!--
  ============================================================================
  IMPORTANTE: las tareas de abajo son EJEMPLOS ilustrativos.
  /speckit-tasks DEBE reemplazarlas por tareas reales según las historias de spec.md (con sus
  prioridades P1, P2, P3…), el plan, el modelo de datos y los contratos.
  NO deje estos ejemplos en el archivo generado.
  ============================================================================
-->

## Fase 1: Preparación (infraestructura compartida)

**Propósito**: inicializar lo que la spec necesita antes de las historias

- [ ] T001 [Tarea de preparación con su ruta]

---

## Fase 2: Fundacional (prerrequisitos que bloquean)

**Propósito**: infraestructura que DEBE estar lista antes de cualquier historia

**⚠️ CRÍTICO**: ninguna historia empieza antes de terminar esta fase

- [ ] T002 [Migración o tabla nueva en backend/database/migrations/NNN_*.sql + CAMBIOS.md]
- [ ] T003 [P] [Utilidad compartida en backend/src/utils/...]

**Punto de control**: la base está lista; las historias pueden empezar

---

## Fase 3: Historia de usuario 1 - [Título] (Prioridad: P1) 🎯 MVP · HU-##

**Objetivo**: [qué entrega esta historia]

**Prueba independiente**: [cómo se verifica sola]

### Pruebas de la historia 1

> **NOTA: escriba estas pruebas PRIMERO y verifique que FALLAN antes de implementar**

- [ ] T004 [P] [US1] Prueba unitaria de las reglas puras en backend/tests/unit/<modulo>.reglas.test.js
- [ ] T005 [US1] Pruebas de integración HU-## E1…En en backend/tests/integration/<modulo>.test.js

### Implementación de la historia 1

- [ ] T006 [P] [US1] Validador zod en backend/src/modules/<modulo>/<modulo>.validator.js
- [ ] T007 [US1] Repositorio en backend/src/modules/<modulo>/<modulo>.repository.js
- [ ] T008 [US1] Servicio con las reglas RN-## en backend/src/modules/<modulo>/<modulo>.service.js
- [ ] T009 [US1] Controlador y rutas (authorize + validate) en backend/src/modules/<modulo>/
- [ ] T010 [US1] Página frontend/<pantalla>.html y vista frontend/js/views/<pantalla>.view.js (componentes por nivel atómico)

**Punto de control**: la historia 1 funciona y se prueba sola

---

[Repita el bloque por cada historia en orden de prioridad]

---

## Fase N: Pulido y transversales

- [ ] TXXX Carpeta Postman NNN en backend/docs/postman/casos/NNN-<modulo>.js (éxito y error por endpoint) y `npm run test:api` en verde
- [ ] TXXX [P] Actualizar README.md (endpoints, pantallas, usuarios de prueba)
- [ ] TXXX Cobertura de services ≥ 80 %, `npm run lint` sin errores y prueba manual en escritorio y a 375 px
- [ ] TXXX Verificar que no queden comentarios ni textos en inglés y marcar `[X]` en este archivo

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Preparación (Fase 1)** → **Fundacional (Fase 2)** → historias (Fase 3+) → **Pulido**

### Dependencias entre historias

- [Indique qué historias usan piezas de otras]

### Dentro de cada historia

- Pruebas primero (y verificar que fallan) → validador y repositorio → servicio → rutas y controlador → interfaz

### Oportunidades de paralelismo

- [Liste las tareas [P] que pueden ir juntas]

## Estrategia de implementación

### Primero el MVP (solo la historia 1)

1. Fase 1 y Fase 2
2. Historia 1 → **detenerse y validar**

### Entrega incremental

3. Una historia a la vez, cada una con su punto de control en verde
4. Pulido y PR `NNN-modulo` → `develop`
