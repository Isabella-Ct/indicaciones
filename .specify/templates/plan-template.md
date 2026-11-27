# Plan de implementación: [FUNCIONALIDAD]

**Rama**: `[###-nombre-funcionalidad]` | **Fecha**: [FECHA] | **Spec**: [enlace]

**Entrada**: especificación de `specs/[###-nombre-funcionalidad]/spec.md`

**Nota**: esta plantilla la llena el comando `/speckit-plan`. Sigue también `docs/prompts/prompt-plan-backend.md` con la precedencia rúbrica → constitución → SRS.

## Resumen

[Requisito principal de la spec + enfoque técnico decidido en research.md]

## Contexto técnico

<!-- ACCIÓN REQUERIDA: confirme o ajuste los valores del proyecto; marque lo desconocido como NEEDS CLARIFICATION. -->

**Lenguaje/Versión**: JavaScript (ES2022) en CommonJS sobre Node.js 20 LTS

**Dependencias principales**: express, mysql2/promise, zod, jsonwebtoken, bcrypt, helmet, cors, dotenv [+ las justificadas en Seguimiento de complejidad]

**Almacenamiento**: MySQL 8 (InnoDB, utf8mb4), `backend/database/schema.sql` según el modelo 6.1; cambios en `CAMBIOS.md`

**Pruebas**: Jest + Supertest (`backend/tests/`) y Postman + Newman (`backend/docs/postman/casos/NNN-*.js`)

**Plataforma objetivo**: un proceso Node que sirve `/api/v1` y `frontend/`; navegadores Chrome, Edge, Firefox y Safari

**Tipo de proyecto**: aplicación web monolítica (`backend/` + `frontend/`)

**Metas de rendimiento**: [RNF-REN-01/02/03 que apliquen]

**Restricciones**: [RNF-SEG, RNF-PRI, RNF-SAF que apliquen; español, COP, America/Bogota]

**Escala/Alcance**: [volumen esperado de datos y usuarios]

## Verificación de la constitución (Constitution Check)

*COMPUERTA: debe pasar antes de la fase 0 y volver a verificarse después del diseño (fase 1).*

| Principio | Cumplimiento | Estado |
|---|---|---|
| I. La especificación manda | [trazabilidad HU/RF/RN/FR] | |
| II. Monolito por capas y REST | [rutas B.1, sobre {ok}, 409/422, paginación] | |
| III. Seguridad y privacidad | [JWT, permisos, validación, Ley 1581] | |
| IV. Integridad de datos | [transacciones, FK, UNIQUE, hora del servidor] | |
| V. Frontend vanilla y accesible (Atomic Design) | [componentes por nivel, textContent, `<dialog>`, 360–1920 px] | |
| VI. Pruebas | [escenario → Jest + Postman, éxito y error] | |
| VII. Simplicidad | [rebanada vertical, dependencias] | |

## Estructura del proyecto

### Documentación (esta funcionalidad)

```text
specs/[###-funcionalidad]/
├── spec.md
├── plan.md                  # este archivo (/speckit-plan)
├── research.md              # fase 0 (/speckit-plan)
├── data-model.md            # fase 1 (/speckit-plan)
├── quickstart.md            # fase 1 (/speckit-plan)
├── frontend-integration.md  # fase 1 (prompt §3.11)
├── contracts/openapi.yaml   # fase 1 (/speckit-plan)
└── tasks.md                 # fase 2 (/speckit-tasks, no lo crea /speckit-plan)
```

### Código fuente (raíz del repositorio)

<!-- ACCIÓN REQUERIDA: liste los archivos reales que crea o modifica esta spec. -->

```text
backend/
├── src/modules/<modulo>/{<modulo>.routes.js, .controller.js, .service.js, .repository.js, .validator.js}
├── database/{schema.sql, seed.sql, migrations/, CAMBIOS.md}
├── docs/postman/casos/NNN-<modulo>.js
└── tests/{unit, integration}/

frontend/
├── <pantalla>.html                          # página: marcado completo con <template>
├── css/{atomos, moleculas, organismos, plantillas}.css
└── js/
    ├── services/<modulo>.service.js         # una función por endpoint
    ├── views/<pantalla>.view.js             # nivel PÁGINA: llama a servicios y conecta componentes
    └── components/{atomos, moleculas, organismos, plantillas}/   # sin llamadas a la API
```

**Decisión de estructura**: [documente la estructura elegida y los directorios reales]

## Seguimiento de complejidad (Complexity Tracking)

> **Llénelo SOLO si la verificación de la constitución tiene violaciones que se deben justificar** (incluye dependencias fuera de la lista de la constitución §VII).

| Violación | Por qué hace falta | Alternativa más simple descartada |
|---|---|---|
| [p. ej. dependencia X] | [necesidad concreta, RF de origen] | [por qué no basta lo permitido] |
